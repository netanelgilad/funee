use super::declaration::Declaration;
use std::collections::{HashMap, HashSet};
use swc_common::{Globals, Mark, GLOBALS};
use swc_ecma_ast::Ident;
use swc_ecma_transforms_base::resolver;
use swc_ecma_visit::{
    self, noop_visit_mut_type, noop_visit_type, Visit, VisitMut, VisitMutWith, VisitWith,
};

pub fn get_references_from_declaration(
    decl: &mut Declaration,
    unresolved_mark: (&Globals, Mark),
) -> HashSet<String> {
    match decl {
        Declaration::FnDecl(n) => get_references_from_ast(&mut n.function, unresolved_mark),
        Declaration::FnExpr(n) => get_references_from_ast(n, unresolved_mark),
        Declaration::Expr(n) => get_references_from_ast(n, unresolved_mark),
        Declaration::FuneeIdentifier(_) => HashSet::new(),
        Declaration::HostFn(_) => HashSet::new(),
    }
}

#[derive(Default)]
struct ResolveReferences {
    pub unresolved_mark: Mark,
    pub references: HashSet<String>,
}

impl Visit for ResolveReferences {
    noop_visit_type!();

    fn visit_ident(&mut self, n: &Ident) {
        if n.span.has_mark(self.unresolved_mark) {
            self.references.insert(n.sym.to_string());
        }
    }
}

fn get_references_from_ast<T: Clone + VisitMutWith<dyn VisitMut> + VisitWith<ResolveReferences>>(
    ast: &mut T,
    unresolved_mark: (&Globals, Mark),
) -> HashSet<String> {
    GLOBALS.set(unresolved_mark.0, || {
        let resolver = &mut resolver(unresolved_mark.1, Mark::new(), true);
        ast.visit_mut_with(resolver);

        let mut definition_references = ResolveReferences {
            unresolved_mark: unresolved_mark.1,
            ..Default::default()
        };
        ast.visit_with(&mut definition_references);

        definition_references.references
    })
}

pub fn rename_references_in_declaration(
    decl: &mut Declaration,
    to_replace: HashMap<String, String>,
    unresolved_mark: (&Globals, Mark),
) {
    match decl {
        Declaration::FnDecl(n) => {
            rename_references_in_ast(&mut n.function, to_replace, unresolved_mark)
        }
        Declaration::FnExpr(n) => rename_references_in_ast(n, to_replace, unresolved_mark),
        Declaration::Expr(n) => rename_references_in_ast(n, to_replace, unresolved_mark),
        Declaration::FuneeIdentifier(_) => {}
        Declaration::HostFn(_) => {}
    };
}

fn rename_references_in_ast<
    T: Clone + VisitMutWith<dyn VisitMut> + VisitWith<ResolveReferences>,
>(
    ast: &mut T,
    to_replace: HashMap<String, String>,
    unresolved_mark: (&Globals, Mark),
) {
    GLOBALS.set(unresolved_mark.0, || {
        ast.visit_mut_with(&mut RenameReferences {
            unresolved_mark: unresolved_mark.1,
            to_replace,
        });
    });
}

struct RenameReferences {
    pub unresolved_mark: Mark,
    pub to_replace: HashMap<String, String>,
}

impl<'a> VisitMut for RenameReferences {
    noop_visit_mut_type!();

    fn visit_mut_ident(&mut self, n: &mut Ident) {
        if n.span.has_mark(self.unresolved_mark) {
            let name = n.sym.as_ref();
            if let Some(to_replace) = self.to_replace.get(name) {
                n.sym = to_replace.clone().into();
            }
        }
    }
}
