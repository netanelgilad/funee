/**
 * Curry a function by binding its first argument.
 * @param fn The function to curry
 * @param firstArg The argument to bind
 * @returns A function where the first argument is bound to the value of `firstArg`
 */
export const curry = (fn: any, firstArg: any) => {
  return (...args: any[]) => fn(firstArg, ...args);
};
