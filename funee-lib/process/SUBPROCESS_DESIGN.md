# Subprocess API Design for funee

## Overview

This document specifies the design of funee's subprocess API for spawning and managing child processes. The design draws inspiration from Deno's `Deno.Command`, Bun's `Bun.spawn`, and Node's `child_process` while prioritizing a clean, promise-based, ergonomic API.

## Design Goals

1. **Simple cases should be simple** - Running a command and getting output should be one line
2. **Complex cases should be possible** - Streaming, piping, and process control must be supported
3. **Promise-first** - Async operations use promises, not callbacks
4. **Type-safe** - Full TypeScript types for all options and return values
5. **Consistent with funee patterns** - Match existing funee-lib conventions (JSON serialization over ops)

---

## API Design

### 1. Spawn API

Two patterns supported for flexibility:

```typescript
// Simple: command + args array
const result = await spawn("ls", ["-la"]);

// Full options object
const proc = spawn({
  cmd: ["ls", "-la"],
  cwd: "/home/user",
  env: { PATH: "/usr/bin" },
});
```

#### Function Signatures

```typescript
// Convenience form: immediately waits and returns output
function spawn(command: string, args?: string[]): Promise<CommandOutput>;

// Full form: returns process handle for streaming/control
function spawn(options: SpawnOptions): Process;
```

### 2. SpawnOptions Interface

```typescript
interface SpawnOptions {
  /** Command and arguments as array */
  cmd: string[];
  
  /** Working directory for the process */
  cwd?: string;
  
  /** Environment variables (replaces process env) */
  env?: Record<string, string>;
  
  /** Inherit environment and merge with env option */
  inheritEnv?: boolean;  // default: true
  
  /** How to handle stdin */
  stdin?: "piped" | "inherit" | "null";  // default: "null"
  
  /** How to handle stdout */
  stdout?: "piped" | "inherit" | "null";  // default: "piped"
  
  /** How to handle stderr */
  stderr?: "piped" | "inherit" | "null";  // default: "piped"
}
```

**Stdio Options Explained:**
- `"piped"` - Create a pipe; accessible via `Process.stdin`/`stdout`/`stderr`
- `"inherit"` - Connect to parent process's stdio
- `"null"` - Discard (`/dev/null` equivalent)

### 3. Process Object

Returned by `spawn(options)`. Represents a running subprocess.

```typescript
interface Process {
  /** Process ID */
  readonly pid: number;
  
  /** Writable stream for stdin (only if stdin: "piped") */
  readonly stdin: WritableStream<Uint8Array> | null;
  
  /** Readable stream for stdout (only if stdout: "piped") */
  readonly stdout: ReadableStream<Uint8Array> | null;
  
  /** Readable stream for stderr (only if stderr: "piped") */
  readonly stderr: ReadableStream<Uint8Array> | null;
  
  /** Promise that resolves with ProcessStatus when process exits */
  readonly status: Promise<ProcessStatus>;
  
  /** Send a signal to the process */
  kill(signal?: Signal): void;
  
  /** Wait for process and collect all output */
  output(): Promise<CommandOutput>;
  
  /** Write data to stdin and close it */
  writeInput(data: string | Uint8Array): Promise<void>;
}
```

### 4. ProcessStatus Interface

```typescript
interface ProcessStatus {
  /** True if process exited with code 0 */
  success: boolean;
  
  /** Exit code (null if terminated by signal) */
  code: number | null;
  
  /** Signal that terminated the process (null if normal exit) */
  signal: Signal | null;
}
```

### 5. CommandOutput Interface

```typescript
interface CommandOutput {
  /** Process exit status */
  status: ProcessStatus;
  
  /** Stdout as Uint8Array (empty if stdout not piped) */
  stdout: Uint8Array;
  
  /** Stderr as Uint8Array (empty if stderr not piped) */
  stderr: Uint8Array;
  
  /** Convenience: stdout decoded as UTF-8 string */
  stdoutText(): string;
  
  /** Convenience: stderr decoded as UTF-8 string */
  stderrText(): string;
}
```

### 6. Signal Type

```typescript
type Signal = 
  | "SIGTERM"  // default
  | "SIGKILL"
  | "SIGINT"
  | "SIGHUP"
  | "SIGQUIT"
  | number;    // raw signal number
```

---

## Usage Examples

### Simple Command Execution

```typescript
import { spawn } from "funee";

// Run and get output
const result = await spawn("echo", ["hello", "world"]);
console.log(result.stdoutText());  // "hello world\n"
console.log(result.status.code);   // 0
```

### Capture stdout/stderr

```typescript
const result = await spawn("ls", ["nonexistent"]);
if (!result.status.success) {
  console.error(result.stderrText());  // "ls: nonexistent: No such file..."
}
```

