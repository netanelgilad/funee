# HTTP Server API Design for Funee

This document specifies the design for an HTTP server API in funee that lets users create web servers.

## Overview

Goal: Provide a simple, ergonomic HTTP server API that follows funee conventions (factory functions, arrow function style) while leveraging web-standard types (Request, Response, Headers) from our existing fetch implementation.

---

## Research Summary

### Deno's `Deno.serve()` (Modern, Simple)

```typescript
// Minimal - defaults to port 8000
Deno.serve((req) => new Response("Hello!"));

// With options
Deno.serve({ port: 3000 }, (req) => new Response("Hello!"));

// Async handler
Deno.serve(async (req) => {
  const body = await req.json();
  return new Response(JSON.stringify(body));
});
```

**Pros:**
- Extremely simple API
- Uses web-standard Request/Response
- Handler-first design
- Single function does everything

**Cons:**
- Limited configuration surface
- Returns a Server object with methods (class-based internally)

### Bun's `Bun.serve()` (Feature-rich)

```typescript
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello!");
  },
  routes: {
    "/api/status": new Response("OK"),
    "/users/:id": (req) => new Response(`User ${req.params.id}`),
  },
});
```

**Pros:**
- Built-in routing
- Rich configuration
- Server lifecycle methods (stop, reload)
- Returns server object with metrics

**Cons:**
- More complex API surface
- `routes` adds complexity

### Node's `http.createServer()` (Traditional)

```typescript
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello World\n");
});
server.listen(3000);
```

**Pros:**
- Fine-grained control
- Streaming-friendly design

**Cons:**
- Verbose, callback-heavy
- Non-standard req/res objects
- Two-step (create + listen)

### Pattern Decision: Deno-style

Funee should follow Deno's approach because:
1. **Simplicity** - One function, clear behavior
2. **Web Standards** - Reuses our existing Response/Headers types
3. **Handler-first** - Matches functional programming style
4. **No routing built-in** - Keep core simple, routing is userland

---

## API Design

### Simple API

The primary API is a single `serve` function:

```typescript
// Signature
const serve = (
  optionsOrHandler: ServeOptions | RequestHandler,
  handler?: RequestHandler
) => Server;

// Types
type RequestHandler = (request: Request, info: RequestInfo) => Response | Promise<Response>;

type ServeOptions = {
  port?: number;           // Default: 8000
  hostname?: string;       // Default: "127.0.0.1"
  signal?: AbortSignal;    // For graceful shutdown
  onListen?: (info: ListenInfo) => void;
  onError?: (error: Error) => Response | Promise<Response>;
};

type RequestInfo = {
  remoteAddr: { hostname: string; port: number };
};

type ListenInfo = {
  hostname: string;
  port: number;
};

type Server = {
  readonly port: number;
  readonly hostname: string;
  shutdown: () => Promise<void>;
  ref: () => void;
  unref: () => void;
};
```

### Usage Examples

```typescript
import { serve } from "funee";

// 1. Minimal - just a handler (defaults to port 8000)
serve((req) => new Response("Hello, World!"));

// 2. With port option
serve({ port: 3000 }, (req) => new Response("Hello!"));

// 3. Full options
serve({
  port: 3000,
  hostname: "0.0.0.0",
  onListen: ({ hostname, port }) => {
    console.log(`Server running at http://${hostname}:${port}`);
  },
  onError: (error) => {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
}, async (req) => {
  // Handler has full access to web-standard Request
  const url = new URL(req.url);
  
  if (url.pathname === "/api/data") {
    const data = await req.json();
    return Response.json({ received: data });
  }
  
  return new Response("Not Found", { status: 404 });
});

// 4. Programmatic shutdown
const controller = new AbortController();

const server = serve({
  port: 3000,
  signal: controller.signal,
}, (req) => new Response("Hello!"));

