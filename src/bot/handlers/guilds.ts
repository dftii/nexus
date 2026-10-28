import { Events, Status, type Client } from "discord.js";
import type {
  GuildDirectory,
  GuildPresence,
  InstallationService,
} from "../services/installation";

/** Adapter: expose the discord.js guild cache as a plain `GuildDirectory`. */
export function createGuildDirectory(client: Client): GuildDirectory {
  return {
    presence(guildId): GuildPresence {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return "absent";
      return guild.available === false ? "unavailable" : "present";
    },
    guildIds: () => [...client.guilds.cache.keys()],
    isGatewayReady: () => client.ws.status === Status.Ready,
  };
}

/** `guildCreate` / `guildDelete`: map to ids and delegate to the service. */
export function registerGuildHandlers(
  client: Client,
  installation: InstallationService,
): void {
  client.on(Events.GuildCreate, (guild) => {
    void installation.onGuildAvailable(guild.id);
  });
  client.on(Events.GuildDelete, (guild) => {
    // `available === false` means a Discord outage, not a removal.
    void installation.onGuildRemoved(guild.id, guild.available === false);
  });
}
