/**
 * funee AST Builders (Extended)
 * 
 * Additional AST builder functions that complement the basic builders in ast-types.ts.
 * These provide the complete set of builders needed for macro development.
 * 
 * Basic builders (identifier, stringLiteral, etc.) are in ast-types.ts
 * This file adds: declarations, modules, statements, and helper/compound builders.
 */

import type {
  // Literals
  BigIntLiteral,
  RegExpLiteral,
  StringLiteral,
  NumericLiteral,
  BooleanLiteral,
  NullLiteral,
  // Expressions
  Expression,
  Identifier,
  CallExpression,
  MemberExpression,
  ArrowFunctionExpression,
  ParenthesizedExpression,
  UpdateExpression,
  UpdateOperator,
  SequenceExpression,
  YieldExpression,
  TaggedTemplateExpression,
  TemplateLiteral,
  // Statements
  Statement,
  BlockStatement,
  EmptyStatement,
  DebuggerStatement,
  BreakStatement,
  ContinueStatement,
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
  // Declarations
  VariableDeclaration,
  VariableDeclarator,
  FunctionDeclaration,
  ClassDeclaration,
  ClassBody,
  ClassMember,
  ClassProperty,
  ClassMethod,
  StaticBlock,
  // Patterns
  Pattern,
  // Modules
  ImportDeclaration,
  ImportSpecifier,
  ImportNamedSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ExportNamedDeclaration,
  ExportSpecifier,
  ExportDefaultDeclaration,
  ExportDefaultExpression,
  ExportAllDeclaration,
  // Program
  Program,
  ModuleItem,
} from "./ast-types.ts";

// Re-export basic builders from ast-types.ts
export {
  // Identifiers & Literals
  identifier,
  stringLiteral,
  numericLiteral,
  booleanLiteral,
  nullLiteral,
  // Basic Expressions
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
  // Basic Statements
  blockStatement,
  expressionStatement,
  returnStatement,
  ifStatement,
  // Declarations
  variableDeclaration,
  variableDeclarator,
  // Patterns
  restElement,
  arrayPattern,
  objectPattern,
  assignmentPattern,
} from "./ast-types.ts";

// ============================================================================
// Additional Literals
// ============================================================================

/**
 * Create a BigIntLiteral node
 */
export function bigIntLiteral(value: bigint): BigIntLiteral {
  return {
    type: "BigIntLiteral",
    value,
  };
}

/**
 * Create a RegExpLiteral node
 */
export function regExpLiteral(pattern: string, flags: string = ""): RegExpLiteral {
  return {
    type: "RegExpLiteral",
    pattern,
    flags,
  };
}

/**
 * Create a literal from a JavaScript value
 * Infers the correct literal type based on the value
 */
export function literal(
  value: string | number | boolean | null | bigint
): StringLiteral | NumericLiteral | BooleanLiteral | NullLiteral | BigIntLiteral {
  if (value === null) {
    return { type: "NullLiteral" };
  }
  if (typeof value === "string") {
    return { type: "StringLiteral", value };
  }
  if (typeof value === "number") {
    return { type: "NumericLiteral", value };
  }
  if (typeof value === "boolean") {
    return { type: "BooleanLiteral", value };
  }
  if (typeof value === "bigint") {
    return { type: "BigIntLiteral", value };
  }
  throw new Error(`Unsupported literal value: ${value}`);
}

// ============================================================================
// Additional Expression Builders
// ============================================================================

/**
 * Create an UpdateExpression node (++x, x--, etc.)
 */
export function updateExpression(
  operator: UpdateOperator,
  argument: Expression,
  prefix: boolean = true
): UpdateExpression {
  return {
    type: "UpdateExpression",
    operator,
    argument,
    prefix,
  };
}

/**
 * Create a SequenceExpression node (a, b, c)
 */
export function sequenceExpression(expressions: Expression[]): SequenceExpression {
  return {
    type: "SequenceExpression",
    expressions,
  };
}

/**
 * Create a YieldExpression node
 */
export function yieldExpression(
  argument: Expression | null = null,
  delegate: boolean = false
): YieldExpression {
  return {
    type: "YieldExpression",
    argument,
    delegate,
  };
}

/**
 * Create a ParenthesizedExpression node
 */
export function parenthesizedExpression(expression: Expression): ParenthesizedExpression {
  return {
    type: "ParenthesizedExpression",
    expression,
  };
}

/**
 * Create a TaggedTemplateExpression node
 */
