/**
 * funee AST Type Definitions
 * 
 * These types define the AST node structure used by funee's macro system.
 * They are compatible with SWC's JavaScript AST format (which follows estree conventions).
 * 
 * Macros receive and return these AST nodes when transforming code at bundle time.
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base interface for all AST nodes
 */
export interface BaseNode {
  type: string;
  /** Source location (optional, may not be present in generated nodes) */
  span?: Span;
}

/**
 * Source location span
 */
export interface Span {
  start: number;
  end: number;
}

/**
 * Union of all AST node types
 */
export type Node = 
  | Expression
  | Statement
  | Declaration
  | Pattern
  | ModuleItem
  | ObjectMember
  | SpreadElement
  | TemplateElement
  | VariableDeclarator
  | SwitchCase
  | CatchClause
  | ClassBody
  | ClassMember
  | ImportSpecifier
  | ExportSpecifier
  | ObjectPatternProperty
  | Program;

// ============================================================================
// Expression Types
// ============================================================================

/**
 * Union of all expression types
 */
export type Expression =
  | Identifier
  | Literal
  | ArrayExpression
  | ObjectExpression
  | FunctionExpression
  | ArrowFunctionExpression
  | UnaryExpression
  | UpdateExpression
  | BinaryExpression
  | AssignmentExpression
  | LogicalExpression
  | MemberExpression
  | ConditionalExpression
  | CallExpression
  | NewExpression
  | SequenceExpression
  | TemplateLiteral
  | TaggedTemplateExpression
  | ThisExpression
  | YieldExpression
  | AwaitExpression
  | ParenthesizedExpression
  | SpreadElement;

/**
 * Identifier - a variable or property name
 */
export interface Identifier extends BaseNode {
  type: "Identifier";
  value: string;
  /** Whether this is optional (TypeScript ?) */
  optional?: boolean;
}

// ============================================================================
// Literal Types
// ============================================================================

/**
 * Union of all literal types
 */
export type Literal =
  | StringLiteral
  | NumericLiteral
  | BooleanLiteral
  | NullLiteral
  | BigIntLiteral
  | RegExpLiteral;

/**
 * String literal
 */
export interface StringLiteral extends BaseNode {
  type: "StringLiteral";
  value: string;
  /** Raw string representation (with quotes) */
  raw?: string;
}

/**
 * Numeric literal (integers and floats)
 */
export interface NumericLiteral extends BaseNode {
  type: "NumericLiteral";
  value: number;
  /** Raw string representation */
  raw?: string;
}

/**
 * Boolean literal (true/false)
 */
export interface BooleanLiteral extends BaseNode {
  type: "BooleanLiteral";
  value: boolean;
}

/**
 * Null literal
 */
export interface NullLiteral extends BaseNode {
  type: "NullLiteral";
}

/**
 * BigInt literal
 */
export interface BigIntLiteral extends BaseNode {
  type: "BigIntLiteral";
  value: bigint;
  raw?: string;
}

/**
 * Regular expression literal
 */
export interface RegExpLiteral extends BaseNode {
  type: "RegExpLiteral";
  pattern: string;
  flags: string;
}

// ============================================================================
// Compound Expression Types
// ============================================================================

/**
 * Array expression: [1, 2, 3]
 */
export interface ArrayExpression extends BaseNode {
  type: "ArrayExpression";
  elements: (Expression | SpreadElement | null)[];
}

/**
 * Object expression: { a: 1, b: 2 }
 */
export interface ObjectExpression extends BaseNode {
  type: "ObjectExpression";
  properties: ObjectMember[];
}

/**
 * Union of object member types
 */
export type ObjectMember =
  | ObjectProperty
  | SpreadElement
  | ObjectMethod;

/**
 * Object property: key: value or key (shorthand)
 */
export interface ObjectProperty extends BaseNode {
  type: "KeyValueProperty" | "Property";
  key: Expression;
  value: Expression;
  /** Computed property name: { [expr]: value } */
  computed?: boolean;
  /** Shorthand syntax: { x } instead of { x: x } */
  shorthand?: boolean;
}

/**
 * Object method (getter/setter/method)
 */
export interface ObjectMethod extends BaseNode {
  type: "MethodProperty" | "GetterProperty" | "SetterProperty";
  key: Expression;
  params: Pattern[];
  body: BlockStatement;
  computed?: boolean;
  generator?: boolean;
  async?: boolean;
}

/**
 * Spread element: ...expr
 */
export interface SpreadElement extends BaseNode {
  type: "SpreadElement";
  arguments: Expression;
}

