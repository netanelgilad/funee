use super::closure::Closure;
use crate::funee_identifier::FuneeIdentifier;
use std::collections::{HashMap, HashSet};
use swc_ecma_ast::{Expr, Ident, Pat, Param, Function, ArrowExpr, VarDeclarator, CatchClause, BlockStmtOrExpr};
use swc_ecma_visit::{noop_visit_type, Visit, VisitWith};

/// Visitor that collects all free variables in an expression
/// A free variable is one that's used but not defined within the expression
struct FreeVariableCollector {
    /// Stack of scopes - each scope contains bound variable names
    scopes: Vec<HashSet<String>>,
    /// Collected free variables
    free_variables: HashSet<String>,
}

impl FreeVariableCollector {
    fn new() -> Self {
        Self {
            scopes: vec![HashSet::new()],
            free_variables: HashSet::new(),
        }
    }

    fn enter_scope(&mut self) {
        self.scopes.push(HashSet::new());
    }

    fn exit_scope(&mut self) {
        self.scopes.pop();
    }

    fn bind(&mut self, name: &str) {
        if let Some(scope) = self.scopes.last_mut() {
            scope.insert(name.to_string());
        }
    }

    fn is_bound(&self, name: &str) -> bool {
        self.scopes.iter().any(|scope| scope.contains(name))
    }

    fn bind_pattern(&mut self, pat: &Pat) {
        match pat {
            Pat::Ident(ident) => {
                self.bind(&ident.id.sym);
            }
            Pat::Array(arr) => {
                for elem in arr.elems.iter().flatten() {
                    self.bind_pattern(elem);
                }
            }
            Pat::Rest(rest) => {
                self.bind_pattern(&rest.arg);
            }
            Pat::Object(obj) => {
                for prop in &obj.props {
                    match prop {
                        swc_ecma_ast::ObjectPatProp::KeyValue(kv) => {
                            self.bind_pattern(&kv.value);
                        }
                        swc_ecma_ast::ObjectPatProp::Assign(assign) => {
                            self.bind(&assign.key.sym);
                        }
                        swc_ecma_ast::ObjectPatProp::Rest(rest) => {
                            self.bind_pattern(&rest.arg);
                        }
                    }
                }
            }
            Pat::Assign(assign) => {
                self.bind_pattern(&assign.left);
            }
            Pat::Expr(_) => {
                // Expression patterns don't bind names
            }
            Pat::Invalid(_) => {}
        }
    }
}

impl Visit for FreeVariableCollector {
    noop_visit_type!();

    fn visit_ident(&mut self, ident: &Ident) {
        let name = ident.sym.as_ref();
        if !self.is_bound(name) {
            self.free_variables.insert(name.to_string());
        }
    }

    fn visit_function(&mut self, func: &Function) {
        self.enter_scope();
        
        // Bind function parameters
        for param in &func.params {
            self.bind_pattern(&param.pat);
        }
        
        // Visit function body
        if let Some(body) = &func.body {
            body.visit_with(self);
        }
        
        self.exit_scope();
    }

    fn visit_arrow_expr(&mut self, arrow: &ArrowExpr) {
        self.enter_scope();
        
        // Bind arrow function parameters
        for pat in &arrow.params {
            self.bind_pattern(pat);
        }
        
        // Visit arrow body
        match &*arrow.body {
            BlockStmtOrExpr::BlockStmt(block) => block.visit_with(self),
            BlockStmtOrExpr::Expr(expr) => expr.visit_with(self),
        }
        
        self.exit_scope();
    }

    fn visit_var_declarator(&mut self, decl: &VarDeclarator) {
        // Bind the variable name
        self.bind_pattern(&decl.name);
        
        // Visit the initializer (if any)
        if let Some(init) = &decl.init {
            init.visit_with(self);
        }
    }

    fn visit_catch_clause(&mut self, clause: &CatchClause) {
        self.enter_scope();
        
        // Bind catch parameter
        if let Some(param) = &clause.param {
            self.bind_pattern(param);
        }
        
        // Visit catch body
        clause.body.visit_with(self);
        
        self.exit_scope();
    }
}

/// Get all free variables in an expression
fn get_free_variables(expr: &Expr) -> HashSet<String> {
    let mut collector = FreeVariableCollector::new();
    expr.visit_with(&mut collector);
    collector.free_variables
}

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
pub fn capture_closure(
    expr: Expr,
    scope_references: &HashMap<String, FuneeIdentifier>,
) -> Closure {
    // Get all free variables used in the expression
    let free_vars = get_free_variables(&expr);
    
    // Filter to only those that are in the scope references (defined in parent scope)
    let mut closure_references = HashMap::new();
    for ref_name in free_vars {
        if let Some(identifier) = scope_references.get(&ref_name) {
            closure_references.insert(ref_name, identifier.clone());
        }
    }
    
    Closure::new(expr, closure_references)
}

#[cfg(test)]
mod tests {
    use super::*;
    use swc_common::SyntaxContext;

    fn ident(name: &str) -> Ident {
        Ident::new(name.into(), Default::default(), SyntaxContext::empty())
    }

    #[test]
    fn test_capture_closure_with_no_references() {
        // Expression: 42 (no references)
        let expr = Expr::Lit(swc_ecma_ast::Lit::Num(swc_ecma_ast::Number {
            span: Default::default(),
            value: 42.0,
            raw: None,
        }));
        
        let scope_refs = HashMap::new();
        let closure = capture_closure(expr, &scope_refs);
        
        assert!(closure.references.is_empty(), "Literal should have no references");
    }

    #[test]
    fn test_capture_closure_with_references() {
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
        
        let closure = capture_closure(expr, &scope_refs);
        
        assert_eq!(closure.references.len(), 1, "Should capture one reference");
        assert!(closure.references.contains_key("someVar"), "Should capture someVar");
    }

    #[test]
    fn test_capture_closure_with_arrow_function() {
        // Expression: () => someVar (arrow function using free variable)
        let expr = Expr::Arrow(ArrowExpr {
            span: Default::default(),
            ctxt: SyntaxContext::empty(),
            params: vec![],
            body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Ident(ident("someVar"))))),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
        });
        
        let mut scope_refs = HashMap::new();
        scope_refs.insert(
            "someVar".to_string(),
            FuneeIdentifier {
                name: "someVar".to_string(),
                uri: "/test/module.ts".to_string(),
            },
        );
        
        let closure = capture_closure(expr, &scope_refs);
        
        assert_eq!(closure.references.len(), 1, "Should capture someVar from inside arrow");
        assert!(closure.references.contains_key("someVar"), "Should capture someVar");
    }

    #[test]
    fn test_capture_closure_with_bound_parameter() {
        // Expression: (x) => x (parameter is bound, not free)
        let expr = Expr::Arrow(ArrowExpr {
            span: Default::default(),
            ctxt: SyntaxContext::empty(),
            params: vec![Pat::Ident(swc_ecma_ast::BindingIdent {
                id: ident("x"),
                type_ann: None,
            })],
            body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Ident(ident("x"))))),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
        });
        
        let mut scope_refs = HashMap::new();
        scope_refs.insert(
            "x".to_string(),
            FuneeIdentifier {
                name: "x".to_string(),
                uri: "/test/module.ts".to_string(),
            },
        );
        
        let closure = capture_closure(expr, &scope_refs);
        
        assert!(closure.references.is_empty(), "Parameter x should not be a free variable");
    }
}
