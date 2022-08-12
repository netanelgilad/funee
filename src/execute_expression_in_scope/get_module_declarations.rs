use std::collections::HashMap;

use swc_ecma_ast::{
    Decl, DefaultDecl, ExportSpecifier, ImportSpecifier, Module, ModuleDecl, ModuleExportName,
    ModuleItem, Stmt,
};

use crate::funee_identifier::FuneeIdentifier;

use super::declaration::Declaration;

pub fn get_module_declarations(module: Module) -> HashMap<String, ModuleDeclaration> {
    HashMap::from_iter(
        module
            .body
            .into_iter()
            .flat_map(|x| get_module_declarations_from_module_item("".to_string(), x)),
    )
}

pub struct ModuleDeclaration {
    pub exported: bool,
    pub declaration: Declaration,
}

fn get_name_from_module_export_name(name: &ModuleExportName) -> String {
    match name {
        ModuleExportName::Ident(ref ident) => ident.sym.to_string(),
        ModuleExportName::Str(ref s) => s.value.to_string(),
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
                fn_decl.ident.sym.to_string(),
                ModuleDeclaration {
                    exported: true,
                    declaration: Declaration::FnDecl(fn_decl),
                },
            )],
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
                                Some(ref src) => src.value.to_string(),
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
                    n.local.sym.to_string(),
                    ModuleDeclaration {
                        exported: false,
                        declaration: Declaration::FuneeIdentifier(FuneeIdentifier {
                            name: match n.imported {
                                Some(ref imported) => get_name_from_module_export_name(imported),
                                None => n.local.sym.to_string(),
                            },
                            uri: decl.src.value.to_string(),
                        }),
                    },
                )),
                ImportSpecifier::Default(n) => Some((
                    n.local.sym.to_string(),
                    ModuleDeclaration {
                        exported: false,
                        declaration: Declaration::FuneeIdentifier(FuneeIdentifier {
                            name: "default".to_string(),
                            uri: decl.src.value.to_string(),
                        }),
                    },
                )),
                ImportSpecifier::Namespace(_) => None,
            })
            .collect(),
        ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultExpr(_)) => vec![],
        ModuleItem::Stmt(Stmt::Decl(Decl::Fn(func))) => vec![(
            func.ident.sym.to_string(),
            ModuleDeclaration {
                exported: false,
                declaration: Declaration::FnDecl(func),
            },
        )],
        _ => vec![],
    }
}
