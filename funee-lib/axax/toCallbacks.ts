/** 
 * Error type to signal early completion from callbacks 
 */
export type StopError = Error & { __stopError: true };

/** Creates a StopError to signal early completion */
export const createStopError = function (): StopError {
  const error = new Error("StopError") as StopError;
  error.__stopError = true;
  return error;
};

/** Check if an error is a StopError */
export const isStopError = function (e: unknown): e is StopError {
  return e !== null && typeof e === "object" && "__stopError" in e;
};

/**
 * Converts an async iterable into a series of callbacks. The function returns
 * a promise that resolves when the stream is done.
 *
 * @param callback the callback that gets called for each value
 */
export const toCallbacks = function <T>(
  callback: (result: IteratorResult<T>) => Promise<void>
) {
  return async function inner(source: AsyncIterable<T>) {
    const iterator = source[Symbol.asyncIterator]();
    while (true) {
      const result = await iterator.next();
      try {
        await callback(result);
      } catch (e) {
        // StopError or any error signals early completion
        if (isStopError(e)) {
          return;
        }
        throw e;
      }
      if (result.done) {
        return;
      }
    }
  };
};
