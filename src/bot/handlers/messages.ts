import { Events, type Client } from "discord.js";
import type { Ingestion } from "../services/ingestion";

/**
 * `messageCreate`: hand the message to the ingestion service, which reads only
 * the allowed metadata fields (see services/message-events.ts). Nothing here
 * touches `content`, `embeds`, `attachments`, `mentions` or friends.
 */
export function registerMessageHandler(
  client: Client,
  ingestion: Ingestion,
): void {
  client.on(Events.MessageCreate, (message) => {
    ingestion.handle(message);
  });
}
