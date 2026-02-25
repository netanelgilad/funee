# funee

A TypeScript bundler with compile-time macros, HTTP imports, and aggressive tree-shaking.

## What is funee?

funee is a Rust-based bundler designed for functional TypeScript. It executes your code's default export and provides:

- **Compile-time macros** - Transform code at bundle time, not runtime
- **HTTP imports** - Import directly from URLs (like Deno)
- **Aggressive tree-shaking** - Only include what's actually used
- **Functional architecture** - No classes, just functions

## Installation

```bash
# Build from source
cargo build --release

# Binary at target/release/funee
```

## Usage

```bash
# Run a TypeScript file (executes default export)
funee main.ts

# Emit bundled JavaScript without executing
funee --emit main.ts

# Bypass HTTP cache and fetch fresh
funee --reload main.ts
```

## CLI Flags

| Flag | Description |
|------|-------------|
| `--emit` | Print bundled JavaScript instead of executing |
| `--reload` | Bypass HTTP cache and fetch fresh from network |

## Features

### Macros

Define compile-time transformations with `createMacro()`:

```typescript
import { createMacro, Closure, CanonicalName } from "funee";

// A macro that runs at compile time
const addOne = createMacro((closure: Closure<number>) => {
  // This runs during bundling, not at runtime!
  return closure.expression + 1;
});

export default () => {
  const x = 5;
  return addOne(x); // Expanded at compile time to: 6
};
```

Macros can:
- Access the AST of their arguments
- Capture references from the calling scope
- Return new code to be inserted
- Call other macros (with recursion limits)

### HTTP Imports

Import modules directly from URLs:

```typescript
import { add } from "https://esm.sh/lodash-es@4.17.21/add";

export default () => add(1, 2);
```

Features:
- **Automatic caching** at `~/.funee/cache/`
- **Stale cache fallback** on network failures
- **Redirect handling** (302, chains)
- **Relative imports** from HTTP modules work correctly
- **Tree-shaking** removes unused HTTP exports

### Tree-Shaking

funee only includes declarations that are actually referenced:

```typescript
// utils.ts
export const used = () => "I'm included";
export const unused = () => "I'm removed";

// main.ts
import { used } from "./utils.ts";
export default () => used();
// Result: only `used` appears in output
```

### Funee Standard Library

Import utilities from `"funee"`:

```typescript
import { 
  Closure,       // Closure type for macros
  CanonicalName, // Represents a qualified name
  createMacro,   // Marker for macro definitions
  log            // Debug logging
} from "funee";
```

## Examples

### Simple Function

```typescript
// hello.ts
import { log } from "funee";

export default () => {
  log("Hello, funee!");
  return 42;
};
```

```bash
$ funee hello.ts
Hello, funee!
42
```

### HTTP Imports with Tree-Shaking

```typescript
// main.ts
import { add } from "https://esm.sh/lodash-es@4.17.21";

export default () => add(2, 3);
```

```bash
$ funee --emit main.ts
# Only the `add` function is included, not all of lodash
```

### Compile-Time Computation

```typescript
import { createMacro, Closure } from "funee";

const compileTimeSquare = createMacro((closure: Closure<number>) => {
  return closure.expression * closure.expression;
});

export default () => compileTimeSquare(5);
// Bundles to: export default () => 25;
```

## Architecture

funee is built in Rust using:
- **SWC** for TypeScript parsing and code generation
- **deno_core** for macro execution
- **reqwest** for HTTP fetching
- **petgraph** for dependency graph analysis

The functional-only constraint (no classes) enables aggressive optimizations and simpler macro semantics.

## Development

```bash
# Run tests
cd tests && npm test

# Run Rust unit tests
cargo test

# Build release
cargo build --release
```

## Current Status

- ✅ 58 E2E tests passing
- ✅ 22 Rust unit tests passing
- ✅ Macro system complete
- ✅ HTTP imports complete
- 🚧 Import maps (planned)

## License

MIT
