import type { Allowlist } from "./allowlist";
import {
  createBatchWriter,
  type BatchWriter,
  type BatchWriterOptions,
} from "./batch-writer";
import type { CommunityCache } from "./community-cache";
import type { Logger } from "./logger";
import {
  classifyMessage,
  createRejectionCounter,
  extractMessageDto,
  type MessageSource,
} from "./message-events";
import type { BotRepository } from "./repository";

export interface Ingestion {
  /** Synchronous and non-throwing: classify and enqueue one message. */
  handle(message: MessageSource): void;
  start(): void;
  /** Flush what is buffered (bounded by `timeoutMs`) and stop the timers. */
  stop(timeoutMs?: number): Promise<{ remaining: number }>;
  /** Log and reset the rejection counters if any are pending. */
  reportRejections(): void;
  readonly writer: BatchWriter;
}

/**
 * Wires filtering to the batch writer and owns the aggregated counters. One
 * `ingest_flush` log line per flush; rejection counters ride along (or are
 * reported on their own by `reportRejections`). Never logs per message.
 */
export function createIngestion(deps: {
  repository: BotRepository;
  allowlist: Allowlist;
  cache: CommunityCache;
  logger: Logger;
  writerOptions?: Partial<
    Omit<BatchWriterOptions, "insert" | "logger" | "onFlush">
  >;
}): Ingestion {
  const { repository, allowlist, cache, logger } = deps;
  const rejections = createRejectionCounter();

  const writer = createBatchWriter({
    ...deps.writerOptions,
    insert: (records) => repository.insertMessageEvents(records),
    logger,
    onFlush: ({ stored, skipped }) => {
      const rejected = rejections.drain();
      logger.info("ingest_flush", {
        stored,
        skipped,
        ...(rejected ? { rejected } : {}),
      });
    },
  });

  return {
    writer,

    handle(message) {
      try {
        const result = classifyMessage(extractMessageDto(message), {
          allowlist,
          cache,
        });
        if (result.accepted) writer.enqueue(result.record);
        else rejections.add(result.reason);
      } catch {
        rejections.add("invalid");
      }
    },

    start: () => writer.start(),
    stop: (timeoutMs) => writer.stop(timeoutMs),

    reportRejections() {
      const rejected = rejections.drain();
      if (rejected) logger.info("ingest_rejections", { rejected });
    },
  };
}
