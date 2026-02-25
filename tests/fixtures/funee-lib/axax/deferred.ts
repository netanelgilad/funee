import { log, createDeferred } from "funee";

export default async function () {
  // Test resolve
  const deferred = createDeferred<string>();
  
  // Resolve synchronously (no setTimeout in funee)
  Promise.resolve().then(() => {
    deferred.resolve("resolved!");
  });
  
  const result = await deferred.promise;
  log(`deferred: ${result}`);
  
  // Test rejection
  const rejectDeferred = createDeferred<string>();
  Promise.resolve().then(() => {
    rejectDeferred.reject(new Error("rejected!"));
  });
  
  try {
    await rejectDeferred.promise;
  } catch (e: any) {
    log(`caught: ${e.message}`);
  }
}
