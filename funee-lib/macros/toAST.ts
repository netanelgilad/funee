/**
 * toAST - Convert JavaScript values to AST-like objects
 * 
 * This utility function is used by macros to convert runtime values
 * into AST-like representations. Returns code strings that construct
 * AST-like objects at runtime.
 */

/**
 * Converts a JavaScript value to code that constructs an AST-like object.
 * 
 * @param value - The value to convert to AST representation
 * @returns A code string that constructs the AST-like object
 * 
 * @example
 * ```typescript
 * toAST(42)  // '{ type: "NumericLiteral", value: 42 }'
 * toAST("hi") // '{ type: "StringLiteral", value: "hi" }'
 * toAST([1, 2]) // '{ type: "ArrayExpression", elements: [...] }'
 * ```
 */
export function toAST(value: any): string {
  if (value === null) {
    return '{ type: "NullLiteral" }';
  }
  
  if (value === undefined) {
    return '{ type: "Identifier", value: "undefined" }';
  }
  
  switch (typeof value) {
    case "boolean":
      return `{ type: "BooleanLiteral", value: ${value} }`;
    
    case "number":
      return `{ type: "NumericLiteral", value: ${value} }`;
    
    case "string":
      return `{ type: "StringLiteral", value: ${JSON.stringify(value)} }`;
    
    case "object":
      if (Array.isArray(value)) {
        const elements = value.map(toAST);
        return `{ type: "ArrayExpression", elements: [${elements.join(", ")}] }`;
      }
      // Plain object
      const properties = Object.entries(value).map(([key, val]) =>
        `{ type: "ObjectProperty", key: { type: "Identifier", value: ${JSON.stringify(key)} }, value: ${toAST(val)} }`
      );
      return `{ type: "ObjectExpression", properties: [${properties.join(", ")}] }`;
    
    default:
      throw new Error(`toAST: unsupported type "${typeof value}"`);
  }
}

/**
 * Converts a value to a JavaScript code string that reconstructs it.
 * 
 * Unlike toAST which creates AST-like objects, toCode creates the
 * actual JavaScript code to construct the value.
 * 
 * @param value - The value to convert to code
 * @returns A JavaScript code string
 * 
 * @example
 * ```typescript
 * toCode(42) // '42'
 * toCode("hi") // '"hi"'
 * toCode({ a: 1 }) // '{ a: 1 }'
 * ```
 */
export function toCode(value: any): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  
  switch (typeof value) {
    case "boolean":
    case "number":
      return String(value);
    case "string":
      return JSON.stringify(value);
    case "object":
      if (Array.isArray(value)) {
        return `[${value.map(toCode).join(", ")}]`;
      }
      const pairs = Object.entries(value).map(([k, v]) => {
        const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
        return `${key}: ${toCode(v)}`;
      });
      return `{ ${pairs.join(", ")} }`;
    default:
      throw new Error(`toCode: unsupported type "${typeof value}"`);
  }
}