// Later: graceful shutdown
await server.shutdown();
// Or via signal:
// controller.abort();
```

---

## Request Object

The handler receives a web-standard `Request` object. We already have Request types from our fetch implementation, but for the server we need to ensure it has:

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string` | Full URL including protocol, host, path, query |
| `method` | `string` | HTTP method (GET, POST, PUT, DELETE, etc.) |
| `headers` | `Headers` | Request headers (our existing Headers type) |
| `body` | `ReadableStream \| null` | Request body stream (null for GET/HEAD) |
| `bodyUsed` | `boolean` | Whether body has been consumed |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `json()` | `Promise<unknown>` | Parse body as JSON |
| `text()` | `Promise<string>` | Get body as text |
| `arrayBuffer()` | `Promise<ArrayBuffer>` | Get body as ArrayBuffer |
| `formData()` | `Promise<FormData>` | Parse body as form data (Phase 2) |
| `clone()` | `Request` | Clone the request |

### URL Parsing

Users parse URLs themselves using the standard `URL` class:

```typescript
serve((req) => {
  const url = new URL(req.url);
  
  console.log(url.pathname);     // "/api/users"
  console.log(url.search);       // "?page=1"
  console.log(url.searchParams.get("page")); // "1"
  
  return new Response("OK");
});
```

**Decision:** No built-in URL param parsing. The `URL` API is standard and sufficient. Routing libraries can add pattern matching (`/users/:id`).

---

## Response Creation

We reuse our existing Response type from the fetch API. No changes needed.

### Creating Responses

```typescript
// Basic text response
new Response("Hello!");

// With status and headers
new Response("Not Found", {
  status: 404,
  headers: { "Content-Type": "text/plain" }
});

// JSON response (static method)
Response.json({ message: "Hello" });

// Redirect
Response.redirect("https://example.com", 302);

// Empty response
new Response(null, { status: 204 });

// Streaming response (Phase 2)
new Response(readableStream, {
  headers: { "Content-Type": "text/event-stream" }
});
```

### Factory Function Aliases

For funee-style consistency, we also export factory functions:

```typescript
import { createResponse, createJsonResponse, createRedirectResponse } from "funee";

// These are aliases for the Response constructor/static methods
createResponse("Hello!");
createJsonResponse({ message: "Hello" });
createRedirectResponse("/new-location", 302);
```

**Decision:** Use existing Response type from fetch. No need for a separate server Response type.

---

## Server Lifecycle

### Starting the Server

```typescript
const server = serve({ port: 3000 }, handler);

// Server is now listening
console.log(`Listening on port ${server.port}`);
```

The server starts listening immediately when `serve()` is called. There's no separate `.listen()` step.

### Graceful Shutdown

Two ways to stop the server:

```typescript
// 1. Via server.shutdown()
const server = serve({ port: 3000 }, handler);
await server.shutdown(); // Waits for in-flight requests

// 2. Via AbortSignal
const controller = new AbortController();
serve({ port: 3000, signal: controller.signal }, handler);
controller.abort(); // Triggers shutdown
```

### Error Handling

```typescript
serve({
  port: 3000,
  onError: (error) => {
    // Called when handler throws or rejects
    console.error("Request error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
}, async (req) => {
  throw new Error("Something went wrong");
  // onError will handle this and return the 500 response
});
```

If no `onError` is provided, unhandled errors return a generic 500 response.

### Keeping Process Alive

```typescript
const server = serve({ port: 3000 }, handler);

// Server keeps the process alive by default
server.unref(); // Process can exit if server is only thing running
server.ref();   // Restore: keep process alive
```

---

## Routing

**Decision:** No built-in routing. Keep the core simple.

Routing is left to userland. A simple pattern:

```typescript
// Manual routing with if/switch
serve((req) => {
  const url = new URL(req.url);
  
  if (url.pathname === "/") {
    return new Response("Home");
  }
  if (url.pathname === "/about") {
    return new Response("About");
  }
  return new Response("Not Found", { status: 404 });
});

// With a simple router helper (userland)
const router = createRouter({
  "GET /": () => new Response("Home"),
  "GET /users": listUsers,
  "POST /users": createUser,
  "GET /users/:id": getUser,
});

serve(router.handler);
```

