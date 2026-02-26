# Web Fetch API Design for Funee

This document specifies the design for a web-standard `fetch()` implementation in funee.

## Overview

Goal: Provide a `fetch()` API that matches the [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/) as closely as practical for a CLI runtime environment.

## Research Summary

### What the Standard Defines

From MDN/WHATWG spec:

**`fetch()`** - Global function that returns a Promise resolving to a Response

**`Response`** - Represents the response to a request
- Properties: `ok`, `status`, `statusText`, `headers`, `url`, `redirected`, `type`, `body`, `bodyUsed`
- Methods: `json()`, `text()`, `arrayBuffer()`, `blob()`, `bytes()`, `clone()`, `formData()`
- Static: `Response.error()`, `Response.redirect()`, `Response.json()`

**`Headers`** - HTTP headers collection
- Methods: `get()`, `set()`, `has()`, `delete()`, `append()`, `entries()`, `keys()`, `values()`, `forEach()`
- Iterable with `for...of`

**`Request`** - Represents a resource request
- Properties: `url`, `method`, `headers`, `body`, `bodyUsed`, `mode`, `credentials`, `cache`, `redirect`, `referrer`, `integrity`, `keepalive`, `signal`
- Methods: `json()`, `text()`, `arrayBuffer()`, `blob()`, `clone()`

### Common Usage Patterns (Priority Order)

1. **Basic GET + JSON** - `fetch(url).then(r => r.json())`
2. **Basic GET + text** - `fetch(url).then(r => r.text())`
3. **Check status** - `if (!response.ok) throw new Error(...)`
4. **POST with JSON body** - `fetch(url, { method: 'POST', body: JSON.stringify(data), headers: {...} })`
5. **Custom headers** - Authorization, Content-Type, etc.
6. **Error handling** - Network errors vs HTTP errors (4xx/5xx)

---

## Phase 1 Design (MVP)

### Global `fetch()` Function

```typescript
declare function fetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response>;
```

For Phase 1, we support:
- `input` as `string` (URL)
- Full `RequestInit` options (see below)

### `RequestInit` Options

```typescript
interface RequestInit {
  /** HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD). Default: "GET" */
  method?: string;
  
  /** Request headers. Can be Headers object, plain object, or array of [key, value] pairs */
  headers?: HeadersInit;
  
  /** Request body. String or null for Phase 1. */
  body?: string | null;
  
  /** How to handle redirects: "follow" | "error" | "manual". Default: "follow" */
  redirect?: RequestRedirect;
  
  /** AbortSignal to cancel the request */
  signal?: AbortSignal | null;
}

type HeadersInit = Headers | Record<string, string> | [string, string][];
type RequestRedirect = "follow" | "error" | "manual";
```

### `Headers` Class

```typescript
class Headers implements Iterable<[string, string]> {
  constructor(init?: HeadersInit);
  
  /** Get header value (case-insensitive). Returns null if not found. */
  get(name: string): string | null;
  
  /** Set header value (replaces existing). */
  set(name: string, value: string): void;
  
  /** Check if header exists (case-insensitive). */
  has(name: string): boolean;
  
  /** Delete a header (case-insensitive). */
  delete(name: string): void;
  
  /** Append value to header (creates if doesn't exist). */
  append(name: string, value: string): void;
  
  /** Iterate over all header entries. */
  entries(): IterableIterator<[string, string]>;
  
  /** Iterate over all header names. */
  keys(): IterableIterator<string>;
  
  /** Iterate over all header values. */
  values(): IterableIterator<string>;
  
  /** Execute callback for each header. */
  forEach(callback: (value: string, key: string, parent: Headers) => void): void;
  
  /** Default iterator (same as entries()). */
  [Symbol.iterator](): IterableIterator<[string, string]>;
}
```

**Implementation Notes:**
- Header names are stored in lowercase (per spec)
- Multiple values for same header are combined with ", "
- Should validate header names/values (no forbidden characters)

### `Response` Class

