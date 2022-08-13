use swc_ecma_ast::{Expr, FnDecl, FnExpr};

use crate::funee_identifier::FuneeIdentifier;

#[derive(Debug)]
pub enum Declaration {
    Expr(Expr),
    FnExpr(FnExpr),
    FnDecl(FnDecl),
    FuneeIdentifier(FuneeIdentifier),
    HostFn(FuneeIdentifier),
}
