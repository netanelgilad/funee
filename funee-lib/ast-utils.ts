/**
 * funee - AST Utility Functions
 *
 * This module provides utility functions for working with AST nodes.
 * These are commonly used by macros for transformations and analysis.
 */

import type { Node, BaseNode } from "./ast-types.ts";
import type { Closure, CanonicalName } from "./core.ts";

// Use BaseNode as the common node type for walking (all nodes extend it)
type ASTNode = BaseNode;

/**
 * Visitor interface for walking AST nodes
 */
export interface ASTVisitor {
  /**
   * Called when entering a node (before visiting children)
   */
  enter?: (node: Node) => void;

  /**
   * Called when leaving a node (after visiting children)
   */
  leave?: (node: Node) => void;
}

/**
 * Get all property values of a node that are themselves nodes or arrays of nodes.
 * Used by walkAST to traverse the AST structure.
 */
function getChildNodes(node: Node): Node[] {
  const children: Node[] = [];

  for (const key of Object.keys(node)) {
    // Skip 'type' and 'span' - they're not child nodes
    if (key === "type" || key === "span") continue;

    const value = (node as unknown as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      // Array of nodes (e.g., body, params, elements)
      for (const item of value) {
        if (item && typeof item === "object" && "type" in item) {
          children.push(item as Node);
        }
      }
    } else if (value && typeof value === "object" && "type" in value) {
      // Single child node
      children.push(value as Node);
    }
  }

  return children;
}

/**
 * Walk an AST tree, calling visitor callbacks for each node.
 *
 * @param ast - The root AST node to walk
 * @param visitor - Object with enter and/or leave callbacks
 *
 * @example
 * ```typescript
 * const identifiers: string[] = [];
 * walkAST(ast, {
 *   enter: (node) => {
 *     if (node.type === "Identifier") {
 *       identifiers.push(node.value);
 *     }
 *   }
 * });
 * ```
 */
export function walkAST(ast: Node, visitor: ASTVisitor): void {
  // Call enter callback
  if (visitor.enter) {
    visitor.enter(ast);
  }

  // Recursively visit children
  const children = getChildNodes(ast);
  for (const child of children) {
    walkAST(child, visitor);
  }

  // Call leave callback
  if (visitor.leave) {
    visitor.leave(ast);
  }
}

/**
 * Deep clone an AST node.
 *
 * Creates a complete copy of the AST subtree, ensuring the original
 * is not mutated when transforming the clone.
 *
 * @param ast - The AST node to clone
 * @returns A deep copy of the AST node
 *
 * @example
 * ```typescript
 * const original = identifier("foo");
 * const cloned = cloneAST(original);
 * cloned.value = "bar";  // doesn't affect original
 * ```
 */
export function cloneAST<T extends Node>(ast: T): T {
  // Handle null/undefined
  if (ast === null || ast === undefined) {
    return ast;
  }

  // Handle arrays
  if (Array.isArray(ast)) {
    return ast.map((item) => cloneAST(item)) as unknown as T;
  }

  // Handle primitive types (shouldn't happen with Node, but be safe)
  if (typeof ast !== "object") {
    return ast;
  }

  // Clone object properties recursively
  const cloned: Record<string, unknown> = {};

  for (const key of Object.keys(ast)) {
    const value = (ast as unknown as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      cloned[key] = value.map((item) =>
        typeof item === "object" && item !== null ? cloneAST(item as Node) : item
      );
    } else if (value && typeof value === "object") {
      cloned[key] = cloneAST(value as Node);
    } else {
      cloned[key] = value;
    }
  }

  return cloned as unknown as T;
}

/**
 * Replace nodes of a specific type throughout an AST.
 *
 * Walks the AST and replaces any node matching the given type using
 * the replacer function. Returns a new AST (immutable - original is not modified).
 *
 * @param ast - The root AST node
 * @param nodeType - The type of nodes to replace (e.g., "Identifier", "CallExpression")
 * @param replacer - Function that receives matching nodes and returns their replacement
 * @returns A new AST with replacements applied
 *
 * @example
 * ```typescript
 * // Rename all identifiers from "foo" to "bar"
 * const newAST = replaceNodesByType(ast, "Identifier", (node) => {
 *   if (node.value === "foo") {
 *     return { ...node, value: "bar" };
 *   }
 *   return node;
 * });
 * ```
 */
export function replaceNodesByType<T extends Node = Node>(
  ast: Node,
  nodeType: string,
  replacer: (node: T) => Node
): Node {
  // Check if this node should be replaced
  if (ast.type === nodeType) {
    // Replace this node, then recursively process the result
    const replaced = replacer(ast as unknown as T);
    // If replacer returned same node (identity), don't need to recurse again
    if (replaced === ast) {
      return replaceNodeInChildren(ast, nodeType, replacer);
    }
    // Recursively process the replacement (it might have matching children)
    return replaceNodesByType(replaced, nodeType, replacer);
  }

  // Process children
  return replaceNodeInChildren(ast, nodeType, replacer);
}

/**
 * Helper to replace matching nodes in the children of an AST node.
 */