```typescript
class Response {
  constructor(body?: BodyInit | null, init?: ResponseInit);
  
  // ---- Instance Properties (read-only) ----
  
  /** True if status is 200-299 */
  readonly ok: boolean;
  
  /** HTTP status code (e.g., 200, 404, 500) */
  readonly status: number;
  
  /** Status message (e.g., "OK", "Not Found") */
  readonly statusText: string;
  
  /** Response headers */
  readonly headers: Headers;
  
  /** Final URL after redirects */
  readonly url: string;
  
  /** True if response resulted from a redirect */
  readonly redirected: boolean;
  
  /** Response type ("basic" for same-origin, etc.) - always "basic" in funee */
  readonly type: ResponseType;
  
  /** True if body has been consumed */
  readonly bodyUsed: boolean;
  
  // ---- Instance Methods ----
  
  /** Parse body as JSON */
  json(): Promise<any>;
  
  /** Get body as text string */
  text(): Promise<string>;
  
  /** Get body as ArrayBuffer */
  arrayBuffer(): Promise<ArrayBuffer>;
  
  /** Get body as Blob */
  blob(): Promise<Blob>;
  
  /** Get body as Uint8Array */
  bytes(): Promise<Uint8Array>;
  
  /** Create a copy of this Response */
  clone(): Response;
  
  // ---- Static Methods ----
  
  /** Create a network error Response */
  static error(): Response;
  
  /** Create a redirect Response */
  static redirect(url: string, status?: number): Response;
  
  /** Create a JSON Response */
  static json(data: any, init?: ResponseInit): Response;
}

interface ResponseInit {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
}

type ResponseType = "basic" | "cors" | "error" | "opaque" | "opaqueredirect";
```

**Implementation Notes:**
- Body can only be consumed once (track via `bodyUsed`)
- `clone()` must be called before consuming body if you need multiple reads
- Phase 1: body is stored as string internally, converted to other types on demand

### `Request` Class (Simplified)

```typescript
class Request {
  constructor(input: string | URL | Request, init?: RequestInit);
  
  // ---- Instance Properties (read-only) ----
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly redirect: RequestRedirect;
  readonly signal: AbortSignal | null;
  readonly bodyUsed: boolean;
  
  // ---- Instance Methods ----
  text(): Promise<string>;
  json(): Promise<any>;
  clone(): Request;
}
```

**Note:** Request class is optional for Phase 1. Users can just pass URL + RequestInit to fetch().

---

## What We WON'T Support Initially

### Deferred to Later Phases

1. **Streaming bodies** (`ReadableStream`)
   - Phase 1: Body is fully buffered as string
   - Later: Implement proper streaming for large responses
   
2. **FormData**
   - Phase 1: Use `JSON.stringify()` or manual body encoding
   - Later: Implement `FormData` class and `response.formData()`

3. **Blob (full implementation)**
   - Phase 1: Return simple object with `{ size, type, arrayBuffer() }`
   - Later: Full Blob with slice, text, stream

4. **AbortController/AbortSignal**
   - Phase 1: Accept `signal` in options but don't implement cancellation
   - Later: Wire up to Rust request cancellation

### Not Applicable (CLI Runtime)

These concepts don't apply to a CLI/server-side runtime:

1. **CORS** - No same-origin policy in CLI context
2. **Credentials/cookies** - No automatic cookie jar
3. **Cache modes** (`cache: "no-cache"`, etc.) - No browser cache
4. **Referrer/referrer policy** - No document context
5. **Mode** (`mode: "cors"`, `"no-cors"`) - Always full access
6. **Service Workers** - Not applicable
7. **CSP/integrity** - Not applicable

### Maybe Later

1. **Cookies** - Could add a cookie jar for session management
2. **Proxy support** - Useful for corporate environments
3. **Custom TLS/certificates** - For self-signed certs
4. **HTTP/2** - reqwest supports this, just needs exposing

---

## Implementation Plan

### 1. Rust Side (ops)

**Option A: Reuse existing `op_httpFetch`**
- Current signature: `(method, url, headers_json, body) -> json_response`
- Problem: Blocking (synchronous) - bad for concurrent requests
- Would need to make it async