export function taggedTemplateExpression(
  tag: Expression,
  quasi: TemplateLiteral
): TaggedTemplateExpression {
  return {
    type: "TaggedTemplateExpression",
    tag,
    quasi,
  };
}

/**
 * Create a computed MemberExpression node (obj["prop"])
 */
export function computedMemberExpression(
  object: Expression,
  property: Expression
): MemberExpression {
  return {
    type: "MemberExpression",
    object,
    property,
    computed: true,
  };
}

// ============================================================================
// Additional Statement Builders
// ============================================================================

/**
 * Create an EmptyStatement node
 */
export function emptyStatement(): EmptyStatement {
  return { type: "EmptyStatement" };
}

/**
 * Create a DebuggerStatement node
 */
export function debuggerStatement(): DebuggerStatement {
  return { type: "DebuggerStatement" };
}

/**
 * Create a BreakStatement node
 */
export function breakStatement(label: Identifier | null = null): BreakStatement {
  return {
    type: "BreakStatement",
    label,
  };
}

/**
 * Create a ContinueStatement node
 */
export function continueStatement(label: Identifier | null = null): ContinueStatement {
  return {
    type: "ContinueStatement",
    label,
  };
}

/**
 * Create a SwitchStatement node
 */
export function switchStatement(
  discriminant: Expression,
  cases: SwitchCase[]
): SwitchStatement {
  return {
    type: "SwitchStatement",
    discriminant,
    cases,
  };
}

/**
 * Create a SwitchCase node (null test = default case)
 */
export function switchCase(
  test: Expression | null,
  consequent: Statement[]
): SwitchCase {
  return {
    type: "SwitchCase",
    test,
    consequent,
  };
}

/**
 * Create a ThrowStatement node
 */
export function throwStatement(argument: Expression): ThrowStatement {
  return {
    type: "ThrowStatement",
    argument,
  };
}

/**
 * Create a TryStatement node
 */
export function tryStatement(
  block: BlockStatement,
  handler: CatchClause | null = null,
  finalizer: BlockStatement | null = null
): TryStatement {
  return {
    type: "TryStatement",
    block,
    handler,
    finalizer,
  };
}

/**
 * Create a CatchClause node
 */
export function catchClause(
  param: Pattern | null,
  body: BlockStatement
): CatchClause {
  return {
    type: "CatchClause",
    param,
    body,
  };
}

/**
 * Create a WhileStatement node
 */
export function whileStatement(test: Expression, body: Statement): WhileStatement {
  return {
    type: "WhileStatement",
    test,
    body,
  };
}

/**
 * Create a DoWhileStatement node
 */
export function doWhileStatement(body: Statement, test: Expression): DoWhileStatement {
  return {
    type: "DoWhileStatement",
    body,
    test,
  };
}

/**
 * Create a ForStatement node
 */
export function forStatement(
  init: VariableDeclaration | Expression | null,
  test: Expression | null,
  update: Expression | null,
  body: Statement
): ForStatement {
  return {
    type: "ForStatement",
    init,
    test,
    update,
    body,
  };
}

/**
 * Create a ForInStatement node
 */
export function forInStatement(
  left: VariableDeclaration | Pattern,
  right: Expression,
  body: Statement
): ForInStatement {
  return {
    type: "ForInStatement",
    left,
    right,
    body,
  };
}

/**
 * Create a ForOfStatement node
 */
export function forOfStatement(
  left: VariableDeclaration | Pattern,
  right: Expression,
  body: Statement,
  isAwait: boolean = false
): ForOfStatement {
  return {
    type: "ForOfStatement",
    left,
    right,
    body,
    await: isAwait,
  };
}

/**
 * Create a LabeledStatement node
 */
export function labeledStatement(label: Identifier, body: Statement): LabeledStatement {
  return {
    type: "LabeledStatement",
    label,
    body,
  };
}

// ============================================================================
// Declaration Builders
// ============================================================================

/**
 * Convenience function for: const name = value
 */
export function constDeclaration(name: string, init: Expression): VariableDeclaration {
  return {
    type: "VariableDeclaration",
    kind: "const",
    declarations: [{
      type: "VariableDeclarator",
      id: { type: "Identifier", value: name },
      init,
    }],
  };
}

/**
 * Convenience function for: let name = value
 */
export function letDeclaration(
  name: string,
  init: Expression | null = null
): VariableDeclaration {
  return {
    type: "VariableDeclaration",
    kind: "let",
    declarations: [{
      type: "VariableDeclarator",
      id: { type: "Identifier", value: name },
      init,
    }],
  };
}

