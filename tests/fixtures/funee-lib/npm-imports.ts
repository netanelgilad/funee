/**
 * Test fixture: Verify npm module imports work correctly
 */
import { log } from "funee";
import { npmPublish } from "funee";
import type { NpmPublishOptions } from "funee";

export default () => {
  // Test that npmPublish is a function
  log(`npmPublish is function: ${typeof npmPublish === 'function'}`);
  
  // Test that options type works
  const opts: NpmPublishOptions = {
    name: "test-package",
    version: "1.0.0",
    tarballBase64: "dGVzdA==", // "test" in base64
    tarballShasum: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
    authToken: "npm_xxx",
    distTags: ["latest"],
  };
  log(`NpmPublishOptions created: ${opts.name}@${opts.version}`);
  
  // Test with optional registry
  const optsWithRegistry: NpmPublishOptions = {
    ...opts,
    registry: "https://npm.myorg.com",
  };
  log(`Custom registry: ${optsWithRegistry.registry}`);
  
  log("npm imports test complete");
};