**Option B: Create new async `op_fetch`** (Recommended)
```rust
#[op2(async)]
#[string]
async fn op_fetch(
    #[string] url: &str,
    #[string] method: &str,
    #[string] headers_json: &str,
    #[string] body: Option<&str>,
    follow_redirects: bool,
) -> Result<String, JsErrorBox> {
    // Use reqwest async client
    let client = reqwest::Client::new();
    // ... build and send request
    // Return JSON: { status, statusText, headers, body, url, redirected }
}
```

**Changes needed:**
- Add `statusText` to response (not in current op)
- Add `url` (final URL after redirects)
- Add `redirected` flag
- Support `follow_redirects` option
- Make async (use `reqwest::Client` not `reqwest::blocking::Client`)

### 2. JavaScript Side (funee-lib)

**New files:**
```
funee-lib/http/
├── Headers.ts          # Headers class implementation
├── Response.ts         # Response class implementation  
├── Request.ts          # Request class implementation (optional)
├── fetch.ts            # fetch() function implementation
└── types.ts            # Shared types (RequestInit, etc.)
```

**Headers.ts** - Pure JS, no Rust ops needed
```typescript
export class Headers implements Iterable<[string, string]> {
  private _headers: Map<string, string[]> = new Map();
  
  constructor(init?: HeadersInit) {
    if (init) {
      if (init instanceof Headers) {
        // Copy from another Headers
      } else if (Array.isArray(init)) {
        // Array of [key, value] pairs
      } else {
        // Plain object
      }
    }
  }
  // ... methods
}
```

**Response.ts** - Mostly pure JS, body parsing may use TextDecoder
```typescript
export class Response {
  #body: string | null;
  #bodyUsed = false;
  // ... implementation
}
```

**fetch.ts** - Calls Rust op, returns Response
```typescript
import { op_fetch } from "funee:internal"; // or however we expose internal ops

export async function fetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  // Normalize input to URL string
  // Build headers JSON
  // Call op_fetch
  // Wrap result in Response object
}
```

### 3. Making `fetch` a Global

Add to `run_js.rs` FETCH_BOOTSTRAP similar to TIMER_BOOTSTRAP:

```rust
const FETCH_BOOTSTRAP: &str = r#"
(() => {
    // Headers class
    globalThis.Headers = class Headers { /* ... */ };
    
    // Response class
    globalThis.Response = class Response { /* ... */ };
    
    // Request class (optional)
    globalThis.Request = class Request { /* ... */ };
    
    // fetch function
    globalThis.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : input.url;
        const method = init.method || 'GET';
        // ... normalize headers
        const result = await Deno.core.ops.op_fetch(url, method, headersJson, body, followRedirects);
        return new Response(/* parsed result */);
    };
})();
"#;
```

**Alternative:** Keep implementations in TypeScript files and import them into the bootstrap. This is cleaner but requires the bootstrap to be able to import funee-lib modules.

### 4. Export from funee-lib

Update `funee-lib/http/index.ts`:
```typescript
// Web-standard fetch API
export { Headers } from "./Headers.ts";
export { Response } from "./Response.ts";
export { Request } from "./Request.ts";  // optional
export { fetch } from "./fetch.ts";
export type { RequestInit, HeadersInit, ResponseInit } from "./types.ts";
```

**Note:** Even though `fetch`, `Headers`, `Response` are globals, we also export them for explicit imports if users prefer.

---

## Test Cases Specification

### Basic Functionality

```typescript
// 1. Basic GET returns Response
test("fetch basic GET", async () => {
  const response = await fetch("https://httpbin.org/get");
  expect(response).toBeInstanceOf(Response);
  expect(response.ok).toBe(true);
  expect(response.status).toBe(200);
});

// 2. Response.json() parses JSON
test("Response.json() parses JSON body", async () => {
  const response = await fetch("https://httpbin.org/json");
  const data = await response.json();
  expect(typeof data).toBe("object");
});

// 3. Response.text() returns string
test("Response.text() returns string", async () => {
  const response = await fetch("https://httpbin.org/html");
  const text = await response.text();
  expect(typeof text).toBe("string");
  expect(text.length).toBeGreaterThan(0);
});

// 4. POST with JSON body
test("fetch POST with JSON body", async () => {
  const response = await fetch("https://httpbin.org/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "value" })
  });
  expect(response.ok).toBe(true);
  const data = await response.json();
  expect(data.json).toEqual({ key: "value" });
});

// 5. Custom headers are sent
test("fetch sends custom headers", async () => {
  const response = await fetch("https://httpbin.org/headers", {
    headers: {
      "X-Custom-Header": "test-value",
      "Authorization": "Bearer token123"
    }
  });
  const data = await response.json();
  expect(data.headers["X-Custom-Header"]).toBe("test-value");
  expect(data.headers["Authorization"]).toBe("Bearer token123");
});
```