We may provide a basic router as a separate module later, but it's not part of the core server API.

---

## Implementation Plan

### Phase 1: Core Server (MVP)

**Rust Ops Required:**

```rust
// Start listening on a port, returns server ID
#[op2]
fn op_serverStart(
    port: u16,
    #[string] hostname: &str,
) -> Result<u32, JsErrorBox>;

// Accept next connection, returns request data or null if shutdown
#[op2(async)]
async fn op_serverAccept(
    server_id: u32,
) -> Result<Option<ServerRequest>, JsErrorBox>;

// Send response for a request
#[op2(async)]
async fn op_serverRespond(
    request_id: u32,
    status: u16,
    #[string] status_text: &str,
    #[string] headers_json: &str,
    #[string] body: Option<&str>,
) -> Result<(), JsErrorBox>;

// Read request body (chunked)
#[op2(async)]
async fn op_serverReadBody(
    request_id: u32,
) -> Result<Option<Vec<u8>>, JsErrorBox>;

// Stop accepting connections
#[op2(async)]
async fn op_serverStop(
    server_id: u32,
) -> Result<(), JsErrorBox>;
```

**Request/Response Data Structures:**

```rust
// Returned by op_serverAccept
struct ServerRequest {
    request_id: u32,
    method: String,
    url: String,           // Full URL with protocol
    headers: Vec<(String, String)>,
    has_body: bool,
}
```

**JavaScript Implementation:**

```typescript
// funee-lib/server/serve.ts

import { Response, Headers } from "../http/index.ts";

// Internal ops (provided by runtime)
declare function serverStart(port: number, hostname: string): number;
declare function serverAccept(serverId: number): Promise<RawRequest | null>;
declare function serverRespond(
  requestId: number,
  status: number,
  statusText: string,
  headers: string,
  body: string | null
): Promise<void>;
declare function serverReadBody(requestId: number): Promise<Uint8Array | null>;
declare function serverStop(serverId: number): Promise<void>;

type RawRequest = {
  requestId: number;
  method: string;
  url: string;
  headers: [string, string][];
  hasBody: boolean;
};

export const serve = (
  optionsOrHandler: ServeOptions | RequestHandler,
  maybeHandler?: RequestHandler
): Server => {
  // Normalize arguments
  const options = typeof optionsOrHandler === "function" 
    ? {} 
    : optionsOrHandler;
  const handler = typeof optionsOrHandler === "function"
    ? optionsOrHandler
    : maybeHandler!;

  const port = options.port ?? 8000;
  const hostname = options.hostname ?? "127.0.0.1";
  
  // Start server
  const serverId = serverStart(port, hostname);
  
  // Call onListen callback
  options.onListen?.({ hostname, port });
  
  // Accept loop
  const acceptLoop = async () => {
    while (true) {
      const raw = await serverAccept(serverId);
      if (raw === null) break; // Server stopped
      
      // Handle request (don't await - handle concurrently)
      handleRequest(raw, handler, options.onError);
    }
  };
  
  // Start accept loop
  acceptLoop();
  
  // Return server handle
  return {
    port,
    hostname,
    shutdown: () => serverStop(serverId),
    ref: () => { /* TODO: implement */ },
    unref: () => { /* TODO: implement */ },
  };
};

const handleRequest = async (
  raw: RawRequest,
  handler: RequestHandler,
  onError?: (error: Error) => Response | Promise<Response>
) => {
  try {
    // Build Request object
    const headers = new Headers(raw.headers);
    const request = createServerRequest(raw, headers);
    
    // Call handler
    const response = await handler(request, {
      remoteAddr: { hostname: "127.0.0.1", port: 0 }, // TODO: get from raw
    });
    
    // Send response
    await sendResponse(raw.requestId, response);
    
  } catch (error) {
    const errorResponse = onError
      ? await onError(error as Error)
      : new Response("Internal Server Error", { status: 500 });
    await sendResponse(raw.requestId, errorResponse);
  }
};

const sendResponse = async (requestId: number, response: Response) => {
  const headersObj: Record<string, string> = {};
  for (const [key, value] of response.headers) {
    headersObj[key] = value;
  }
  
  const body = await response.text(); // TODO: handle streaming
  
  await serverRespond(
    requestId,
    response.status,
    response.statusText,
    JSON.stringify(headersObj),
    body || null
  );
};
```

