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
      // TODO: Create a fixture that uses the aliased export
      expect(true).toBe(true);
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

  describe('error handling', () => {
    it('reports missing import errors', async () => {
      /**
       * When an import cannot be resolved, funee should
       * give a clear error message
       */
      // TODO: Create fixture with bad import
      expect(true).toBe(true);
    });

    it('reports parse errors with location', async () => {
      /**
       * When TypeScript has syntax errors, funee should
       * report them with file, line, and column information
       */
      // TODO: Create fixture with syntax error
      expect(true).toBe(true);
    });
  });
});