### Error Handling

```typescript
// 6. Network error (invalid host)
test("fetch throws on network error", async () => {
  await expect(fetch("https://invalid.invalid/"))
    .rejects.toThrow();
});

// 7. 404 response - doesn't throw, ok is false
test("404 response has ok=false", async () => {
  const response = await fetch("https://httpbin.org/status/404");
  expect(response.ok).toBe(false);
  expect(response.status).toBe(404);
});

// 8. 500 response - doesn't throw, ok is false
test("500 response has ok=false", async () => {
  const response = await fetch("https://httpbin.org/status/500");
  expect(response.ok).toBe(false);
  expect(response.status).toBe(500);
});

// 9. Response.ok is false for 4xx/5xx
test("Response.ok is false for all 4xx/5xx", async () => {
  for (const status of [400, 401, 403, 404, 500, 502, 503]) {
    const response = await fetch(`https://httpbin.org/status/${status}`);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(status);
  }
});
```

### Headers Class

```typescript
// 10. Headers constructor with object
test("Headers constructor with object", () => {
  const headers = new Headers({ "Content-Type": "application/json" });
  expect(headers.get("content-type")).toBe("application/json");
});

// 11. Headers constructor with array
test("Headers constructor with array", () => {
  const headers = new Headers([
    ["Content-Type", "application/json"],
    ["X-Custom", "value"]
  ]);
  expect(headers.get("Content-Type")).toBe("application/json");
  expect(headers.get("x-custom")).toBe("value");
});

// 12. Headers case-insensitive
test("Headers are case-insensitive", () => {
  const headers = new Headers();
  headers.set("Content-Type", "text/html");
  expect(headers.get("content-type")).toBe("text/html");
  expect(headers.get("CONTENT-TYPE")).toBe("text/html");
  expect(headers.has("Content-TYPE")).toBe(true);
});

// 13. Headers append combines values
test("Headers.append combines values", () => {
  const headers = new Headers();
  headers.append("Accept", "text/html");
  headers.append("Accept", "application/json");
  expect(headers.get("Accept")).toBe("text/html, application/json");
});

// 14. Headers iteration
test("Headers is iterable", () => {
  const headers = new Headers({ "A": "1", "B": "2" });
  const entries = [...headers];
  expect(entries).toContainEqual(["a", "1"]);
  expect(entries).toContainEqual(["b", "2"]);
});

// 15. Headers.delete removes header
test("Headers.delete removes header", () => {
  const headers = new Headers({ "X-Remove": "value" });
  expect(headers.has("X-Remove")).toBe(true);
  headers.delete("x-remove");
  expect(headers.has("X-Remove")).toBe(false);
});
```

### Response Class

```typescript
// 16. Response body can only be consumed once
test("Response body can only be consumed once", async () => {
  const response = await fetch("https://httpbin.org/json");
  await response.json();
  expect(response.bodyUsed).toBe(true);
  await expect(response.json()).rejects.toThrow();
});

// 17. Response.clone allows multiple reads
test("Response.clone allows multiple reads", async () => {
  const response = await fetch("https://httpbin.org/json");
  const clone = response.clone();
  
  const data1 = await response.json();
  const data2 = await clone.json();
  
  expect(data1).toEqual(data2);
});

// 18. Response.arrayBuffer returns ArrayBuffer
test("Response.arrayBuffer returns ArrayBuffer", async () => {
  const response = await fetch("https://httpbin.org/bytes/16");
  const buffer = await response.arrayBuffer();
  expect(buffer).toBeInstanceOf(ArrayBuffer);
  expect(buffer.byteLength).toBe(16);
});

// 19. Response static methods
test("Response.json() static method", () => {
  const response = Response.json({ hello: "world" });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
});

