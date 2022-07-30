use std::pin::Pin;

use deno_core::{
    anyhow::Error, error::generic_error, futures::FutureExt, resolve_import, ModuleLoader,
    ModuleSource, ModuleSourceFuture, ModuleSpecifier, ModuleType,
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

            let code = std::fs::read(path)?;

            let module = ModuleSource {
                code: code.into_boxed_slice(),
                module_type,
                module_url_specified: module_specifier.to_string(),
                module_url_found: module_specifier.to_string(),
            };
            Ok(module)
        }
        .boxed_local()
    }
}
