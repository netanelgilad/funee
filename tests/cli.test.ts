import { describe, it, expect, beforeAll } from 'vitest';
import { execSync, spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNEE_BIN = resolve(__dirname, '../target/release/funee');
const FIXTURES = resolve(__dirname, 'fixtures');

// Helper to run funee CLI
async function runFunee(args: string[], options: { cwd?: string } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve) => {
    const proc = spawn(FUNEE_BIN, args, {
      cwd: options.cwd || FIXTURES,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}

// Helper to run funee with --emit flag to get bundled output
async function runFuneeEmit(args: string[], options: { cwd?: string } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return runFunee(['--emit', ...args], options);
}

describe('funee CLI', () => {
  beforeAll(() => {
    // Build funee in release mode before tests
    try {
      execSync('cargo build --release', { 
        cwd: resolve(__dirname, '..'),
        stdio: 'inherit' 
      });
    } catch (e) {
      console.error('Failed to build funee:', e);
      throw e;
    }
  });

  describe('basic execution', () => {
    it('runs a simple function that calls log', async () => {
      /**
       * This test verifies that funee can:
       * 1. Parse a TypeScript file
       * 2. Resolve imports from "funee" 
       * 3. Execute the default export function
       * 4. Call the host `log` function
       */
      const { stdout, exitCode } = await runFunee(['hello.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('hello from funee');
    });

    it('runs default export expressions', async () => {
      /**
       * Tests: export default () => { ... }
       * (as opposed to export default function() { ... })
       */
      const { stdout, exitCode } = await runFunee(['default-expr.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('default export expression works');
    });

    it('supports multiple host functions', async () => {
      /**
       * Tests that multiple imports from "funee" work:
       * import { log, debug } from "funee"
       */
      const { stdout, exitCode } = await runFunee(['multi-host.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('log works');
      expect(stdout).toContain('[DEBUG] debug works');
    });

    it('supports async functions', async () => {
      /**
       * Tests that async/await works correctly
       * Note: Using globals like Promise directly doesn't work yet
       */
      const { stdout, exitCode } = await runFunee(['async.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('async start');
      expect(stdout).toContain('async helper called');
      expect(stdout).toContain('async end');
    });
  });

  describe('re-exports', () => {
    it('resolves re-exports through barrel files', async () => {
      /**
       * Tests that funee correctly resolves re-exports:
       * entry.ts -> barrel.ts (export { helper } from "./impl.ts") -> impl.ts
       * 
       * This is the FuneeIdentifier chain resolution in source_graph.rs
       */
      const { stdout, stderr, exitCode } = await runFunee(['reexports/entry.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('helper called');
      expect(stdout).toContain('reexports work');
    });

    it('resolves aliased re-exports', async () => {
      /**
       * Tests: export { helper as aliased } from "./impl.ts"
       * The original name should be used when loading the declaration
       */
      const { stdout, stderr, exitCode } = await runFunee(['reexports/aliased-entry.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('helper called');
      expect(stdout).toContain('aliased re-export works');
    });
  });

  describe('import chains', () => {
    it('resolves deep import chains (A -> B -> C)', async () => {
      /**
       * Tests that the declaration graph correctly walks through
       * multiple levels of imports:
       * entry.ts -> a.ts -> b.ts -> c.ts
       * 
       * All functions should be available and called in order
       */
      const { stdout, stderr, exitCode } = await runFunee(['chain/entry.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('level one');
      expect(stdout).toContain('level two');
      expect(stdout).toContain('level three - deepest');
      expect(stdout).toContain('chain works');
    });
  });

  describe('import aliasing', () => {
    it('supports import { foo as bar } aliasing', async () => {
      /**
       * Tests that import aliasing works correctly:
       * import { originalName as aliased } from "./utils.ts"
       * 
       * The alias should be used locally, but the original export is resolved
       */
      const { stdout, stderr, exitCode } = await runFunee(['import-alias/entry.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('testing import aliases');
      expect(stdout).toContain('original function called');
      expect(stdout).toContain('another function called');
      expect(stdout).toContain('import alias test complete');
    });
  });

  describe('private helpers', () => {
    it('includes non-exported functions used by exported ones', async () => {
      /**
       * Tests that private helper functions (not exported) are included
       * when they're used by exported functions
       */
      const { stdout, exitCode } = await runFunee(['private/entry.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('private helper called');
      expect(stdout).toContain('public function called');
    });

    it('tree-shakes unused private functions', async () => {
      /**
       * Private functions that aren't used should be excluded
       */
      const { stdout, exitCode } = await runFuneeEmit(['private/entry.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('private helper called');
      expect(stdout).not.toContain('unused private');
    });
  });

  describe('tree shaking', () => {
    it('only includes referenced declarations', async () => {
      /**
       * Core value proposition of declaration-level bundling:
       * utils.ts exports 3 functions, but only `used` is imported
       * 
       * The bundled output should NOT contain `unused` or `alsoUnused`
       */
      const { stdout, stderr, exitCode } = await runFunee(['treeshake/entry.ts']);
      
      // Should run successfully
      expect(exitCode).toBe(0);
      expect(stdout).toContain('used function');
      expect(stdout).toContain('tree shaking works');
      
      // Should NOT contain unused functions' output
      expect(stdout).not.toContain('unused function - should NOT appear');
      expect(stdout).not.toContain('also unused - should NOT appear');
    });

    it('emitted code does not contain unused declarations', async () => {
      /**
       * Verify at the code level that unused functions are tree-shaken
       * by checking the --emit output doesn't contain them
       */
      const { stdout, exitCode } = await runFuneeEmit(['treeshake/entry.ts']);
      
      expect(exitCode).toBe(0);
      
      // The emitted JS should contain the used function
      expect(stdout).toContain('used');
      
      // But should NOT contain the unused functions
      expect(stdout).not.toContain('unused');
      expect(stdout).not.toContain('alsoUnused');
    });
  });

  describe('variable declarations / arrow functions', () => {
    it('supports exported const arrow functions', async () => {
      /**
       * Tests that funee handles:
       * export const add = (a: number, b: number) => a + b;
       * 
       * This is a common pattern that requires VarDecl support
       */
      const { stdout, stderr, exitCode } = await runFunee(['arrow/entry.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('2 + 3 = 5');
      expect(stdout).toContain('4 * 5 = 20');
    });

    it('tree-shakes unused arrow functions', async () => {
      /**
       * math.ts exports add, multiply, subtract but only add/multiply are used
       * subtract should not appear in the bundle
       * 
       * Note: Declaration names are renamed to declaration_N in the output,
       * so we check for the function body patterns instead
       */
      const { stdout, exitCode } = await runFuneeEmit(['arrow/entry.ts']);
      
      expect(exitCode).toBe(0);
      // add: (a, b) => a + b - simple expression arrow
      expect(stdout).toContain('a + b');
      // multiply: (a, b) => { return a * b } - block arrow  
      expect(stdout).toContain('a * b');
      // subtract: (a, b) => a - b - should NOT be in output
      expect(stdout).not.toContain('a - b');
    });
  });

  describe('globals', () => {
    it('supports JavaScript built-in globals', async () => {
      /**
       * Tests that JavaScript globals (Promise, Object, Array, JSON, Math)
       * are available and not mistakenly treated as imports to resolve.
       */
      const { stdout, stderr, exitCode } = await runFunee(['globals.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Promise.resolve: 42');
      expect(stdout).toContain('Promise.all: a,b,c');
      expect(stdout).toContain('Array.map: 2,4,6');
      expect(stdout).toContain('Object.keys: a,b');
      expect(stdout).toContain('JSON.stringify: {"test":true}');
      expect(stdout).toContain('Math.max: 5');
      expect(stdout).toContain('globals test complete');
    });

    it('tree-shakes but preserves global references in emitted code', async () => {
      /**
       * Verify that global references remain in emitted code
       * and aren't removed by tree-shaking
       */
      const { stdout, exitCode } = await runFuneeEmit(['globals.ts']);
      
      expect(exitCode).toBe(0);
      // Globals should be referenced directly, not as imports
      expect(stdout).toContain('Promise');
      expect(stdout).toContain('Object');
      expect(stdout).toContain('JSON');
    });
  });

  describe('macros', () => {
    // ===== STEP 2: MACRO ARGUMENT CAPTURE TESTS =====
    
    it('detects macro calls and captures arguments (Step 2)', async () => {
      /**
       * Step 2 Test: Macro Argument Capture
       * 
       * When closure(add) is encountered:
       * 1. Bundler detects 'closure' is a macro (via createMacro)
       * 2. Argument 'add' is captured as Closure (not bundled normally)
       * 3. Closure contains expression AST + references
       * 
       * For Step 2, we test using --emit to verify the captured argument
       * appears in the bundled output (even though macro isn't executed yet).
       */
      const { stdout, stderr, exitCode } = await runFuneeEmit(['macro/step2_argument_capture.ts']);
      
      // Should bundle successfully
      expect(exitCode).toBe(0);
      
      // The emitted code should show that:
      // 1. The 'add' function is included (it's referenced by the Closure)
      // Note: Declarations are renamed to declaration_N in the output
      expect(stdout).toMatch(/declaration_\d+\s*=\s*\(a,\s*b\)\s*=>\s*a\s*\+\s*b/);  // var declaration_N = (a, b) => a + b
      
      // 2. The createMacro call should be included (macro not executed yet in Step 2)
      // The macro reference 'closure' should be in the bundle
      expect(stdout).toMatch(/declaration_\d+\s*=\s*\w+/);  // var declaration_N = closure_arg0
      
      // 3. Should not crash or error during capture
      expect(stderr).toBe('');
    });

    it('captures arguments with external references', async () => {
      /**
       * Tests that when capturing an expression with external references,
       * the Closure includes them in its references map.
       * 
       * Example:
       * const multiplier = 2;
       * const mult = (x) => x * multiplier;
       * const multClosure = closure(mult);
       * 
       * The Closure should capture both the mult expression AND the multiplier reference.
       */
      // TODO: Create fixture and implement this test
      expect(true).toBe(true);  // Placeholder
    });

    it('expands closure macro at bundle time', async () => {
      /**
       * The closure() macro should:
       * 1. Detect that `closure` is created via createMacro()
       * 2. When closure(add) is called, capture `add`'s AST instead of evaluating
       * 3. Run the macro function at bundle time
       * 4. Emit code that constructs the Closure at runtime
       * 
       * This is the core macro system behavior.
       */
      const { stdout, stderr, exitCode } = await runFunee(['macro/entry.ts']);
      
      expect(exitCode).toBe(0);
      // The closure should have captured the arrow function's AST
      expect(stdout).toContain('AST type: ArrowFunctionExpression');
      expect(stdout).toContain('Has references: true');
    });

    it('macro can access references from captured expression', async () => {
      /**
       * When capturing an expression that references external declarations,
       * the Closure should include those in its references map
       */
      // TODO: Test with expression that has external refs
      expect(true).toBe(true);
    });

    // ===== STEP 3: MACRO EXECUTION TESTS =====
    
    it('expands simple addOne macro at compile time', async () => {
      /**
       * Step 3: Execute macros during bundling using deno_core
       * 
       * The addOne macro should:
       * 1. Be detected as a macro (createMacro call)
       * 2. When addOne(5) is found, execute the macro function
       * 3. Replace the call with the result: (5) + 1
       * 4. Final output should be 6 (evaluated at runtime)
       */
      const { stdout, stderr, exitCode } = await runFunee(['macro/simple_macro.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('6');  // (5) + 1 = 6
    });

    it('expands macro that adds references', async () => {
      /**
       * Test that macros can add new references to the closure
       * 
       * The withAdd macro should:
       * 1. Take an expression (10)
       * 2. Add 'add' to its references
       * 3. Return expression that calls add(10, 5)
       * 4. Funee should include 'add' function in the bundle
       */
      const { stdout, exitCode } = await runFunee(['macro/macro_with_refs.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('15');  // add(10, 5) = 15
    });

    it('handles recursive macro calls (macro calling macro)', async () => {
      /**
       * Test iterative macro expansion
       * 
       * addTwo macro calls double(addOne(x)):
       * - Iteration 1: addTwo(5) expands to double(addOne(5))
       * - Iteration 2: addOne(5) expands to (5) + 1
       * - Iteration 3: double((5) + 1) expands to ((5) + 1) * 2
       * - Final result: 12
       */
      const { stdout, exitCode } = await runFunee(['macro/recursive_macro.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('12');  // ((5) + 1) * 2 = 12
    });

    it('prevents infinite macro recursion', async () => {
      /**
       * Test that infinite macro loops are caught
       * 
       * A macro that calls itself should trigger max_iterations
       * and exit with a clear error message
       */
      const { stderr, exitCode } = await runFunee(['macro/infinite_macro.ts']);
      
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Macro expansion exceeded max iterations');
    });

    it('emitted code does not contain macro definitions', async () => {
      /**
       * Macros run at compile time and should be removed from final bundle
       * 
       * The --emit output should:
       * - Contain the expanded result: (5) + 1
       * - NOT contain createMacro or addOne function
       */
      const { stdout, exitCode } = await runFuneeEmit(['macro/simple_macro.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('5) + 1');  // Expanded expression
      expect(stdout).not.toContain('createMacro');  // Macro removed
      expect(stdout).not.toContain('addOne');  // Macro function removed
    });
  });

  describe('funee standard library', () => {
    it('imports Closure type from "funee"', async () => {
      /**
       * Tests that importing types from "funee" works:
       * import { Closure } from "funee"
       * 
       * The bundler should recognize "funee" as the standard library
       * and provide the Closure type
       */
      const { stdout, stderr, exitCode } = await runFunee(['funee-lib/import-types.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Closure type imported');
    });

    it('uses Closure constructor at runtime', async () => {
      /**
       * Tests that the Closure runtime constructor works:
       * import { Closure } from "funee"
       * const c = Closure({ expression: ..., references: {} })
       * 
       * Should construct a proper Closure object
       */
      const { stdout, stderr, exitCode } = await runFunee(['funee-lib/closure-constructor.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('expression: test-ast-node');
      expect(stdout).toContain('references size: 0');
    });

    it('imports log from "funee"', async () => {
      /**
       * Tests that host functions can be imported from "funee":
       * import { log } from "funee"
       * 
       * This should work the same as before (backward compatibility)
       */
      const { stdout, exitCode } = await runFunee(['funee-lib/import-log.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('log from funee works');
    });

    it('imports multiple exports from "funee"', async () => {
      /**
       * Tests importing multiple things from "funee":
       * import { Closure, CanonicalName, log } from "funee"
       * 
       * Should resolve all exports correctly
       */
      const { stdout, exitCode } = await runFunee(['funee-lib/multiple-imports.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Closure imported');
      expect(stdout).toContain('CanonicalName imported');
      expect(stdout).toContain('log imported');
    });

    it('Closure constructor accepts plain object references', async () => {
      /**
       * Tests that Closure() converts plain objects to Maps:
       * Closure({ expression: x, references: { foo: {...} } })
       * 
       * Should internally convert references object to Map
       */
      const { stdout, exitCode } = await runFunee(['funee-lib/closure-plain-refs.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('references is Map: true');
      expect(stdout).toContain('reference count: 2');
    });

    it('Closure constructor accepts Map references', async () => {
      /**
       * Tests that Closure() accepts Map references directly:
       * Closure({ expression: x, references: new Map([...]) })
       */
      const { stdout, exitCode } = await runFunee(['funee-lib/closure-map-refs.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('references is Map: true');
      expect(stdout).toContain('reference count: 1');
    });

    it('imports createMacro from "funee"', async () => {
      /**
       * Tests that createMacro can be imported:
       * import { createMacro } from "funee"
       * 
       * The function itself should be available (even though it throws at runtime)
       */
      const { stdout, exitCode } = await runFunee(['funee-lib/import-create-macro.ts']);
      
      expect(exitCode).toBe(0);
      expect(stdout).toContain('createMacro is function: true');
    });

    it('createMacro throws at runtime if not expanded', async () => {
      /**
       * Tests safety check: if createMacro is somehow called at runtime
       * (bundler didn't expand the macro), it should throw with clear message
       */
      const { stderr, exitCode } = await runFunee(['funee-lib/createMacro-throws.ts']);
      
      // Should fail because createMacro is called at runtime
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('createMacro was not expanded');
    });
  });

  describe('error handling', () => {
    it('reports missing import errors', async () => {
      /**
       * When an import cannot be resolved, funee should
       * exit with non-zero and report the missing declaration
       */
      const { stdout, stderr, exitCode } = await runFunee(['errors/missing-import.ts']);
      
      expect(exitCode).not.toBe(0);
      // Should mention what couldn't be found
      expect(stderr).toContain('doesNotExist');
    });

    it('reports parse errors', async () => {
      /**
       * When TypeScript has syntax errors, funee should
       * exit with non-zero and report the error
       */
      const { stdout, stderr, exitCode } = await runFunee(['errors/syntax-error.ts']);
      
      expect(exitCode).not.toBe(0);
      // Should indicate a parse/syntax error occurred
      expect(stderr).toMatch(/parse|error|expected/i);
    });
  });
});
