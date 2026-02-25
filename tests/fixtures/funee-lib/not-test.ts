import { log, not } from "funee";

const isPositive = (n: number): boolean => n > 0;

const isEvenAsync = async (n: number): Promise<boolean> => n % 2 === 0;

export default async function() {
  // not(isPositive) should return true for negative numbers
  const isNotPositive = not(isPositive);
  
  const result1 = await isNotPositive(5);   // isPositive(5) = true, not = false
  const result2 = await isNotPositive(-3);  // isPositive(-3) = false, not = true
  
  log(`not(isPositive)(5): ${result1}`);
  log(`not(isPositive)(-3): ${result2}`);
  
  // Test with async function
  const isOddAsync = not(isEvenAsync);
  
  const result3 = await isOddAsync(4);  // isEvenAsync(4) = true, not = false
  const result4 = await isOddAsync(7);  // isEvenAsync(7) = false, not = true
  
  log(`not(isEvenAsync)(4): ${result3}`);
  log(`not(isEvenAsync)(7): ${result4}`);
  
  log("not test complete");
}