/**
 * Function expression: function(a, b) { }
 */
export interface FunctionExpression extends BaseNode {
  type: "FunctionExpression";
  identifier?: Identifier | null;
  params: Pattern[];
  body: BlockStatement;
  generator?: boolean;
  async?: boolean;
  /** TypeScript type parameters */
  typeParameters?: any;
  /** TypeScript return type */
  returnType?: any;
}

/**
 * Arrow function: (a, b) => expr or (a, b) => { }
 */
export interface ArrowFunctionExpression extends BaseNode {
  type: "ArrowFunctionExpression";
  params: Pattern[];
  body: BlockStatement | Expression;
  async?: boolean;
  generator?: boolean;
  /** TypeScript type parameters */
  typeParameters?: any;
  /** TypeScript return type */
  returnType?: any;
}

/**
 * Unary expression: !x, -x, typeof x, etc.
 */
export interface UnaryExpression extends BaseNode {
  type: "UnaryExpression";
  operator: UnaryOperator;
  argument: Expression;
  prefix?: boolean;
}

export type UnaryOperator = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

/**
 * Update expression: x++, --x, etc.
 */
export interface UpdateExpression extends BaseNode {
  type: "UpdateExpression";
  operator: UpdateOperator;
  argument: Expression;
  prefix: boolean;
}

export type UpdateOperator = "++" | "--";

/**
 * Binary expression: a + b, a === b, etc.
 */
