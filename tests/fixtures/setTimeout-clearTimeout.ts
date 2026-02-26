import { log } from "funee";

export default async function() {
  log("start");
  
  const id = setTimeout(() => {
    log("should not fire");
  }, 100);
  
  clearTimeout(id);
  
  // Wait a bit to ensure the timeout would have fired
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      log("waited past cancelled timeout");
      resolve();
    }, 150);
  });
  
  log("end");
}
