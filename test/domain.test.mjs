import test from "node:test";
import assert from "node:assert/strict";
import { config, example, analyze } from "../src/domain.mjs";
import { validateState } from "../src/lib.mjs";
test("Documented sample results match independently specified expectations", () => {
  const report = analyze(example.records, example.settings, config.asOf);
  for (const [label, value] of [
    ["Products to reorder", 1],
    ["Suggested purchase cost", "650.00"],
    ["No-demand products", 1],
  ])
    assert.equal(
      report.metrics.find((m) => m.label === label).value,
      value,
      label,
    );
});
test("Business edge cases", () => {
  (function edge(records, s, analyze) {
    assert.equal(analyze([records[0]], s).rows[0]["Suggested units"], 325);
    assert.equal(
      analyze([{ ...records[0], onOrder: 500 }], s).metrics[0].value,
      0,
    );
  })(example.records, example.settings, analyze, validateState);
});
