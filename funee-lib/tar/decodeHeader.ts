/**
 * Decode a tar header
 * 
 * Parses a 512-byte USTAR format tar header block.
 */

import type { TarHeader, TarFileType } from "./types.ts";
import { decodeString as decodeStringUtil } from "./encoding.ts";

const USTAR_MAGIC = new Uint8Array([0x75, 0x73, 0x74, 0x61, 0x72, 0x00]); // "ustar\0"
const GNU_MAGIC = new Uint8Array([0x75, 0x73, 0x74, 0x61, 0x72, 0x20]); // "ustar "
const GNU_VER = new Uint8Array([0x20, 0x00]); // " \0"
const MAGIC_OFFSET = 257;
const VERSION_OFFSET = 263;
const ZERO_OFFSET = "0".charCodeAt(0);

/**
 * Find index of a byte in a Uint8Array within a range
 */
const indexOf = (buffer: Uint8Array, num: number, offset: number, end: number): number => {
  for (; offset < end; offset++) {
    if (buffer[offset] === num) return offset;
  }
  return end;
};

/**
 * Clamp an index to the valid range
 */
const clamp = (index: number, len: number): number => {
  index = ~~index; // Coerce to integer
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
};

/**
 * Decode a string from a Uint8Array
 */
const decodeStr = (buffer: Uint8Array, offset: number, length: number): string => {
  const end = indexOf(buffer, 0, offset, offset + length);
  return decodeStringUtil(buffer.slice(offset, end));
};

/**
 * Parse a base-256 encoded number
 */
const parse256 = (buf: Uint8Array): number | null => {
  // First byte MUST be either 80 or FF
  // 80 for positive, FF for 2's comp
  let positive: boolean;
  if (buf[0] === 0x80) positive = true;
  else if (buf[0] === 0xff) positive = false;
  else return null;

  // Build up a base-256 tuple from the least sig to the highest
  const tuple: number[] = [];
  for (let i = buf.length - 1; i > 0; i--) {
    const byte = buf[i];
    if (positive) tuple.push(byte);
    else tuple.push(0xff - byte);
  }

  let sum = 0;
  for (let i = 0; i < tuple.length; i++) {
    sum += tuple[i] * Math.pow(256, i);
  }

  return positive ? sum : -1 * sum;
};

/**
 * Decode an octal number from a Uint8Array
 */
const decodeOct = (buffer: Uint8Array, offset: number, length: number): number | null => {
  const slice = buffer.slice(offset, offset + length);
  let sliceOffset = 0;

  // If prefixed with 0x80 then parse as a base-256 integer
  if (slice[sliceOffset] & 0x80) {
    return parse256(slice);
  }

  // Older versions of tar can prefix with spaces
  while (sliceOffset < slice.length && slice[sliceOffset] === 32) sliceOffset++;

  const end = clamp(indexOf(slice, 32, sliceOffset, slice.length), slice.length);
  while (sliceOffset < end && slice[sliceOffset] === 0) sliceOffset++;

  if (end === sliceOffset) return 0;

  const octString = decodeStringUtil(slice.slice(sliceOffset, end));
  return parseInt(octString, 8);
};

/**
 * Convert typeflag number to type string
 */
const toType = (flag: number): TarFileType | null => {
  switch (flag) {
    case 0:
      return "file";
    case 1:
      return "link";
    case 2:
      return "symlink";
    case 3:
      return "character-device";
    case 4:
      return "block-device";
    case 5:
      return "directory";
    case 6:
      return "fifo";
    case 7:
      return "contiguous-file";
    case 72:
      return "pax-header";
    case 55:
      return "pax-global-header";
    case 27:
      return "gnu-long-link-path";
    case 28:
    case 30:
      return "gnu-long-path";
    default:
      return null;
  }
};

/**
 * Calculate checksum of a tar header block
 */
const cksum = (block: Uint8Array): number => {
  let sum = 8 * 32;
  for (let i = 0; i < 148; i++) sum += block[i];
  for (let j = 156; j < 512; j++) sum += block[j];
  return sum;
};

/**
 * Compare two Uint8Arrays
 */
const compareArrays = (a: Uint8Array, b: Uint8Array, bOffset: number, bEnd: number): boolean => {
  if (a.length !== bEnd - bOffset) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[bOffset + i]) return false;
  }
  return true;
};

/**
 * Decode a 512-byte tar header
 * 
 * @param buffer - 512-byte Uint8Array containing the header
 * @returns Parsed TarHeader or null if invalid
 * 
 * @example
 * ```typescript
 * const header = decodeHeader(headerBytes);
 * if (header) {
 *   console.log(header.name, header.size);
 * }
 * ```
 */
export const decodeHeader = (buffer: Uint8Array): TarHeader | null => {
  let typeflag = buffer[156] === 0 ? 0 : buffer[156] - ZERO_OFFSET;
  let name = decodeStr(buffer, 0, 100);
  const mode = decodeOct(buffer, 100, 8);
  const uid = decodeOct(buffer, 108, 8);
  const gid = decodeOct(buffer, 116, 8);
  const size = decodeOct(buffer, 124, 12);
  const mtime = decodeOct(buffer, 136, 12);
  const type = toType(typeflag);
  const linkname = buffer[157] === 0 ? null : decodeStr(buffer, 157, 100);
  const uname = decodeStr(buffer, 265, 32);
  const gname = decodeStr(buffer, 297, 32);
  const devmajor = decodeOct(buffer, 329, 8);
  const devminor = decodeOct(buffer, 337, 8);

  const c = cksum(buffer);

  // Empty block check
  if (c === 8 * 32) return null;

  // Checksum validation
  if (c !== decodeOct(buffer, 148, 8)) {
    throw new Error(
      `Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?`
    );
  }

  // Check magic
  if (compareArrays(USTAR_MAGIC, buffer, MAGIC_OFFSET, MAGIC_OFFSET + 6)) {
    // ustar (posix) format - prepend prefix if present
    if (buffer[345]) name = decodeStr(buffer, 345, 155) + "/" + name;
  } else if (
    compareArrays(GNU_MAGIC, buffer, MAGIC_OFFSET, MAGIC_OFFSET + 6) &&
    compareArrays(GNU_VER, buffer, VERSION_OFFSET, VERSION_OFFSET + 2)
  ) {
    // 'gnu'/'oldgnu' format - similar to ustar
  } else {
    throw new Error("Invalid tar header: unknown format.");
  }

  // Support old tar versions that use trailing / to indicate dirs
  if (typeflag === 0 && name && name[name.length - 1] === "/") typeflag = 5;

  if (mode === null || uid === null || gid === null || size === null || mtime === null) {
    return null;
  }

  return {
    name,
    mode,
    uid,
    gid,
    size,
    mtime: new Date(1000 * mtime),
    type: type || "file",
    linkname,
    uname,
    gname,
    devmajor: devmajor || 0,
    devminor: devminor || 0,
  };
};
