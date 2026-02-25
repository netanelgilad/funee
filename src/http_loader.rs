//! HTTP file loader for remote module imports
//! 
//! Enables imports like:
//! ```typescript
//! import { x } from "https://example.com/mod.ts"
//! ```

use bytes_str::BytesStr;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{self, ErrorKind};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use swc_common::FileLoader;
use url::Url;

/// Metadata stored alongside cached modules
#[derive(Debug, Serialize, Deserialize)]
struct CacheMetadata {
    url: String,
    etag: Option<String>,
    last_modified: Option<String>,
    cached_at: u64,
    content_type: Option<String>,
}

impl CacheMetadata {
    fn from_response(url: &str, response: &reqwest::blocking::Response) -> Self {
        let headers = response.headers();
        Self {
            url: url.to_string(),
            etag: headers.get("etag").map(|v| v.to_str().unwrap_or("").to_string()),
            last_modified: headers.get("last-modified").map(|v| v.to_str().unwrap_or("").to_string()),
            cached_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            content_type: headers.get("content-type").map(|v| v.to_str().unwrap_or("").to_string()),
        }
    }

    fn is_fresh(&self, max_age_secs: u64) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        now - self.cached_at < max_age_secs
    }
}

/// File loader that supports both local files and HTTP URLs
pub struct HttpFileLoader {
    cache_dir: PathBuf,
    http_client: Client,
    /// Max cache age in seconds (default: 24 hours)
    max_cache_age: u64,
    /// Force reload from network, bypassing cache freshness check
    force_reload: bool,
}

impl HttpFileLoader {
    /// Create a new HTTP file loader with default cache directory
    pub fn new() -> io::Result<Self> {
        let cache_dir = Self::default_cache_dir()?;
        Self::with_cache_dir(cache_dir)
    }

    /// Create a new HTTP file loader with a custom cache directory
    pub fn with_cache_dir(cache_dir: PathBuf) -> io::Result<Self> {
        fs::create_dir_all(&cache_dir)?;
        
        let http_client = Client::builder()
            .redirect(reqwest::redirect::Policy::limited(10))
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| io::Error::new(ErrorKind::Other, e))?;

        Ok(Self {
            cache_dir,
            http_client,
            max_cache_age: 24 * 60 * 60, // 24 hours
            force_reload: false,
        })
    }

    /// Create a new HTTP file loader with force reload enabled (bypasses cache freshness)
    pub fn with_force_reload(force_reload: bool) -> io::Result<Self> {
        let mut loader = Self::new()?;
        loader.force_reload = force_reload;
        Ok(loader)
    }

    /// Get the default cache directory (~/.funee/cache)
    fn default_cache_dir() -> io::Result<PathBuf> {
        dirs::home_dir()
            .map(|home| home.join(".funee").join("cache"))
            .ok_or_else(|| io::Error::new(ErrorKind::NotFound, "Could not find home directory"))
    }

    /// Check if a URI is an HTTP/HTTPS URL
    pub fn is_http_uri(uri: &str) -> bool {
        uri.starts_with("http://") || uri.starts_with("https://")
    }

    /// Get the cache path for a URL
    fn get_cache_path(&self, url: &str) -> PathBuf {
        let parsed = Url::parse(url).expect("Invalid URL");
        let host = parsed.host_str().unwrap_or("unknown");
        
        // Create a short hash of the full URL for uniqueness
        let mut hasher = Sha256::new();
        hasher.update(url.as_bytes());
        let hash = format!("{:x}", hasher.finalize());
        let short_hash = &hash[..16];

        // Use the URL path as the filename, falling back to "index.ts"
        let filename = parsed.path()
            .split('/')
            .last()
            .filter(|s| !s.is_empty())
            .unwrap_or("index.ts");

        self.cache_dir
            .join(if parsed.scheme() == "https" { "https" } else { "http" })
            .join(host)
            .join(short_hash)
            .join(filename)
    }

    /// Get the metadata path for a cached URL
    fn get_metadata_path(&self, url: &str) -> PathBuf {
        self.get_cache_path(url).parent().unwrap().join("metadata.json")
    }

    /// Load cached metadata if available
    fn load_metadata(&self, url: &str) -> Option<CacheMetadata> {
        let path = self.get_metadata_path(url);
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    /// Fetch a URL and cache it
    fn fetch_and_cache(&self, url: &str) -> io::Result<String> {
        let cache_path = self.get_cache_path(url);
        let metadata_path = self.get_metadata_path(url);

        // Check if cached and fresh (skip cache check if force_reload is enabled)
        if !self.force_reload && cache_path.exists() {
            if let Some(metadata) = self.load_metadata(url) {
                if metadata.is_fresh(self.max_cache_age) {
                    return fs::read_to_string(&cache_path);
                }
            }
        }

        // Fetch from network
        match self.http_client.get(url).send() {
            Ok(response) => {
                if !response.status().is_success() {
                    // Try stale cache on HTTP error
                    if cache_path.exists() {
                        eprintln!("⚠ HTTP {} for {}, using stale cache", response.status(), url);
                        return fs::read_to_string(&cache_path);
                    }
                    return Err(io::Error::new(
                        ErrorKind::NotFound,
                        format!("HTTP {} for {}", response.status(), url)
                    ));
                }

                // Save metadata before consuming response body
                let metadata = CacheMetadata::from_response(url, &response);
                
                let content = response.text().map_err(|e| 
                    io::Error::new(ErrorKind::Other, e)
                )?;

                // Save to cache
                if let Some(parent) = cache_path.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::write(&cache_path, &content)?;
                
                // Save metadata
                if let Ok(json) = serde_json::to_string_pretty(&metadata) {
                    let _ = fs::write(&metadata_path, json);
                }

                eprintln!("✓ Fetched: {}", url);
                Ok(content)
            }
            Err(e) => {
                // Fallback to stale cache on network error
                if cache_path.exists() {
                    eprintln!("⚠ Network error for {}, using stale cache: {}", url, e);
                    fs::read_to_string(&cache_path)
                } else {
                    Err(io::Error::new(
                        ErrorKind::Other,
                        format!("Failed to fetch {} (not cached): {}", url, e)
                    ))
                }
            }
        }
    }
}

