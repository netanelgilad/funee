use super::declaration::Declaration;
use crate::funee_identifier::FuneeIdentifier;
use std::{collections::HashMap, path::Path};
use swc_ecma_ast::{
    Callee, Decl, DefaultDecl, ExportSpecifier, Expr, ImportSpecifier, Module, ModuleDecl,
    ModuleExportName, ModuleItem, Pat, Stmt,
};

pub fn get_module_declarations(module: Module) -> HashMap<String, ModuleDeclaration> {
    HashMap::from_iter(
        module
            .body
            .into_iter()
            .flat_map(|x| get_module_declarations_from_module_item("".to_string(), x)),
    )
}

pub struct ModuleDeclaration {
    #[allow(dead_code)]
    pub exported: bool,
    pub declaration: Declaration,
}

fn atom_to_string(atom: &swc_atoms::Atom) -> String {
    // Atom derefs to str for valid UTF-8
    (&**atom).to_string()
}

/// Check if an expression is a call to createMacro() and extract the macro function
/// Pattern: createMacro((input: Closure<T>) => { ... })
/// Returns: Some(macro_function_expr) if it's a createMacro call, None otherwise
fn extract_macro_function(expr: &Expr) -> Option<Expr> {
    if let Expr::Call(call_expr) = expr {
        // Check if the callee is an identifier named "createMacro"
        if let Callee::Expr(callee_expr) = &call_expr.callee {
            if let Expr::Ident(ident) = &**callee_expr {
                if atom_to_string(&ident.sym) == "createMacro" {
                    // Extract the first argument (the macro function)
                    if let Some(first_arg) = call_expr.args.first() {
                        return Some((*first_arg.expr).clone());
                    }
                }
            }
        }
    }
    None
}

fn wtf8_to_string(atom: &swc_atoms::Wtf8Atom) -> String {
    // Wtf8Atom for string literals
    atom.as_str().unwrap_or_default().to_string()
}

fn get_name_from_module_export_name(name: &ModuleExportName) -> String {
    match name {
        ModuleExportName::Ident(ref ident) => atom_to_string(&ident.sym),
        ModuleExportName::Str(ref s) => wtf8_to_string(&s.value),
    }
}

fn get_module_declarations_from_module_item(
    current_uri: String,
    module_item: ModuleItem,
) -> Vec<(String, ModuleDeclaration)> {
    match module_item {
        ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(node)) => match node.decl {
            DefaultDecl::Fn(func) => vec![(
                "default".to_string(),
                ModuleDeclaration {
                    exported: true,
                    declaration: Declaration::FnExpr(func),
                },
            )],
            _ => vec![],
        },
        ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(decl)) => match decl.decl {
            Decl::Fn(fn_decl) => vec![(
                atom_to_string(&fn_decl.ident.sym),
                ModuleDeclaration {
                    exported: true,
                    declaration: Declaration::FnDecl(fn_decl),
                },
            )],
            Decl::Var(var_decl) => var_decl
                .decls
                .into_iter()
                .filter_map(|declarator| {
                    // Only handle simple identifier patterns with initializers
                    if let (Pat::Ident(ident), Some(init)) = (declarator.name, declarator.init) {
                        // Check if this is a macro created via createMacro()
                        let declaration = if let Some(macro_fn) = extract_macro_function(&init) {
                            Declaration::Macro(macro_fn)
                        } else {
                            Declaration::VarInit(*init)
                        };
                        
                        Some((
                            atom_to_string(&ident.sym),
                            ModuleDeclaration {
                                exported: true,
                                declaration,
                            },
                        ))
                    } else {
                        None
                    }
                })
                .collect(),
            _ => vec![],
        },
        ModuleItem::ModuleDecl(ModuleDecl::ExportNamed(decl)) => decl
            .specifiers
            .iter()
            .filter_map(|export_specifier| match export_specifier {
                ExportSpecifier::Named(n) => Some((
                    get_name_from_module_export_name(match n.exported {
                        Some(ref exported) => exported,
                        None => &n.orig,
                    }),
                    ModuleDeclaration {
                        exported: true,
                        declaration: Declaration::FuneeIdentifier(FuneeIdentifier {
                            name: get_name_from_module_export_name(&n.orig),
                            uri: match decl.src {
                                Some(ref src) => wtf8_to_string(&src.value),
                                None => current_uri.clone(),
                            },
                        }),
                    },
                )),
                ExportSpecifier::Default(_) => None,
                ExportSpecifier::Namespace(_) => None,
            })
            .collect(),
        ModuleItem::ModuleDecl(ModuleDecl::Import(decl)) => decl
            .specifiers
            .iter()
            .filter_map(|import_specifier| match import_specifier {
                ImportSpecifier::Named(n) => Some((
                    atom_to_string(&n.local.sym),
                    ModuleDeclaration {
                        exported: false,
                        declaration: Declaration::FuneeIdentifier(FuneeIdentifier {
                            name: match n.imported {
                                Some(ref imported) => get_name_from_module_export_name(imported),
                                None => atom_to_string(&n.local.sym),
                            },
                            uri: get_import_decl_uri(&current_uri, &decl),
                        }),
                    },
                )),
                ImportSpecifier::Default(n) => Some((
                    atom_to_string(&n.local.sym),
                    ModuleDeclaration {
                        exported: false,
                        declaration: Declaration::FuneeIdentifier(FuneeIdentifier {
                            name: "default".to_string(),
                            uri: get_import_decl_uri(&current_uri, &decl),
                        }),
                    },
                )),
                ImportSpecifier::Namespace(_) => None,
            })
            .collect(),
        ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultExpr(expr)) => vec![(
            "default".to_string(),
            ModuleDeclaration {
                exported: true,
                declaration: Declaration::VarInit(*expr.expr),
            },
        )],
        ModuleItem::Stmt(Stmt::Decl(Decl::Fn(func))) => vec![(
            atom_to_string(&func.ident.sym),
            ModuleDeclaration {
                exported: false,
                declaration: Declaration::FnDecl(func),
            },
        )],
        // Handle non-exported variable declarations (e.g., const addClosure = closure(add))
        ModuleItem::Stmt(Stmt::Decl(Decl::Var(var_decl))) => var_decl
            .decls
            .into_iter()
            .filter_map(|declarator| {
                // Only handle simple identifier patterns with initializers
                if let (Pat::Ident(ident), Some(init)) = (declarator.name, declarator.init) {
                    // Check if this is a macro created via createMacro()
                    let declaration = if let Some(macro_fn) = extract_macro_function(&init) {
                        Declaration::Macro(macro_fn)
                    } else {
                        Declaration::VarInit(*init)
                    };
                    
                    Some((
                        atom_to_string(&ident.sym),
                        ModuleDeclaration {
                            exported: false,
                            declaration,
                        },
                    ))
                } else {
                    None
                }
            })
            .collect(),
        _ => vec![],
    }
}

fn get_import_decl_uri(current_uri: &String, decl: &swc_ecma_ast::ImportDecl) -> String {
    Path::new(current_uri)
        .join(Path::new(&wtf8_to_string(&decl.src.value)))
        .to_str()
        .unwrap()
        .to_string()
}
