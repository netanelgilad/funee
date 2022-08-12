import { log } from "funee";
import { foo as bar, baz as faz } from "somewhere";
import hopa from "sdsd";

function doIt() {
  bar();
  hopa();
  faz;
}

export function another() {
  another();
}

export default function () {
  another();
  const c = 1;
  log("hello world");
  [].map((x) => {
    log(x);
  });
}