/**
 * Create a FunctionDeclaration node
 */
export function functionDeclaration(
  id: Identifier,
  params: Pattern[],
  body: BlockStatement,
  options: { async?: boolean; generator?: boolean } = {}
): FunctionDeclaration {
  return {
    type: "FunctionDeclaration",
    identifier: id,
    params,
    body,
    async: options.async,
    generator: options.generator,
  };
}

/**
 * Create a ClassDeclaration node
 */
export function classDeclaration(
  id: Identifier,
  body: ClassBody,
  superClass: Expression | null = null
): ClassDeclaration {
  return {
    type: "ClassDeclaration",
    identifier: id,
    superClass,
    body,
  };
}

/**
 * Create a ClassBody node
 */
export function classBody(body: ClassMember[]): ClassBody {
  return {
    type: "ClassBody",
    body,
  };
}

/**
 * Create a ClassProperty node
 */
export function classProperty(
  key: Expression,
  value: Expression | null = null,
  options: { computed?: boolean; static?: boolean } = {}
): ClassProperty {
  return {
    type: "ClassProperty",
    key,
    value,
    computed: options.computed,
    static: options.static,
  };
}

/**
 * Create a ClassMethod node
 */
export function classMethod(
  kind: "method" | "constructor" | "getter" | "setter",
  key: Expression,
  params: Pattern[],
  body: BlockStatement,
  options: { computed?: boolean; static?: boolean; async?: boolean; generator?: boolean } = {}
): ClassMethod {
  return {
    type: "ClassMethod",
    kind,
    key,
    params,
    body,
    computed: options.computed,
    static: options.static,
    async: options.async,
    generator: options.generator,
  };
}

/**
 * Create a StaticBlock node
 */
export function staticBlock(body: Statement[]): StaticBlock {
  return {
    type: "StaticBlock",
    body,
  };
}

// ============================================================================
// Module Declaration Builders
// ============================================================================

/**
 * Create an ImportDeclaration node
 */
export function importDeclaration(
  specifiers: ImportSpecifier[],
  source: StringLiteral
): ImportDeclaration {
  return {
    type: "ImportDeclaration",
    specifiers,
    source,
  };
}

/**
 * Create a named ImportSpecifier node
 */
export function importSpecifier(
  local: Identifier,
  imported: Identifier | StringLiteral | null = null
): ImportNamedSpecifier {
  return {
    type: "ImportSpecifier",
    local,
    imported,
  };
}

/**
 * Create an ImportDefaultSpecifier node
 */
export function importDefaultSpecifier(local: Identifier): ImportDefaultSpecifier {
  return {
    type: "ImportDefaultSpecifier",
    local,
  };
}

/**
 * Create an ImportNamespaceSpecifier node
 */
export function importNamespaceSpecifier(local: Identifier): ImportNamespaceSpecifier {
  return {
    type: "ImportNamespaceSpecifier",
    local,
  };
}

/**
 * Create an ExportNamedDeclaration node
 */
export function exportNamedDeclaration(
  declaration: VariableDeclaration | FunctionDeclaration | ClassDeclaration | null = null,
  specifiers: ExportSpecifier[] = [],
  source: StringLiteral | null = null
): ExportNamedDeclaration {
  return {
    type: "ExportNamedDeclaration",
    declaration,
    specifiers,
    source,
  };
}

/**
 * Create an ExportSpecifier node
 */
export function exportSpecifier(
  local: Identifier | StringLiteral,
  exported: Identifier | StringLiteral | null = null
): ExportSpecifier {
  return {
    type: "ExportSpecifier",
    local,
    exported,
  };
}

/**
 * Create an ExportDefaultDeclaration node (for function/class declarations)
 */
export function exportDefaultDeclaration(
  decl: FunctionDeclaration | ClassDeclaration
): ExportDefaultDeclaration {
  return {
    type: "ExportDefaultDeclaration",
    decl,
  };
}

/**
 * Create an ExportDefaultExpression node (for expressions)
 */
export function exportDefaultExpression(expression: Expression): ExportDefaultExpression {
  return {
    type: "ExportDefaultExpression",
    expression,
  };
}

/**
 * Create an ExportAllDeclaration node
 */
export function exportAllDeclaration(
  source: StringLiteral,
  exported: Identifier | null = null
): ExportAllDeclaration {
  return {
    type: "ExportAllDeclaration",
    source,
    exported,
  };
}

// ============================================================================
// Program Builder
// ============================================================================

/**
 * Create a Program node
 */
