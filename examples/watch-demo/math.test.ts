/**
 * 🧪 Watch Mode Demo - Closure-Level Dependency Tracking
 * 
 * Run with: funee examples/watch-demo/math.test.ts
 * 
 * The test scenarios use `add` and `multiply` from math.ts.
 * The closure references capture ONLY these declarations.
 * 
 * When watching:
 * - Edit `add` or `multiply` → tests re-run ✅
 * - Edit `subtract`, `divide`, `modulo` → NO re-run! ❌
 * 
 * This is because funee watches the CLOSURE GRAPH, not the file graph.
 */

import {
  scenario,
  runScenarios,
  runScenariosWatch,
  assertThat,
  is,
  log,
  Closure,
} from "funee";

import { add, multiply } from "./math.ts";

// Build closures with explicit references
// In real usage, the `closure` macro does this automatically
const mathTestDir = "/Users/netanelgilad/clawd/agents/riff/repos/funee/examples/watch-demo";

const addTestClosure: Closure<() => Promise<void>> = {
  expression: async () => {
    await assertThat(add(2, 3), is(5));
    await assertThat(add(0, 0), is(0));
    await assertThat(add(-1, 1), is(0));
  },
  // This tells the watcher: "I depend on `add` from math.ts"
  references: new Map([
    ["add", [`${mathTestDir}/math.ts`, "add"]]
  ]),
};

const multiplyTestClosure: Closure<() => Promise<void>> = {
  expression: async () => {
    await assertThat(multiply(2, 3), is(6));
    await assertThat(multiply(0, 5), is(0));
    await assertThat(multiply(-2, 3), is(-6));
  },
  references: new Map([
    ["multiply", [`${mathTestDir}/math.ts`, "multiply"]]
  ]),
};

const composedTestClosure: Closure<() => Promise<void>> = {
  expression: async () => {
    const result = multiply(add(2, 3), 4);
    await assertThat(result, is(20));
  },
  // This test depends on BOTH add and multiply
  references: new Map([
    ["add", [`${mathTestDir}/math.ts`, "add"]],
    ["multiply", [`${mathTestDir}/math.ts`, "multiply"]]
  ]),
};

const scenarios = [
  scenario({
    description: "add() works correctly",
    verify: addTestClosure,
  }),
  scenario({
    description: "multiply() works correctly",
    verify: multiplyTestClosure,
  }),
  scenario({
    description: "add and multiply compose",
    verify: composedTestClosure,
  }),
];

export default async () => {
  const watchMode = false;

  log("🧪 Funee Watch Mode Demo");
  log("========================");
  log("");
  log("📦 math.ts exports: add, multiply, subtract, divide, modulo");
  log("✅ Tests USE: add, multiply");
  log("❌ Tests IGNORE: subtract, divide, modulo");
  log("");

  if (watchMode) {
    log("👀 Watch mode - edit math.ts to see selective re-runs");
    log("");
    await runScenariosWatch(scenarios, { logger: log });
  } else {
    const results = await runScenarios(scenarios, { logger: log });
    
    log("");
    log("─".repeat(55));
    log("💡 HOW CLOSURE-LEVEL WATCHING WORKS:");
    log("");
    log("   Each scenario's closure has a `references` Map:");
    log("   - addTestClosure.references = { add → math.ts }");
    log("   - multiplyTestClosure.references = { multiply → math.ts }");
    log("");
    log("   The watcher collects all referenced files and watches them.");
    log("   When math.ts changes, only scenarios that reference it re-run.");
    log("");
    log("   In a smarter impl, we'd diff the AST to detect WHICH");
    log("   declaration changed, enabling even finer granularity.");
    log("─".repeat(55));
    
    return results;
  }
};