### Set Working Directory and Environment

```typescript
const proc = spawn({
  cmd: ["node", "script.js"],
  cwd: "/app",
  env: { NODE_ENV: "production" },
});

const output = await proc.output();
```

### Streaming Output

```typescript
const proc = spawn({
  cmd: ["tail", "-f", "/var/log/app.log"],
  stdout: "piped",
});

// Stream stdout
const reader = proc.stdout!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

### Write to stdin

```typescript
const proc = spawn({
  cmd: ["cat"],
  stdin: "piped",
  stdout: "piped",
});

// Write to stdin
await proc.writeInput("Hello from stdin!");

// Read output
const output = await proc.output();
console.log(output.stdoutText());  // "Hello from stdin!"
```

### Piping Processes (cat file | grep pattern)

```typescript
const cat = spawn({
  cmd: ["cat", "large-file.txt"],
  stdout: "piped",
});

const grep = spawn({
  cmd: ["grep", "ERROR"],
  stdin: "piped",
  stdout: "piped",
});

// Pipe cat's stdout to grep's stdin
cat.stdout!.pipeTo(grep.stdin!);

const result = await grep.output();
console.log(result.stdoutText());
```

### Kill a Process

```typescript
const proc = spawn({
  cmd: ["sleep", "60"],
});

// Kill after 1 second
setTimeout(() => proc.kill("SIGTERM"), 1000);

