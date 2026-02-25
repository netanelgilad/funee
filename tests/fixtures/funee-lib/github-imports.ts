/**
 * Test fixture: Verify GitHub module imports work correctly
 */
import { log } from "funee";
import { createRelease } from "funee";
import type { RepoIdentifier, CreateReleaseOptions, CreateReleaseResponse } from "funee";

export default () => {
  // Test that createRelease is a function
  log(`createRelease is function: ${typeof createRelease === 'function'}`);
  
  // Test that types are usable (compile-time check)
  const repo: RepoIdentifier = { owner: "test", name: "repo" };
  log(`RepoIdentifier created: ${repo.owner}/${repo.name}`);
  
  // Test that options type works
  const opts: CreateReleaseOptions = {
    repoIdentifier: repo,
    githubToken: "test-token",
    tagName: "v1.0.0",
    targetCommitish: "main",
    prerelease: false,
  };
  log(`CreateReleaseOptions created: ${opts.tagName}`);
  
  // Test response type structure
  const response: Partial<CreateReleaseResponse> = {
    id: 123,
    html_url: "https://github.com/test/repo/releases/v1.0.0",
    tag_name: "v1.0.0",
  };
  log(`CreateReleaseResponse structure: id=${response.id}`);
  
  log("github imports test complete");
};
