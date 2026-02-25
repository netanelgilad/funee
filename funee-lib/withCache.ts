/**
 * withCache - Memoize a single-argument function with a simple Map cache
 * 
 * @param fn - The function to memoize
 * @returns A memoized version of the function
 * 
 * @example
 * ```typescript
 * import { withCache } from "funee";
 * 
 * const expensiveComputation = withCache((x: number) => {
 *   // ... expensive work
 *   return result;
 * });
 * 
 * expensiveComputation(5); // computed
 * expensiveComputation(5); // cached
 * ```
 */
export const withCache = <TParam, TResult>(
  fn: (param: TParam) => TResult
): ((param: TParam) => TResult) => {
  const cache = new Map<TParam, TResult>();
  
  return (param: TParam): TResult => {
    const cachedResult = cache.get(param);
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    const result = fn(param);
    cache.set(param, result);
    return result;
  };
};
