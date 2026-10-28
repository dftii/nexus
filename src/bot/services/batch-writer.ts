import { describeError, type Logger } from "./logger";
import type { MessageEventRecord } from "./repository";

export const DEFAULT_FLUSH_INTERVAL_MS = 2_000;
export const DEFAULT_MAX_BATCH = 100;
export const DEFAULT_MAX_BUFFER = 5_000;
export const DEFAULT_MAX_BACKOFF_MS = 30_000;
export const DEFAULT_STOP_TIMEOUT_MS = 5_000;

export interface FlushResult {
  /** Rows actually stored. */
  stored: number;
  /** Rows the database already had (Gateway resends). */
  skipped: number;
}

export interface BatchWriterOptions {
  /** Idempotent insert; resolves to the number of rows stored. */
  insert: (records: readonly MessageEventRecord[]) => Promise<number>;
  logger: Logger;
  flushIntervalMs?: number;
  maxBatch?: number;
  maxBuffer?: number;
  maxBackoffMs?: number;
  /** Called after each successful flush with its aggregate result. */
  onFlush?: (result: FlushResult) => void;
}

export interface BatchWriter {
  enqueue(record: MessageEventRecord): void;
  /** Start the periodic flush timer. */
  start(): void;
  /** Stop timers and try to flush what is left within `timeoutMs`. */
  stop(timeoutMs?: number): Promise<{ remaining: number }>;
  readonly size: number;
  readonly droppedTotal: number;
}

/**
 * Buffered batch writer. Records are queued and written with one idempotent
 * insert every `flushIntervalMs` or as soon as `maxBatch` are waiting.
 *
 * Failure handling: a failed batch goes back to the FRONT of the buffer and is
 * retried with exponential backoff (1s, 2s, 4s ... capped). The buffer is
 * bounded: when full the OLDEST records are dropped and counted, so a long
 * database outage cannot exhaust memory.
 */
export function createBatchWriter(options: BatchWriterOptions): BatchWriter {
  const {
    insert,
    logger,
    flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
    maxBatch = DEFAULT_MAX_BATCH,
    maxBuffer = DEFAULT_MAX_BUFFER,
    maxBackoffMs = DEFAULT_MAX_BACKOFF_MS,
    onFlush,
  } = options;

  let buffer: MessageEventRecord[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<boolean> | undefined;
  let inFlightSize = 0;
  let failures = 0;
  let backingOff = false;
  let running = false;
  let droppedTotal = 0;
  let droppedSinceLog = 0;

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const schedule = (delay: number) => {
    clearTimer();
    if (!running) return;
    timer = setTimeout(() => {
      timer = undefined;
      backingOff = false;
      void flushOnce();
    }, delay);
    timer.unref?.();
  };

  const enforceBound = () => {
    const overflow = buffer.length - maxBuffer;
    if (overflow > 0) {
      buffer = buffer.slice(overflow);
      droppedTotal += overflow;
      droppedSinceLog += overflow;
    }
  };

  /** One flush attempt. Resolves true on success (or nothing to do). */
  const flushOnce = (): Promise<boolean> => {
    if (inFlight) return inFlight;
    if (buffer.length === 0) {
      schedule(flushIntervalMs);
      return Promise.resolve(true);
    }
    const batch = buffer.splice(0, maxBatch);
    inFlightSize = batch.length;
    inFlight = (async () => {
      try {
        const stored = await insert(batch);
        failures = 0;
        const result = { stored, skipped: batch.length - stored };
        onFlush?.(result);
        if (droppedSinceLog > 0) {
          logger.warn("ingest_buffer_dropped", { dropped: droppedSinceLog });
          droppedSinceLog = 0;
        }
        // More waiting? Keep draining without waiting for the next tick.
        schedule(buffer.length >= maxBatch ? 0 : flushIntervalMs);
        return true;
      } catch (error) {
        failures += 1;
        buffer = [...batch, ...buffer];
        enforceBound();
        const delay = Math.min(maxBackoffMs, 1_000 * 2 ** (failures - 1));
        backingOff = true;
        logger.warn("ingest_flush_failed", {
          ...describeError(error),
          attempt: failures,
          buffered: buffer.length,
          dropped: droppedSinceLog,
          retryInMs: delay,
        });
        droppedSinceLog = 0;
        schedule(delay);
        return false;
      } finally {
        inFlight = undefined;
        inFlightSize = 0;
      }
    })();
    return inFlight;
  };

  return {
    enqueue(record) {
      buffer.push(record);
      enforceBound();
      if (running && !inFlight && !backingOff && buffer.length >= maxBatch) {
        clearTimer();
        void flushOnce();
      }
    },

    start() {
      running = true;
      schedule(flushIntervalMs);
    },

    async stop(timeoutMs = DEFAULT_STOP_TIMEOUT_MS) {
      running = false;
      clearTimer();
      let expired = false;
      let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
      const expiry = new Promise<void>((resolve) => {
        deadlineTimer = setTimeout(() => {
          expired = true;
          resolve();
        }, timeoutMs);
      });
      try {
        while (!expired) {
          if (!inFlight && buffer.length === 0) break;
          const ok = await Promise.race([
            flushOnce(),
            expiry.then(() => false),
          ]);
          if (!ok) break;
        }
      } finally {
        clearTimeout(deadlineTimer);
        clearTimer();
      }
      return { remaining: buffer.length + inFlightSize };
    },

    get size() {
      return buffer.length;
    },
    get droppedTotal() {
      return droppedTotal;
    },
  };
}
