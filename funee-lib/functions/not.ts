/**
 * Inverse a function.
 * @param fn The function to inverse
 * @returns A function that returns the reverse result of the original function
 */
export const not = (fn: (...args: any[]) => boolean | Promise<boolean>) => {
  return async (...args: any[]) => {
    return !(await fn(...args));
  };
};
