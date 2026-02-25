/**
 * publish - Publish a package to the npm registry
 *
 * @example
 * ```typescript
 * import { npmPublish } from "funee";
 *
 * await npmPublish({
 *   name: "my-package",
 *   version: "1.0.0",
 *   tarballBase64: "H4sIAAAA...", // base64-encoded tarball
 *   tarballShasum: "abc123...",   // SHA1 hash of tarball
 *   authToken: process.env.NPM_TOKEN,
 *   distTags: ["latest"],
 * });
 * ```
 */

import { httpRequest } from "../http/httpRequest.ts";
import type { URLString } from "../http/HttpTarget.ts";

/**
 * Options for publishing a package to npm.
 */
export interface NpmPublishOptions {
  /** Package name (e.g., "my-package" or "@scope/my-package") */
  name: string;
  /** Package version (semver, e.g., "1.0.0") */
  version: string;
  /** Base64-encoded tarball content */
  tarballBase64: string;
  /** SHA1 hash of the tarball (hex string) */
  tarballShasum: string;
  /** npm authentication token */
  authToken: string;
  /** Distribution tags (e.g., ["latest"]) */
  distTags: string[];
  /** Registry URL (defaults to npm registry) */
  registry?: string;
}

/**
 * Publish a package to the npm registry.
 *
 * The tarball must be provided as a base64-encoded string along with
 * its SHA1 hash. This allows the caller to handle tarball creation
 * and hashing as needed.
 *
 * @param opts - Options for publishing
 * @throws If the publish fails (non-200 response)
 *
 * @example
 * ```typescript
 * // Publish a package to npm
 * await npmPublish({
 *   name: "my-package",
 *   version: "1.0.0",
 *   tarballBase64: tarballData,
 *   tarballShasum: sha1Hash,
 *   authToken: "npm_xxx",
 *   distTags: ["latest"],
 * });
 *
 * // Publish to a custom registry
 * await npmPublish({
 *   name: "@myorg/private-pkg",
 *   version: "2.0.0",
 *   tarballBase64: tarballData,
 *   tarballShasum: sha1Hash,
 *   authToken: "npm_xxx",
 *   distTags: ["latest"],
 *   registry: "https://npm.myorg.com",
 * });
 * ```
 */
export const npmPublish = async (opts: NpmPublishOptions): Promise<void> => {
  const {
    name,
    version,
    tarballBase64,
    tarballShasum,
    authToken,
    distTags,
    registry = "https://registry.npmjs.org",
  } = opts;

  // Calculate the length of the decoded tarball from base64
  // Base64 encodes 3 bytes into 4 characters
  // Length calculation: (base64Length * 3) / 4, accounting for padding
  const paddingChars = (tarballBase64.match(/=+$/) || [""])[0].length;
  const tarballLength = (tarballBase64.length * 3) / 4 - paddingChars;

  const body = {
    _id: name,
    name: name,
    access: "public",
    "dist-tags": Object.fromEntries(distTags.map((tag) => [tag, version])),
    versions: {
      [version]: {
        name: name,
        version: version,
        dist: {
          tarball: `${registry}/${name}/-/${name}-${version}.tgz`,
          shasum: tarballShasum,
        },
      },
    },
    _attachments: {
      [`${name}-${version}.tgz`]: {
        "content-type": "application/octet-stream",
        data: tarballBase64,
        length: tarballLength,
      },
    },
  };

  const url = `${registry}/${name}` as URLString;

  const response = await httpRequest({
    method: "PUT",
    target: { url },
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      "User-Agent": "funee",
    },
    body: JSON.stringify(body),
  });

  if (response.status !== 200) {
    throw new Error(
      `Failed to publish package. Response status code: ${response.status}, body: ${response.body}`
    );
  }
};
