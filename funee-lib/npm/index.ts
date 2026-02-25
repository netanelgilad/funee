/**
 * npm - npm registry utilities for funee
 *
 * This module provides functions for interacting with the npm registry.
 *
 * @example
 * ```typescript
 * import { npmPublish } from "funee";
 *
 * await npmPublish({
 *   name: "my-package",
 *   version: "1.0.0",
 *   tarballBase64: tarballData,
 *   tarballShasum: sha1Hash,
 *   authToken: "npm_xxx",
 *   distTags: ["latest"],
 * });
 * ```
 */

export type { NpmPublishOptions } from "./publish.ts";
export { npmPublish } from "./publish.ts";
