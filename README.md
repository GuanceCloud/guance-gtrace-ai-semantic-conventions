# GTrace AI Semantic Conventions

本仓库定义 GTrace AI 链路与指标的语义规范，用于统一 Codex、Claude、Hermes、OpenClaw 等 Agent 插件的 trace attributes、resource tags、metrics tags 和迁移口径。

## 规范策略

本规范采用标准优先策略：

- OpenTelemetry GenAI semantic conventions 中已有的字段和指标，必须使用官方 `gen_ai.*`、`error.type`、`server.*` 等字段。
- GTrace 自身扩展必须显式标注为 GTrace extension，不把扩展字段伪装成 OpenTelemetry 标准字段。
- 旧短字段和旧指标只进入迁移文档，不作为新实现的首选字段。
- 高基数字段、长文本、prompt、message、tool arguments 和 tool result 默认只允许出现在 trace attributes，不进入默认 metric tags。

## 文档索引

- [Trace 语义规范](docs/trace-semantic-conventions.md)
- [Metric 语义规范](docs/metric-semantic-conventions.md)
- [字段迁移矩阵](docs/field-migration.md)
- [插件落地 Profile](docs/plugin-profiles.md)

## 机器可读源

- [attributes.yaml](registry/attributes.yaml): 字段 registry。
- [metrics.yaml](registry/metrics.yaml): 指标 registry。
- [attributes.schema.json](schemas/attributes.schema.json): trace 示例的最小结构约束。
- [metrics.schema.json](schemas/metrics.schema.json): metric 示例的最小结构约束。
- [examples](examples): 规范示例。

## 参考来源

- OpenTelemetry GenAI semantic conventions: https://github.com/open-telemetry/semantic-conventions-genai
- Codex 插件文档: https://github.com/GuanceCloud/codex-otel-plugin/tree/main/docs
- Claude 插件文档: https://github.com/GuanceCloud/claude-otel-plugin/tree/main/docs
- Hermes 插件文档: https://github.com/GuanceCloud/hermes-otel-plugin/tree/main/docs
- OpenClaw 插件文档: https://github.com/GuanceCloud/openclaw-otel-plugin/tree/main/docs

## 本地校验

```bash
npm test
```

当前校验覆盖：

- JSON 文件可解析。
- 示例不包含已废弃字段。
- metric 示例不使用已废弃 token type。
- 文档中的本地相对链接存在。

