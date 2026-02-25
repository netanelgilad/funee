# File Watcher Module Design

## Overview

This document describes the design of funee's file watching capability, which enables detecting filesystem changes through an async iterable API.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      JavaScript Layer                        │
│                                                              │
│  watchFile(path) → AsyncIterable<WatchEvent>                 │
│  watchDirectory(path, opts?) → AsyncIterable<WatchEvent>     │
│                                                              │
│  Uses: async generators + polling pattern                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Host function calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Rust Layer (deno_core)                 │
│                                                              │
│  op_watchStart(path, recursive) → watcherId                  │
│  op_watchPoll(watcherId) → events[] | null                   │
│  op_watchStop(watcherId)                                     │
│                                                              │
│  Uses: notify crate with RecommendedWatcher                  │
│  Storage: global HashMap<u32, WatcherState>                  │
└─────────────────────────────────────────────────────────────┘
```

## Rust Implementation

### Dependencies

Add to `Cargo.toml`:
```toml
notify = { version = "6.1", default-features = false, features = ["macos_fsevent"] }
```

### Host Operations

#### `op_watchStart(path: string, recursive: bool) → u32`
- Creates a new `notify::RecommendedWatcher`
- Registers the watcher in a global `HashMap<u32, WatcherState>`
- Starts watching the specified path
- Returns a unique watcher ID

#### `op_watchPoll(watcherId: u32) → string`
- Checks the event queue for the specified watcher
- Returns JSON array of pending events, or `"null"` if none
- Non-blocking operation

#### `op_watchStop(watcherId: u32)`
- Removes the watcher from the global map
- Dropping the watcher stops watching automatically

### WatcherState Structure

```rust
struct WatcherState {
    _watcher: RecommendedWatcher,  // Kept alive to maintain watch
    events: Arc<Mutex<Vec<WatchEvent>>>,
}

struct WatchEvent {
    kind: String,    // "create" | "modify" | "remove" | "rename" | "any"
    path: String,
}
```

### Event Bridging

The notify crate uses callbacks for events. We bridge to JS via:
1. Callback pushes events into `Arc<Mutex<Vec<WatchEvent>>>`
2. JS polls periodically via `op_watchPoll`
3. Each poll drains the event queue

## JavaScript API

### Types

```typescript
export type WatchEventKind = "create" | "modify" | "remove" | "rename" | "any";

export type WatchEvent = {
  kind: WatchEventKind;
  path: string;
};

export type WatchOptions = {
  recursive?: boolean;
};
```

### Functions

#### `watchFile(path: string) → AsyncIterable<WatchEvent>`

Factory function that returns an async iterable of file change events.

```typescript
export const watchFile = (path: string): AsyncIterable<WatchEvent> & { stop: () => void } => {
  const watcherId = watchStart(path, false);
  let stopped = false;
  
  const iterable = {
    async *[Symbol.asyncIterator]() {
      while (!stopped) {
        const events = watchPoll(watcherId);
        if (events) {
          for (const event of events) {
            yield event;
          }
        }
        // Small delay to avoid busy-waiting
        await new Promise(r => setTimeout(r, 50));
      }
    },
    stop: () => {
      stopped = true;
      watchStop(watcherId);
    }
  };
  
  return iterable;
};
```

#### `watchDirectory(path: string, options?: WatchOptions) → AsyncIterable<WatchEvent>`

Same as watchFile but with recursive option for directory watching.

### Usage Example

```typescript
import { watchFile } from "funee";

// Watch a single file
const watcher = watchFile("./config.json");

for await (const event of watcher) {
  log(`File ${event.kind}: ${event.path}`);
  if (someCondition) {
    watcher.stop();
  }
}
```

## Design Decisions

### Host Function Imports

funee-lib modules MUST import host functions from `"funee"`, not from `"../host.ts"` directly.

**Why?** The funee bundler handles `"funee"` as a special bare specifier that resolves to
funee-lib/index.ts. From there, host function identifiers are matched against the registered
host_functions map in the Rust runtime. Importing directly from host.ts doesn't work because
`declare function` statements are TypeScript-only and not handled by the bundler's AST parser.

```typescript
// ✅ Correct: import from "funee"
import { watchStart, watchPoll, watchStop } from "funee";

// ❌ Wrong: direct import from host.ts
import { watchStart } from "../host.ts";
```

### Why Polling Instead of Push?

deno_core's synchronous ops don't naturally support push-based async events.
Polling approach:
- Simple to implement and reason about
- Works within deno_core's execution model
- 50ms poll interval is responsive enough for most use cases

### Why notify Crate?

- Cross-platform (macOS FSEvents, Linux inotify, Windows)
- Well-maintained and widely used
- Uses native OS APIs for efficiency

### Factory Functions Over Classes

Following funee conventions:
- `watchFile()` returns an object with async iterator + stop method
- No `new WatchFile()` or class-based API
- Arrow functions for all exports

### Event Simplification

Notify's events are complex. We simplify to:
- `create` - file/directory created
- `modify` - content or metadata changed
- `remove` - deleted
- `rename` - renamed
- `any` - catch-all for unrecognized events

## Test Plan

1. **Basic file watching**: Create a file, detect creation
2. **File modification**: Write to file, detect modify event
3. **Stop watching**: Verify stop() cleans up properly
4. **Multiple watchers**: Run several watchers concurrently
5. **Directory watching**: Watch directory recursively

## Implementation Phases

### Phase 1: Rust ops (this PR)
- Add notify crate
- Implement op_watchStart, op_watchPoll, op_watchStop
- Basic event type mapping

### Phase 2: JavaScript wrapper (this PR)
- watchFile() with async iterator
- watchDirectory() with options
- stop() functionality

### Phase 3: Tests (this PR)
- Integration tests in cli.test.ts
- Create temp files and verify events