impl Default for HttpFileLoader {
    fn default() -> Self {
        Self::new().expect("Failed to create HttpFileLoader")
    }
}

impl FileLoader for HttpFileLoader {
    fn file_exists(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        if Self::is_http_uri(&path_str) {
            // For HTTP URLs, check if cached
            self.get_cache_path(&path_str).exists()
        } else {
            path.exists()
        }
    }

    fn abs_path(&self, path: &Path) -> Option<PathBuf> {
        let path_str = path.to_string_lossy();
        if Self::is_http_uri(&path_str) {
            // HTTP URLs are already absolute
            Some(path.to_path_buf())
        } else {
            std::fs::canonicalize(path).ok()
        }
    }

    fn read_file(&self, path: &Path) -> io::Result<BytesStr> {
        let path_str = path.to_string_lossy();
        if Self::is_http_uri(&path_str) {
            self.fetch_and_cache(&path_str).map(BytesStr::from)
        } else {
            fs::read_to_string(path).map(BytesStr::from)
        }
    }
}

/// Resolve a relative URL against a base HTTP URL
pub fn resolve_http_url(base_url: &str, relative_path: &str) -> Result<String, url::ParseError> {
    let base = Url::parse(base_url)?;
    let resolved = base.join(relative_path)?;
    Ok(resolved.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_http_uri() {
        assert!(HttpFileLoader::is_http_uri("https://example.com/mod.ts"));
        assert!(HttpFileLoader::is_http_uri("http://localhost:8000/test.ts"));
        assert!(!HttpFileLoader::is_http_uri("./local.ts"));
        assert!(!HttpFileLoader::is_http_uri("/absolute/path.ts"));
        assert!(!HttpFileLoader::is_http_uri("funee"));
    }

    #[test]
    fn test_resolve_http_url() {
        let base = "https://example.com/lib/mod.ts";
        
        assert_eq!(
            resolve_http_url(base, "./utils.ts").unwrap(),
            "https://example.com/lib/utils.ts"
        );
        
        assert_eq!(
            resolve_http_url(base, "../other.ts").unwrap(),
            "https://example.com/other.ts"
        );
        
        assert_eq!(
            resolve_http_url(base, "/root.ts").unwrap(),
            "https://example.com/root.ts"
        );
    }

    #[test]
    fn test_cache_path_generation() {
        let loader = HttpFileLoader::with_cache_dir(PathBuf::from("/tmp/funee-test-cache")).unwrap();
        
        let path = loader.get_cache_path("https://example.com/lib/mod.ts");
        assert!(path.to_string_lossy().contains("https"));
        assert!(path.to_string_lossy().contains("example.com"));
        assert!(path.to_string_lossy().ends_with("mod.ts"));
    }
}
