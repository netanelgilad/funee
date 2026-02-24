# HTTP Imports Design for funee

## Overview

This document outlines the design for supporting HTTP imports in funee, enabling code like:
```typescript
import { x } from "https://example.com/mod.ts"
```

## Current Architecture Analysis

### Module Loading Flow
1. **Entry Point**: `main.rs` creates an `ExecutionRequest` with a scope (file path) and expression
2. **Source Graph**: `source_graph.rs` builds a dependency graph using `FileLoader`
3. **Module Resolution**: `load_module_declaration.rs` resolves imports to declarations
4. **File Loading**: Uses SWC's `FileLoader` trait (currently `RealFileLoader`)

### Key Files
- `src/execution_request/source_graph.rs` - Builds dependency graph, resolves references
- `src/load_module.rs` - Parses TypeScript modules via SWC
- `src/execution_request.rs` - Defines `FileLoader` injection point

### Current Path Resolution
```rust
// From source_graph.rs
let relative_path = RelativePath::new(&i.uri);
let current_dir = Path::new(&current_identifier.uri)
    .parent()
    .unwrap()
    .to_str()
    .unwrap();
current_identifier = FuneeIdentifier {
    name: i.name,
    uri: relative_path
        .to_logical_path(&current_dir)
        .to_str()
        .unwrap()
        .to_string(),
};
```

## Design Proposal

### 1. HTTP Detection Strategy

**Question**: How to detect HTTP vs file imports?

**Answer**: Check URI prefix in `FuneeIdentifier.uri`:
```rust
fn is_http_import(uri: &str) -> bool {
    uri.starts_with("http://") || uri.starts_with("https://")
}
```

This is simple, explicit, and matches Deno's approach.

### 2. Custom FileLoader Implementation

Create a `HttpFileLoader` that wraps `RealFileLoader` and adds HTTP support:

```rust
pub struct HttpFileLoader {
    cache_dir: PathBuf,
    http_client: reqwest::blocking::Client,
    real_file_loader: RealFileLoader,
}

impl FileLoader for HttpFileLoader {
    fn file_exists(&self, path: &Path) -> bool {
        if is_http_import(path.to_str().unwrap()) {
            // Check if cached
            self.get_cache_path(path.to_str().unwrap()).exists()
        } else {
            self.real_file_loader.file_exists(path)
        }
    }

    fn abs_path(&self, path: &Path) -> Option<PathBuf> {
        if is_http_import(path.to_str().unwrap()) {
            // HTTP URLs are already absolute
            Some(path.to_path_buf())
        } else {
            self.real_file_loader.abs_path(path)
        }
    }

    fn read_file(&self, path: &Path) -> std::io::Result<BytesStr> {
        if is_http_import(path.to_str().unwrap()) {
            self.fetch_and_cache(path.to_str().unwrap())
        } else {
            self.real_file_loader.read_file(path)
        }
    }
}
```

### 3. Caching Strategy

**Question**: Where should HTTP modules be cached?

**Answer**: Use a content-addressable cache based on URL:

```
~/.funee/cache/
  https/
    example.com/
      <hash>/
        mod.ts        # cached file content
        metadata.json # etag, last-modified, etc.
```

**Cache Key Generation**:
```rust
fn get_cache_path(&self, url: &str) -> PathBuf {
    let parsed = Url::parse(url).unwrap();
    let host = parsed.host_str().unwrap();
    let path_hash = hash_url(url); // SHA256 or similar
    
    self.cache_dir
        .join("https")
        .join(host)
        .join(path_hash)
        .join(parsed.path().trim_start_matches('/'))
}

fn hash_url(url: &str) -> String {
    // Use first 16 chars of SHA256 for brevity
    format!("{:x}", sha256(url)).chars().take(16).collect()
}
```

**Cache Metadata**:
```json
{
  "url": "https://example.com/mod.ts",
  "etag": "\"33a64df551425fcc55e4d42a148795d9f25f89d4\"",
  "last_modified": "Wed, 21 Oct 2024 07:28:00 GMT",
  "cached_at": 1708801234,
  "headers": {
    "content-type": "application/typescript"
  }
}
```

### 4. HTTP Fetching

**Question**: What Rust crate for HTTP?

**Answer**: **reqwest** (blocking mode initially)

**Rationale**:
- Most popular and well-maintained
- Works with Tokio (funee already uses it)
- Supports sync and async APIs
- Good error handling and retry logic
- Can start with blocking API, migrate to async later

