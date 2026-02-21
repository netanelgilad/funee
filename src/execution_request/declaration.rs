use crate::funee_identifier::FuneeIdentifier;
use swc_ecma_ast::{
    BlockStmt, CallExpr, Callee, ComputedPropName, Decl, Expr, ExprOrSpread, ExprStmt, FnDecl,
    FnExpr, Ident, Lit, MemberExpr, MemberProp, ModuleItem, Param, Pat, RestPat, ReturnStmt, Stmt,
};

#[derive(Debug, Clone)]
pub enum Declaration {
    Expr(Expr),
    FnExpr(FnExpr),
    FnDecl(FnDecl),
    FuneeIdentifier(FuneeIdentifier),
    HostFn(String),
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
                    ident: Ident::new(name.into(), Default::default()),
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
                ident: Ident::new(name.into(), Default::default()),
                declare: Default::default(),
                function: swc_ecma_ast::Function {
                    params: vec![Param {
                        span: Default::default(),
                        decorators: Default::default(),
                        pat: Pat::Rest(RestPat {
                            span: Default::default(),
                            dot3_token: Default::default(),
                            arg: Box::new(Pat::Ident(
                                Ident::new("args".into(), Default::default()).into(),
                            )),
                            type_ann: None,
                        }),
                    }],
                    decorators: Default::default(),
                    span: Default::default(),
                    body: Some(BlockStmt {
                        span: Default::default(),
                        stmts: vec![Stmt::Return(ReturnStmt {
                            span: Default::default(),
                            arg: Some(Box::new(Expr::Call(CallExpr {
                                span: Default::default(),
                                type_args: None,
                                args: vec![
                                    ExprOrSpread {
                                        expr: Box::new(Expr::Lit(Lit::Str(
                                            ("op_".to_string() + &op_name).into(),
                                        ))),
                                        spread: None,
                                    },
                                    ExprOrSpread {
                                        expr: Box::new(Expr::Member(MemberExpr {
                                            span: Default::default(),
                                            obj: Box::new(Expr::Ident(Ident::new(
                                                "args".into(),
                                                Default::default(),
                                            ))),
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
                                    prop: swc_ecma_ast::MemberProp::Ident(Ident::new(
                                        "opAsync".into(),
                                        Default::default(),
                                    )),
                                    obj: Box::new(Expr::Member(MemberExpr {
                                        span: Default::default(),
                                        prop: swc_ecma_ast::MemberProp::Ident(Ident::new(
                                            "core".into(),
                                            Default::default(),
                                        )),
                                        obj: Box::new(Expr::Ident(Ident::new(
                                            "Deno".into(),
                                            Default::default(),
                                        ))),
                                    })),
                                }))),
                            }))),
                        })],
                    }),
                    is_generator: false,
                    is_async: true,
                    type_params: None,
                    return_type: None,
                },
            })),
        })
    }
}
