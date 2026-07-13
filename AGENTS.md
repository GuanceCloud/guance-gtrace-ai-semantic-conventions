# AGENTS.md

This file defines collaboration rules for the `gtrace-ai-semantic-conventions` project.

## Project Scope

This repository maintains AI Agent observability semantic-convention documents.

Current document set:

- `docs/zh/agent-semantic-conventions.md`
- `docs/zh/trace-semantic-conventions.md`
- `docs/zh/metric-semantic-conventions.md`
- `docs/en/agent-semantic-conventions.md`
- `docs/en/trace-semantic-conventions.md`
- `docs/en/metric-semantic-conventions.md`

## Document Responsibilities

- `agent-semantic-conventions.md`: agent-level identity, request boundary, and status semantics
- `trace-semantic-conventions.md`: trace structure, span relationships, and trace fields
- `metric-semantic-conventions.md`: metric definitions, tags, and aggregation semantics

## Editing Rules

- Keep naming and field semantics consistent across documents.
- Avoid binding public conventions to a single agent implementation.
- When adding a field, define its scope, meaning, and whether it belongs to default Trace or Metric output.
- Keep shared concepts in the agent document; keep Trace- and Metric-specific rules in their own documents.
