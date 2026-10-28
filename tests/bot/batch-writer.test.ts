import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBatchWriter } from "@/bot/services/batch-writer";
import { silentLogger } from "@/bot/services/logger";
import type { MessageEventRecord } from "@/bot/services/repository";
import { createFakeBotRepository } from "../helpers/fake-bot-repo";

function record(n: number): MessageEventRecord {
  return {
    communityId: "com_1",
    discordMessageId: String(n),
    discordGuildId: "123456789012345678",
    discordChannelId: "700000000000000001",
    authorDiscordId: "600000000000000001",
    occurredAt: new Date(1_800_000_000_000 + n),
  };
}

function setup(
  options: Parameters<typeof createBatchWriter>[0] extends infer O
    ? Partial<O>
    : never = {},
) {
  const fake = createFakeBotRepository();
  const onFlush = vi.fn();
  const logger = { ...silentLogger, warn: vi.fn() };
  const writer = createBatchWriter({
    insert: (records) => fake.repo.insertMessageEvents(records),
    logger,
    onFlush,
    ...options,
  });
  return { fake, writer, onFlush, logger };
}

describe("createBatchWriter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("flushes on the interval", async () => {
    const { fake, writer, onFlush } = setup();
    writer.start();
    writer.enqueue(record(1));
    writer.enqueue(record(2));
    expect(fake.events.size).toBe(0);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fake.events.size).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.events.size).toBe(2);
    expect(onFlush).toHaveBeenCalledWith({ stored: 2, skipped: 0 });
    await writer.stop();
  });

  it("flushes immediately at the batch size, in one call", async () => {
    const { fake, writer } = setup();
    writer.start();
    for (let i = 1; i <= 100; i++) writer.enqueue(record(i));
    await vi.advanceTimersByTimeAsync(0);
    expect(fake.events.size).toBe(100);
    expect(fake.repo.insertMessageEvents).toHaveBeenCalledTimes(1);
    await writer.stop();
  });

  it("counts duplicates (Gateway resends) as skipped", async () => {
    const { writer, onFlush } = setup();
    writer.start();
    writer.enqueue(record(1));
    await vi.advanceTimersByTimeAsync(2_000);
    writer.enqueue(record(1));
    writer.enqueue(record(2));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(onFlush).toHaveBeenLastCalledWith({ stored: 1, skipped: 1 });
    await writer.stop();
  });

  it("keeps the batch on failure and retries with exponential backoff", async () => {
    const { fake, writer, logger } = setup();
    fake.control.failInserts = 2;
    writer.start();
    writer.enqueue(record(1));
    await vi.advanceTimersByTimeAsync(2_000); // attempt 1 fails, retry in 1s
    expect(writer.size).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "ingest_flush_failed",
      expect.objectContaining({ attempt: 1, retryInMs: 1_000 }),
    );
    await vi.advanceTimersByTimeAsync(1_000); // attempt 2 fails, retry in 2s
    expect(logger.warn).toHaveBeenLastCalledWith(
      "ingest_flush_failed",
      expect.objectContaining({ attempt: 2, retryInMs: 2_000 }),
    );
    expect(fake.events.size).toBe(0);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fake.events.size).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.events.size).toBe(1);
    expect(writer.size).toBe(0);
    await writer.stop();
  });

  it("caps the backoff", async () => {
    const { fake, writer, logger } = setup({ maxBackoffMs: 4_000 });
    fake.control.failAll = true;
    writer.start();
    writer.enqueue(record(1));
    await vi.advanceTimersByTimeAsync(2_000);
    for (let i = 0; i < 4; i++) await vi.advanceTimersByTimeAsync(4_000);
    const delays = (logger.warn as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => (call[1] as { retryInMs: number }).retryInMs,
    );
    expect(Math.max(...delays)).toBe(4_000);
    await writer.stop(10);
  });

  it("drops the OLDEST records when the buffer is full", async () => {
    const { fake, writer } = setup({ maxBuffer: 3 });
    for (let i = 1; i <= 5; i++) writer.enqueue(record(i)); // not started: no flush
    expect(writer.size).toBe(3);
    expect(writer.droppedTotal).toBe(2);
    writer.start();
    await vi.advanceTimersByTimeAsync(2_000);
    expect([...fake.events.keys()].sort()).toEqual(["3", "4", "5"]);
    await writer.stop();
  });

  it("drops oldest while the database is down and reports the drops", async () => {
    const { fake, writer, logger } = setup({ maxBuffer: 2, maxBatch: 2 });
    fake.control.failAll = true;
    writer.start();
    writer.enqueue(record(1));
    writer.enqueue(record(2));
    await vi.advanceTimersByTimeAsync(0); // batch of 2 fails
    writer.enqueue(record(3));
    writer.enqueue(record(4));
    expect(writer.size).toBe(2);
    expect(writer.droppedTotal).toBe(2);
    fake.control.failAll = false;
    await vi.advanceTimersByTimeAsync(1_000);
    expect([...fake.events.keys()].sort()).toEqual(["3", "4"]);
    expect(logger.warn).toHaveBeenCalledWith(
      "ingest_buffer_dropped",
      expect.objectContaining({ dropped: expect.any(Number) }),
    );
    await writer.stop();
  });

  it("flushes the remainder on stop", async () => {
    const { fake, writer } = setup();
    writer.start();
    for (let i = 1; i <= 250; i++) writer.enqueue(record(i));
    const result = await writer.stop(5_000);
    expect(result.remaining).toBe(0);
    expect(fake.events.size).toBe(250);
  });

  it("stop gives up when the database is down and reports what is left", async () => {
    const { fake, writer } = setup();
    fake.control.failAll = true;
    writer.start();
    writer.enqueue(record(1));
    const result = await writer.stop(5_000);
    expect(result.remaining).toBe(1);
  });

  it("stop returns at the timeout when an insert hangs", async () => {
    const writer = createBatchWriter({
      insert: () => new Promise<number>(() => undefined),
      logger: silentLogger,
    });
    writer.start();
    writer.enqueue(record(1));
    const stopping = writer.stop(1_000);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(stopping).resolves.toEqual({ remaining: 1 });
  });

  it("does not schedule more flushes after stop", async () => {
    const { fake, writer } = setup();
    writer.start();
    await writer.stop();
    writer.enqueue(record(1));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fake.events.size).toBe(0);
  });
});
