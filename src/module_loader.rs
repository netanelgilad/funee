use std::{pin::Pin, rc::Rc};

use crate::load_module::load_module;
use deno_core::{
    anyhow::Error, error::generic_error, futures::FutureExt, resolve_import, ModuleLoader,
    ModuleSource, ModuleSourceFuture, ModuleSpecifier, ModuleType,
};
use swc_common::{BytePos, LineCol, SourceMap};
use swc_ecma_ast::*;
use swc_ecma_codegen::{
    text_writer::{JsWriter, WriteJs},
    Emitter,
};

pub struct FuneeModuleLoader;

impl ModuleLoader for FuneeModuleLoader {
    fn resolve(
        &self,
        specifier: &str,
        referrer: &str,
        _is_main: bool,
    ) -> Result<ModuleSpecifier, Error> {
        Ok(resolve_import(specifier, referrer)?)
    }

    fn load(
        &self,
        module_specifier: &ModuleSpecifier,
        _maybe_referrer: Option<ModuleSpecifier>,
        _is_dynamic: bool,
    ) -> Pin<Box<ModuleSourceFuture>> {
        let module_specifier = module_specifier.clone();
        async move {
            let path = module_specifier.to_file_path().map_err(|_| {
                generic_error(format!(
                    "Provided module specifier \"{}\" is not a file URL.",
                    module_specifier
                ))
            })?;
            let module_type = if let Some(extension) = path.extension() {
                let ext = extension.to_string_lossy().to_lowercase();
                if ext == "json" {
                    ModuleType::Json
                } else {
                    ModuleType::JavaScript
                }
            } else {
                ModuleType::JavaScript
            };

            let buf = load_javascript_code(path);

            let module = ModuleSource {
                code: buf.into_boxed_slice(),
                module_type,
                module_url_specified: module_specifier.to_string(),
                module_url_found: module_specifier.to_string(),
            };
            Ok(module)
        }
        .boxed_local()
    }
}

fn load_javascript_code(path: std::path::PathBuf) -> Vec<u8> {
    let (cm, module) = load_module(path);
    emit_module(cm, module)
}

pub fn emit_module(cm: Rc<SourceMap>, module: Module) -> Vec<u8> {
    let mut buf = vec![];
    let mut srcmap = vec![];
    {
        let wr = Box::new(JsWriter::new(cm.clone(), "\n", &mut buf, Some(&mut srcmap)))
            as Box<dyn WriteJs>;

        let mut emitter = Emitter {
            cfg: swc_ecma_codegen::Config {
                ..Default::default()
            },
            cm: cm.clone(),
            comments: None,
            wr,
        };

        emitter.emit_module(&module).unwrap();
    }

    buf
}

fn _get_inline_source_map(cm: Rc<SourceMap>, srcmap: &mut Vec<(BytePos, LineCol)>) -> Vec<u8> {
    let srcmap = cm.build_source_map(srcmap);

    let mut output: Vec<u8> = vec![];
    srcmap.to_writer(&mut output).unwrap();

    let mut buf = vec![];
    for value in "\n//# sourceMappingURL=data:application/json;base64,".bytes() {
        buf.push(value);
    }
    buf
}
