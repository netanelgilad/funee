use deno_core::{error::AnyError, Extension, FastString, OpDecl, PollEventLoopOptions};

/// Bootstrap JavaScript that sets up timer globals (setTimeout, setInterval, etc.)
const TIMER_BOOTSTRAP: &str = r#"
(() => {
    // Timer callback registry
    const timerCallbacks = new Map();
    
    // setTimeout implementation
    globalThis.setTimeout = (callback, delay = 0, ...args) => {
        const timerId = Deno.core.ops.op_timerStart();
        timerCallbacks.set(timerId, { callback, args, cleared: false });
        
        // Schedule the async wait
        (async () => {
            const completed = await Deno.core.ops.op_timerWait(timerId, delay);
            const timer = timerCallbacks.get(timerId);
            timerCallbacks.delete(timerId);
            if (completed && timer && !timer.cleared) {
                timer.callback(...timer.args);
            }
        })();
        
        return timerId;
    };
    
    // clearTimeout implementation
    globalThis.clearTimeout = (timerId) => {
        const timer = timerCallbacks.get(timerId);
        if (timer) {
            timer.cleared = true;
        }
        Deno.core.ops.op_timerCancel(timerId);
    };
    
    // setInterval implementation
    globalThis.setInterval = (callback, delay = 0, ...args) => {
        let active = true;
        let currentTimerId;
        
        const scheduleNext = async () => {
            while (active) {
                currentTimerId = Deno.core.ops.op_timerStart();
                const completed = await Deno.core.ops.op_timerWait(currentTimerId, delay);
                if (completed && active) {
                    callback(...args);
                } else {
                    break;
                }
            }
        };
        
        // Start the interval loop
        scheduleNext();
        
        // Return an object that tracks the interval
        // We use a unique ID for clearInterval
        const intervalId = Deno.core.ops.op_timerStart();
        timerCallbacks.set(intervalId, { 
            type: 'interval',
            cancel: () => { 
                active = false; 
                if (currentTimerId !== undefined) {
                    Deno.core.ops.op_timerCancel(currentTimerId);
                }
            } 
        });
        
        return intervalId;
    };
    
    // clearInterval implementation
    globalThis.clearInterval = (intervalId) => {
        const interval = timerCallbacks.get(intervalId);
        if (interval && interval.type === 'interval') {
            interval.cancel();
            timerCallbacks.delete(intervalId);
        }
    };
})();
"#;