const status = await proc.status;
console.log(status.signal);  // "SIGTERM"
```

### Inherit Parent I/O (Interactive)

```typescript
const proc = spawn({
  cmd: ["vim", "file.txt"],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

await proc.status;  // Wait for editor to close
```

---

## Implementation Plan

### Rust Ops Required

| Op Name | Type | Description |
|---------|------|-------------|
| `op_processSpawn` | sync | Spawn a new process, return process ID and handles |
| `op_processWrite` | async | Write data to process stdin |
| `op_processRead` | async | Read data from process stdout/stderr |
| `op_processKill` | sync | Send signal to process |
| `op_processWait` | async | Wait for process to exit, return status |
| `op_processClose` | sync | Close a process handle (cleanup) |

### Op Signatures

```rust
// Spawn a new process
// Returns JSON: { pid: number, stdinId?: number, stdoutId?: number, stderrId?: number }
#[op2]
#[string]
fn op_processSpawn(
    #[string] cmd_json: &str,  // JSON array of command + args
    #[string] cwd: &str,       // Working directory (empty = current)
    #[string] env_json: &str,  // JSON object of env vars
    inherit_env: bool,
    #[string] stdin: &str,     // "piped" | "inherit" | "null"
    #[string] stdout: &str,
    #[string] stderr: &str,
) -> Result<String, JsErrorBox>;

// Write to stdin
#[op2]
async fn op_processWrite(
    process_id: u32,
    #[buffer] data: &[u8],
) -> Result<u32, JsErrorBox>;  // Returns bytes written

// Read from stdout/stderr
// stream: 1 = stdout, 2 = stderr
#[op2]
async fn op_processRead(
    process_id: u32,
    stream: u8,
    #[buffer] buffer: &mut [u8],
) -> Result<u32, JsErrorBox>;  // Returns bytes read (0 = EOF)

// Send signal to process
#[op2(fast)]
fn op_processKill(
    process_id: u32,
    #[string] signal: &str,
) -> Result<(), JsErrorBox>;

// Wait for process exit
// Returns JSON: { code: number | null, signal: string | null }
#[op2]
#[string]
async fn op_processWait(process_id: u32) -> Result<String, JsErrorBox>;

// Cleanup process handle
#[op2(fast)]
fn op_processClose(process_id: u32);
```

### Global State

```rust
use std::sync::{LazyLock, Mutex};
use std::collections::HashMap;
use std::process::{Child, ChildStdin, ChildStdout, ChildStderr};
use tokio::process::Child as AsyncChild;

struct ProcessHandle {
    child: AsyncChild,  // Use tokio for async
}

static PROCESSES: LazyLock<Mutex<HashMap<u32, ProcessHandle>>> = 
    LazyLock::new(|| Mutex::new(HashMap::new()));

static NEXT_PROCESS_ID: LazyLock<Mutex<u32>> = 
    LazyLock::new(|| Mutex::new(1));
```

### TypeScript Wrapper (funee-lib/process/index.ts)

```typescript
// Host function declarations
export declare function processSpawn(
  cmdJson: string,
  cwd: string,
  envJson: string,
  inheritEnv: boolean,
  stdin: string,
  stdout: string,
  stderr: string,
): string;

export declare function processWrite(processId: number, data: Uint8Array): Promise<number>;
export declare function processRead(processId: number, stream: number, buffer: Uint8Array): Promise<number>;
export declare function processKill(processId: number, signal: string): void;
export declare function processWait(processId: number): Promise<string>;
export declare function processClose(processId: number): void;
```

### Async I/O Stream Handling

For `stdout` and `stderr` as `ReadableStream`:

```typescript
class ProcessReadableStream extends ReadableStream<Uint8Array> {
  constructor(processId: number, streamType: 1 | 2) {
    super({
      async pull(controller) {
        const buffer = new Uint8Array(8192);
        const bytesRead = await processRead(processId, streamType, buffer);
        
        if (bytesRead === 0) {
          controller.close();
        } else {
          controller.enqueue(buffer.subarray(0, bytesRead));
        }
      },
    });
  }
}
```

For `stdin` as `WritableStream`:

```typescript
class ProcessWritableStream extends WritableStream<Uint8Array> {
  constructor(processId: number) {
    super({
      async write(chunk) {
        await processWrite(processId, chunk);
      },
      close() {
        processClose(processId);  // Close stdin
      },
    });
  }
}
```

### Integration with deno_core

1. Add ops to the extension in `main.rs`:
   ```rust
   deno_core::extension!(
       funee_ext,
       ops = [
           // ... existing ops ...
           op_processSpawn,
           op_processWrite,
           op_processRead,
           op_processKill,
           op_processWait,
           op_processClose,
       ],
       ...
   );
   ```

2. Use `tokio::process::Command` for async subprocess handling:
   ```rust
   use tokio::process::Command;
   
   let mut cmd = Command::new(&args[0]);
   cmd.args(&args[1..]);
   cmd.stdin(Stdio::piped());  // based on options
   cmd.stdout(Stdio::piped());
   cmd.stderr(Stdio::piped());
   
   let child = cmd.spawn()?;
   ```

---

## Test Cases

### Basic Execution
1. Spawn simple command, get exit code 0
2. Spawn command that fails, get non-zero exit code
3. Spawn nonexistent command, handle error

### Output Capture
4. Capture stdout from `echo` command
5. Capture stderr from failing command
6. Capture both stdout and stderr separately
7. Handle large output (> 64KB) without blocking

### Input
8. Write string to stdin via `writeInput()`
9. Write binary data to stdin
10. Pipe data through cat command
11. Streaming write to stdin

### Working Directory
12. Set cwd, verify command runs in that directory
13. Invalid cwd returns error

### Environment Variables
14. Set custom env vars, command sees them
15. `inheritEnv: false` - command doesn't see parent env
16. `inheritEnv: true` (default) - command sees merged env

### Signals
17. Kill process with SIGTERM
18. Kill process with SIGKILL
19. Kill already-exited process (no-op)
20. Process terminated by signal has correct `status.signal`

### Streaming
21. Stream stdout line by line from long-running process
22. Stream stderr while process runs
23. Concurrent read from stdout and stderr

### Process Piping
24. Pipe stdout of one process to stdin of another
25. Chain 3+ processes together

### Error Handling
26. Handle process spawn failure gracefully
27. Handle write to closed stdin
28. Handle read after process exit
29. Handle double-kill

### Edge Cases
30. Command with spaces in arguments
31. Command with special characters
32. Empty command array (error)
33. Very long argument list
34. Process with no output

---

## File Structure

```
funee-lib/process/
├── SUBPROCESS_DESIGN.md  # This file
├── index.ts              # Main exports: spawn, Process, etc.
├── types.ts              # TypeScript interfaces
└── streams.ts            # ReadableStream/WritableStream wrappers
```

---

## Future Considerations

### Not in v1 (but worth considering later)

1. **Shell mode** - Execute command through shell (like Node's `shell: true`)
2. **Timeout** - Auto-kill process after duration
3. **IPC** - Inter-process communication channel
4. **PTY** - Pseudo-terminal support for interactive processes
5. **Windows** - Platform-specific considerations (currently Unix-focused)
6. **Resource limits** - CPU/memory limits on subprocess
7. **Detached processes** - Process survives parent exit

---

## Decision Rationale

### Why not exactly like Deno's `Command`?

Deno uses a builder pattern (`new Deno.Command().spawn()`). funee prefers function-based APIs for consistency with other modules. The builder pattern is verbose for simple cases.

### Why not exactly like Bun's `spawn`?

Bun uses some Bun-specific types (`Bun.file()`, `FileSink`). funee uses standard Web Streams for consistency and portability.

### Why JSON serialization over raw buffers for spawn options?

Funee's existing ops (filesystem, HTTP) use JSON for structured data. This maintains consistency and simplifies the Rust side. The performance cost is negligible for spawn operations.

### Why async ops for read/write?

Process I/O is inherently async. Using `op2` async ops integrates naturally with tokio's async runtime and avoids blocking the JS event loop.
