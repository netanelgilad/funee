use crate::{execution_request::ExecutionRequest, funee_identifier::FuneeIdentifier};
use ast::{CallExpr, Callee};
use deno_core::{error::AnyError, op};
use std::collections::HashMap;
use swc_common::FileLoader;
use swc_ecma_ast as ast;

// Sync op - still works through opAsync (resolves immediately)
#[op]
fn op_log(something: String) -> Result<(), AnyError> {
    println!("{:#?}", something);
    Ok(())
}

// Async op - demonstrates actual async behavior
#[op]
async fn op_delay_echo(message: String) -> Result<String, AnyError> {
    // Simulate async work (e.g., network call)
    tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    Ok(format!("echo: {}", message))
}

// Async op - simulates a fetch operation
#[op]
async fn op_mock_fetch(url: String) -> Result<String, AnyError> {
    // In real impl, this would do actual HTTP
    tokio::time::sleep(std::time::Duration::from_millis(5)).await;
    Ok(format!(r#"{{"url": "{}", "status": 200, "body": "mock response"}}"#, url))
}

struct MockFileLoader {
    pub files: HashMap<String, String>,
}

impl FileLoader for MockFileLoader {
    fn file_exists(&self, path: &std::path::Path) -> bool {
        println!("abs_path: {:?}", path);
        self.files.contains_key(path.to_str().unwrap())
    }

    fn abs_path(&self, path: &std::path::Path) -> Option<std::path::PathBuf> {
        println!("abs_path: {:?}", path);
        Some(path.to_path_buf())
    }

    fn read_file(&self, path: &std::path::Path) -> std::io::Result<String> {
        println!("reading file: {}", path.to_str().unwrap());
        Ok(self.files.get(path.to_str().unwrap()).unwrap().clone())
    }
}

#[test]
fn it_works() {
    let request = ExecutionRequest {
        expression: ast::Expr::Call(CallExpr {
            span: Default::default(),
            callee: Callee::Expr(Box::new(ast::Expr::Ident(ast::Ident::new(
                "default".into(),
                Default::default(),
            )))),
            type_args: None,
            args: vec![],
        }),
        scope: "/Users/netanelg/Development/funee/example.ts".to_string(),
        host_functions: HashMap::from([(
            FuneeIdentifier {
                name: "log".to_string(),
                uri: "funee".to_string(),
            },
            op_log::decl(),
        )]),
        file_loader: Box::new(MockFileLoader {
            files: HashMap::from([
                (
                    "/Users/netanelg/Development/funee/example.ts".to_string(),
                    r#"
                import { log } from "funee";
                import { renameMe } from "./another.ts";
                export default async function () {
                    renameMe();
                    log("hello world 2");
                  }
                "#
                    .to_string(),
                ),
                (
                    "/Users/netanelg/Development/funee/another.ts".to_string(),
                    r#"
                import { log } from "funee";

                function renameMe() {
                    log("hello");
                }
                "#
                    .to_string(),
                ),
            ]),
        }),
    };
    assert_eq!(request.execute().unwrap(), ());
}

#[test]
fn async_ops_work() {
    let request = ExecutionRequest {
        expression: ast::Expr::Call(CallExpr {
            span: Default::default(),
            callee: Callee::Expr(Box::new(ast::Expr::Ident(ast::Ident::new(
                "default".into(),
                Default::default(),
            )))),
            type_args: None,
            args: vec![],
        }),
        scope: "/test/async_example.ts".to_string(),
        host_functions: HashMap::from([
            (
                FuneeIdentifier {
                    name: "log".to_string(),
                    uri: "funee".to_string(),
                },
                op_log::decl(),
            ),
            (
                FuneeIdentifier {
                    name: "delayEcho".to_string(),
                    uri: "funee".to_string(),
                },
                op_delay_echo::decl(),
            ),
            (
                FuneeIdentifier {
                    name: "mockFetch".to_string(),
                    uri: "funee".to_string(),
                },
                op_mock_fetch::decl(),
            ),
        ]),
        file_loader: Box::new(MockFileLoader {
            files: HashMap::from([
                (
                    "/test/async_example.ts".to_string(),
                    r#"
                import { log, delayEcho, mockFetch } from "funee";

                export default async function () {
                    // Test async echo
                    const echoed = await delayEcho("hello async world");
                    log(echoed);

                    // Test async fetch
                    const response = await mockFetch("https://api.example.com/data");
                    log(response);

                    log("async ops completed!");
                }
                "#
                    .to_string(),
                ),
            ]),
        }),
    };
    assert_eq!(request.execute().unwrap(), ());
}