function replaceNodeInChildren<T extends Node>(
  ast: Node,
  nodeType: string,
  replacer: (node: T) => Node
): Node {
  const result: Record<string, unknown> = {};
  let hasChanges = false;

  for (const key of Object.keys(ast)) {
    const value = (ast as unknown as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      const newArray: unknown[] = [];
      let arrayChanged = false;

      for (const item of value) {
        if (item && typeof item === "object" && "type" in item) {
          const newItem = replaceNodesByType(item as Node, nodeType, replacer);
          newArray.push(newItem);
          if (newItem !== item) arrayChanged = true;
        } else {
          newArray.push(item);
        }
      }

      result[key] = arrayChanged ? newArray : value;
      if (arrayChanged) hasChanges = true;
    } else if (value && typeof value === "object" && "type" in value) {
      const newValue = replaceNodesByType(value as Node, nodeType, replacer);
      result[key] = newValue;
      if (newValue !== value) hasChanges = true;
    } else {
      result[key] = value;
    }
  }

  // Return original object if nothing changed (structural sharing)
  return hasChanges ? (result as unknown as Node) : ast;
}

/**
 * Find all identifiers in an AST that reference things outside the closure's scope.
 *
 * This walks the AST and collects identifiers that:
 * 1. Are not defined locally (as function params, variable declarations, etc.)
 * 2. Are present in the closure's references map
 *
 * @param ast - The AST to analyze
 * @param closure - The Closure containing the references map
 * @returns Map of local names to their canonical names (external references only)
 *
 * @example
 * ```typescript
 * // For expression: (x) => x * multiplier
 * // Where 'multiplier' is from another module
 * const refs = getOutOfScopeReferences(ast, closure);
 * // Returns: Map { "multiplier" => { uri: "./math.ts", name: "multiplier" } }
 * ```
 */
export function getOutOfScopeReferences(
  ast: Node,
  closure: Closure<unknown>
): Map<string, CanonicalName> {
  const result = new Map<string, CanonicalName>();
  const localBindings = new Set<string>();

  // Walk AST to find:
  // 1. Local bindings (function params, variable declarations, etc.)
  // 2. Identifier usages

  walkAST(ast, {
    enter: (node) => {
      // Track local bindings
      switch (node.type) {
        case "ArrowFunctionExpression":
        case "FunctionExpression":
        case "FunctionDeclaration": {
          // Add parameter names to local bindings
          const params = (node as { params?: Node[] }).params || [];
          for (const param of params) {
            collectBindingNames(param, localBindings);
          }
          break;
        }

        case "VariableDeclarator": {
          // Add variable name to local bindings
          const id = (node as { id?: Node }).id;
          if (id) {
            collectBindingNames(id, localBindings);
          }
          break;
        }

        case "CatchClause": {
          // Add catch parameter to local bindings
          const param = (node as { param?: Node }).param;
          if (param) {
            collectBindingNames(param, localBindings);
          }
          break;
        }

        case "Identifier": {
          // Check if this identifier is a reference (not a binding site)
          const name = getIdentifierName(node);
          if (name && !localBindings.has(name)) {
            // Check if it's in the closure's references
            const canonicalName = closure.references.get(name);
            if (canonicalName) {
              result.set(name, canonicalName);
            }
          }
          break;
        }
      }
    },
  });

  return result;
}

/**
 * Get the name from an Identifier node.
 * Handles both Babel-style ({ name: "foo" }) and SWC-style ({ value: "foo" }) identifiers.
 */
function getIdentifierName(node: Node): string | null {
  if (node.type !== "Identifier") return null;

  const nodeAny = node as { value?: string; name?: string };
  return nodeAny.value ?? nodeAny.name ?? null;
}

/**
 * Collect all binding names from a pattern node.
 * Handles simple identifiers, array patterns, object patterns, etc.
 */
function collectBindingNames(node: Node, bindings: Set<string>): void {
  switch (node.type) {
    case "Identifier": {
      const name = getIdentifierName(node);
      if (name) bindings.add(name);
      break;
    }

    case "ArrayPattern": {
      const elements = (node as { elements?: (Node | null)[] }).elements || [];
      for (const element of elements) {
        if (element) collectBindingNames(element, bindings);
      }
      break;
    }

    case "ObjectPattern": {
      const properties = (node as { properties?: Node[] }).properties || [];
      for (const prop of properties) {
        // ObjectPatternProperty uses "KeyValuePatternProperty" or "AssignmentPatternProperty" as type
        if (prop.type === "KeyValuePatternProperty") {
          const value = (prop as { value?: Node }).value;
          if (value) collectBindingNames(value, bindings);
        } else if (prop.type === "AssignmentPatternProperty") {
          // Shorthand property: { x } or { x = default }
          const key = (prop as { key?: Node }).key;
          if (key) collectBindingNames(key, bindings);
        } else if (prop.type === "RestElement") {
          collectBindingNames(prop, bindings);
        }
      }
      break;
    }

    case "RestElement": {
      const argument = (node as { argument?: Node }).argument;
      if (argument) collectBindingNames(argument, bindings);
      break;
    }

    case "AssignmentPattern":
    case "AssignmentPatternProperty": {
      const left = (node as { left?: Node; key?: Node }).left ?? (node as { key?: Node }).key;
      if (left) collectBindingNames(left, bindings);
      break;
    }
  }
}