### Phase 2: Enhanced Features

- **Streaming request bodies** - Read body chunks with `serverReadBody`
- **Streaming responses** - Send body chunks instead of full body
- **WebSocket upgrade** - `upgradeWebSocket(request)` function
- **TLS/HTTPS** - `cert` and `key` options
- **HTTP/2** - Automatic protocol negotiation

### Integration with deno_core Event Loop

The async ops (`op_serverAccept`, `op_serverRespond`, etc.) integrate with deno_core's Tokio runtime:

1. `op_serverStart` creates a `TcpListener` and stores it in `OpState`
2. `op_serverAccept` awaits `listener.accept()` via Tokio
3. Each request gets a unique ID, connection stored in a map
4. `op_serverRespond` writes the HTTP response to the connection
5. `op_serverStop` drops the listener, causing `accept()` to return None

**Rust-side Sketch:**

```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;

struct ServerState {
    listeners: HashMap<u32, TcpListener>,
    connections: HashMap<u32, TcpStream>,
    next_server_id: u32,
    next_request_id: u32,
}

#[op2]
fn op_serverStart(
    state: &mut OpState,
    port: u16,
    #[string] hostname: &str,
) -> Result<u32, JsErrorBox> {
    let addr = format!("{}:{}", hostname, port);
    let listener = std::net::TcpListener::bind(&addr)
        .map_err(|e| JsErrorBox::generic(format!("Failed to bind: {}", e)))?;
    listener.set_nonblocking(true)?;
    
    let listener = TcpListener::from_std(listener)?;
    
    let server_state = state.borrow_mut::<ServerState>();
    let id = server_state.next_server_id;
    server_state.next_server_id += 1;
    server_state.listeners.insert(id, listener);
    
    Ok(id)
}

#[op2(async)]
async fn op_serverAccept(
    state: Rc<RefCell<OpState>>,
    server_id: u32,
) -> Result<Option<String>, JsErrorBox> {
    // Get listener from state
    // await accept()
    // Parse HTTP request
    // Store connection, return request JSON
}
```

---

## Constraints Compliance

✅ **Factory functions (no classes)** - `serve()` is a function returning a plain object
✅ **Arrow function style** - Handlers are arrow functions
✅ **Keep it simple for v1** - Single function API, no routing, minimal options

---

## Test Cases (Specification Only)

These tests specify expected behavior. Implementation is separate.

### Basic Server Tests

```typescript
// 1. Start server and respond to request
test("serve responds to requests", async () => {
  const server = serve({ port: 0 }, () => new Response("Hello"));
  const response = await fetch(`http://localhost:${server.port}/`);
  expect(await response.text()).toBe("Hello");
  await server.shutdown();
});

// 2. Handle different HTTP methods
test("serve handles different methods", async () => {
  const server = serve({ port: 0 }, (req) => {
    return new Response(req.method);
  });
  
  const get = await fetch(`http://localhost:${server.port}/`);
  expect(await get.text()).toBe("GET");
  
  const post = await fetch(`http://localhost:${server.port}/`, { method: "POST" });
  expect(await post.text()).toBe("POST");
  
  await server.shutdown();
});

// 3. Access request URL and path
test("serve receives full request URL", async () => {
  const server = serve({ port: 0 }, (req) => {
    const url = new URL(req.url);
    return Response.json({
      pathname: url.pathname,
      search: url.search,
    });
  });
  
  const response = await fetch(`http://localhost:${server.port}/api/test?foo=bar`);
  const data = await response.json();
  expect(data.pathname).toBe("/api/test");
  expect(data.search).toBe("?foo=bar");
  
  await server.shutdown();
});

