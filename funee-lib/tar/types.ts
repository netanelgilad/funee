/**
 * Tar archive types
 */

export type TarFileType = 
  | "file"
  | "link"
  | "symlink"
  | "character-device"
  | "block-device"
  | "directory"
  | "fifo"
  | "contiguous-file"
  | "pax-header"
  | "pax-global-header"
  | "gnu-long-link-path"
  | "gnu-long-path";

export interface TarHeader {
  name: string;
  mode: number;
  uid: number;
  gid: number;
  size: number;
  mtime: Date;
  type: TarFileType;
  linkname?: string | null;
  uname?: string;
  gname?: string;
  devmajor?: number;
  devminor?: number;
}

export interface TarEntry {
  entry: TarHeader;
  data: Uint8Array;
}

export interface TarEncodeOptions {
  name: string;
  mode: number;
  uid: number;
  gid: number;
  size: number;
  mtime: Date;
  type: TarFileType;
  typeflag?: number;
  linkname?: string;
  uname?: string;
  gname?: string;
  devmajor?: number;
  devminor?: number;
}
