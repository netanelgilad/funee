use ast::{CallExpr, Callee};
use deno_core::{error::AnyError, op, OpState, Resource};
use funee::{execution_request::ExecutionRequest, funee_identifier::FuneeIdentifier};
use std::collections::HashMap;
use swc_common::FileLoader;
use swc_ecma_ast as ast;

struct SomeResource {}

impl Resource for SomeResource {}

mod trace_host;

#[op]
fn op_log(state: &mut OpState, something: String) -> Result<(), AnyError> {
    let r = state.resource_table.add(SomeResource {});
    println!(
        "{:?}",
        state.resource_table.names().into_iter().collect::<Vec<_>>()
    );
    println!("{:#?}", something);
    Ok(())
}

struct MockFileLoader {
    pub files: HashMap<String, String>,
}

impl FileLoader for MockFileLoader {
    fn file_exists(&self, path: &std::path::Path) -> bool {
        self.files.contains_key(path.to_str().unwrap())
    }

    fn abs_path(&self, path: &std::path::Path) -> Option<std::path::PathBuf> {
        Some(path.to_path_buf())
    }

    fn read_file(&self, path: &std::path::Path) -> std::io::Result<String> {
        Ok(self.files.get(path.to_str().unwrap()).unwrap().clone())
    }
}

#[test]
fn calling_a_host_function() {
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
        scope: "/example.ts".to_string(),
        host: NOOP_HOST,
        file_loader: Box::new(MockFileLoader {
            files: HashMap::from([
                (
                    "/example.ts".to_string(),
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
                    "/another.ts".to_string(),
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
