import { log, cryptoRandomString } from "funee";

export default function() {
  // Test basic usage
  const str8 = cryptoRandomString(8);
  log(`length 8: ${str8.length === 8 ? "pass" : "fail"}`);
  
  const str16 = cryptoRandomString(16);
  log(`length 16: ${str16.length === 16 ? "pass" : "fail"}`);
  
  // Test that it generates hex characters only
  const hexPattern = /^[0-9a-f]+$/;
  log(`is hex: ${hexPattern.test(str16) ? "pass" : "fail"}`);
  
  // Test that different calls produce different strings (very high probability)
  const a = cryptoRandomString(32);
  const b = cryptoRandomString(32);
  log(`unique: ${a !== b ? "pass" : "fail"}`);
  
  log("cryptoRandomString test complete");
}
