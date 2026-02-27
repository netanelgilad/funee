import {
  log,
  scenario,
  runScenarios,
  Closure,
  assertThat,
  is,
  contains,
  spawn,
  greaterThan,
} from "funee";

const FUNEE = "./target/release/funee";

const scenarios = [
  // ==================== BASIC EXECUTION ====================

  scenario({
    description: "basic :: runs hello.ts",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, ["tests/fixtures/hello.ts"]);
        await assertThat(result.status.code, is(0));
        await assertThat(result.stdoutText(), contains("hello from funee"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "basic :: runs default export expressions",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, ["tests/fixtures/default-expr.ts"]);
        await assertThat(result.status.code, is(0));
        await assertThat(
          result.stdoutText(),
          contains("default export expression works")
        );
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "basic :: supports multiple host functions",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, ["tests/fixtures/multi-host.ts"]);
        await assertThat(result.status.code, is(0));
        await assertThat(result.stdoutText(), contains("log works"));
        await assertThat(result.stdoutText(), contains("[DEBUG] debug works"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "basic :: supports async functions",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, ["tests/fixtures/async.ts"]);
        await assertThat(result.status.code, is(0));
        await assertThat(result.stdoutText(), contains("async start"));
        await assertThat(result.stdoutText(), contains("async helper called"));
        await assertThat(result.stdoutText(), contains("async end"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // ==================== TREE SHAKING ====================

  scenario({
    description: "tree shaking :: only includes referenced declarations",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, ["tests/fixtures/treeshake/entry.ts"]);
        await assertThat(result.status.code, is(0));
        await assertThat(result.stdoutText(), contains("used function"));
        await assertThat(result.stdoutText(), contains("tree shaking works"));
        // Should NOT contain unused functions' output
        const stdout = result.stdoutText();
        await assertThat(
          stdout.includes("unused function - should NOT appear"),
          is(false)
        );
        await assertThat(
          stdout.includes("also unused - should NOT appear"),
          is(false)
        );
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "tree shaking :: emitted code does not contain unused declarations",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, [
          "--emit",
          "tests/fixtures/treeshake/entry.ts",
        ]);
        await assertThat(result.status.code, is(0));
        // The emitted JS should contain the used function
        await assertThat(result.stdoutText(), contains("used"));
        // But should NOT contain the unused functions
        // Note: declarations are renamed to declaration_N, so we check for the
        // string literals from the unused functions
        const stdout = result.stdoutText();
        await assertThat(
          stdout.includes("unused function - should NOT appear"),
          is(false)
        );
        await assertThat(
          stdout.includes("also unused - should NOT appear"),
          is(false)
        );
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // ==================== GLOBALS ====================

  scenario({
    description: "globals :: supports JavaScript built-in globals",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, ["tests/fixtures/globals.ts"]);
        await assertThat(result.status.code, is(0));
        await assertThat(result.stdoutText(), contains("Promise.resolve: 42"));
        await assertThat(result.stdoutText(), contains("Promise.all: a,b,c"));
        await assertThat(result.stdoutText(), contains("Array.map: 2,4,6"));
        await assertThat(result.stdoutText(), contains("Object.keys: a,b"));
        await assertThat(
          result.stdoutText(),
          contains('JSON.stringify: {"test":true}')
        );
        await assertThat(result.stdoutText(), contains("Math.max: 5"));
        await assertThat(result.stdoutText(), contains("globals test complete"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "globals :: tree-shakes but preserves global references in emitted code",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, ["--emit", "tests/fixtures/globals.ts"]);
        await assertThat(result.status.code, is(0));
        // Globals should be referenced directly, not as imports
        await assertThat(result.stdoutText(), contains("Promise"));
        await assertThat(result.stdoutText(), contains("Object"));
        await assertThat(result.stdoutText(), contains("JSON"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // ==================== ERROR HANDLING ====================

  scenario({
    description: "error handling :: reports missing import errors",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, [
          "tests/fixtures/errors/missing-import.ts",
        ]);
        // Should exit with non-zero code
        await assertThat(result.status.code, greaterThan(0));
        // Should mention what couldn't be found
        await assertThat(result.stderrText(), contains("doesNotExist"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "error handling :: reports parse errors",
    verify: {
      expression: async () => {
        const result = await spawn(FUNEE, [
          "tests/fixtures/errors/syntax-error.ts",
        ]);
        // Should exit with non-zero code
        await assertThat(result.status.code, greaterThan(0));
        // Should indicate a parse/syntax error occurred
        const stderr = result.stderrText().toLowerCase();
        const hasErrorInfo =
          stderr.includes("parse") ||
          stderr.includes("error") ||
          stderr.includes("expected");
        await assertThat(hasErrorInfo, is(true));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

export default async () => {
  await runScenarios(scenarios, { logger: log });
};
