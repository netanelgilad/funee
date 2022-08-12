use std::collections::HashSet;

use swc_common::{Globals, Mark, GLOBALS};
use swc_ecma_ast::Ident;
use swc_ecma_transforms_base::resolver;

use swc_ecma_visit::{self, noop_visit_type, Visit, VisitMut, VisitMutWith, VisitWith};

use super::declaration::Declaration;

pub fn get_references_from_declaration(decl: &mut Declaration) -> HashSet<String> {
    match decl {
        Declaration::FnDecl(n) => get_references_from_ast(&mut n.function),
        Declaration::FnExpr(n) => get_references_from_ast(n),
        Declaration::Expr(n) => get_references_from_ast(n),
        Declaration::FuneeIdentifier(_) => HashSet::new(),
        Declaration::HostFn { name: _, uri: _ } => HashSet::new(),
    }
}

#[derive(Default)]
struct DefinitionReferences {
    pub unresolved_mark: Mark,
    pub references: HashSet<String>,
}

impl Visit for DefinitionReferences {
    noop_visit_type!();

    fn visit_ident(&mut self, n: &Ident) {
        if n.span.has_mark(self.unresolved_mark) {
            self.references.insert(n.sym.to_string());
        }
    }
}

fn get_references_from_ast<
    T: Clone + VisitMutWith<dyn VisitMut> + VisitWith<DefinitionReferences>,
>(
    ast: &mut T,
) -> HashSet<String> {
    let globals = Globals::default();
    GLOBALS.set(&globals, || {
        let unresolved_mark = Mark::new();
        let resolver = &mut resolver(unresolved_mark, Mark::new(), true);
        ast.visit_mut_with(resolver);

        let mut definition_references = DefinitionReferences {
            unresolved_mark,
            ..Default::default()
        };
        ast.visit_with(&mut definition_references);

        definition_references.references
    })
}
