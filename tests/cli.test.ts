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
