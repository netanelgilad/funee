import { createSubject } from "./subject.ts";

/**
 * Event emitter interface (compatible with Node.js EventEmitter)
 */
interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): this;
}

/**
 * Creates an async iterable from an event emitter.
 * Listens for the specified event name and emits values.
 * Completes when 'end' event is fired.
 */
export const fromEmitter = function <T>(eventEmitter: EventEmitter, eventName: string) {
  const subject = createSubject<T>();
  eventEmitter.on(eventName, (event: T) => {
    subject.onNext(event);
  });
  eventEmitter.on("end", () => {
    subject.onCompleted();
  });
  return subject.iterator;
};
