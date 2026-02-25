/**
 * Deferred type - a promise that can be resolved/rejected externally
 */
export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

/**
 * Creates a deferred promise - allows resolving/rejecting from outside
 */
export const createDeferred = function <T>(): Deferred<T> {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  let reject: (reason?: any) => void = () => {};
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
};
