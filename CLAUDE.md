# Reglas del proyecto

## Idioma

Responder SIEMPRE en español, incluidos resúmenes, preguntas e informes finales, aunque el código, los documentos o los informes de los subagentes estén en inglés. El código, los commits y la documentación del repo siguen en inglés.

## Forma de trabajar

- Todo va directo a `main`: sin ramas de feature ni pull requests. Antes de cada commit y cada push, pedir permiso (no hay autorización permanente).
- Nunca subir `.env` ni secretos. Comprobar el formato de las variables sin imprimir sus valores.
- El usuario no pega credenciales en el chat: las pone él en `.env`.
- Nunca resetear la base de datos ni editar migraciones ya aplicadas; las migraciones nuevas son aditivas (se generan con `prisma migrate diff` y una BD shadow temporal, sin `migrate dev`).
- El bot lo arranca el usuario (`npm run bot:start`), nunca un agente.
- Al terminar una fase: verificar en vivo cuando se pueda, documentar en `docs/PROGRESS.md` qué está verificado, simulado o pendiente, y preparar un informe en español para ChatGPT si el usuario lo pide.

## Estado del proyecto (actualizar al terminar cada fase)

NEXUS: SaaS de gestión y analíticas de comunidades de Discord. El usuario envía cada fase como un prompt escrito con ChatGPT.

- **Fase 1** (base, diseño, dashboard demo en `/demo`): hecha.
- **Fase 2** (login con Discord vía Auth.js v5, onboarding de comunidades): hecha y probada con Discord real. Ojo: el proveedor de Discord necesita `issuer: "https://discord.com"` en `src/server/auth/config.ts` o el callback falla (RFC 9207).
- **Fase 3** (bot en `src/bot/`, tabla `message_events`, heartbeat, invitación, dashboard con datos reales): hecha y probada en vivo.
- **Siguiente:** Fase 4, analíticas a partir de los eventos reales.

Detalle técnico y decisiones: `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` (ADR-001 a ADR-031), `docs/PROGRESS.md`, `src/bot/README.md`.

Discord:
- Aplicación `NEXUS (dev)` en el Developer Portal, con redirect `http://localhost:3000/api/auth/callback/discord`.
- El bot se prueba **solo en el servidor CAPTURAS**, que es el único ID en `DISCORD_GUILD_ALLOWLIST`.
- **No** usar el servidor "Gestión de Protocolos Nacionales": es el de los amigos del usuario y ya tiene su otro bot, dfti.security (XP y moderación tipo MEE6). Conectarlo solo cuando el bot sea estable, avisando a los amigos y repartiendo funciones con dfti.security.

## Puesta en marcha en otro ordenador

1. `git pull`, después `npm install`, y una sola vez `py -m pip install --user graphifyy`.
2. Copiar el `.env` a mano, nunca por git. Lleva `DATABASE_URL`, `POSTGRES_*` (en este equipo `POSTGRES_PORT=5433` porque el 5432 estaba ocupado), `AUTH_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `DISCORD_BOT_TOKEN` y `DISCORD_GUILD_ALLOWLIST`.
3. Arrancar Docker Desktop y ejecutar `npm run db:up` y `npm run db:deploy`. La base de datos de ese ordenador empieza vacía: hay que volver a iniciar sesión y conectar CAPTURAS desde `/onboarding`. Los mensajes guardados en el otro equipo no se trasladan.
4. Arrancar la web con `npm run dev` (http://localhost:3000) y el bot, en otra terminal, con `npm run bot:start`.

## Modelos y subagentes

**Si la tarea se envía con Opus**, se reparte así:
- **Opus 5.5, esfuerzo medio** (la sesión principal): planifica toda la tarea, toma las decisiones de diseño y revisa el resultado.
- **Sonnet 5.5, esfuerzo alto**: ejecuta las tareas que requieren inteligencia (lógica, bugs, refactors, features).
- **Haiku 5.5, esfuerzo alto**: tareas simples.
- **Haiku 5.5, esfuerzo bajo**: tareas mecánicas: renombrar, mover archivos y similares.

Al lanzar subagentes (incluidos los workers de `/savvy-flow`, que por defecto usan Opus o Fable), pasar siempre `model` y `effort` explícitos según esta tabla: `sonnet` + `high`, `haiku` + `high` o `haiku` + `low`.

**Si la tarea se envía con otro modelo**, se responde con ese mismo modelo y sin subagentes, a no ser que el prompt los pida. Si la tarea debería usar subagentes y el prompt no lo dice, sugerirlo y esperar confirmación antes de continuar.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
