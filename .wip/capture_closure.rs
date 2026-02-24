use super::closure::Closure;
use super::get_references_from_declaration::get_references_from_ast;
use crate::funee_identifier::FuneeIdentifier;
use std::collections::HashMap;
use swc_common::{Globals, Mark};
use swc_ecma_ast::Expr;

/// Capture an expression as a Closure with its out-of-scope references
/// 
/// This is used when an expression is passed as an argument to a macro.
/// We need to capture:
/// 1. The expression's AST
/// 2. All references that are defined outside the expression (out-of-scope)
///
/// # Arguments
/// * `expr` - The expression to capture (e.g., the `add` in `closure(add)`)
/// * `scope_references` - The references available in the calling scope
/// * `unresolved_mark` - SWC's mark for tracking unresolved identifiers
pub fn capture_closure(
    mut expr: Expr,
    scope_references: &HashMap<String, FuneeIdentifier>,
    unresolved_mark: (&Globals, Mark),
) -> Closure {
    // Get all references used in the expression
    let expr_references = get_references_from_ast(&mut expr, unresolved_mark);
    
    // Filter to only those that are out-of-scope (defined in parent scope)
    let mut closure_references = HashMap::new();
    for ref_name in expr_references {
        if let Some(identifier) = scope_references.get(&ref_name) {
            closure_references.insert(ref_name, identifier.clone());
        }
    }
    
    Closure::new(expr, closure_references)
}

#[cfg(test)]
mod tests {
    use super::*;
    use swc_common::{Globals, Mark, SyntaxContext};
    use swc_ecma_ast::Ident;

    fn ident(name: &str) -> Ident {
        Ident::new(name.into(), Default::default(), SyntaxContext::empty())
    }

    #[test]
    fn test_capture_closure_with_no_references() {
        use swc_common::GLOBALS;
        
        let globals = Globals::default();
        GLOBALS.set(&globals, || {
            let mark = Mark::new();
            
            // Expression: 42 (no references)
            let expr = Expr::Lit(swc_ecma_ast::Lit::Num(swc_ecma_ast::Number {
                span: Default::default(),
                value: 42.0,
                raw: None,
            }));
            
            let scope_refs = HashMap::new();
            let closure = capture_closure(expr, &scope_refs, (&globals, mark));
            
            assert!(closure.references.is_empty(), "Literal should have no references");
        });
    }

    #[test]
    fn test_capture_closure_with_references() {
        use swc_common::GLOBALS;
        
        let globals = Globals::default();
        GLOBALS.set(&globals, || {
            let mark = Mark::new();
            
            // Expression: someVar (references someVar)
            let expr = Expr::Ident(ident("someVar"));
            
            let mut scope_refs = HashMap::new();
            scope_refs.insert(
                "someVar".to_string(),
                FuneeIdentifier {
                    name: "someVar".to_string(),
                    uri: "/test/module.ts".to_string(),
                },
            );
            
            let closure = capture_closure(expr, &scope_refs, (&globals, mark));
            
            assert_eq!(closure.references.len(), 1, "Should capture one reference");
            assert!(closure.references.contains_key("someVar"), "Should capture someVar");
        });
    }
}
