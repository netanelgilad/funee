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

  describe('module resolution', () => {
    it('resolves relative imports', async () => {
      /**
       * Tests that funee correctly resolves and bundles
       * relative imports like `import { foo } from "./other.ts"`
       */
      // TODO: Create fixture with relative imports
      expect(true).toBe(true); // Placeholder
    });

    it('handles the funee host module', async () => {
      /**
       * Tests that `import { log } from "funee"` correctly
       * maps to host functions provided by the runtime
       */
      // This is covered by the basic execution test
      expect(true).toBe(true);
    });
  });

  describe('declaration graph', () => {
    it('only bundles referenced declarations', async () => {
      /**
       * Funee should only include declarations that are
       * actually referenced from the entry point, enabling
       * tree-shaking at the declaration level
       */
      // TODO: Create fixture and verify output
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('reports parse errors with location', async () => {
      /**
       * When TypeScript has syntax errors, funee should
       * report them with file, line, and column information
       */
      // TODO: Create fixture with syntax error
      expect(true).toBe(true);
    });

    it('reports missing import errors', async () => {
      /**
       * When an import cannot be resolved, funee should
       * give a clear error message
       */
      // TODO: Create fixture with bad import
      expect(true).toBe(true);
    });
  });
});