// 4. Access request headers
test("serve receives request headers", async () => {
  const server = serve({ port: 0 }, (req) => {
    return new Response(req.headers.get("x-custom"));
  });
  
  const response = await fetch(`http://localhost:${server.port}/`, {
    headers: { "X-Custom": "test-value" }
  });
  expect(await response.text()).toBe("test-value");
  
  await server.shutdown();
});
```

### Request Body Tests

```typescript
// 5. Parse JSON body
test("serve parses JSON body", async () => {
  const server = serve({ port: 0 }, async (req) => {
    const body = await req.json();
    return Response.json({ received: body });
  });
  
  const response = await fetch(`http://localhost:${server.port}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hello: "world" }),
  });
  const data = await response.json();
  expect(data.received).toEqual({ hello: "world" });
  
  await server.shutdown();
});

// 6. Parse text body
test("serve parses text body", async () => {
  const server = serve({ port: 0 }, async (req) => {
    const text = await req.text();
    return new Response(`Received: ${text}`);
  });
  
  const response = await fetch(`http://localhost:${server.port}/`, {
    method: "POST",
    body: "hello world",
  });
  expect(await response.text()).toBe("Received: hello world");
  
  await server.shutdown();
});
```

### Response Tests

```typescript
// 7. Set response headers
test("serve sets response headers", async () => {
  const server = serve({ port: 0 }, () => {
    return new Response("OK", {
      headers: { "X-Custom": "response-value" }
    });
  });
  
  const response = await fetch(`http://localhost:${server.port}/`);
  expect(response.headers.get("x-custom")).toBe("response-value");
  
  await server.shutdown();
});

// 8. Set status code
test("serve sets status code", async () => {
  const server = serve({ port: 0 }, () => {
    return new Response("Not Found", { status: 404 });
  });
  
  const response = await fetch(`http://localhost:${server.port}/`);
  expect(response.status).toBe(404);
  expect(response.ok).toBe(false);
  
  await server.shutdown();
});

// 9. JSON response helper
test("Response.json works", async () => {
  const server = serve({ port: 0 }, () => {
    return Response.json({ message: "hello" });
  });
  
  const response = await fetch(`http://localhost:${server.port}/`);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual({ message: "hello" });
  
  await server.shutdown();
});
```

### Concurrency Tests

```typescript
// 10. Handle multiple concurrent requests
test("serve handles concurrent requests", async () => {
  let activeRequests = 0;
  let maxConcurrent = 0;
  
  const server = serve({ port: 0 }, async (req) => {
    activeRequests++;
    maxConcurrent = Math.max(maxConcurrent, activeRequests);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    activeRequests--;
    return new Response("OK");
  });
  
  // Send 5 requests concurrently
  const requests = Array(5).fill(null).map(() => 
    fetch(`http://localhost:${server.port}/`)
  );
  
  await Promise.all(requests);
  expect(maxConcurrent).toBeGreaterThan(1);
  
  await server.shutdown();
});
```

### Lifecycle Tests

```typescript
// 11. Graceful shutdown
test("server.shutdown waits for in-flight requests", async () => {
  let requestCompleted = false;
  
  const server = serve({ port: 0 }, async (req) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    requestCompleted = true;
    return new Response("OK");
  });
  
  // Start a request
  const requestPromise = fetch(`http://localhost:${server.port}/`);
  
  // Wait a bit then shutdown
  await new Promise(resolve => setTimeout(resolve, 10));
  await server.shutdown();
  
  // Request should have completed
  expect(requestCompleted).toBe(true);
  const response = await requestPromise;
  expect(await response.text()).toBe("OK");
});

