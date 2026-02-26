/**
 * Test fixture: Network error throws
 * 
 * Expected behavior:
 * - fetch() throws on network failures (DNS error, connection refused, etc.)
 * - This is different from HTTP errors which don't throw
 * 
 * Per web standards, fetch throws TypeError on network errors.
 */
import { log } from "funee";

export default async () => {
  let networkErrorThrown = false;
  let errorType = "";
  let errorMessage = "";
  
  try {
    // invalid.invalid is guaranteed to not resolve (ICANN reserved)
    await fetch("https://invalid.invalid/test");
    log("ERROR: fetch should have thrown on invalid host");
  } catch (error) {
    networkErrorThrown = true;
    if (error instanceof Error) {
      errorType = error.name;
      errorMessage = error.message;
    } else {
      errorType = typeof error;
    }
  }
  
  log(`network error thrown: ${networkErrorThrown}`);
  log(`error type: ${errorType}`);
  log(`has error message: ${errorMessage.length > 0}`);
  
  // Test connection refused (localhost on a port that's likely not in use)
  let connectionErrorThrown = false;
  try {
    await fetch("http://localhost:1/test");
  } catch (error) {
    connectionErrorThrown = true;
  }
  
  log(`connection error thrown: ${connectionErrorThrown}`);
  
  log("error-network test complete");
};
