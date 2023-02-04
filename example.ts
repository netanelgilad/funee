import { execute, Expression } from "host";
import { renameMe } from "./another.ts";

type Executable<TResult> = {
  expression: Expression<TResult>;
  references: Record<string, 
}

declare function execute(executable: Executable): T;

export default function () {
  renameMe();
  log("hello world 2");
}
