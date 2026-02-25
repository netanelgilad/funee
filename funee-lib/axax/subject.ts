import { createDeferred, Deferred } from "./deferred.ts";

/**
 * Subject type - a push-based async iterator
 */
export type Subject<T> = {
  iterator: AsyncIterableIterator<T>;
  finally: (callback: () => void) => void;
  onCompleted: () => Promise<void>;
  onNext: (value: T) => Promise<void>;
  onError: (error: any) => void;
  isDone: () => boolean;
  callback: (result: IteratorResult<T>) => Promise<void>;
};

/**
 * Creates a Subject - the async iterator equivalent of a deferred/observable.
 * Allows pushing values to an async iterator from callbacks.
 */
export const createSubject = function <T>(): Subject<T> {
  const doneValue: IteratorResult<T> = {
    done: true,
    value: undefined as T,
  };

  const queue: Array<IteratorResult<T>> = [];
  const deferreds: Array<Deferred<IteratorResult<T>>> = [];
  let done = false;
  let noMoreResults = false;
  let backPressureDeferred = createDeferred<void>();
  const finallyCallbacks: Array<() => void> = [];
  let error: any = undefined;

  const callback = function (result: IteratorResult<T>): Promise<void> {
    if (result.done) {
      for (const queuedDeferred of deferreds) {
        queuedDeferred.resolve(result);
      }
      noMoreResults = true;
      return Promise.resolve();
    }
    const deferred = deferreds.pop();
    if (deferred !== undefined) {
      deferred.resolve(result);
      return Promise.resolve();
    } else {
      queue.push(result);
      return backPressureDeferred.promise;
    }
  };

  const iterator: AsyncIterableIterator<T> = {
    throw(e?: any) {
      done = true;
      finallyCallbacks.map((cb) => cb());
      for (const deferred of deferreds) {
        deferred.reject(e);
      }
      return Promise.reject(e);
    },
    return(_value?: any) {
      done = true;
      finallyCallbacks.map((cb) => cb());
      for (const deferred of deferreds) {
        deferred.resolve(doneValue);
      }
      return Promise.resolve(doneValue);
    },
    next(_value?: any) {
      if (error) {
        return Promise.reject(error);
      }
      const queuedItem = queue.shift();
      if (queue.length === 0) {
        backPressureDeferred.resolve();
        backPressureDeferred = createDeferred<void>();
      }
      if (queuedItem !== undefined) {
        return Promise.resolve(queuedItem);
      } else {
        if (noMoreResults && !done) {
          done = true;
          finallyCallbacks.map((cb) => cb());
        }
        if (done) {
          return Promise.resolve(doneValue);
        }
        const deferred = createDeferred<IteratorResult<T>>();
        deferreds.push(deferred);
        return deferred.promise;
      }
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };

  return {
    iterator,
    finally: (cb: () => void) => {
      finallyCallbacks.push(cb);
    },
    onCompleted: () => callback({ done: true, value: undefined as T }),
    onNext: (value: T) => callback({ done: false, value }),
    onError: (e: any) => {
      error = e;
      for (const queuedDeferred of deferreds) {
        queuedDeferred.reject(e);
      }
      noMoreResults = true;
    },
    isDone: () => done,
    callback,
  };
};