// 12. onListen callback
test("onListen is called with port info", async () => {
  let listenInfo: { hostname: string; port: number } | null = null;
  
  const server = serve({
    port: 0,
    onListen: (info) => { listenInfo = info; }
  }, () => new Response("OK"));
  
  expect(listenInfo).not.toBeNull();
  expect(listenInfo!.port).toBe(server.port);
  
  await server.shutdown();
});

// 13. Error handling with onError
test("onError handles thrown errors", async () => {
  const server = serve({
    port: 0,
    onError: (error) => {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }, () => {
    throw new Error("Something broke");
  });
  
  const response = await fetch(`http://localhost:${server.port}/`);
  expect(response.status).toBe(500);
  expect(await response.text()).toBe("Error: Something broke");
  
  await server.shutdown();
});

// 14. Default error handling (no onError)
test("default error returns 500", async () => {
  const server = serve({ port: 0 }, () => {
    throw new Error("Unhandled");
  });
  
  const response = await fetch(`http://localhost:${server.port}/`);
  expect(response.status).toBe(500);
  
  await server.shutdown();
});
```

### Edge Cases

```typescript
// 15. Empty response body
test("empty response body", async () => {
  const server = serve({ port: 0 }, () => {
    return new Response(null, { status: 204 });
  });
  
  const response = await fetch(`http://localhost:${server.port}/`);
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  
  await server.shutdown();
});

// 16. Large request body
test("large request body", async () => {
  const server = serve({ port: 0 }, async (req) => {
    const text = await req.text();
    return new Response(`Length: ${text.length}`);
  });
  
  const largeBody = "x".repeat(100000);
  const response = await fetch(`http://localhost:${server.port}/`, {
    method: "POST",
    body: largeBody,
  });
  expect(await response.text()).toBe("Length: 100000");
  
  await server.shutdown();
});

// 17. Large response body
test("large response body", async () => {
  const server = serve({ port: 0 }, () => {
    const largeBody = "y".repeat(100000);
    return new Response(largeBody);
  });
  
  const response = await fetch(`http://localhost:${server.port}/`);
  const text = await response.text();
  expect(text.length).toBe(100000);
  
  await server.shutdown();
});

// 18. Request with no body (GET)
test("GET request has no body", async () => {
  const server = serve({ port: 0 }, async (req) => {
    const hasBody = req.body !== null;
    return Response.json({ hasBody, method: req.method });
  });
  
  const response = await fetch(`http://localhost:${server.port}/`);
  const data = await response.json();
  expect(data.hasBody).toBe(false);
  expect(data.method).toBe("GET");
  
  await server.shutdown();
});
```

---

## Open Questions

1. **Port 0 for random port assignment?**
   - Deno and Bun support `port: 0` to let the OS assign a port
   - Useful for testing
   - Recommendation: Support it

2. **HTTPS support in Phase 1?**
   - Requires `cert` and `key` options
   - Rust-side: Use `rustls` or `native-tls`
   - Recommendation: Defer to Phase 2

3. **AbortSignal for shutdown?**
   - Modern pattern, consistent with fetch
   - Recommendation: Support it in Phase 1

4. **Remote address info?**
   - Handler receives `RequestInfo.remoteAddr`
   - Useful for logging, rate limiting
   - Recommendation: Include in Phase 1

5. **HTTP/2 support?**
   - hyper (Rust HTTP library) supports it
   - Transparent to the handler (same Request/Response)
   - Recommendation: Phase 2, automatic negotiation

---

## Summary

Phase 1 delivers:
- ✅ `serve()` function with options + handler
- ✅ Web-standard Request object (method, url, headers, body)
- ✅ Web-standard Response (reuses existing fetch types)
- ✅ Basic lifecycle (start, shutdown)
- ✅ Error handling (onError callback)
- ✅ Concurrent request handling
- ❌ Streaming bodies (Phase 2)
- ❌ WebSocket upgrade (Phase 2)
- ❌ HTTPS/TLS (Phase 2)
- ❌ Built-in routing (userland)

The design prioritizes simplicity and web-standard compatibility, making it easy for users familiar with Deno or browser APIs to build HTTP servers in funee.
