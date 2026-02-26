/**
 * Test fixture: Headers class methods
 * 
 * Expected behavior:
 * - Headers.get(name) returns value or null (case-insensitive)
 * - Headers.has(name) returns boolean (case-insensitive)
 * - Headers.entries() returns iterable of [name, value] pairs
 * - Headers.keys() returns iterable of header names
 * - Headers.values() returns iterable of header values
 * - Headers.forEach() iterates over all headers
 * - Headers constructor accepts object, array, or Headers
 * 
 * Uses local test server for fast, reliable testing.
 */
import { log } from "funee";

export default async () => {
  // Test Headers from response
  const response = await fetch("http://localhost:19998/response-headers?X-Test=hello&X-Another=world");
  const headers = response.headers;
  
  // get() - should be case-insensitive
  log(`get Content-Type: ${headers.get('content-type') !== null}`);
  log(`get CONTENT-TYPE: ${headers.get('CONTENT-TYPE') !== null}`);
  
  // has() - should be case-insensitive
  log(`has content-type: ${headers.has('content-type')}`);
  log(`has Content-Type: ${headers.has('Content-Type')}`);
  log(`has nonexistent: ${headers.has('x-nonexistent')}`);
  
  // entries() - should be iterable
  log(`entries is function: ${typeof headers.entries === 'function'}`);
  let entryCount = 0;
  for (const [name, value] of headers.entries()) {
    if (entryCount < 3) {
      log(`entry: ${name}=${value.substring(0, 30)}...`);
    }
    entryCount++;
  }
  log(`entry count > 0: ${entryCount > 0}`);
  
  // keys() - should iterate over header names
  log(`keys is function: ${typeof headers.keys === 'function'}`);
  let keyCount = 0;
  for (const name of headers.keys()) {
    keyCount++;
  }
  log(`key count > 0: ${keyCount > 0}`);
  
  // values() - should iterate over header values
  log(`values is function: ${typeof headers.values === 'function'}`);
  let valueCount = 0;
  for (const value of headers.values()) {
    valueCount++;
  }
  log(`value count > 0: ${valueCount > 0}`);
  
  // forEach() - should call callback for each header
  log(`forEach is function: ${typeof headers.forEach === 'function'}`);
  let forEachCount = 0;
  headers.forEach((value, name) => {
    forEachCount++;
  });
  log(`forEach count > 0: ${forEachCount > 0}`);
  
  // Test Headers constructor (if globally available)
  if (typeof Headers !== 'undefined') {
    // From object
    const h1 = new Headers({ "X-Test": "value1" });
    log(`Headers from object: ${h1.get('x-test') === 'value1'}`);
    
    // From array
    const h2 = new Headers([["X-Test", "value2"]]);
    log(`Headers from array: ${h2.get('x-test') === 'value2'}`);
    
    // set() method
    h1.set('X-New', 'new-value');
    log(`Headers.set: ${h1.get('x-new') === 'new-value'}`);
    
    // delete() method
    h1.delete('X-New');
    log(`Headers.delete: ${h1.has('x-new') === false}`);
    
    // append() method - should combine values
    const h3 = new Headers();
    h3.append('Accept', 'text/html');
    h3.append('Accept', 'application/json');
    const acceptValue = h3.get('Accept');
    log(`Headers.append combines: ${acceptValue?.includes('text/html') && acceptValue?.includes('application/json')}`);
  } else {
    log("Headers constructor not available globally");
  }
  
  log("headers-object test complete");
};
