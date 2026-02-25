import { log, someString } from "funee";

// Test someString utility
export default () => {
  // Default length (16)
  const str1 = someString();
  log(`default length: ${str1.length === 16 ? "pass" : "fail"}`);
  
  // Custom length
  const str2 = someString(8);
  log(`custom length 8: ${str2.length === 8 ? "pass" : "fail"}`);
  
  const str3 = someString(32);
  log(`custom length 32: ${str3.length === 32 ? "pass" : "fail"}`);
  
  // Should be hex (only 0-9 and a-f)
  const isHex = /^[0-9a-f]+$/i.test(str1);
  log(`is hex: ${isHex ? "pass" : "fail"}`);
  
  // Should generate unique values
  const str4 = someString();
  log(`unique: ${str1 !== str4 ? "pass" : "fail"}`);
  
  log("someString test complete");
};
