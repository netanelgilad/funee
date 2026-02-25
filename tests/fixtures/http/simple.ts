// Simple test module that we'll host somewhere
export const greeting = "Hello from HTTP!";

export function greet(name: string): string {
  return `${greeting} ${name}`;
}
