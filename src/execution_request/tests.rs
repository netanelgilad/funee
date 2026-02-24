use crate::{execution_request::ExecutionRequest, funee_identifier::FuneeIdentifier};
use ast::{CallExpr, Callee};
use deno_core::{op2, OpDecl};
use std::collections::HashMap;
use swc_common::{FileLoader, SyntaxContext};
use swc_ecma_ast as ast;
use bytes_str::BytesStr;

fn ident(name: &str) -> ast::Ident {
    ast::Ident::new(name.into(), Default::default(), SyntaxContext::empty())
}

// Sync op
#[op2(fast)]
fn op_log(#[string] something: &str) {
    println!("{:#?}", something);
}

fn get_op_log_decl() -> OpDecl {
    op_log()
}

struct MockFileLoader {
    pub files: HashMap<String, String>,
}

impl FileLoader for MockFileLoader {
    fn file_exists(&self, path: &std::path::Path) -> bool {
        println!("file_exists: {:?}", path);
        self.files.contains_key(path.to_str().unwrap())
    }

    fn abs_path(&self, path: &std::path::Path) -> Option<std::path::PathBuf> {
        println!("abs_path: {:?}", path);
        Some(path.to_path_buf())
    }

    fn read_file(&self, path: &std::path::Path) -> std::io::Result<BytesStr> {
        println!("reading file: {}", path.to_str().unwrap());
        Ok(BytesStr::from(self.files.get(path.to_str().unwrap()).unwrap().clone()))
    }
}

#[test]
fn it_works() {
    let request = ExecutionRequest {
        expression: ast::Expr::Call(CallExpr {
            span: Default::default(),
            ctxt: SyntaxContext::empty(),
            callee: Callee::Expr(Box::new(ast::Expr::Ident(ident("default")))),
            type_args: None,
            args: vec![],
        }),
        scope: "/Users/netanelg/Development/funee/example.ts".to_string(),
        host_functions: HashMap::from([(
            FuneeIdentifier {
                name: "log".to_string(),
                uri: "funee".to_string(),
            },
            get_op_log_decl(),
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
fn test_macro_detection() {
    use crate::execution_request::get_module_declarations::get_module_declarations;
    use crate::load_module::load_module;
    use std::path::PathBuf;
    use std::rc::Rc;
    use swc_common::{FilePathMapping, SourceMap};

    // Create a mock file loader with the macro-lib.ts content
    let file_loader = Box::new(MockFileLoader {
        files: HashMap::from([(
            "/test/macro-lib.ts".to_string(),
            r#"
export function createMacro<T, R>(fn: (closure: T) => R): (value: T) => R {
    throw new Error("Macro not expanded");
}

export const closure = createMacro(<T>(input: T) => {
    return input;
});
            "#
            .to_string(),
        )]),
    });

    let cm = Rc::new(SourceMap::with_file_loader(
        file_loader,
        FilePathMapping::empty(),
    ));

    // Load the module and get declarations
    let module = load_module(&cm, PathBuf::from("/test/macro-lib.ts"));
    let declarations = get_module_declarations(module);

    // Verify that 'closure' is detected as a Macro
    let closure_decl = declarations.get("closure").expect("closure declaration should exist");
    
    match &closure_decl.declaration {
        crate::execution_request::declaration::Declaration::Macro(_) => {
            println!("✅ Successfully detected 'closure' as a Macro!");
        }
        other => {
            panic!("Expected closure to be a Macro, but got: {:?}", other);
        }
    }

    // Verify that 'createMacro' is NOT a Macro (it's just a regular function)
    let create_macro_decl = declarations.get("createMacro").expect("createMacro declaration should exist");
    
    match &create_macro_decl.declaration {
        crate::execution_request::declaration::Declaration::Macro(_) => {
            panic!("createMacro should NOT be detected as a Macro");
        }
        _ => {
            println!("✅ createMacro correctly identified as regular function");
        }
    }
}
