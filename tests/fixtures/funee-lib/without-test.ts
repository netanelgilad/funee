import { log, without } from "funee";

export default function() {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const toRemove = [2, 4, 6, 8, 10];
  
  // without should remove even numbers, leaving odd numbers
  const result = without(items, toRemove);
  log(`without result: ${JSON.stringify(result)}`);
  
  // Test with strings
  const fruits = ["apple", "banana", "cherry", "date"];
  const removeFruits = ["banana", "date"];
  const resultFruits = without(fruits, removeFruits);
  log(`without fruits: ${JSON.stringify(resultFruits)}`);
  
  // Test with empty toRemove
  const resultEmpty = without(items, []);
  log(`without empty: ${JSON.stringify(resultEmpty)}`);
  
  log("without test complete");
}
