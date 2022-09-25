use super::get_module_declarations::{get_module_declarations, ModuleDeclaration};
use crate::{funee_identifier::FuneeIdentifier, load_module::load_module};
use std::{path::PathBuf, rc::Rc};
use swc_common::SourceMap;

pub fn load_declaration(cm: &Rc<SourceMap>, t: &FuneeIdentifier) -> Option<ModuleDeclaration> {
    let module = load_module(cm, PathBuf::from(t.uri.as_str()));
    let mut module_declarations = get_module_declarations(module.clone());
    let declaration = module_declarations.remove(t.name.as_str());
    declaration
}
