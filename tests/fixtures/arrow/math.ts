export const add = (a: number, b: number) => a + b;

export const multiply = (a: number, b: number) => {
  return a * b;
};

// Should be tree-shaken
export const subtract = (a: number, b: number) => a - b;
