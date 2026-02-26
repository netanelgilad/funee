import { log } from "funee";

export default async function() {
  log("start");
  
  let count = 0;
  
  await new Promise<void>((resolve) => {
    const id = setInterval(() => {
      count++;
      log("tick " + count);
      if (count >= 3) {
        clearInterval(id);
        resolve();
      }
    }, 30);
  });
  
  log("end");
}
