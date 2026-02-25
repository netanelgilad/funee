import { log, createSubject, toArray } from "funee";

export default async function () {
  const subject = createSubject<number>();
  
  // Push values asynchronously using Promise microtask (no setTimeout in funee)
  Promise.resolve().then(() => {
    subject.onNext(1);
    subject.onNext(2);
    subject.onNext(3);
    subject.onCompleted();
  });
  
  const result = await toArray(subject.iterator);
  log(`subject result: ${JSON.stringify(result)}`);
}
