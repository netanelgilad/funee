/**
 * Regular expression to parse Git refs in the format:
 * - refs/heads/<branch-name>
 * - refs/tags/<tag-name>
 * 
 * Captures the name portion (branch or tag name) in a named group.
 */
export const gitRefFormat = /^refs\/(heads|tags)\/(?<name>.*)$/;

/**
 * A GitRef is a string known to be in the format of a Git reference
 * (e.g., "refs/heads/main" or "refs/tags/v1.0.0").
 * 
 * This is a branded type - use `isGitRef` to validate strings at runtime.
 */
export type GitRef = string & { readonly __brand: 'GitRef' };

/**
 * Check if a string is a valid GitRef.
 * 
 * @param str - The string to check
 * @returns True if the string matches the GitRef format
 * 
 * @example
 * ```ts
 * if (isGitRef(ref)) {
 *   const name = getNameOfRef(ref);
 * }
 * ```
 */
export const isGitRef = (str: string): str is GitRef => {
  return gitRefFormat.test(str);
};

/**
 * Extract the branch or tag name from a Git reference.
 * 
 * @param gitRef - A valid Git reference string (e.g., "refs/heads/main")
 * @returns The name portion (e.g., "main")
 * @throws If the string is not a valid GitRef format
 * 
 * @example
 * ```ts
 * import { getNameOfRef, isGitRef } from "funee";
 * 
 * const ref = "refs/heads/feature/awesome";
 * if (isGitRef(ref)) {
 *   const name = getNameOfRef(ref);
 *   // => "feature/awesome"
 * }
 * ```
 */
export const getNameOfRef = (gitRef: GitRef): string => {
  // Need to reset lastIndex since we use the regex multiple times
  gitRefFormat.lastIndex = 0;
  const result = gitRefFormat.exec(gitRef);
  if (!result || !result.groups) {
    throw new Error("Invalid GitRef format: " + gitRef);
  }
  return result.groups.name;
};
