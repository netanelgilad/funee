use std::pin::Pin;

use deno_core::{
    anyhow::Error, error::generic_error, futures::FutureExt, resolve_import, ModuleLoader,
    ModuleSource, ModuleSourceFuture, ModuleSpecifier, ModuleType,
};
use swc_common::{sync::Lrc, FilePathMapping, Globals, Mark, SourceMap, GLOBALS};
use swc_ecma_ast::EsVersion;
use swc_ecma_codegen::{
    text_writer::{JsWriter, WriteJs},
    Emitter,
};
use swc_ecma_parser::{parse_file_as_module, Syntax, TsConfig};
use swc_ecma_transforms_typescript::strip;
use swc_ecma_visit::FoldWith;

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

            println!("{}", String::from_utf8_lossy(&buf));

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
    let cm = Lrc::new(SourceMap::new(FilePathMapping::empty()));
    let m = parse_file_as_module(
        &cm.load_file(&path).unwrap(),
        Syntax::Typescript(TsConfig {
            decorators: true,
            tsx: true,
            ..Default::default()
        }),
        EsVersion::latest(),
        None,
        &mut vec![],
    )
    .expect("failed to parse input as a module");
    let globals = Globals::default();
    let module = GLOBALS.set(&globals, || m.fold_with(&mut strip(Mark::new())));
    let mut buf = vec![];
    {
        let wr = Box::new(JsWriter::new(cm.clone(), "\n", &mut buf, None)) as Box<dyn WriteJs>;

        let mut emitter = Emitter {
            cfg: swc_ecma_codegen::Config {
                ..Default::default()
            },
            cm,
            comments: None,
            wr,
        };

        emitter.emit_module(&module).unwrap();
    }
    buf
}
