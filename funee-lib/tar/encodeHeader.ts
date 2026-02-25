/**
 * Encode a tar header
 * 
 * Creates a 512-byte USTAR format tar header from the given options.
 */

import type { TarEncodeOptions, TarFileType } from "./types.ts";
import { encodeString } from "./encoding.ts";

const SEVENS = "7777777777777777777";
const ZEROS = "0000000000000000000";
const MASK = parseInt("7777", 8);
const ZERO_OFFSET = "0".charCodeAt(0);
const USTAR_MAGIC = new Uint8Array([0x75, 0x73, 0x74, 0x61, 0x72, 0x00]); // "ustar\0"
const USTAR_VER = new Uint8Array([0x30, 0x30]); // "00"
const MAGIC_OFFSET = 257;
const VERSION_OFFSET = 263;

/**
 * Encode a number as octal string with padding
 */
const encodeOct = (val: number, n: number): string => {
  const valAsString = val.toString(8);
  if (valAsString.length > n) return SEVENS.slice(0, n) + " ";
  return ZEROS.slice(0, n - valAsString.length) + valAsString + " ";
};

/**
 * Convert type string to typeflag number
 */
const toTypeflag = (flag: TarFileType): number => {
  switch (flag) {
    case "file":
      return 0;
    case "link":
      return 1;
    case "symlink":
      return 2;
    case "character-device":
      return 3;
    case "block-device":
      return 4;
    case "directory":
      return 5;
    case "fifo":
      return 6;
    case "contiguous-file":
      return 7;
    case "pax-header":
      return 72;
    default:
      return 0;
  }
};

/**
 * Calculate checksum of a tar header block
 */
const cksum = (block: Uint8Array): number => {
  let sum = 8 * 32; // Checksum field is treated as spaces
  for (let i = 0; i < 148; i++) sum += block[i];
  for (let j = 156; j < 512; j++) sum += block[j];
  return sum;
};

/**
 * Write a string to a Uint8Array at the given offset
 */
const writeString = (buf: Uint8Array, str: string, offset: number): void => {
  for (let i = 0; i < str.length; i++) {
    buf[offset + i] = str.charCodeAt(i);
  }
};

/**
 * Encode a tar header
 * 
 * @param opts - Header options including name, mode, uid, gid, size, mtime, type
 * @returns 512-byte Uint8Array or null if encoding fails
 * 
 * @example
 * ```typescript
 * const header = encodeHeader({
 *   name: "file.txt",
 *   mode: 0o644,
 *   uid: 0,
 *   gid: 0,
 *   size: 1024,
 *   mtime: new Date(),
 *   type: "file"
 * });
 * ```
 */
export const encodeHeader = (opts: TarEncodeOptions): Uint8Array | null => {
  const buf = new Uint8Array(512);
  let name = opts.name;
  let prefix = "";

  // Add trailing slash for directories
  if (toTypeflag(opts.type) === 5 && name[name.length - 1] !== "/") {
    name += "/";
  }

  // Check for non-ASCII characters (tar only supports ASCII)
  const nameBytes = encodeString(name);
  if (nameBytes.length !== name.length) return null; // Non-ASCII not supported

  // Split long names into prefix and name
  while (name.length > 100) {
    const i = name.indexOf("/");
    if (i === -1) return null;
    prefix += prefix ? "/" + name.slice(0, i) : name.slice(0, i);
    name = name.slice(i + 1);
  }

  if (name.length > 100 || prefix.length > 155) {
    return null;
  }
  if (opts.linkname && opts.linkname.length > 100) return null;

  // Write name (0-99)
  writeString(buf, name, 0);

  // Write mode (100-107)
  writeString(buf, encodeOct(opts.mode & MASK, 6), 100);

  // Write uid (108-115)
  writeString(buf, encodeOct(opts.uid, 6), 108);

  // Write gid (116-123)
  writeString(buf, encodeOct(opts.gid, 6), 116);

  // Write size (124-135)
  writeString(buf, encodeOct(opts.size, 11), 124);

  // Write mtime (136-147)
  writeString(buf, encodeOct((opts.mtime.getTime() / 1000) | 0, 11), 136);

  // Write typeflag (156)
  buf[156] = ZERO_OFFSET + toTypeflag(opts.type);

  // Write linkname (157-256)
  if (opts.linkname) writeString(buf, opts.linkname, 157);

  // Write USTAR magic (257-262)
  buf.set(USTAR_MAGIC, MAGIC_OFFSET);

  // Write version (263-264)
  buf.set(USTAR_VER, VERSION_OFFSET);

  // Write uname (265-296)
  if (opts.uname) writeString(buf, opts.uname, 265);

  // Write gname (297-328)
  if (opts.gname) writeString(buf, opts.gname, 297);

  // Write devmajor (329-336)
  writeString(buf, encodeOct(opts.devmajor || 0, 6), 329);

  // Write devminor (337-344)
  writeString(buf, encodeOct(opts.devminor || 0, 6), 337);

  // Write prefix (345-499)
  if (prefix) writeString(buf, prefix, 345);

  // Calculate and write checksum (148-155)
  writeString(buf, encodeOct(cksum(buf), 6), 148);

  return buf;
};
