/**
 * funee - Standard Runtime Library
 * 
 * The funee standard library provides:
 * - Core types for the macro system (Closure, CanonicalName)
 * - Macro definition utilities (createMacro)
 * - Host functions (log, debug)
 * - AST types, predicates, and builder functions
 * 
 * @example
 * ```typescript
 * import { Closure, CanonicalName, createMacro, log } from "funee";
 * 
 * // Define a compile-time macro
 * const myMacro = createMacro((input: Closure<any>) => {
 *   // Transform the input AST at bundle time
 *   return Closure({
 *     expression: transformedAST,
 *     references: new Map()
 *   });
 * });
 * ```
 */

// Core macro system types and functions
// Note: Closure is both a type interface and a constructor function
export {
  createMacro,
  Closure,
} from "./core.ts";

// Re-export types (Closure interface is automatically available via the value export above)
export type {
  CanonicalName,
  MacroFunction,
  MacroResultWithDefinitions
} from "./core.ts";

// Host functions provided by the runtime
export {
  log,
  debug,
  randomBytes
} from "./host.ts";

// ============================================================================
// AST Types
// ============================================================================

export type {
  // Base types
  BaseNode,
  Span,
  Node,
  
  // Expressions
  Expression,
  Identifier,
  Literal,
  StringLiteral,
  NumericLiteral,
  BooleanLiteral,
  NullLiteral,
  BigIntLiteral,
  RegExpLiteral,
  ArrayExpression,
  ObjectExpression,
  ObjectMember,
  ObjectProperty,
  ObjectMethod,
  SpreadElement,
  FunctionExpression,
  ArrowFunctionExpression,
  UnaryExpression,
  UnaryOperator,
  UpdateExpression,
  UpdateOperator,
  BinaryExpression,
  BinaryOperator,
  AssignmentExpression,
  AssignmentOperator,
  LogicalExpression,
  LogicalOperator,
  MemberExpression,
  ConditionalExpression,
  CallExpression,
  NewExpression,
  SequenceExpression,
  TemplateLiteral,
  TemplateElement,
  TaggedTemplateExpression,
  ThisExpression,
  YieldExpression,
  AwaitExpression,
  ParenthesizedExpression,
  
  // Statements
  Statement,
  ExpressionStatement,
  BlockStatement,
  EmptyStatement,
  DebuggerStatement,
  ReturnStatement,
  BreakStatement,
  ContinueStatement,
  IfStatement,
  SwitchStatement,
  SwitchCase,
  ThrowStatement,
  TryStatement,
  CatchClause,
  WhileStatement,
  DoWhileStatement,
  ForStatement,
  ForInStatement,
  ForOfStatement,
  LabeledStatement,
  WithStatement,
  
  // Declarations
  Declaration,
  VariableDeclaration,
  VariableDeclarator,
  FunctionDeclaration,
  ClassDeclaration,
  ClassBody,
  ClassMember,
  ClassProperty,
  ClassMethod,
  PrivateProperty,
  PrivateMethod,
  PrivateName,
  StaticBlock,
  
  // Patterns
  Pattern,
  ArrayPattern,
  ObjectPattern,
  ObjectPatternProperty,
  RestElement,
  AssignmentPattern,
  
  // Modules
  ModuleItem,
  ImportDeclaration,
  ImportSpecifier,
  ImportNamedSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ExportDeclaration,
  ExportNamedDeclaration,
  ExportSpecifier,
  ExportDefaultDeclaration,
  ExportDefaultExpression,
  ExportAllDeclaration,
  
  // Program
  Program,
} from "./ast-types.ts";

// ============================================================================
// AST Type Guards (predicates)
// ============================================================================

export {
  isIdentifier,
  isStringLiteral,
  isNumericLiteral,
  isBooleanLiteral,
  isNullLiteral,
  isLiteral,
  isArrayExpression,
  isObjectExpression,
  isCallExpression,
  isMemberExpression,
  isArrowFunctionExpression,
  isFunctionExpression,
  isFunctionDeclaration,
  isFunction,
  isVariableDeclaration,
  isVariableDeclarator,
  isBlockStatement,
  isReturnStatement,
  isExpressionStatement,
  isExpression,
  isStatement,
  isPattern,
} from "./ast-types.ts";

// ============================================================================
// AST Builder Functions
// ============================================================================

