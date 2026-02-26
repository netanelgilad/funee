/**
 * Math utilities - some used by tests, some not
 */

// ✅ USED by tests - changes here trigger re-run
export const add = (a: number, b: number): number => a + b;

export const multiply = (a: number, b: number): number => a * b;

// ❌ NOT USED by tests - changes here are ignored
export const subtract = (a: number, b: number): number => a - b;

export const divide = (a: number, b: number): number => a / b;

export const modulo = (a: number, b: number): number => a % b;
