/**
 * toAST - Convert JavaScript values to AST nodes
 * 
 * This utility function is used by macros to convert runtime values
 * into AST representations that can be emitted as code.
 */

import {
  Expression,
  arrayExpression,
  nullLiteral,
  objectExpression,
  objectProperty,
  identifier,
  stringLiteral,
  numericLiteral,
  booleanLiteral,
} from "../ast-types.ts";

/**
 * Converts a JavaScript value to its AST representation.
 * 
 * Supports:
 * - null, undefined
 * - booleans
 * - numbers
 * - strings
 * - arrays (recursively)
 * - plain objects (recursively)
 * 
 * @param value - The value to convert to AST
 * @returns An AST Expression node representing the value
 * @throws If the value type is not supported
 * 
 * @example
 * ```typescript
 * toAST({ name: "test", values: [1, 2, 3] })
 * // Returns:
 * // {
 * //   type: "ObjectExpression",
 * //   properties: [
 * //     { type: "ObjectProperty", key: identifier("name"), value: stringLiteral("test") },
 * //     { type: "ObjectProperty", key: identifier("values"), value: arrayExpression([...]) }
 * //   ]
 * // }
 * ```
 */
export function toAST(value: any): Expression {
  if (value === null) {
    return nullLiteral();
  }
  
  if (value === undefined) {
    return identifier("undefined");
  }
  
  const type = typeof value;
  
  switch (type) {
    case "boolean":
      return booleanLiteral(value);
    
    case "number":
      return numericLiteral(value);
    
    case "string":
      return stringLiteral(value);
    
    case "object":
      if (Array.isArray(value)) {
        return arrayExpression(value.map(toAST));
      }
      // Plain object
      return objectExpression(
        Object.entries(value).map(([key, val]) =>
          objectProperty(identifier(key), toAST(val))
        )
      );
    
    default:
      throw new Error(`toAST: unsupported type "${type}"`);
  }
}