// Re-export all builders from ast-builders.ts (which re-exports from ast-types.ts)
export {
  // Identifiers & Literals (from ast-types.ts)
  identifier,
  stringLiteral,
  numericLiteral,
  booleanLiteral,
  nullLiteral,
  // Additional Literals (from ast-builders.ts)
  bigIntLiteral,
  regExpLiteral,
  literal,
  
  // Basic Expressions (from ast-types.ts)
  arrayExpression,
  objectExpression,
  objectProperty,
  callExpression,
  memberExpression,
  arrowFunctionExpression,
  functionExpression,
  newExpression,
  spreadElement,
  templateLiteral,
  templateElement,
  thisExpression,
  binaryExpression,
  logicalExpression,
  unaryExpression,
  conditionalExpression,
  assignmentExpression,
  awaitExpression,
  // Additional Expressions (from ast-builders.ts)
  updateExpression,
  sequenceExpression,
  yieldExpression,
  parenthesizedExpression,
  taggedTemplateExpression,
  computedMemberExpression,
  
  // Basic Statements (from ast-types.ts)
  blockStatement,
  expressionStatement,
  returnStatement,
  ifStatement,
  // Additional Statements (from ast-builders.ts)
  emptyStatement,
  debuggerStatement,
  breakStatement,
  continueStatement,
  switchStatement,
  switchCase,
  throwStatement,
  tryStatement,
  catchClause,
  whileStatement,
  doWhileStatement,
  forStatement,
  forInStatement,
  forOfStatement,
  labeledStatement,
  
  // Declarations (from ast-types.ts)
  variableDeclaration,
  variableDeclarator,
  // Additional Declarations (from ast-builders.ts)
  constDeclaration,
  letDeclaration,
  functionDeclaration,
  classDeclaration,
  classBody,
  classProperty,
  classMethod,
  staticBlock,
  
  // Patterns (from ast-types.ts)
  restElement,
  arrayPattern,
  objectPattern,
  assignmentPattern,
  
  // Modules (from ast-builders.ts)
  importDeclaration,
  importSpecifier,
  importDefaultSpecifier,
  importNamespaceSpecifier,
  exportNamedDeclaration,
  exportSpecifier,
  exportDefaultDeclaration,
  exportDefaultExpression,
  exportAllDeclaration,
  
  // Program (from ast-builders.ts)
  program,
  
  // Helper / Compound builders (from ast-builders.ts)
  iife,
  methodCall,
  propertyChain,
  objectFromEntries,
  arrayFromElements,
  shorthandProperty,
  simpleImport,
  defaultImport,
  namespaceImport,
} from "./ast-builders.ts";

// ============================================================================
// AST Utility Functions
// ============================================================================

export {
  walkAST,
  cloneAST,
  replaceNodesByType,
  getOutOfScopeReferences,
} from "./ast-utils.ts";

export type { ASTVisitor } from "./ast-utils.ts";

// ============================================================================
// Assertions - Testing library
// ============================================================================

export type {
  Assertion,
  Otherwise,
  Within,
  OtherwiseCallback,
} from "./assertions/index.ts";

export {
  assertion,
  otherwise,
  within,
  isOtherwise,
  isWithin,
  assertThat,
  is,
  not as notAssertion,  // Aliased to avoid conflict with functions/not
  both,
  AssertionError,
  assert,
  strictEqual,
  deepEqual,
} from "./assertions/index.ts";

// ============================================================================
// Refine - Type Refinement Utilities
// ============================================================================

export { ensure, encode } from "./refine/index.ts";
export type { Refine, KeySet } from "./refine/index.ts";

// ============================================================================
// Macros - Compile-time code transformation
// ============================================================================

export {
  // Core capture macros
  closure,
  definition,
  Definition,
  
  // Utility macros
  canonicalName,
  canonicalNameFn,
  tuple,
  unsafeCast,
  unsafeDefined,
  
  // Helper for macro authors
  toAST,
} from "./macros/index.ts";

// ============================================================================
// Function Utilities
// ============================================================================

export {
  curry,
  not,
} from "./functions/index.ts";

// ============================================================================
// Collection Utilities
// ============================================================================

export {
  without,
} from "./collections/index.ts";

// ============================================================================
// Random Utilities
// ============================================================================

export {
  cryptoRandomString,
} from "./random/index.ts";

// ============================================================================
// Git Utilities
// ============================================================================

export {
  gitRefFormat,
  isGitRef,
  getNameOfRef,
} from "./git/index.ts";

export type { GitRef } from "./git/index.ts";

// ============================================================================
// Async Iterator Utilities (axax)
// ============================================================================

export {
  // Core utilities
  Deferred,
  Subject,
  StopError,
  toCallbacks,
  
  // Array conversions
  fromArray,
  toArray,
  
  // Transformations
  map,
  reduce,
  count,
  
  // Combining iterators
  merge,
  
  // Concurrent operations
  concurrentMap,
  concurrentFilter,
  
  // Source adapters
  fromEmitter,
  fromNodeStream,
  
  // Length utilities
  collectLength,
  streamUntilLength,
} from "./axax/index.ts";

export type {
  CollectLengthResult,
  StreamUntilLengthResult,
} from "./axax/index.ts";
