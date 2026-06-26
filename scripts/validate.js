const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const forbiddenText = [
  "gen_ai.skill1.",
  "\"gen_ai.operation.name\": \"skill\"",
  "gen_ai.usage.total_tokens",
  "\"gen_ai.token.type\": \"total\"",
  "\"gen_ai.token.type\": \"cache_read\"",
  "\"gen_ai.token.type\": \"cache_total\"",
  "\"gen_ai.token.type\": \"cache_creation\"",
  "\"gen_ai.token.type\": \"reasoning\""
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateJsonFiles() {
  const jsonFiles = walk(root).filter((file) => file.endsWith(".json"));
  for (const file of jsonFiles) {
    readJson(file);
  }
}

function validateExamples() {
  const exampleFiles = walk(path.join(root, "examples")).filter((file) => file.endsWith(".json"));
  for (const file of exampleFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const forbidden of forbiddenText) {
      assert(!text.includes(forbidden), `${path.relative(root, file)} contains forbidden token: ${forbidden}`);
    }
    const parsed = JSON.parse(text);
    if (parsed.spans) {
      for (const span of parsed.spans) {
        assert(span.attributes && span.attributes["gen_ai.operation.name"], `${span.name} misses gen_ai.operation.name`);
      }
    }
    if (parsed.metrics) {
      for (const metric of parsed.metrics) {
        assert(metric.name && metric.type && metric.unit && metric.attributes, `invalid metric shape in ${file}`);
        if (metric.name === "gen_ai.client.token.usage") {
          assert(["input", "output"].includes(metric.attributes["gen_ai.token.type"]), `${metric.name} has invalid token type`);
        }
        if (metric.name.startsWith("gen_ai.client.") || metric.name === "gen_ai.workflow.duration" || metric.name === "gen_ai.invoke_agent.duration" || metric.name === "gen_ai.execute_tool.duration") {
          if (metric.name.includes("duration") || metric.name.includes("time_")) {
            assert(metric.unit === "s", `${metric.name} must use seconds`);
          }
        }
      }
    }
  }
}

function validateMarkdownLinks() {
  const markdownFiles = walk(root).filter((file) => file.endsWith(".md"));
  const localLink = /\[[^\]]+\]\((?!https?:\/\/)([^)#]+)(?:#[^)]+)?\)/g;
  for (const file of markdownFiles) {
    const text = fs.readFileSync(file, "utf8");
    let match;
    while ((match = localLink.exec(text))) {
      const target = match[1];
      if (target.startsWith("mailto:")) continue;
      const resolved = path.resolve(path.dirname(file), target);
      assert(fs.existsSync(resolved), `${path.relative(root, file)} links to missing file ${target}`);
    }
  }
}

validateJsonFiles();
validateExamples();
validateMarkdownLinks();
console.log("validation passed");

