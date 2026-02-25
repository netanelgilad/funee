import { createSubject } from "./subject.ts";

/**
 * Readable stream interface (compatible with Node.js Readable)
 */
interface Readable {
  on(event: "data", listener: (chunk: any) => void): this;
  on(event: "end", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;
}

/**
 * Creates an async iterable from a Node.js readable stream.
 * Handles data, end, and error events.
 */
export const fromNodeStream = function <T = Buffer>(stream: Readable) {
  const subject = createSubject<T>();

  stream.on("data", (chunk: T) => subject.onNext(chunk));
  stream.on("end", () => subject.onCompleted());
  stream.on("error", (e: Error) => subject.onError(e));

  return subject.iterator;
};
