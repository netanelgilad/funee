// Deeply nested module for testing path resolution
import { base } from "../base.ts";

export function nested(): string {
  return `nested: ${base()}`;
}
