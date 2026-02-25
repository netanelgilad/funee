import { createDeferred } from "./deferred.ts";
import { createSubject } from "./subject.ts";
import { createStopError, toCallbacks } from "./toCallbacks.ts";

/**
 * Runs a mapping function over an asynchronous iterable with controlled concurrency.
 * Unlike regular map, multiple items can be processed in parallel.
 */
export const concurrentMap = function <TFrom, TTo>(
  mapper: (t: TFrom) => Promise<TTo>,
  concurrency: number
) {
  return function inner(source: AsyncIterable<TFrom>) {
    const subject = createSubject<TTo>();
    let done = false;
    subject.finally(() => {
      done = true;
    });
    let running = 0;
    let deferred = createDeferred<void>();
    toCallbacks<TFrom>((result) => {
      if (done) {
        throw createStopError();
      }
      if (!result.done) {
        running += 1;
        if (running >= concurrency) {
          deferred = createDeferred<void>();
        }
        mapper(result.value).then((value) => {
          running -= 1;
          subject.onNext(value);
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
