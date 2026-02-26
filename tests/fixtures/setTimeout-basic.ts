import { log } from "funee";

export default async function() {
  log("start");
  
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      log("timeout fired");
      resolve();
    }, 50);
  });
  
  log("end");
}
