use crate::funee_identifier::FuneeIdentifier;
use swc_common::SyntaxContext;
use swc_ecma_ast::{
    BlockStmt, CallExpr, Callee, ComputedPropName, Decl, Expr, ExprOrSpread, ExprStmt, FnDecl,
    FnExpr, Ident, IdentName, Lit, MemberExpr, MemberProp, ModuleItem, Param, Pat, RestPat, ReturnStmt, Stmt,
};

#[derive(Debug, Clone)]
pub enum Declaration {
    Expr(Expr),
    FnExpr(FnExpr),
    FnDecl(FnDecl),
    FuneeIdentifier(FuneeIdentifier),
    HostFn(String),
}

fn ident(name: &str) -> Ident {
    Ident::new(name.into(), Default::default(), SyntaxContext::empty())
}

fn ident_name(name: &str) -> IdentName {
    IdentName::new(name.into(), Default::default())
}

impl Declaration {
    pub fn into_module_item(self, name: String) -> ModuleItem {
        ModuleItem::Stmt(match self {
            Declaration::FnDecl(mut fn_decl) => {
                fn_decl.ident.sym = name.into();
                Stmt::Decl(Decl::Fn(fn_decl))
            }
            Declaration::FnExpr(fn_expr) => {
                let fn_decl = FnDecl {
                    ident: ident(&name),
                    declare: Default::default(),
                    function: fn_expr.function,
                };
                Stmt::Decl(Decl::Fn(fn_decl))
            }
            Declaration::Expr(fn_expr) => Stmt::Expr(ExprStmt {
                span: Default::default(),
                expr: Box::new(fn_expr),
            }),
            Declaration::FuneeIdentifier(_) => unreachable!(),
            Declaration::HostFn(op_name) => Stmt::Decl(Decl::Fn(FnDecl {
                ident: ident(&name),
                declare: Default::default(),
                function: Box::new(swc_ecma_ast::Function {
                    params: vec![Param {
                        span: Default::default(),
                        decorators: Default::default(),
                        pat: Pat::Rest(RestPat {
                            span: Default::default(),
                            dot3_token: Default::default(),
                            arg: Box::new(Pat::Ident(
                                ident("args").into(),
                            )),
                            type_ann: None,
                        }),
                    }],
                    decorators: Default::default(),
                    span: Default::default(),
                    ctxt: SyntaxContext::empty(),
                    body: Some(BlockStmt {
                        span: Default::default(),
                        ctxt: SyntaxContext::empty(),
                        stmts: vec![Stmt::Return(ReturnStmt {
                            span: Default::default(),
                            arg: Some(Box::new(Expr::Call(CallExpr {
                                span: Default::default(),
                                ctxt: SyntaxContext::empty(),
                                type_args: None,
                                args: vec![
                                    ExprOrSpread {
                                        expr: Box::new(Expr::Lit(Lit::Str(
                                            format!("op_{}", op_name).into(),
                                        ))),
                                        spread: None,
                                    },
                                    ExprOrSpread {
                                        expr: Box::new(Expr::Member(MemberExpr {
                                            span: Default::default(),
                                            obj: Box::new(Expr::Ident(ident("args"))),
                                            prop: MemberProp::Computed(ComputedPropName {
                                                span: Default::default(),
                                                expr: Box::new(Expr::Lit(Lit::Num(0.into()))),
                                            }),
                                        })),
                                        spread: None,
                                    },
                                ],
                                callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
                                    span: Default::default(),
                                    prop: MemberProp::Ident(ident_name("opAsync")),
                                    obj: Box::new(Expr::Member(MemberExpr {
                                        span: Default::default(),
                                        prop: MemberProp::Ident(ident_name("core")),
                                        obj: Box::new(Expr::Ident(ident("Deno"))),
                                    })),
                                }))),
                            }))),
                        })],
                    }),
                    is_generator: false,
                    is_async: true,
                    type_params: None,
                    return_type: None,
                }),
            })),
        })
    }
}
