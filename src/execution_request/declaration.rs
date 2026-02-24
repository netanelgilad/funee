use crate::funee_identifier::FuneeIdentifier;
use swc_common::SyntaxContext;
use swc_ecma_ast::{
    BlockStmt, CallExpr, Callee, Decl, Expr, ExprOrSpread, ExprStmt, FnDecl,
    FnExpr, Ident, IdentName, MemberExpr, MemberProp, ModuleItem, Param, Pat, RestPat, ReturnStmt, Stmt,
    VarDecl, VarDeclKind, VarDeclarator,
};

#[derive(Debug, Clone)]
pub enum Declaration {
    Expr(Expr),
    FnExpr(FnExpr),
    FnDecl(FnDecl),
    /// Variable declaration with initializer (e.g., `const add = () => ...`)
    VarInit(Expr),
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
            Declaration::VarInit(init_expr) => {
                // Generate: var name = init_expr;
                Stmt::Decl(Decl::Var(Box::new(VarDecl {
                    span: Default::default(),
                    ctxt: SyntaxContext::empty(),
                    kind: VarDeclKind::Var,
                    declare: false,
                    decls: vec![VarDeclarator {
                        span: Default::default(),
                        name: Pat::Ident(ident(&name).into()),
                        init: Some(Box::new(init_expr)),
                        definite: false,
                    }],
                })))
            }
            Declaration::FuneeIdentifier(_) => unreachable!(),
            Declaration::HostFn(op_name) => {
                // Generate: function name(...args) { return Deno.core.ops.op_name(...args); }
                Stmt::Decl(Decl::Fn(FnDecl {
                    ident: ident(&name),
                    declare: Default::default(),
                    function: Box::new(swc_ecma_ast::Function {
                        params: vec![Param {
                            span: Default::default(),
                            decorators: Default::default(),
                            pat: Pat::Rest(RestPat {
                                span: Default::default(),
                                dot3_token: Default::default(),
                                arg: Box::new(Pat::Ident(ident("args").into())),
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
                                    // Deno.core.ops.op_name(...args)
                                    callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
                                        span: Default::default(),
                                        prop: MemberProp::Ident(ident_name(&format!("op_{}", op_name))),
                                        obj: Box::new(Expr::Member(MemberExpr {
                                            span: Default::default(),
                                            prop: MemberProp::Ident(ident_name("ops")),
                                            obj: Box::new(Expr::Member(MemberExpr {
                                                span: Default::default(),
                                                prop: MemberProp::Ident(ident_name("core")),
                                                obj: Box::new(Expr::Ident(ident("Deno"))),
                                            })),
                                        })),
                                    }))),
                                    args: vec![ExprOrSpread {
                                        spread: Some(Default::default()),
                                        expr: Box::new(Expr::Ident(ident("args"))),
                                    }],
                                }))),
                            })],
                        }),
                        is_generator: false,
                        is_async: false, // sync for now
                        type_params: None,
                        return_type: None,
                    }),
                }))
            }
        })
    }
}
