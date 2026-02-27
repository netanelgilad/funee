/**
 * Self-hosted tests for funee standard library.
 *
 * These tests verify that funee-lib works correctly when run within
 * the funee runtime itself. Tests use the scenario/runScenarios
 * pattern with direct function calls (no CLI spawning needed).
 */

import {
  // Core types and utilities
  Closure,
  log,

  // Assertions
  assertThat,
  is,
  notAssertion,
  both,
  contains,
  matches,
  greaterThan,
  lessThan,
  greaterThanOrEqual,
  lessThanOrEqual,
  AssertionError,
  isAssertionError,
  assert,
  strictEqual,
  deepEqual,

  // Validator
  scenario,
  runScenarios,
  Scenario,

  // Filesystem
  readFile,
  writeFile,
  isFile,
  lstat,
  readdir,
  join,
  FilePathString,
  FolderPathString,

  // Streams
  toString,
  toBuffer,
  fromString,
  fromBuffer,
  empty,

  // Axax (async iterables)
  fromArray,
  toArray,
  map,
  filter,
  reduce,
  count,
  merge,
  createDeferred,
  createSubject,
} from "funee";

// ============================================================================
// ASSERTIONS TESTS
// ============================================================================

const assertionScenarios: Array<Scenario> = [
  // Basic equality - is()
  scenario({
    description: "assertions :: is matches equal values",
    verify: {
      expression: async () => {
        await assertThat(4, is(4));
        await assertThat("hello", is("hello"));
        await assertThat(true, is(true));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: is fails on unequal values",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat(4, is(5));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // Negation - not()
  scenario({
    description: "assertions :: not inverts assertion",
    verify: {
      expression: async () => {
        await assertThat(5, notAssertion(is(10)));
        await assertThat("hello", notAssertion(is("world")));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: not fails when inner passes",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat(5, notAssertion(is(5)));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // Combination - both()
  scenario({
    description: "assertions :: both combines two assertions",
    verify: {
      expression: async () => {
        await assertThat(5, both(greaterThan(3), lessThan(10)));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: both fails if first fails",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat(2, both(greaterThan(5), lessThan(10)));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: both fails if second fails",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat(15, both(greaterThan(5), lessThan(10)));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // String containment - contains()
  scenario({
    description: "assertions :: contains matches substring",
    verify: {
      expression: async () => {
        await assertThat("hello world", contains("world"));
        await assertThat("hello world", contains("hello"));
        await assertThat("testing 123", contains("123"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: contains fails on missing substring",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat("hello world", contains("xyz"));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // Array containment - contains()
  scenario({
    description: "assertions :: contains matches array element",
    verify: {
      expression: async () => {
        await assertThat([1, 2, 3], contains(2));
        await assertThat(["a", "b", "c"], contains("b"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: contains with deep equality for objects",
    verify: {
      expression: async () => {
        await assertThat([{ a: 1 }, { b: 2 }], contains({ a: 1 }));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // Pattern matching - matches()
  scenario({
    description: "assertions :: matches validates regex pattern",
    verify: {
      expression: async () => {
        await assertThat("hello123", matches(/\d+/));
        await assertThat("abc", matches(/^[a-z]+$/));
        await assertThat("user@example.com", matches(/@/));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: matches fails on non-matching pattern",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat("hello", matches(/\d+/));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // Numeric comparisons - greaterThan()
  scenario({
    description: "assertions :: greaterThan validates numeric comparison",
    verify: {
      expression: async () => {
        await assertThat(5, greaterThan(3));
        await assertThat(100, greaterThan(99));
        await assertThat(-1, greaterThan(-10));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: greaterThan fails on equal values",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat(5, greaterThan(5));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // Numeric comparisons - lessThan()
  scenario({
    description: "assertions :: lessThan validates numeric comparison",
    verify: {
      expression: async () => {
        await assertThat(3, lessThan(5));
        await assertThat(99, lessThan(100));
        await assertThat(-10, lessThan(-1));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: lessThan fails on equal values",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat(5, lessThan(5));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // Numeric comparisons - greaterThanOrEqual()
  scenario({
    description: "assertions :: greaterThanOrEqual allows equal values",
    verify: {
      expression: async () => {
        await assertThat(5, greaterThanOrEqual(5));
        await assertThat(6, greaterThanOrEqual(5));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: greaterThanOrEqual fails on smaller values",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat(4, greaterThanOrEqual(5));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // Numeric comparisons - lessThanOrEqual()
  scenario({
    description: "assertions :: lessThanOrEqual allows equal values",
    verify: {
      expression: async () => {
        await assertThat(5, lessThanOrEqual(5));
        await assertThat(4, lessThanOrEqual(5));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: lessThanOrEqual fails on larger values",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          await assertThat(6, lessThanOrEqual(5));
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // AssertionError utilities
  scenario({
    description: "assertions :: isAssertionError identifies AssertionErrors",
    verify: {
      expression: async () => {
        const err = AssertionError({
          message: "test error",
          actual: 1,
          expected: 2,
        });
        await assertThat(isAssertionError(err), is(true));
        await assertThat(isAssertionError(new Error("regular")), is(false));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // assert() - simple boolean assertion
  scenario({
    description: "assertions :: assert passes on truthy values",
    verify: {
      expression: async () => {
        assert(true, "should pass");
        assert(1, "should pass");
        assert("hello", "should pass");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: assert fails on falsy values",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          assert(false, "should fail");
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // strictEqual()
  scenario({
    description: "assertions :: strictEqual compares with ===",
    verify: {
      expression: async () => {
        strictEqual(5, 5);
        strictEqual("hello", "hello");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: strictEqual fails on different values",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          strictEqual(5, "5");
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  // deepEqual()
  scenario({
    description: "assertions :: deepEqual compares objects deeply",
    verify: {
      expression: async () => {
        deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } });
        deepEqual([1, 2, 3], [1, 2, 3]);
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "assertions :: deepEqual fails on different objects",
    verify: {
      expression: async () => {
        let caught = false;
        try {
          deepEqual({ a: 1 }, { a: 2 });
        } catch (err) {
          caught = isAssertionError(err);
        }
        if (!caught) throw new Error("Expected AssertionError");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

// ============================================================================
// VALIDATOR TESTS
// ============================================================================

const validatorScenarios: Array<Scenario> = [
  scenario({
    description: "validator :: scenario creates valid scenario object",
    verify: {
      expression: async () => {
        const s = scenario({
          description: "test scenario",
          verify: {
            expression: async () => {},
            references: new Map(),
          } as Closure<() => Promise<unknown>>,
        });
        await assertThat(s.description, is("test scenario"));
        await assertThat(typeof s.verify.expression, is("function"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "validator :: runScenarios executes passing scenarios",
    verify: {
      expression: async () => {
        const testScenarios = [
          scenario({
            description: "inner test 1",
            verify: {
              expression: async () => {
                await assertThat(1 + 1, is(2));
              },
              references: new Map(),
            } as Closure<() => Promise<unknown>>,
          }),
          scenario({
            description: "inner test 2",
            verify: {
              expression: async () => {
                await assertThat("a" + "b", is("ab"));
              },
              references: new Map(),
            } as Closure<() => Promise<unknown>>,
          }),
        ];

        const results = await runScenarios(testScenarios, { logger: () => {} });
        await assertThat(results.length, is(2));
        await assertThat(results[0].success, is(true));
        await assertThat(results[1].success, is(true));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "validator :: runScenarios reports failing scenarios",
    verify: {
      expression: async () => {
        const testScenarios = [
          scenario({
            description: "passing test",
            verify: {
              expression: async () => {
                await assertThat(1, is(1));
              },
              references: new Map(),
            } as Closure<() => Promise<unknown>>,
          }),
          scenario({
            description: "failing test",
            verify: {
              expression: async () => {
                await assertThat(1, is(2));
              },
              references: new Map(),
            } as Closure<() => Promise<unknown>>,
          }),
        ];

        const results = await runScenarios(testScenarios, { logger: () => {} });
        await assertThat(results.length, is(2));
        await assertThat(results[0].success, is(true));
        await assertThat(results[1].success, is(false));
        await assertThat(results[1].error !== undefined, is(true));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "validator :: runScenarios respects focus flag",
    verify: {
      expression: async () => {
        const testScenarios: Array<Scenario> = [
          scenario({
            description: "unfocused test",
            verify: {
              expression: async () => {},
              references: new Map(),
            } as Closure<() => Promise<unknown>>,
          }),
          scenario({
            description: "focused test",
            focus: true,
            verify: {
              expression: async () => {},
              references: new Map(),
            } as Closure<() => Promise<unknown>>,
          }),
        ];

        const results = await runScenarios(testScenarios, { logger: () => {} });
        // Only focused scenario should run
        await assertThat(results.length, is(1));
        await assertThat(results[0].description, is("focused test"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

// ============================================================================
// FILESYSTEM TESTS
// ============================================================================

const filesystemScenarios: Array<Scenario> = [
  scenario({
    description: "filesystem :: join combines path segments",
    verify: {
      expression: async () => {
        await assertThat(join("/home", "user"), is("/home/user"));
        await assertThat(join("/a/b", "c"), is("/a/b/c"));
        await assertThat(join("foo", "bar"), is("foo/bar"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "filesystem :: writeFile and readFile roundtrip",
    verify: {
      expression: async () => {
        const testPath = "/tmp/funee-stdlib-test-1.txt" as FilePathString;
        const content = "Hello from funee self-hosted test!";
        
        writeFile(testPath, content);
        const result = readFile(testPath);
        
        await assertThat(result, is(content));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "filesystem :: isFile returns true for files",
    verify: {
      expression: async () => {
        const testPath = "/tmp/funee-stdlib-test-2.txt" as FilePathString;
        writeFile(testPath, "test content");
        
        const result = isFile(testPath);
        await assertThat(result, is(true));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "filesystem :: isFile returns false for directories",
    verify: {
      expression: async () => {
        const result = isFile("/tmp");
        await assertThat(result, is(false));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "filesystem :: lstat returns file stats",
    verify: {
      expression: async () => {
        const testPath = "/tmp/funee-stdlib-test-3.txt" as FilePathString;
        const content = "test content 12345";
        writeFile(testPath, content);
        
        const stats = lstat(testPath);
        
        await assertThat(stats.is_file, is(true));
        await assertThat(stats.is_directory, is(false));
        await assertThat(stats.size, is(content.length));
        await assertThat(typeof stats.modified_ms, is("number"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "filesystem :: lstat identifies directories",
    verify: {
      expression: async () => {
        // Use /private/tmp on macOS since /tmp is a symlink
        // lstat doesn't follow symlinks, so we use the real path
        const stats = lstat("/private/tmp");
        
        await assertThat(stats.is_directory, is(true));
        await assertThat(stats.is_file, is(false));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "filesystem :: readdir lists directory contents",
    verify: {
      expression: async () => {
        // Write a test file to /tmp
        const testPath = "/tmp/funee-stdlib-test-4.txt" as FilePathString;
        writeFile(testPath, "test");
        
        const files = readdir("/tmp" as FolderPathString);
        
        await assertThat(Array.isArray(files), is(true));
        await assertThat(files, contains("funee-stdlib-test-4.txt"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "filesystem :: readFile throws on non-existent file",
    verify: {
      expression: async () => {
        let threw = false;
        try {
          readFile("/nonexistent/file/path.txt" as FilePathString);
        } catch (e) {
          threw = true;
        }
        await assertThat(threw, is(true));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "filesystem :: readdir throws on non-existent directory",
    verify: {
      expression: async () => {
        let threw = false;
        try {
          readdir("/nonexistent/directory/path" as FolderPathString);
        } catch (e) {
          threw = true;
        }
        await assertThat(threw, is(true));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

// ============================================================================
// STREAMS TESTS
// ============================================================================

const streamsScenarios: Array<Scenario> = [
  scenario({
    description: "streams :: fromString and toString roundtrip",
    verify: {
      expression: async () => {
        const input = "hello from streams test";
        const stream = fromString(input);
        const result = await toString(stream);
        await assertThat(result, is(input));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "streams :: empty yields nothing",
    verify: {
      expression: async () => {
        const result = await toString(empty());
        await assertThat(result, is(""));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "streams :: fromBuffer and toBuffer roundtrip",
    verify: {
      expression: async () => {
        const input = new Uint8Array([1, 2, 3, 4, 5]);
        const stream = fromBuffer(input);
        const result = await toBuffer(stream);
        
        await assertThat(result.length, is(5));
        await assertThat(result[0], is(1));
        await assertThat(result[4], is(5));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "streams :: empty buffer has zero length",
    verify: {
      expression: async () => {
        const result = await toBuffer(empty());
        await assertThat(result.length, is(0));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

// ============================================================================
// AXAX (ASYNC ITERABLES) TESTS
// ============================================================================

const axaxScenarios: Array<Scenario> = [
  scenario({
    description: "axax :: fromArray and toArray roundtrip",
    verify: {
      expression: async () => {
        const input = [1, 2, 3, 4, 5];
        const result = await toArray(fromArray(input));
        
        await assertThat(result.length, is(5));
        await assertThat(result[0], is(1));
        await assertThat(result[4], is(5));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: map transforms each item",
    verify: {
      expression: async () => {
        const input = fromArray([1, 2, 3]);
        const doubled = map((x: number) => x * 2)(input);
        const result = await toArray(doubled);
        
        await assertThat(result.length, is(3));
        await assertThat(result[0], is(2));
        await assertThat(result[1], is(4));
        await assertThat(result[2], is(6));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: map with index",
    verify: {
      expression: async () => {
        const input = fromArray(["a", "b", "c"]);
        const withIndex = map((x: string, i: number) => `${i}:${x}`)(input);
        const result = await toArray(withIndex);
        
        await assertThat(result[0], is("0:a"));
        await assertThat(result[1], is("1:b"));
        await assertThat(result[2], is("2:c"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: filter selects matching items",
    verify: {
      expression: async () => {
        const input = fromArray([1, 2, 3, 4, 5, 6]);
        const evens = filter((x: number) => x % 2 === 0)(input);
        const result = await toArray(evens);
        
        await assertThat(result.length, is(3));
        await assertThat(result[0], is(2));
        await assertThat(result[1], is(4));
        await assertThat(result[2], is(6));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: filter with async predicate",
    verify: {
      expression: async () => {
        const input = fromArray([1, 2, 3, 4, 5]);
        const gtTwo = filter(async (x: number) => x > 2)(input);
        const result = await toArray(gtTwo);
        
        await assertThat(result.length, is(3));
        await assertThat(result, contains(3));
        await assertThat(result, contains(4));
        await assertThat(result, contains(5));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: reduce accumulates values",
    verify: {
      expression: async () => {
        const input = fromArray([1, 2, 3, 4, 5]);
        const sum = await reduce((acc: number, x: number) => acc + x, 0)(input);
        
        await assertThat(sum, is(15));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: reduce with async reducer",
    verify: {
      expression: async () => {
        const input = fromArray([1, 2, 3, 4, 5]);
        const sum = await reduce(
          async (acc: number, x: number) => acc + x,
          10
        )(input);
        
        await assertThat(sum, is(25));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: count returns number of items",
    verify: {
      expression: async () => {
        const result = await count(fromArray([1, 2, 3, 4, 5]));
        await assertThat(result, is(5));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: count on empty iterable returns 0",
    verify: {
      expression: async () => {
        const result = await count(fromArray([]));
        await assertThat(result, is(0));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: merge combines multiple iterables",
    verify: {
      expression: async () => {
        const a = fromArray([1, 2, 3]);
        const b = fromArray([4, 5, 6]);
        const merged = merge(a, b);
        const result = await toArray(merged);
        
        // Merge interleaves - all 6 items should be present
        await assertThat(result.length, is(6));
        await assertThat(result, contains(1));
        await assertThat(result, contains(4));
        await assertThat(result, contains(6));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: createDeferred can be resolved externally",
    verify: {
      expression: async () => {
        const deferred = createDeferred<string>();
        
        // Resolve in a microtask
        Promise.resolve().then(() => deferred.resolve("resolved!"));
        
        const result = await deferred.promise;
        await assertThat(result, is("resolved!"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: createDeferred can be rejected",
    verify: {
      expression: async () => {
        const deferred = createDeferred<string>();
        
        Promise.resolve().then(() => deferred.reject(new Error("rejected!")));
        
        let caught = false;
        try {
          await deferred.promise;
        } catch (err) {
          caught = (err as Error).message === "rejected!";
        }
        await assertThat(caught, is(true));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: createSubject pushes values to iterator",
    verify: {
      expression: async () => {
        const subject = createSubject<number>();
        
        // Push values and complete
        subject.onNext(1);
        subject.onNext(2);
        subject.onNext(3);
        subject.onCompleted();
        
        const result = await toArray(subject.iterator);
        
        await assertThat(result.length, is(3));
        await assertThat(result[0], is(1));
        await assertThat(result[1], is(2));
        await assertThat(result[2], is(3));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),

  scenario({
    description: "axax :: chained transformations (pipe pattern)",
    verify: {
      expression: async () => {
        const input = fromArray([1, 2, 3, 4, 5, 6]);
        
        // Filter evens, then double them
        const evens = filter((x: number) => x % 2 === 0)(input);
        const doubled = map((x: number) => x * 2)(evens);
        const result = await toArray(doubled);
        
        // [2, 4, 6] -> [4, 8, 12]
        await assertThat(result.length, is(3));
        await assertThat(result[0], is(4));
        await assertThat(result[1], is(8));
        await assertThat(result[2], is(12));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

// ============================================================================
// COMBINED TEST RUNNER
// ============================================================================

const allScenarios: Array<Scenario> = [
  ...assertionScenarios,
  ...validatorScenarios,
  ...filesystemScenarios,
  ...streamsScenarios,
  ...axaxScenarios,
];

export default async function () {
  log("=".repeat(60));
  log("funee-lib self-hosted stdlib tests");
  log("=".repeat(60));
  log("");

  await runScenarios(allScenarios, { logger: log });

  log("");
  log("=".repeat(60));
  log("Tests complete!");
  log("=".repeat(60));
}
