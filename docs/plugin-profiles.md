# 插件落地 Profile

本页给出四个现有插件落地本规范时的差异化要求。

## Codex

当前 Codex 已接近标准字段，但仍需修正：

- `skill:*` span 不再使用 `gen_ai.operation.name=skill`，应改为 `execute_tool` 或只通过 `skill.*` 表达 skill 扩展语义。
- `skill.result_status`、`gen_ai.skill.result.status` 等变体统一迁移到 `skill.result.status`。
- `gen_ai.agent.operation.duration` 若继续保留毫秒单位，必须作为 GTrace extension；标准耗时使用 `gen_ai.client.operation.duration` 或 `gen_ai.execute_tool.duration`，单位为 `s`。
- `gen_ai.input.messages`、`gen_ai.output.messages`、`gen_ai.system_instructions` 和 `gen_ai.tool.definitions` 继续只作为 trace opt-in 内容字段。

## Claude

当前 Claude 已使用标准 metric name，落地要求：

- 继续使用 `gen_ai.workflow.duration`、`gen_ai.client.operation.duration`、`gen_ai.client.token.usage`。
- Skill 字段统一到 `skill.*`；`gen_ai.skill.*` 只作为实验兼容镜像。
- Cache token 只写 trace attributes，不生成 `cache_*` token metric。
- 保持 `gen_ai.usage.input_tokens` 包含 cache read 与 cache creation token。

## Hermes

Hermes 当前保留大量短字段和旧指标。新规范落地要求：

- 新看板和监控器优先查询 `gen_ai.*` 标准字段。
- `gen_ai.client.*` 只表示标准模型 client 调用，单位为 `s`。
- `gen_ai.agent.*`、`gen_ai.runtime.*` 保留为 GTrace extension，文档中必须标明单位和 tag。
- `usage_total_tokens` 不再作为新 trace 字段；需要总量时由 `gen_ai.usage.input_tokens + gen_ai.usage.output_tokens` 推导。
- `tool_result_status` 与 `outcome` 保持分离。
- `request_type=auto_review`、`review_category=skill` 等字段作为低基数 GTrace extension 保留。

## OpenClaw

OpenClaw 当前有 `gen_ai.skill1.*` 和 token type 总量兼容口径。新规范落地要求：

- 彻底迁移 `gen_ai.skill1.*` 到 `skill.*`。
- 标准 token metric 只使用 `gen_ai.token.type=input|output`。
- `gen_ai.client.*` 不再承载 OpenClaw 自定义 agent operation 统计。
- `gen_ai.agent.operation.*`、`gen_ai.runtime.*` 保留为 GTrace extension。
- `session_key`、`channel`、`queue_name`、`webhook_name` 等运行时字段只进入扩展指标或 trace attributes。

## 验收 Profile

每个插件至少提供：

- 一个成功 `invoke_agent -> chat -> execute_tool` trace fixture。
- 一个包含错误 `error.type` 的 trace fixture。
- 一个 `gen_ai.client.token.usage` metric fixture。
- 一个插件自身 GTrace extension metric fixture。

fixture 不能包含：

- `gen_ai.skill1.*`
- `gen_ai.operation.name=skill`
- `gen_ai.usage.total_tokens`
- 标准 token metric 上的 `gen_ai.token.type=total|cache_read|cache_total|reasoning`

