/**
 * createRelease - Create a GitHub release via the GitHub API
 *
 * @example
 * ```typescript
 * import { createRelease } from "funee";
 *
 * await createRelease({
 *   repoIdentifier: { owner: "myorg", name: "myrepo" },
 *   githubToken: process.env.GITHUB_TOKEN,
 *   tagName: "v1.0.0",
 *   targetCommitish: "main",
 *   prerelease: false,
 * });
 * ```
 */

import { httpPostJSON } from "../http/httpPostJSON.ts";
import type { URLString } from "../http/HttpTarget.ts";

/**
 * Identifies a GitHub repository by owner and name.
 */
export type RepoIdentifier = {
  owner: string;
  name: string;
};

/**
 * Options for creating a GitHub release.
 */
export interface CreateReleaseOptions {
  /** Repository identifier (owner and name) */
  repoIdentifier: RepoIdentifier;
  /** GitHub personal access token or app token */
  githubToken: string;
  /** The name of the tag for this release */
  tagName: string;
  /** The commitish value that determines where the tag is created from */
  targetCommitish: string;
  /** Whether this is a prerelease */
  prerelease: boolean;
  /** Optional release name/title */
  name?: string;
  /** Optional release body/description */
  body?: string;
  /** Whether to create a draft release */
  draft?: boolean;
  /** Whether to automatically generate release notes */
  generateReleaseNotes?: boolean;
}

/**
 * Response from creating a GitHub release.
 */
export interface CreateReleaseResponse {
  id: number;
  html_url: string;
  tag_name: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
}

/**
 * Create a GitHub release.
 *
 * @param opts - Options for creating the release
 * @returns The created release data
 *
 * @example
 * ```typescript
 * const release = await createRelease({
 *   repoIdentifier: { owner: "myorg", name: "myrepo" },
 *   githubToken: "ghp_xxx",
 *   tagName: "v1.0.0",
 *   targetCommitish: "main",
 *   prerelease: false,
 * });
 *
 * console.log(`Release created: ${release.html_url}`);
 * ```
 */
export const createRelease = async (
  opts: CreateReleaseOptions
): Promise<CreateReleaseResponse> => {
  const url = `https://api.github.com/repos/${opts.repoIdentifier.owner}/${opts.repoIdentifier.name}/releases` as URLString;

  const response = await httpPostJSON<CreateReleaseResponse>({
    target: { url },
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${opts.githubToken}`,
      "User-Agent": opts.repoIdentifier.owner,
    },
    data: {
      tag_name: opts.tagName,
      target_commitish: opts.targetCommitish,
      prerelease: opts.prerelease,
      ...(opts.name !== undefined && { name: opts.name }),
      ...(opts.body !== undefined && { body: opts.body }),
      ...(opts.draft !== undefined && { draft: opts.draft }),
      ...(opts.generateReleaseNotes !== undefined && {
        generate_release_notes: opts.generateReleaseNotes,
      }),
    },
  });

  return response;
};
