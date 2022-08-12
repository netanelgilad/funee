use std::path::PathBuf;

use crate::{funee_identifier::FuneeIdentifier, load_module::load_module};

use super::get_module_declarations::{get_module_declarations, ModuleDeclaration};

pub fn load_declaration(t: &FuneeIdentifier) -> Option<ModuleDeclaration> {
    let (_, module) = load_module(PathBuf::from(t.uri.as_str()));
    let mut module_declarations = get_module_declarations(module.clone());
    let declaration = module_declarations.remove(t.name.as_str());
    declaration
}
