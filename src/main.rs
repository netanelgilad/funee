mod emit_module;
pub mod execution_request;
mod funee_identifier;
mod http_loader;
mod load_module;
mod run_js;

use deno_core::{error::AnyError, op2};
use deno_error::JsErrorBox;
use execution_request::ExecutionRequest;
use funee_identifier::FuneeIdentifier;
use rand::RngCore;
use serde::Serialize;
use std::{collections::HashMap, env, fs, path::Path};
use swc_common::SyntaxContext;
use swc_ecma_ast::{CallExpr, Callee, Expr, Ident};

/// Host function: log to stdout
#[op2(fast)]
fn op_log(#[string] message: &str) {
    println!("{}", message);
}

/// Host function: debug log (prefixed)
#[op2(fast)]
fn op_debug(#[string] message: &str) {
    println!("[DEBUG] {}", message);
}

/// Host function: generate cryptographically secure random bytes
/// Returns a hex-encoded string of the requested number of bytes
#[op2]
#[string]
fn op_randomBytes(length: u32) -> String {
    let mut bytes = vec![0u8; length as usize];
    rand::rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

// ============================================================================
// Filesystem Host Functions
// ============================================================================

/// Result wrapper for JSON serialization
#[derive(Serialize)]
#[serde(tag = "type")]
enum FsResult<T: Serialize> {
    #[serde(rename = "ok")]
    Ok { value: T },
    #[serde(rename = "error")]
    Err { error: String },
}

/// Host function: read file contents as UTF-8 string
/// Returns JSON: { type: "ok", value: "content" } or { type: "error", error: "message" }
#[op2]
#[string]
fn op_fsReadFile(#[string] path: &str) -> String {
    let result = match fs::read_to_string(path) {
        Ok(content) => FsResult::Ok { value: content },
        Err(e) => FsResult::Err { error: format!("readFile failed: {}", e) },
    };
    serde_json::to_string(&result).unwrap_or_else(|e| format!(r#"{{"type":"error","error":"{}"}}"#, e))
}

/// Host function: write string content to a file
/// Returns JSON: { type: "ok", value: null } or { type: "error", error: "message" }
#[op2]
#[string]
fn op_fsWriteFile(#[string] path: &str, #[string] content: &str) -> String {
    let result: FsResult<()> = match fs::write(path, content) {
        Ok(()) => FsResult::Ok { value: () },
        Err(e) => FsResult::Err { error: format!("writeFile failed: {}", e) },
    };
    serde_json::to_string(&result).unwrap_or_else(|e| format!(r#"{{"type":"error","error":"{}"}}"#, e))
}

/// Host function: check if path is a file (not directory or symlink)
#[op2(fast)]
fn op_fsIsFile(#[string] path: &str) -> bool {
    Path::new(path).is_file()
}

/// Struct returned by op_lstat
#[derive(Serialize)]
struct FileStats {
    size: u64,
    is_file: bool,
    is_directory: bool,
    is_symlink: bool,
    // Unix timestamps in milliseconds (like JS Date.now())
    modified_ms: Option<u64>,
    created_ms: Option<u64>,
    accessed_ms: Option<u64>,
}

/// Host function: get file stats (like lstat - does not follow symlinks)
/// Returns JSON: { type: "ok", value: { size, is_file, ... } } or { type: "error", error: "message" }
#[op2]
#[string]
fn op_fsLstat(#[string] path: &str) -> String {
    let result = match fs::symlink_metadata(path) {
        Ok(metadata) => {
            let stats = FileStats {
                size: metadata.len(),
                is_file: metadata.is_file(),
                is_directory: metadata.is_dir(),
                is_symlink: metadata.file_type().is_symlink(),
                modified_ms: metadata.modified().ok().and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_millis() as u64)
                }),
                created_ms: metadata.created().ok().and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_millis() as u64)
                }),
                accessed_ms: metadata.accessed().ok().and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_millis() as u64)
                }),
            };
            FsResult::Ok { value: stats }
        }
        Err(e) => FsResult::Err { error: format!("lstat failed: {}", e) },
    };
    serde_json::to_string(&result).unwrap_or_else(|e| format!(r#"{{"type":"error","error":"{}"}}"#, e))
}

/// Host function: list directory contents
/// Returns JSON: { type: "ok", value: ["file1", "file2", ...] } or { type: "error", error: "message" }
#[op2]
#[string]
fn op_fsReaddir(#[string] path: &str) -> String {
    let result = match fs::read_dir(path) {
        Ok(read_dir) => {
            let entries: Result<Vec<String>, _> = read_dir
                .map(|entry| entry.map(|e| e.file_name().to_string_lossy().to_string()))
                .collect();
            match entries {
                Ok(list) => FsResult::Ok { value: list },
                Err(e) => FsResult::Err { error: format!("readdir failed: {}", e) },
            }
        }
        Err(e) => FsResult::Err { error: format!("readdir failed: {}", e) },
    };
    serde_json::to_string(&result).unwrap_or_else(|e| format!(r#"{{"type":"error","error":"{}"}}"#, e))
}

// ============================================================================
// HTTP Host Functions
// ============================================================================

/// Host function: HTTP fetch (blocking version for simplicity)
/// Takes method, URL, headers (as JSON string), and optional body
/// Returns a JSON string with { status, headers, body }
#[op2]
#[string]
fn op_httpFetch(
    #[string] method: &str,
    #[string] url: &str,
    #[string] headers_json: &str,
    #[string] body: &str,
) -> Result<String, JsErrorBox> {
    let client = reqwest::blocking::Client::new();
    
    // Build request based on method
    let mut request_builder = match method.to_uppercase().as_str() {
        "GET" => client.get(url),
        "POST" => client.post(url),
        "PUT" => client.put(url),
        "DELETE" => client.delete(url),
        "PATCH" => client.patch(url),
        "HEAD" => client.head(url),
        _ => return Err(JsErrorBox::type_error(format!("Unsupported HTTP method: {}", method))),
    };
    
    // Parse and add headers
    let headers: HashMap<String, String> = serde_json::from_str(headers_json)
        .map_err(|e| JsErrorBox::generic(format!("Invalid headers JSON: {}", e)))?;
    for (key, value) in headers {
        request_builder = request_builder.header(&key, &value);
    }
    
    // Add body if not empty
    if !body.is_empty() {
        request_builder = request_builder.body(body.to_string());
    }
    
    // Send request
    let response = request_builder.send()
        .map_err(|e| JsErrorBox::generic(format!("HTTP request failed: {}", e)))?;
    
    // Extract response data
    let status = response.status().as_u16();
    let response_headers: HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();
    let response_body = response.text()
        .map_err(|e| JsErrorBox::generic(format!("Failed to read response body: {}", e)))?;
    
    // Build response JSON
    let result = serde_json::json!({
        "status": status,
        "headers": response_headers,
        "body": response_body
    });
    
    Ok(result.to_string())
}

fn main() -> Result<(), AnyError> {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: funee [--emit] [--reload] <file.ts>");
        eprintln!("");
        eprintln!("Options:");
        eprintln!("  --emit    Print bundled JavaScript instead of executing");
        eprintln!("  --reload  Bypass HTTP cache and fetch fresh from network");
        eprintln!("");
        eprintln!("Runs the default export function from the given TypeScript file.");
        std::process::exit(1);
    }
    
    // Parse args
    let emit_only = args.contains(&"--emit".to_string());
    let force_reload = args.contains(&"--reload".to_string());
    let file_path = args.iter()
        .skip(1)
        .find(|arg| !arg.starts_with("--"))
        .expect("No file path provided");
    let absolute_path = if Path::new(file_path).is_absolute() {
        file_path.clone()
    } else {
        env::current_dir()?
            .join(file_path)
            .to_string_lossy()
            .to_string()
    };
    
    // Create expression to call the default export: default()
    let call_default = Expr::Call(CallExpr {
        span: Default::default(),
        ctxt: SyntaxContext::empty(),
        callee: Callee::Expr(Box::new(Expr::Ident(Ident::new(
            "default".into(),
            Default::default(),
            SyntaxContext::empty(),
        )))),
        type_args: None,
        args: vec![],
    });
    
    // Set up host functions
    let host_functions = HashMap::from([
        (
            FuneeIdentifier {
                name: "log".to_string(),
                uri: "funee".to_string(),
            },
            op_log(),
        ),
        (
            FuneeIdentifier {
                name: "debug".to_string(),
                uri: "funee".to_string(),
            },
            op_debug(),
        ),
        (
            FuneeIdentifier {
                name: "randomBytes".to_string(),
                uri: "funee".to_string(),
            },
            op_randomBytes(),
        ),
        // Filesystem host functions
        (
            FuneeIdentifier {
                name: "fsReadFile".to_string(),
                uri: "funee".to_string(),
            },
            op_fsReadFile(),
        ),
        (
            FuneeIdentifier {
                name: "fsWriteFile".to_string(),
                uri: "funee".to_string(),
            },
            op_fsWriteFile(),
        ),
        (
            FuneeIdentifier {
                name: "fsIsFile".to_string(),
                uri: "funee".to_string(),
            },
            op_fsIsFile(),
        ),
        (
            FuneeIdentifier {
                name: "fsLstat".to_string(),
                uri: "funee".to_string(),
            },
            op_fsLstat(),
        ),
        (
            FuneeIdentifier {
                name: "fsReaddir".to_string(),
                uri: "funee".to_string(),
            },
            op_fsReaddir(),
        ),
        // HTTP host functions
        (
            FuneeIdentifier {
                name: "httpFetch".to_string(),
                uri: "funee".to_string(),
            },
            op_httpFetch(),
        ),
    ]);
    
    // Locate funee-lib relative to the executable or use FUNEE_LIB_PATH env var
    let funee_lib_path = env::var("FUNEE_LIB_PATH").ok().or_else(|| {
        // Try to find funee-lib relative to the current executable
        env::current_exe().ok().and_then(|exe| {
            // In dev: exe is in target/release or target/debug
            // funee-lib is in the project root
            let mut path = exe.clone();
            // Go up from target/release/funee to project root
            for _ in 0..3 {
                path.pop();
            }
            path.push("funee-lib");
            path.push("index.ts");
            if path.exists() {
                return Some(path.to_string_lossy().to_string());
            }
            // Also check if funee-lib is next to the executable
            let mut path = exe;
            path.pop();
            path.push("funee-lib");
            path.push("index.ts");
            if path.exists() {
                return Some(path.to_string_lossy().to_string());
            }
            None
        })
    });
    
    let request = ExecutionRequest {
        expression: call_default,
        scope: absolute_path,
        host_functions,
        funee_lib_path,
        file_loader: Box::new(http_loader::HttpFileLoader::with_force_reload(force_reload)?),
    };
    
    if emit_only {
        println!("{}", request.emit());
    } else {
        request.execute()?;
    }
    
    Ok(())
}
