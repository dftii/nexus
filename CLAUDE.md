# Reglas del proyecto

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
