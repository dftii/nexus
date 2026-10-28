# Discord bot (planned - not implemented)

Phase 3 adds the NEXUS Discord bot here as a **separate long-running process**
(entrypoint `src/bot/index.ts`, run with `tsx`), in the same package as the web
app. It will reuse `src/server/db` and `src/lib` but must never be imported by
anything under `src/app`. See `docs/ARCHITECTURE.md`.
