import { createSubject } from "./subject.ts";
import { createStopError, toCallbacks } from "./toCallbacks.ts";

/**
 * Merges multiple async iterables into a single async iterable.
 * Values are emitted as they arrive from any source.
 *
 * @param sources the iterables to merge
 */
export const merge = function <T>(...sources: Array<AsyncIterable<T>>) {
  const subject = createSubject<T>();
  let done = false;
  subject.finally(() => {
    done = true;
  });
  let doneCount = 0;
  sources.map((source) => {
    return toCallbacks<T>((result) => {
      if (result.done) {
        doneCount += 1;
        if (doneCount >= sources.length) {
          done = true;
          return subject.callback(result);
        }
      }
      if (done) {
        throw createStopError();
      } else if (!result.done) {
        return subject.callback(result);
      } else {
        return Promise.resolve();
      }
    })(source);
  });
  return subject.iterator;
};