/// Bootstrap JavaScript that sets up web-standard fetch API (Headers, Response, fetch)
const FETCH_BOOTSTRAP: &str = r#"
(() => {
    // ========================================================================
    // Headers class - Web-standard Headers implementation
    // ========================================================================
    function Headers(init) {
        // Private storage - Map of lowercase name -> array of values
        const _headers = new Map();
        
        // Helper: normalize header name (lowercase)
        const normalizeName = (name) => {
            if (typeof name !== 'string') throw new TypeError('Header name must be a string');
            return name.toLowerCase();
        };
        
        // Helper: validate header value
        const normalizeValue = (value) => {
            if (typeof value !== 'string') return String(value);
            return value;
        };
        
        // Initialize from various input types
        if (init) {
            if (Array.isArray(init)) {
                // Array of [name, value] pairs - check BEFORE Headers check
                // since arrays also have entries() method
                for (const [name, value] of init) {
                    const key = normalizeName(name);
                    if (!_headers.has(key)) _headers.set(key, []);
                    _headers.get(key).push(normalizeValue(value));
                }
            } else if (init instanceof Headers || (init && typeof init.get === 'function' && typeof init.set === 'function')) {
                // Copy from another Headers or Headers-like object
                // Check for get/set methods instead of entries() to avoid matching arrays
                for (const [name, value] of init.entries()) {
                    _headers.set(normalizeName(name), [normalizeValue(value)]);
                }
            } else if (typeof init === 'object') {
                // Plain object
                for (const [name, value] of Object.entries(init)) {
                    _headers.set(normalizeName(name), [normalizeValue(value)]);
                }
            }
        }
        
        // get(name) - returns combined value or null
        this.get = (name) => {
            const values = _headers.get(normalizeName(name));
            return values ? values.join(', ') : null;
        };
        
        // set(name, value) - replaces all values
        this.set = (name, value) => {
            _headers.set(normalizeName(name), [normalizeValue(value)]);
        };
        
        // has(name) - check if header exists
        this.has = (name) => {
            return _headers.has(normalizeName(name));
        };
        
        // delete(name) - remove header
        this.delete = (name) => {
            _headers.delete(normalizeName(name));
        };
        
        // append(name, value) - add value (combines with existing)
        this.append = (name, value) => {
            const key = normalizeName(name);
            if (!_headers.has(key)) {
                _headers.set(key, []);
            }
            _headers.get(key).push(normalizeValue(value));
        };
        
        // entries() - iterator of [name, value] pairs
        this.entries = function* () {
            for (const [name, values] of _headers) {
                yield [name, values.join(', ')];
            }
        };
        
        // keys() - iterator of header names
        this.keys = function* () {
            for (const name of _headers.keys()) {
                yield name;
            }
        };
        
        // values() - iterator of header values
        this.values = function* () {
            for (const values of _headers.values()) {
                yield values.join(', ');
            }
        };
        
        // forEach(callback)
        this.forEach = (callback) => {
            for (const [name, values] of _headers) {
                callback(values.join(', '), name, this);
            }
        };
        
        // Make iterable (same as entries)
        this[Symbol.iterator] = this.entries;
    }
    
    // ========================================================================
    // Response class - Web-standard Response implementation
    // ========================================================================
    function Response(body, init) {
        const _init = init || {};
        const _status = _init.status !== undefined ? _init.status : 200;
        const _statusText = _init.statusText !== undefined ? _init.statusText : '';
        const _headers = _init.headers instanceof Headers 
            ? _init.headers 
            : new Headers(_init.headers);
        const _url = _init.url || '';
        const _redirected = _init.redirected || false;
        
        let _body = body !== undefined && body !== null ? String(body) : null;
        let _bodyUsed = false;
        
        // Read-only properties
        Object.defineProperties(this, {
            ok: { get: () => _status >= 200 && _status < 300, enumerable: true },
            status: { get: () => _status, enumerable: true },
            statusText: { get: () => _statusText, enumerable: true },
            headers: { get: () => _headers, enumerable: true },
            url: { get: () => _url, enumerable: true },
            redirected: { get: () => _redirected, enumerable: true },
            type: { get: () => 'basic', enumerable: true },
            bodyUsed: { get: () => _bodyUsed, enumerable: true }
        });
        
        // Helper to consume body
        const consumeBody = () => {
            if (_bodyUsed) {
                throw new TypeError('Body has already been consumed');
            }
            _bodyUsed = true;
            return _body;
        };
        
        // text() - get body as string
        this.text = async () => {
            const body = consumeBody();
            return body || '';
        };
        
        // json() - parse body as JSON
        this.json = async () => {
            const body = consumeBody();
            if (!body) throw new SyntaxError('Unexpected end of JSON input');
            return JSON.parse(body);
        };
        
        // arrayBuffer() - get body as ArrayBuffer
        this.arrayBuffer = async () => {
            const body = consumeBody();
            const encoder = new TextEncoder();
            return encoder.encode(body || '').buffer;
        };
        
        // bytes() - get body as Uint8Array
        this.bytes = async () => {
            const body = consumeBody();
            const encoder = new TextEncoder();
            return encoder.encode(body || '');
        };
        
        // blob() - get body as Blob-like object
        this.blob = async () => {
            const body = consumeBody();
            const data = new TextEncoder().encode(body || '');
            return {
                size: data.length,
                type: _headers.get('content-type') || '',
                arrayBuffer: async () => data.buffer,
                text: async () => body || '',
            };
        };
        
        // clone() - create a copy
        this.clone = () => {
            if (_bodyUsed) {
                throw new TypeError('Cannot clone a Response whose body has been consumed');
            }
            return new Response(_body, {
                status: _status,
                statusText: _statusText,
                headers: new Headers(_headers),
                url: _url,
                redirected: _redirected
            });
        };
    }
    
    // Static methods on Response
    Response.error = () => {
        const r = new Response(null, { status: 0, statusText: '' });
        Object.defineProperty(r, 'type', { get: () => 'error' });
        return r;
    };
    
    Response.redirect = (url, status = 302) => {
        if (![301, 302, 303, 307, 308].includes(status)) {
            throw new RangeError('Invalid redirect status code');
        }
        return new Response(null, {
            status,
            headers: { 'Location': url }
        });
    };
    
    Response.json = (data, init) => {
        const body = JSON.stringify(data);
        const headers = new Headers(init?.headers);
        if (!headers.has('content-type')) {
            headers.set('content-type', 'application/json');
        }
        return new Response(body, {
            status: init?.status || 200,
            statusText: init?.statusText || '',
            headers
        });
    };
    
    // ========================================================================
    // fetch() - Web-standard fetch implementation
    // ========================================================================
    async function fetch(input, init) {
        // Normalize input to URL string
        let url;
        if (typeof input === 'string') {
            url = input;
        } else if (input && typeof input.url === 'string') {
            // Request-like object
            url = input.url;
            // Merge init from Request if not provided
            if (!init) {
                init = {
                    method: input.method,
                    headers: input.headers
                };
            }
        } else if (input && input.toString) {
            // URL object
            url = input.toString();
        } else {
            throw new TypeError('Invalid fetch input');
        }
        
        const options = init || {};
        const method = options.method || 'GET';
        const body = options.body || '';
        const followRedirects = options.redirect !== 'error' && options.redirect !== 'manual';
        
        // Build headers JSON
        let headersObj = {};
        if (options.headers) {
            if (options.headers instanceof Headers) {
                for (const [name, value] of options.headers.entries()) {
                    headersObj[name] = value;
                }
            } else if (Array.isArray(options.headers)) {
                for (const [name, value] of options.headers) {
                    headersObj[name] = value;
                }
            } else {
                headersObj = options.headers;
            }
        }
        const headersJson = JSON.stringify(headersObj);
        
        // Call the Rust op
        const resultJson = await Deno.core.ops.op_fetch(
            method,
            url,
            headersJson,
            body,
            followRedirects
        );
        
        // Parse result
        const result = JSON.parse(resultJson);
        
        // Handle redirect: "error" - should have thrown if redirect happened with followRedirects=false
        if (options.redirect === 'error' && result.redirected) {
            throw new TypeError('Redirect not allowed');
        }
        
        // Handle redirect: "manual" - return a special opaque redirect response
        if (options.redirect === 'manual' && result.status >= 300 && result.status < 400) {
            // For manual redirect, return the redirect response as-is
        }
        
        // Build Response object
        return new Response(result.body, {
            status: result.status,
            statusText: result.statusText,
            headers: result.headers,
            url: result.url,
            redirected: result.redirected
        });
    }
    
    // Expose globals
    globalThis.Headers = Headers;
    globalThis.Response = Response;
    globalThis.fetch = fetch;
})();
"#;

pub async fn run_js(js: &str, ops: Vec<OpDecl>) -> Result<(), AnyError> {
    let ext = Extension {
        ops: std::borrow::Cow::Owned(ops),
        ..Default::default()
    };
    
    let mut js_runtime = deno_core::JsRuntime::new(deno_core::RuntimeOptions {
        extensions: vec![ext],
        ..Default::default()
    });

    // Execute timer bootstrap first to set up setTimeout/setInterval globals
    js_runtime.execute_script("[funee:timers.js]", TIMER_BOOTSTRAP)?;
    
    // Execute fetch bootstrap to set up fetch/Headers/Response globals
    js_runtime.execute_script("[funee:fetch.js]", FETCH_BOOTSTRAP)?;
    
    // Then execute user code
    let js_code: FastString = js.to_string().into();
    js_runtime.execute_script("[funee:runtime.js]", js_code)?;
    js_runtime.run_event_loop(PollEventLoopOptions::default()).await?;

    Ok(())
}