export function program(
  body: ModuleItem[],
  sourceType: "module" | "script" = "module"
): Program {
  return {
    type: sourceType === "module" ? "Module" : "Script",
    body,
    sourceType,
  };
}

// ============================================================================
// Helper / Compound Builders
// ============================================================================

/**
 * Create an IIFE (Immediately Invoked Function Expression)
 * @example iife([identifier("x")], blockStatement([returnStatement(identifier("x"))]), [numericLiteral(1)])
 * // ((x) => { return x; })(1)
 */
export function iife(
  params: Pattern[],
  body: BlockStatement,
  args: Expression[]
): CallExpression {
  return {
    type: "CallExpression",
    callee: {
      type: "ParenthesizedExpression",
      expression: {
        type: "ArrowFunctionExpression",
        params,
        body,
      },
    },
    arguments: args,
  };
}

/**
 * Create a method call expression
 * @example methodCall(identifier("console"), "log", [stringLiteral("hello")])
 * // console.log("hello")
 */
export function methodCall(
  object: Expression,
  method: string,
  args: Expression[]
): CallExpression {
  return {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object,
      property: { type: "Identifier", value: method },
      computed: false,
    },
    arguments: args,
  };
}

/**
 * Create a property access chain
 * @example propertyChain(identifier("a"), ["b", "c", "d"]) // a.b.c.d
 */
export function propertyChain(object: Expression, props: string[]): Expression {
  return props.reduce<Expression>(
    (acc, prop) => ({
      type: "MemberExpression",
      object: acc,
      property: { type: "Identifier", value: prop },
      computed: false,
    }),
    object
  );
}

/**
 * Build a simple object literal from a plain JS object
 * Values must be expressions or primitives
 */
export function objectFromEntries(
  entries: Record<string, Expression | string | number | boolean | null>
): Expression {
  const properties = Object.entries(entries).map(([key, value]) => {
    let expr: Expression;
    if (value === null) {
      expr = literal(null);
    } else if (typeof value === "string") {
      expr = literal(value);
    } else if (typeof value === "number") {
      expr = literal(value);
    } else if (typeof value === "boolean") {
      expr = literal(value);
    } else {
      expr = value;
    }
    return {
      type: "KeyValueProperty" as const,
      key: { type: "Identifier" as const, value: key },
      value: expr,
    };
  });
  return {
    type: "ObjectExpression",
    properties,
  };
}

/**
 * Build an array literal from an array of expressions or primitives
 */
export function arrayFromElements(
  elements: (Expression | string | number | boolean | null)[]
): Expression {
  const exprs = elements.map((el): Expression => {
    if (el === null) {
      return literal(null);
    } else if (typeof el === "string") {
      return literal(el);
    } else if (typeof el === "number") {
      return literal(el);
    } else if (typeof el === "boolean") {
      return literal(el);
    } else {
      return el;
    }
  });
  return {
    type: "ArrayExpression",
    elements: exprs,
  };
}

/**
 * Create a shorthand object property ({ foo } instead of { foo: foo })
 */
export function shorthandProperty(key: Identifier): Expression {
  return {
    type: "KeyValueProperty",
    key,
    value: key,
    shorthand: true,
  } as unknown as Expression;
}

/**
 * Create a simple import statement
 * @example simpleImport(["foo", "bar"], "./module.js")
 * // import { foo, bar } from "./module.js"
 */
export function simpleImport(
  names: string[],
  source: string
): ImportDeclaration {
  const specifiers = names.map((name) => ({
    type: "ImportSpecifier" as const,
    local: { type: "Identifier" as const, value: name },
    imported: null,
  }));
  return {
    type: "ImportDeclaration",
    specifiers,
    source: { type: "StringLiteral", value: source },
  };
}

/**
 * Create a default import statement
 * @example defaultImport("React", "react")
 * // import React from "react"
 */
export function defaultImport(name: string, source: string): ImportDeclaration {
  return {
    type: "ImportDeclaration",
    specifiers: [{
      type: "ImportDefaultSpecifier",
      local: { type: "Identifier", value: name },
    }],
    source: { type: "StringLiteral", value: source },
  };
}

/**
 * Create a namespace import statement
 * @example namespaceImport("React", "react")
 * // import * as React from "react"
 */
export function namespaceImport(name: string, source: string): ImportDeclaration {
  return {
    type: "ImportDeclaration",
    specifiers: [{
      type: "ImportNamespaceSpecifier",
      local: { type: "Identifier", value: name },
    }],
    source: { type: "StringLiteral", value: source },
  };
}
