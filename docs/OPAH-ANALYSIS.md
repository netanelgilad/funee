# Opah Macro System Analysis

## Core Concepts (from everything repo)

### Closure<T>
```typescript
interface Closure<T> {
  expression: AST;  // The captured AST node
  references: Map<string, CanonicalName>;  // External refs
}
```

### CanonicalName
```typescript
interface CanonicalName {
  uri: string;   // Module URI (file path or URL)
  name: string;  // Export name
}
```

### createMacro
Marks a function as a compile-time macro:
```typescript
const closure = createMacro(<T>(input: Closure<T>) => {
  // Runs at BUNDLE TIME
  return Closure<Closure<T>>({ ... });
});
```

## Macro Detection (isMacroDefinition.ts)

A definition is a macro if:
1. It's a variable declaration
2. The init is a call expression
3. The callee resolves to `createMacro` from `@opah/core`

```typescript
definition.references.get(calleeIdent)
  .equals(CanonicalName({ uri: "@opah/core", name: "createMacro" }))
```

## Macro Processing Flow (processMacros.ts)

1. **Find macros**: Iterate references, check if each is a macro definition
2. **Get macro functions**: Extract and execute the createMacro argument
3. **Process call sites**: For each CallExpression:
   - If callee is a macro:
     a. Capture arguments as Closures (AST + references)
     b. Call macro function with Closures
     c. Replace call with result's expression
     d. Merge result's references
4. **Handle conflicts**: If result uses same local name for different canonical name, wrap in IIFE

## Key Implementation Decisions for Funee

### Option A: JS Macro Execution
- Use deno_core to execute macros during bundling
- Pro: Full JS compatibility
- Con: Complex, slow

### Option B: Rust Macro Execution  
- Implement macro execution in Rust
- Pro: Fast
- Con: Limited to what we implement

### Option C: Two-Pass
- Pass 1: Bundle to find macro calls
- Execute macros externally (maybe in Deno)
- Pass 2: Bundle with macro results
- Pro: Flexible
- Con: Slower build times

## Reference Files
- `everything/macros/closure.ts` - The `closure` macro
- `everything/macros/toAST.ts` - Convert runtime obj to AST literal
- `everything/macros/definition.ts` - Similar to closure but for definitions
- `everything/opah/executeExpressionWithScope/getExecutionProgramForClosure/processMacros.ts` - Full processing
