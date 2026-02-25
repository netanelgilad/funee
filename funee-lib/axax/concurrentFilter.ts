import { createDeferred } from "./deferred.ts";
import { createSubject } from "./subject.ts";
import { createStopError, toCallbacks } from "./toCallbacks.ts";

/**
 * Runs a filter function over an asynchronous iterable with controlled concurrency.
 * Multiple predicate checks can run in parallel.
 */
export const concurrentFilter = function <T>(
  predicate: (t: T) => Promise<boolean>,
  concurrency: number = Infinity
) {
  return function inner(source: AsyncIterable<T>) {
    const subject = createSubject<T>();
    let done = false;
    subject.finally(() => {
      done = true;
    });
    let running = 0;
    let deferred = createDeferred<void>();
    toCallbacks<T>((result) => {
      if (done) {
        throw createStopError();
      }
      if (!result.done) {
        running += 1;
        if (running >= concurrency) {
          deferred = createDeferred<void>();
        }
        predicate(result.value).then((value) => {
          running -= 1;
          if (value) {
            subject.onNext(result.value);
          }
          if (running < concurrency) {
            deferred.resolve();
          }
        });
        return deferred.promise;
      } else {
        subject.onCompleted();
        return Promise.resolve();
      }
    })(source);
    return subject.iterator;
  };
};
