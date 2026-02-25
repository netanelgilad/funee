// Utility module served over HTTP - tests relative imports
export function helper(): string {
  return "helper from HTTP utils";
}

export function unused(): string {
  return "this should be tree-shaken";
}
