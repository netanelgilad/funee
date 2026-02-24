import { createMacro } from "funee";

export default function() {
  // This should throw because createMacro is called at runtime
  // (bundler should have expanded it)
  const macro = createMacro((x) => x);
}
