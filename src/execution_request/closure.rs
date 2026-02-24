use crate::funee_identifier::FuneeIdentifier;
use std::collections::HashMap;
use swc_ecma_ast::Expr;

/// A Closure captures an expression and its out-of-scope references
/// This is used for macro arguments to preserve the AST and context
#[derive(Debug, Clone)]
pub struct Closure {
    /// The captured expression (AST node)
    pub expression: Expr,
    /// Map of local variable names to their canonical definitions
    /// Only includes references that are out-of-scope in the expression
    pub references: HashMap<String, FuneeIdentifier>,
}

impl Closure {
    pub fn new(expression: Expr, references: HashMap<String, FuneeIdentifier>) -> Self {
        Self {
            expression,
            references,
        }
    }
}
