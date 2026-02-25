/**
 * GitHub - GitHub API utilities for funee
 *
 * This module provides functions for interacting with the GitHub API.
 *
 * @example
 * ```typescript
 * import { createRelease } from "funee";
 *
 * await createRelease({
 *   repoIdentifier: { owner: "myorg", name: "myrepo" },
 *   githubToken: "ghp_xxx",
 *   tagName: "v1.0.0",
 *   targetCommitish: "main",
 *   prerelease: false,
 * });
 * ```
 */

export type { RepoIdentifier, CreateReleaseOptions, CreateReleaseResponse } from "./createRelease.ts";
export { createRelease } from "./createRelease.ts";