**Alternative Considered**: ureq
- Simpler, synchronous-only
- Less features
- Good for minimal use cases
- Rejected: reqwest's feature set is worth the extra dependency

**Initial Implementation** (blocking):
```rust
impl HttpFileLoader {
    fn fetch_and_cache(&self, url: &str) -> std::io::Result<BytesStr> {
        let cache_path = self.get_cache_path(url);
        let metadata_path = cache_path.parent().unwrap().join("metadata.json");
        
        // Check if cached and fresh
        if cache_path.exists() {
            if let Ok(metadata) = self.load_metadata(&metadata_path) {
                // Simple: use cache if < 24 hours old
                // TODO: Implement proper ETag/Last-Modified validation
                if metadata.is_fresh() {
                    return std::fs::read_to_string(&cache_path)
                        .map(BytesStr::from);
                }
            }
        }
        
        // Fetch from network
        match self.http_client.get(url).send() {
            Ok(response) => {
                if !response.status().is_success() {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        format!("HTTP {} for {}", response.status(), url)
                    ));
                }
                
                let content = response.text().map_err(|e| 
                    std::io::Error::new(std::io::ErrorKind::Other, e)
                )?;
                
                // Save to cache
                std::fs::create_dir_all(cache_path.parent().unwrap())?;
                std::fs::write(&cache_path, &content)?;
                
                // Save metadata
                let metadata = CacheMetadata::from_response(&response);
                std::fs::write(&metadata_path, serde_json::to_string(&metadata)?)?;
                
                Ok(BytesStr::from(content))
            }
            Err(e) => {
                // Fallback to stale cache on network error
                if cache_path.exists() {
                    eprintln!("Warning: Using stale cache for {} (network error: {})", url, e);
                    std::fs::read_to_string(&cache_path).map(BytesStr::from)
                } else {
                    Err(std::io::Error::new(std::io::ErrorKind::Other, e))
                }
            }
        }
    }
}
```

### 5. Error Handling

**Question**: How to handle network failures?

**Strategy**:
1. **Primary**: Fetch from network
2. **Fallback**: Use stale cache with warning
3. **Fail**: Only if no cache exists

**User Experience**:
```
✓ Fresh from cache: https://example.com/mod.ts
✓ Fetched: https://example.com/mod.ts (234ms)
⚠ Using stale cache: https://example.com/mod.ts (network timeout)
✗ Failed to load: https://example.com/mod.ts (not cached, network error)
```

**Error Types**:
```rust
pub enum HttpModuleError {
    NetworkError { url: String, error: reqwest::Error },
    HttpError { url: String, status: u16 },
    ParseError { url: String, error: String },
    CacheError { url: String, error: std::io::Error },
}
```

### 6. Import Resolution

**Relative HTTP Imports**:
```typescript
// https://example.com/lib/mod.ts
import { helper } from "./utils.ts"  // -> https://example.com/lib/utils.ts
import { other } from "../other.ts"  // -> https://example.com/other.ts
```

**Implementation**:
```rust
// Update path resolution in source_graph.rs
fn resolve_import(base_uri: &str, import_path: &str) -> String {
    if is_http_import(import_path) {
        // Already absolute HTTP URL
        import_path.to_string()
    } else if is_http_import(base_uri) {
        // Relative import from HTTP module
        resolve_relative_url(base_uri, import_path)
    } else if import_path.starts_with("./") || import_path.starts_with("../") {
        // Relative file import
        let current_dir = Path::new(base_uri).parent().unwrap();
        RelativePath::new(import_path)
            .to_logical_path(current_dir)
            .to_str()
            .unwrap()
            .to_string()
    } else {
        // Absolute or named import (keep as-is)
        import_path.to_string()
    }
}

fn resolve_relative_url(base_url: &str, relative_path: &str) -> String {
    Url::parse(base_url)
        .unwrap()
        .join(relative_path)
        .unwrap()
        .to_string()
}
```

### 7. Import Maps (Future)

**Question**: Should we support import maps?

**Answer**: Not in v1, but design for it.

Import maps would allow:
```json
{
  "imports": {
    "react": "https://esm.sh/react@18",
    "lodash/": "https://cdn.skypack.dev/lodash/"
  }
}
```

