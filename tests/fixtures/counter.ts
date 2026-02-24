export class Counter {
  private value: number;

  constructor() {
    this.value = 0;
  }

  increment() {
    this.value++;
  }

  getValue(): number {
    return this.value;
  }
}

// Unused class - should be tree-shaken
export class UnusedClass {
  doNothing() {}
}
