/**
 * Text encoding utilities for tar module
 * 
 * These are simple ASCII-compatible encoders since tar headers
 * only support ASCII characters.
 */

/**
 * Encode a string to Uint8Array (ASCII)
 */
export const encodeString = (str: string): Uint8Array => {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
};

/**
 * Decode a Uint8Array to string (ASCII)
 */
export const decodeString = (bytes: Uint8Array): string => {
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
};