**Design Consideration**: Reserve `import_map` field in `ExecutionRequest`:
```rust
pub struct ExecutionRequest {
    pub expression: Expr,
    pub scope: String,
    pub host_functions: HashMap<FuneeIdentifier, OpDecl>,
    pub file_loader: Box<dyn FileLoader + Sync + Send>,
    pub import_map: Option<ImportMap>,  // Future
}
```

## Implementation Plan

### Phase 1: Basic HTTP Support
1. Add `reqwest` dependency with `blocking` feature
2. Implement `HttpFileLoader` with simple caching
3. Update path resolution for HTTP URLs
4. Add tests with `MockFileLoader` simulating HTTP

### Phase 2: Smart Caching
1. Implement ETag/Last-Modified validation
2. Add cache freshness policies
3. CLI flag: `--reload` to bypass cache
4. Cache statistics and management

### Phase 3: Enhanced UX
1. Progress indicators for downloads
2. Better error messages
3. Cache location configuration
4. Parallel fetching optimization

### Phase 4: Import Maps
1. Parse import map JSON
2. Resolve bare specifiers
3. Support scoped imports

## Dependencies to Add

```toml
[dependencies]
# Existing...
reqwest = { version = "0.11", features = ["blocking"] }
url = "2.5"
sha2 = "0.10"  # For cache key hashing
serde_json = "1.0"  # For cache metadata
```

## Testing Strategy

### Unit Tests
```rust
#[test]
fn test_http_import_detection() {
    assert!(is_http_import("https://example.com/mod.ts"));
    assert!(is_http_import("http://localhost/test.ts"));
    assert!(!is_http_import("./local.ts"));
    assert!(!is_http_import("/absolute/path.ts"));
}

#[test]
fn test_relative_url_resolution() {
    let base = "https://example.com/lib/mod.ts";
    assert_eq!(
        resolve_relative_url(base, "./utils.ts"),
        "https://example.com/lib/utils.ts"
    );
    assert_eq!(
        resolve_relative_url(base, "../other.ts"),
        "https://example.com/other.ts"
    );
}
```

### Integration Tests
```rust
#[test]
fn test_http_module_loading() {
    let loader = HttpFileLoader::new(cache_dir);
    let request = ExecutionRequest {
        scope: "https://example.com/entry.ts".to_string(),
        file_loader: Box::new(loader),
        // ...
    };
    // Mock HTTP responses or use real test server
}
```

## Security Considerations

1. **HTTPS Only**: Warn on HTTP imports (insecure)
2. **Redirect Limits**: Prevent redirect loops (max 5)
3. **Size Limits**: Reject modules > 10MB
4. **Timeout**: 30 second fetch timeout
5. **Cache Poisoning**: Validate content integrity (future: subresource integrity)

## CLI Interface

```bash
# Default: use cache
funee main.ts

# Force reload all HTTP imports
funee --reload main.ts

# Reload specific domain
funee --reload=example.com main.ts

# Show what's in cache
funee cache list

# Clear cache
funee cache clear
```

## Compatibility with Deno

Aim for compatibility where it makes sense:
- ✅ Same URL syntax
- ✅ Same relative import resolution
- ✅ Similar caching strategy
- ⚠️ Different cache location (Deno uses `DENO_DIR`)
- ❌ No TypeScript type checking from URLs (out of scope)

## Open Questions

1. **Lock file**: Should we generate a lock file for reproducible builds?
   - Suggestion: Yes, record URL -> hash mapping
   
2. **Private modules**: How to handle authentication?
   - Suggestion: Support `FUNEE_AUTH_TOKENS` env var (Phase 2)

3. **CDN optimization**: Special handling for esm.sh, skypack, etc?
   - Suggestion: No special cases initially, treat all URLs equally

## Success Criteria

- ✅ Can import from `https://` URLs
- ✅ Modules cached locally
- ✅ Relative imports work from HTTP modules
- ✅ Network failures fallback to cache
- ✅ Clear error messages
- ✅ No breaking changes to existing file-based imports

## Summary

This design leverages funee's existing `FileLoader` abstraction to add HTTP import support with minimal changes to the core architecture. The approach is:

1. **Non-invasive**: Uses existing extension points
2. **Robust**: Handles network failures gracefully
3. **Performant**: Smart caching reduces network requests
4. **Deno-compatible**: Similar behavior to Deno's HTTP imports
5. **Extensible**: Designed for future enhancements (import maps, auth, etc.)

The key insight is that by treating HTTP URLs as just another URI scheme and implementing a custom `FileLoader`, we can add this feature without modifying the dependency resolution or bundling logic.