export interface BinaryExpression extends BaseNode {
  type: "BinaryExpression";
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export type BinaryOperator =
  | "==" | "!=" | "===" | "!=="
  | "<" | "<=" | ">" | ">="
  | "<<" | ">>" | ">>>"
  | "+" | "-" | "*" | "/" | "%"
  | "|" | "^" | "&"
  | "in" | "instanceof"
  | "**";

/**
 * Assignment expression: a = b, a += b, etc.
 */
export interface AssignmentExpression extends BaseNode {
  type: "AssignmentExpression";
  operator: AssignmentOperator;
  left: Pattern | Expression;
  right: Expression;
}

export type AssignmentOperator =
  | "=" | "+=" | "-=" | "*=" | "/=" | "%="
  | "<<=" | ">>=" | ">>>="
  | "|=" | "^=" | "&="
  | "**=" | "||=" | "&&=" | "??=";

/**
 * Logical expression: a && b, a || b, a ?? b
 */
export interface LogicalExpression extends BaseNode {
  type: "LogicalExpression";
  operator: LogicalOperator;
  left: Expression;
  right: Expression;
}

export type LogicalOperator = "&&" | "||" | "??";

/**
 * Member expression: obj.prop or obj[prop]
 */
export interface MemberExpression extends BaseNode {
  type: "MemberExpression";
  object: Expression;
  property: Expression;
  computed?: boolean;
  /** Optional chaining: obj?.prop */
  optional?: boolean;
}

/**
 * Conditional (ternary) expression: a ? b : c
 */
export interface ConditionalExpression extends BaseNode {
  type: "ConditionalExpression";
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}

/**
 * Call expression: fn(a, b)
 */
export interface CallExpression extends BaseNode {
  type: "CallExpression";
  callee: Expression;
  arguments: (Expression | SpreadElement)[];
  /** TypeScript type arguments */
  typeArguments?: any;
  /** Optional chaining: fn?.() */
  optional?: boolean;
}

/**
 * New expression: new Foo(a, b)
 */
export interface NewExpression extends BaseNode {
  type: "NewExpression";
  callee: Expression;
  arguments: (Expression | SpreadElement)[];
  /** TypeScript type arguments */
  typeArguments?: any;
}

/**
 * Sequence expression: a, b, c
 */
export interface SequenceExpression extends BaseNode {
  type: "SequenceExpression";
  expressions: Expression[];
}

/**
 * Template literal: `hello ${name}`
 */
export interface TemplateLiteral extends BaseNode {
  type: "TemplateLiteral";
  quasis: TemplateElement[];
  expressions: Expression[];
}

/**
 * Template element (static part of template literal)
 */
export interface TemplateElement extends BaseNode {
  type: "TemplateElement";
  tail: boolean;
  cooked?: string | null;
  raw: string;
}

/**
 * Tagged template: tag`hello ${name}`
 */
export interface TaggedTemplateExpression extends BaseNode {
  type: "TaggedTemplateExpression";
  tag: Expression;
  quasi: TemplateLiteral;
  /** TypeScript type arguments */
  typeArguments?: any;
}

/**
 * This expression: this
 */
export interface ThisExpression extends BaseNode {
  type: "ThisExpression";
}

/**
 * Yield expression: yield x or yield* x
 */
export interface YieldExpression extends BaseNode {
  type: "YieldExpression";
  argument?: Expression | null;
  delegate: boolean;
}

/**
 * Await expression: await x
 */
export interface AwaitExpression extends BaseNode {
  type: "AwaitExpression";
  argument: Expression;
}

/**
 * Parenthesized expression: (x)
 */
export interface ParenthesizedExpression extends BaseNode {
  type: "ParenthesizedExpression";
  expression: Expression;
}

// ============================================================================
// Statement Types
// ============================================================================

/**
 * Union of all statement types
 */
export type Statement =
  | ExpressionStatement
  | BlockStatement
  | EmptyStatement
  | DebuggerStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | IfStatement
  | SwitchStatement
  | ThrowStatement
  | TryStatement
  | WhileStatement
  | DoWhileStatement
  | ForStatement
  | ForInStatement
  | ForOfStatement
  | LabeledStatement
  | WithStatement
  | Declaration;

/**
 * Expression statement: expr;
 */
export interface ExpressionStatement extends BaseNode {
  type: "ExpressionStatement";
  expression: Expression;
}

/**
 * Block statement: { stmts }
 */
export interface BlockStatement extends BaseNode {
  type: "BlockStatement";
  stmts: Statement[];
}

/**
 * Empty statement: ;
 */
export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

/**
 * Debugger statement: debugger;
 */
export interface DebuggerStatement extends BaseNode {
  type: "DebuggerStatement";
}

/**
 * Return statement: return expr;
 */
export interface ReturnStatement extends BaseNode {
  type: "ReturnStatement";
  argument?: Expression | null;
}

/**
 * Break statement: break; or break label;
 */
export interface BreakStatement extends BaseNode {
  type: "BreakStatement";
  label?: Identifier | null;
}

/**
 * Continue statement: continue; or continue label;
 */
export interface ContinueStatement extends BaseNode {
  type: "ContinueStatement";
  label?: Identifier | null;
}

/**
 * If statement: if (test) { consequent } else { alternate }
 */
export interface IfStatement extends BaseNode {
  type: "IfStatement";
  test: Expression;
  consequent: Statement;
  alternate?: Statement | null;
}

/**
 * Switch statement
 */
export interface SwitchStatement extends BaseNode {
  type: "SwitchStatement";
  discriminant: Expression;
  cases: SwitchCase[];
}

/**
 * Switch case: case test: stmts or default: stmts
 */
export interface SwitchCase extends BaseNode {
  type: "SwitchCase";
  test?: Expression | null;
  consequent: Statement[];
}

/**
 * Throw statement: throw expr;
 */
export interface ThrowStatement extends BaseNode {
  type: "ThrowStatement";
  argument: Expression;
}

/**
 * Try statement: try { } catch { } finally { }
 */
export interface TryStatement extends BaseNode {
  type: "TryStatement";
  block: BlockStatement;
  handler?: CatchClause | null;
  finalizer?: BlockStatement | null;
}

/**
 * Catch clause: catch (param) { body }
 */
export interface CatchClause extends BaseNode {
  type: "CatchClause";
  param?: Pattern | null;
  body: BlockStatement;
}

/**
 * While statement: while (test) { body }
 */
export interface WhileStatement extends BaseNode {
  type: "WhileStatement";
  test: Expression;
  body: Statement;
}

/**
 * Do-while statement: do { body } while (test);
 */
export interface DoWhileStatement extends BaseNode {
  type: "DoWhileStatement";
  body: Statement;
  test: Expression;
}

/**
 * For statement: for (init; test; update) { body }
 */
export interface ForStatement extends BaseNode {
  type: "ForStatement";
  init?: VariableDeclaration | Expression | null;
  test?: Expression | null;
  update?: Expression | null;
  body: Statement;
}

/**
 * For-in statement: for (left in right) { body }
 */
export interface ForInStatement extends BaseNode {
  type: "ForInStatement";
  left: VariableDeclaration | Pattern;
  right: Expression;
  body: Statement;
}

/**
 * For-of statement: for (left of right) { body }
 */
export interface ForOfStatement extends BaseNode {
  type: "ForOfStatement";
  left: VariableDeclaration | Pattern;
  right: Expression;
  body: Statement;
  await?: boolean;
}

/**
 * Labeled statement: label: stmt
 */
export interface LabeledStatement extends BaseNode {
  type: "LabeledStatement";
  label: Identifier;
  body: Statement;
}

/**
 * With statement (deprecated): with (object) { body }
 */
export interface WithStatement extends BaseNode {
  type: "WithStatement";
  object: Expression;
  body: Statement;
}

// ============================================================================
// Declaration Types
// ============================================================================

/**
 * Union of all declaration types
 */
export type Declaration =
  | VariableDeclaration
  | FunctionDeclaration
  | ClassDeclaration;

/**
 * Variable declaration: const x = 1, let y = 2, var z = 3
 */
export interface VariableDeclaration extends BaseNode {
  type: "VariableDeclaration";
  kind: "var" | "let" | "const";
  declarations: VariableDeclarator[];
  /** Whether declaration was declared with `declare` keyword (TypeScript) */
  declare?: boolean;
}

/**
 * Variable declarator: x = 1 (part of VariableDeclaration)
 */
export interface VariableDeclarator extends BaseNode {
  type: "VariableDeclarator";
  id: Pattern;
  init?: Expression | null;
  /** Whether the binding is definite (TypeScript) */
  definite?: boolean;
}

/**
 * Function declaration: function name(params) { body }
 */
export interface FunctionDeclaration extends BaseNode {
  type: "FunctionDeclaration";
  identifier: Identifier;
  params: Pattern[];
  body: BlockStatement;
  generator?: boolean;
  async?: boolean;
  /** Whether declared with `declare` keyword (TypeScript) */
  declare?: boolean;
  /** TypeScript type parameters */
  typeParameters?: any;
  /** TypeScript return type */
  returnType?: any;
}

/**
 * Class declaration: class Name { }
 */
export interface ClassDeclaration extends BaseNode {
  type: "ClassDeclaration";
  identifier: Identifier;
  superClass?: Expression | null;
  body: ClassBody;
  /** Whether declared with `declare` keyword (TypeScript) */
  declare?: boolean;
  /** Decorators */
  decorators?: any[];
  /** TypeScript type parameters */
  typeParameters?: any;
  /** TypeScript implements clause */
  implements?: any[];
}

/**
 * Class body
 */
export interface ClassBody extends BaseNode {
  type: "ClassBody";
  body: ClassMember[];
}

/**
 * Class member (property, method, etc.)
 */
export type ClassMember =
  | ClassProperty
  | ClassMethod
  | PrivateProperty
  | PrivateMethod
  | StaticBlock
  | EmptyStatement;

/**
 * Class property
 */
export interface ClassProperty extends BaseNode {
  type: "ClassProperty";
  key: Expression;
  value?: Expression | null;
  computed?: boolean;
  static?: boolean;
  accessibility?: "public" | "private" | "protected";
  abstract?: boolean;
  optional?: boolean;
  override?: boolean;
  readonly?: boolean;
  declare?: boolean;
  definite?: boolean;
  /** TypeScript type annotation */
  typeAnnotation?: any;
  /** Decorators */
  decorators?: any[];
}

/**
 * Class method
 */
export interface ClassMethod extends BaseNode {
  type: "ClassMethod";
  key: Expression;
  params: Pattern[];
  body: BlockStatement;
  kind: "method" | "constructor" | "getter" | "setter";
  computed?: boolean;
  static?: boolean;
  abstract?: boolean;
  accessibility?: "public" | "private" | "protected";
  optional?: boolean;
  override?: boolean;
  generator?: boolean;
  async?: boolean;
  /** TypeScript type parameters */
  typeParameters?: any;
  /** TypeScript return type */
  returnType?: any;
  /** Decorators */
  decorators?: any[];
}

/**
 * Private property (using # syntax)
 */
export interface PrivateProperty extends BaseNode {
  type: "PrivateProperty";
  key: PrivateName;
  value?: Expression | null;
  static?: boolean;
  /** TypeScript type annotation */
  typeAnnotation?: any;
  /** Decorators */
  decorators?: any[];
}

/**
 * Private method (using # syntax)
 */
export interface PrivateMethod extends BaseNode {
  type: "PrivateMethod";
  key: PrivateName;
  params: Pattern[];
  body: BlockStatement;
  kind: "method" | "getter" | "setter";
  static?: boolean;
  generator?: boolean;
  async?: boolean;
  /** TypeScript type parameters */
  typeParameters?: any;
  /** TypeScript return type */
  returnType?: any;
  /** Decorators */
  decorators?: any[];
}

/**
 * Private name: #name
 */
export interface PrivateName extends BaseNode {
  type: "PrivateName";
  id: Identifier;
}

/**
 * Static initialization block
 */
export interface StaticBlock extends BaseNode {
  type: "StaticBlock";
  body: Statement[];
}

// ============================================================================
// Pattern Types (destructuring and binding)
// ============================================================================

/**
 * Union of all pattern types
 */
export type Pattern =
  | Identifier
  | ArrayPattern
  | ObjectPattern
  | RestElement
  | AssignmentPattern;

/**
 * Array pattern: [a, b, ...rest]
 */
export interface ArrayPattern extends BaseNode {
  type: "ArrayPattern";
  elements: (Pattern | null)[];
  /** TypeScript type annotation */
  typeAnnotation?: any;
  optional?: boolean;
}

/**
 * Object pattern: { a, b: c, ...rest }
 */
export interface ObjectPattern extends BaseNode {
  type: "ObjectPattern";
  properties: (ObjectPatternProperty | RestElement)[];
  /** TypeScript type annotation */
  typeAnnotation?: any;
  optional?: boolean;
}

/**
 * Object pattern property: key: pattern or shorthand
 */
export interface ObjectPatternProperty extends BaseNode {
  type: "KeyValuePatternProperty" | "AssignmentPatternProperty";
  key: Expression;
  value: Pattern;
  computed?: boolean;
  shorthand?: boolean;
}

/**
 * Rest element: ...rest
 */
export interface RestElement extends BaseNode {
  type: "RestElement";
  argument: Pattern;
  /** TypeScript type annotation */
  typeAnnotation?: any;
}

/**
 * Assignment pattern: param = default
 */
export interface AssignmentPattern extends BaseNode {
  type: "AssignmentPattern";
  left: Pattern;
  right: Expression;
}

// ============================================================================
// Module Types (imports/exports)
// ============================================================================

/**
 * Module item (import, export, or statement)
 */
export type ModuleItem =
  | ImportDeclaration
  | ExportDeclaration
  | Statement;

/**
 * Import declaration: import { x } from "module"
 */
export interface ImportDeclaration extends BaseNode {
  type: "ImportDeclaration";
  specifiers: ImportSpecifier[];
  source: StringLiteral;
  /** Import assertion / attributes */
  asserts?: any;
  /** TypeScript import type */
  typeOnly?: boolean;
}

/**
 * Import specifier types
 */
export type ImportSpecifier =
  | ImportNamedSpecifier
  | ImportDefaultSpecifier
  | ImportNamespaceSpecifier;

/**
 * Named import: { x } or { x as y }
 */
export interface ImportNamedSpecifier extends BaseNode {
  type: "ImportSpecifier";
  local: Identifier;
  imported?: Identifier | StringLiteral | null;
  isTypeOnly?: boolean;
}

/**
 * Default import: x from "module"
 */
export interface ImportDefaultSpecifier extends BaseNode {
  type: "ImportDefaultSpecifier";
  local: Identifier;
}

/**
 * Namespace import: * as x from "module"
 */
export interface ImportNamespaceSpecifier extends BaseNode {
  type: "ImportNamespaceSpecifier";
  local: Identifier;
}

/**
 * Export declaration types
 */
export type ExportDeclaration =
  | ExportNamedDeclaration
  | ExportDefaultDeclaration
  | ExportDefaultExpression
  | ExportAllDeclaration;

/**
 * Named export: export { x, y } or export const x = 1
 */
export interface ExportNamedDeclaration extends BaseNode {
  type: "ExportNamedDeclaration";
  specifiers: ExportSpecifier[];
  declaration?: Declaration | null;
  source?: StringLiteral | null;
  /** TypeScript export type */
  typeOnly?: boolean;
  /** Export assertion / attributes */
  asserts?: any;
}

/**
 * Export specifier: x or x as y
 */
export interface ExportSpecifier extends BaseNode {
  type: "ExportSpecifier";
  local: Identifier | StringLiteral;
  exported?: Identifier | StringLiteral | null;
  isTypeOnly?: boolean;
}

/**
 * Default export with declaration: export default function() {}
 */
export interface ExportDefaultDeclaration extends BaseNode {
  type: "ExportDefaultDeclaration";
  decl: FunctionExpression | ClassDeclaration | FunctionDeclaration;
}

/**
 * Default export with expression: export default expr
 */
export interface ExportDefaultExpression extends BaseNode {
  type: "ExportDefaultExpression";
  expression: Expression;
}

/**
 * Export all: export * from "module"
 */
export interface ExportAllDeclaration extends BaseNode {
  type: "ExportAllDeclaration";
  source: StringLiteral;
  exported?: Identifier | null;
  /** TypeScript export type */
  typeOnly?: boolean;
  /** Export assertion / attributes */
  asserts?: any;
}

// ============================================================================
// Program (root node)
// ============================================================================

/**
 * Program - the root AST node
 */
export interface Program extends BaseNode {
  type: "Module" | "Script";
  body: ModuleItem[];
  /** "module" or "script" */
  sourceType?: "module" | "script";
  /** Hashbang/shebang */
  interpreter?: string | null;
}

// ============================================================================
// Type Guards (predicates)
// ============================================================================

/**
 * Check if node is an Identifier
 */
export function isIdentifier(node: Node | null | undefined): node is Identifier {
  return node?.type === "Identifier";
}

/**
 * Check if node is a StringLiteral
 */
export function isStringLiteral(node: Node | null | undefined): node is StringLiteral {
  return node?.type === "StringLiteral";
}

/**
 * Check if node is a NumericLiteral
 */
export function isNumericLiteral(node: Node | null | undefined): node is NumericLiteral {
  return node?.type === "NumericLiteral";
}

/**
 * Check if node is a BooleanLiteral
 */
export function isBooleanLiteral(node: Node | null | undefined): node is BooleanLiteral {
  return node?.type === "BooleanLiteral";
}

/**
 * Check if node is a NullLiteral
 */
export function isNullLiteral(node: Node | null | undefined): node is NullLiteral {
  return node?.type === "NullLiteral";
}

/**
 * Check if node is any Literal
 */
export function isLiteral(node: Node | null | undefined): node is Literal {
  return isStringLiteral(node) || isNumericLiteral(node) || isBooleanLiteral(node) || isNullLiteral(node) ||
    node?.type === "BigIntLiteral" || node?.type === "RegExpLiteral";
}

/**
 * Check if node is an ArrayExpression
 */
export function isArrayExpression(node: Node | null | undefined): node is ArrayExpression {
  return node?.type === "ArrayExpression";
}

/**
 * Check if node is an ObjectExpression
 */
export function isObjectExpression(node: Node | null | undefined): node is ObjectExpression {
  return node?.type === "ObjectExpression";
}

/**
 * Check if node is a CallExpression
 */
export function isCallExpression(node: Node | null | undefined): node is CallExpression {
  return node?.type === "CallExpression";
}

/**
 * Check if node is a MemberExpression
 */
export function isMemberExpression(node: Node | null | undefined): node is MemberExpression {
  return node?.type === "MemberExpression";
}

/**
 * Check if node is an ArrowFunctionExpression
 */
export function isArrowFunctionExpression(node: Node | null | undefined): node is ArrowFunctionExpression {
  return node?.type === "ArrowFunctionExpression";
}

/**
 * Check if node is a FunctionExpression
 */
export function isFunctionExpression(node: Node | null | undefined): node is FunctionExpression {
  return node?.type === "FunctionExpression";
}

/**
 * Check if node is a FunctionDeclaration
 */
export function isFunctionDeclaration(node: Node | null | undefined): node is FunctionDeclaration {
  return node?.type === "FunctionDeclaration";
}

/**
 * Check if node is any function type
 */
export function isFunction(node: Node | null | undefined): node is FunctionExpression | FunctionDeclaration | ArrowFunctionExpression {
  return isArrowFunctionExpression(node) || isFunctionExpression(node) || isFunctionDeclaration(node);
}

/**
 * Check if node is a VariableDeclaration
 */
export function isVariableDeclaration(node: Node | null | undefined): node is VariableDeclaration {
  return node?.type === "VariableDeclaration";
}

/**
 * Check if node is a VariableDeclarator
 */
export function isVariableDeclarator(node: Node | null | undefined): node is VariableDeclarator {
  return node?.type === "VariableDeclarator";
}

/**
 * Check if node is a BlockStatement
 */
export function isBlockStatement(node: Node | null | undefined): node is BlockStatement {
  return node?.type === "BlockStatement";
}

/**
 * Check if node is a ReturnStatement
 */
export function isReturnStatement(node: Node | null | undefined): node is ReturnStatement {
  return node?.type === "ReturnStatement";
}

/**
 * Check if node is an ExpressionStatement
 */
export function isExpressionStatement(node: Node | null | undefined): node is ExpressionStatement {
  return node?.type === "ExpressionStatement";
}

/**
 * Check if node is an Expression
 */
export function isExpression(node: Node | null | undefined): node is Expression {
  if (!node) return false;
  const exprTypes = [
    "Identifier", "StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral",
    "BigIntLiteral", "RegExpLiteral", "ArrayExpression", "ObjectExpression",
    "FunctionExpression", "ArrowFunctionExpression", "UnaryExpression",
    "UpdateExpression", "BinaryExpression", "AssignmentExpression",
    "LogicalExpression", "MemberExpression", "ConditionalExpression",
    "CallExpression", "NewExpression", "SequenceExpression", "TemplateLiteral",
    "TaggedTemplateExpression", "ThisExpression", "YieldExpression",
    "AwaitExpression", "ParenthesizedExpression", "SpreadElement"
  ];
  return exprTypes.includes(node.type);
}

/**
 * Check if node is a Statement
 */
export function isStatement(node: Node | null | undefined): node is Statement {
  if (!node) return false;
  const stmtTypes = [
    "ExpressionStatement", "BlockStatement", "EmptyStatement", "DebuggerStatement",
    "ReturnStatement", "BreakStatement", "ContinueStatement", "IfStatement",
    "SwitchStatement", "ThrowStatement", "TryStatement", "WhileStatement",
    "DoWhileStatement", "ForStatement", "ForInStatement", "ForOfStatement",
    "LabeledStatement", "WithStatement", "VariableDeclaration",
    "FunctionDeclaration", "ClassDeclaration"
  ];
  return stmtTypes.includes(node.type);
}

/**
 * Check if node is a Pattern
 */
export function isPattern(node: Node | null | undefined): node is Pattern {
  if (!node) return false;
  const patternTypes = [
    "Identifier", "ArrayPattern", "ObjectPattern", "RestElement", "AssignmentPattern"
  ];
  return patternTypes.includes(node.type);
}

// ============================================================================
// AST Builder Functions
// ============================================================================

/**
 * Create an Identifier node
 */
export function identifier(name: string): Identifier {
  return { type: "Identifier", value: name };
}

/**
 * Create a StringLiteral node
 */
export function stringLiteral(value: string): StringLiteral {
  return { type: "StringLiteral", value };
}

/**
 * Create a NumericLiteral node
 */
export function numericLiteral(value: number): NumericLiteral {
  return { type: "NumericLiteral", value };
}

/**
 * Create a BooleanLiteral node
 */
export function booleanLiteral(value: boolean): BooleanLiteral {
  return { type: "BooleanLiteral", value };
}

/**
 * Create a NullLiteral node
 */
export function nullLiteral(): NullLiteral {
  return { type: "NullLiteral" };
}

/**
 * Create an ArrayExpression node
 */
export function arrayExpression(elements: (Expression | SpreadElement | null)[] = []): ArrayExpression {
  return { type: "ArrayExpression", elements };
}

/**
 * Create an ObjectExpression node
 */
export function objectExpression(properties: ObjectMember[] = []): ObjectExpression {
  return { type: "ObjectExpression", properties };
}

/**
 * Create an ObjectProperty node
 */
export function objectProperty(
  key: Expression,
  value: Expression,
  options: { computed?: boolean; shorthand?: boolean } = {}
): ObjectProperty {
  return {
    type: "KeyValueProperty",
    key,
    value,
    computed: options.computed,
    shorthand: options.shorthand
  };
}

/**
 * Create a CallExpression node
 */
export function callExpression(
  callee: Expression,
  args: (Expression | SpreadElement)[] = []
): CallExpression {
  return {
    type: "CallExpression",
    callee,
    arguments: args
  };
}

/**
 * Create a MemberExpression node
 */
export function memberExpression(
  object: Expression,
  property: Expression,
  computed: boolean = false
): MemberExpression {
  return {
    type: "MemberExpression",
    object,
    property,
    computed
  };
}

/**
 * Create an ArrowFunctionExpression node
 */
export function arrowFunctionExpression(
  params: Pattern[],
  body: BlockStatement | Expression,
  options: { async?: boolean; generator?: boolean } = {}
): ArrowFunctionExpression {
  return {
    type: "ArrowFunctionExpression",
    params,
    body,
    async: options.async,
    generator: options.generator
  };
}

/**
 * Create a FunctionExpression node
 */
export function functionExpression(
  params: Pattern[],
  body: BlockStatement,
  options: { id?: Identifier | null; async?: boolean; generator?: boolean } = {}
): FunctionExpression {
  return {
    type: "FunctionExpression",
    identifier: options.id ?? null,
    params,
    body,
    async: options.async,
    generator: options.generator
  };
}

/**
 * Create a VariableDeclaration node
 */
export function variableDeclaration(
  kind: "var" | "let" | "const",
  declarations: VariableDeclarator[]
): VariableDeclaration {
  return {
    type: "VariableDeclaration",
    kind,
    declarations
  };
}

/**
 * Create a VariableDeclarator node
 */
export function variableDeclarator(
  id: Pattern,
  init?: Expression | null
): VariableDeclarator {
  return {
    type: "VariableDeclarator",
    id,
    init: init ?? null
  };
}

/**
 * Create a BlockStatement node
 */
export function blockStatement(stmts: Statement[] = []): BlockStatement {
  return {
    type: "BlockStatement",
    stmts
  };
}

/**
 * Create an ExpressionStatement node
 */
export function expressionStatement(expression: Expression): ExpressionStatement {
  return {
    type: "ExpressionStatement",
    expression
  };
}

/**
 * Create a ReturnStatement node
 */
export function returnStatement(argument?: Expression | null): ReturnStatement {
  return {
    type: "ReturnStatement",
    argument: argument ?? null
  };
}

/**
 * Create an IfStatement node
 */
export function ifStatement(
  test: Expression,
  consequent: Statement,
  alternate?: Statement | null
): IfStatement {
  return {
    type: "IfStatement",
    test,
    consequent,
    alternate: alternate ?? null
  };
}

/**
 * Create a BinaryExpression node
 */
export function binaryExpression(
  operator: BinaryOperator,
  left: Expression,
  right: Expression
): BinaryExpression {
  return {
    type: "BinaryExpression",
    operator,
    left,
    right
  };
}

/**
 * Create a LogicalExpression node
 */
export function logicalExpression(
  operator: LogicalOperator,
  left: Expression,
  right: Expression
): LogicalExpression {
  return {
    type: "LogicalExpression",
    operator,
    left,
    right
  };
}

/**
 * Create a UnaryExpression node
 */
export function unaryExpression(
  operator: UnaryOperator,
  argument: Expression,
  prefix: boolean = true
): UnaryExpression {
  return {
    type: "UnaryExpression",
    operator,
    argument,
    prefix
  };
}

/**
 * Create a ConditionalExpression node
 */
export function conditionalExpression(
  test: Expression,
  consequent: Expression,
  alternate: Expression
): ConditionalExpression {
  return {
    type: "ConditionalExpression",
    test,
    consequent,
    alternate
  };
}

/**
 * Create a NewExpression node
 */
export function newExpression(
  callee: Expression,
  args: (Expression | SpreadElement)[] = []
): NewExpression {
  return {
    type: "NewExpression",
    callee,
    arguments: args
  };
}

/**
 * Create a SpreadElement node
 */
export function spreadElement(argument: Expression): SpreadElement {
  return {
    type: "SpreadElement",
    arguments: argument
  };
}

/**
 * Create a TemplateLiteral node
 */
export function templateLiteral(
  quasis: TemplateElement[],
  expressions: Expression[]
): TemplateLiteral {
  return {
    type: "TemplateLiteral",
    quasis,
    expressions
  };
}

/**
 * Create a TemplateElement node
 */
export function templateElement(
  raw: string,
  cooked: string | null = raw,
  tail: boolean = false
): TemplateElement {
  return {
    type: "TemplateElement",
    raw,
    cooked,
    tail
  };
}

/**
 * Create a ThisExpression node
 */
export function thisExpression(): ThisExpression {
  return { type: "ThisExpression" };
}

/**
 * Create an AssignmentExpression node
 */
export function assignmentExpression(
  operator: AssignmentOperator,
  left: Pattern | Expression,
  right: Expression
): AssignmentExpression {
  return {
    type: "AssignmentExpression",
    operator,
    left,
    right
  };
}

/**
 * Create an AwaitExpression node
 */
export function awaitExpression(argument: Expression): AwaitExpression {
  return {
    type: "AwaitExpression",
    argument
  };
}

/**
 * Create a RestElement node
 */
export function restElement(argument: Pattern): RestElement {
  return {
    type: "RestElement",
    argument
  };
}

/**
 * Create an ArrayPattern node
 */
export function arrayPattern(elements: (Pattern | null)[]): ArrayPattern {
  return {
    type: "ArrayPattern",
    elements
  };
}

/**
 * Create an ObjectPattern node
 */
export function objectPattern(
  properties: (ObjectPatternProperty | RestElement)[]
): ObjectPattern {
  return {
    type: "ObjectPattern",
    properties
  };
}

/**
 * Create an AssignmentPattern node
 */
export function assignmentPattern(left: Pattern, right: Expression): AssignmentPattern {
  return {
    type: "AssignmentPattern",
    left,
    right
  };
}