test("Response.error() static method", () => {
  const response = Response.error();
  expect(response.type).toBe("error");
  expect(response.status).toBe(0);
});

// 20. Response.redirect static method
test("Response.redirect() static method", () => {
  const response = Response.redirect("https://example.com", 302);
  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe("https://example.com");
});
```

### Redirect Handling

```typescript
// 21. Redirects are followed by default
test("fetch follows redirects by default", async () => {
  const response = await fetch("https://httpbin.org/redirect/1");
  expect(response.ok).toBe(true);
  expect(response.redirected).toBe(true);
  expect(response.url).toBe("https://httpbin.org/get");
});

// 22. redirect: "error" throws on redirect
test("redirect: error throws on redirect", async () => {
  await expect(
    fetch("https://httpbin.org/redirect/1", { redirect: "error" })
  ).rejects.toThrow();
});

// 23. redirect: "manual" returns redirect response
test("redirect: manual returns redirect response", async () => {
  const response = await fetch("https://httpbin.org/redirect/1", {
    redirect: "manual"
  });
  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);
});
```

### Edge Cases

```typescript
// 24. Empty response body
test("empty response body", async () => {
  const response = await fetch("https://httpbin.org/status/204");
  expect(response.status).toBe(204);
  const text = await response.text();
  expect(text).toBe("");
});

// 25. Large response body
test("large response body", async () => {
  const response = await fetch("https://httpbin.org/bytes/100000");
  const buffer = await response.arrayBuffer();
  expect(buffer.byteLength).toBe(100000);
});

// 26. Response headers are accessible
test("response headers are accessible", async () => {
  const response = await fetch("https://httpbin.org/response-headers?X-Test=value");
  expect(response.headers.get("X-Test")).toBe("value");
});

// 27. Multiple values for same header
test("multiple header values", async () => {
  // httpbin sets multiple Set-Cookie headers
  const response = await fetch("https://httpbin.org/cookies/set?a=1&b=2");
  // Note: Headers.get() combines multiple values with ", "
});
```

---

## Migration Path

For existing funee code using `httpGetJSON`, `httpPostJSON`, etc.:

1. **Keep existing functions** - They continue to work
2. **Add fetch as alternative** - New code can use web-standard fetch
3. **Deprecation (optional)** - Could deprecate old functions in favor of fetch

Example migration:
```typescript
// Old way (still works)
import { httpGetJSON } from "funee";
const data = await httpGetJSON({ target: { url: "https://api.example.com" } });

// New way (web standard)
const response = await fetch("https://api.example.com");
const data = await response.json();
```

---

## Open Questions

1. **Should Request class be in Phase 1?**
   - Minimal MVP: Just `fetch(url, init)` - no Request class needed
   - Full compatibility: Include Request for `new Request()` and passing Request to fetch
   - Recommendation: Include minimal Request class for completeness

2. **Where should implementations live?**
   - Option A: All in run_js.rs as bootstrap JS (simpler, but harder to maintain)
   - Option B: TypeScript files in funee-lib, loaded by bootstrap (cleaner, testable)
   - Recommendation: Option B - TypeScript implementations, bootstrap just assigns to globalThis

3. **Should we support URL objects?**
   - Easy to support: `new URL("https://...")` then `fetch(url)`
   - Requires: URL class to be globally available (it may already be via Deno core)
   - Recommendation: Yes, if URL is already available

4. **Binary body support in Phase 1?**
   - Current op only supports string body
   - ArrayBuffer/Uint8Array bodies would need base64 encoding or new op
   - Recommendation: String-only in Phase 1, add binary body later

---

## Summary

Phase 1 delivers:
- ✅ Global `fetch()` function
- ✅ `Headers` class (full implementation)
- ✅ `Response` class (all methods except streaming)
- ✅ `Request` class (minimal)
- ✅ `RequestInit` options (method, headers, body, redirect)
- ❌ Streaming bodies (Phase 2)
- ❌ AbortController cancellation (Phase 2)
- ❌ FormData (Phase 2)

This gives users a familiar, web-standard API for HTTP requests while maintaining compatibility with existing funee-lib HTTP utilities.
