import { log, assertThat, matches } from "funee";

export default async () => {
  // Regex matching
  await assertThat("hello123", matches(/\d+/));
  log("matches(/\\d+/) passed for 'hello123'");
  
  await assertThat("abc", matches(/^[a-z]+$/));
  log("matches(/^[a-z]+$/) passed for 'abc'");
  
  await assertThat("test@example.com", matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
  log("email pattern passed for 'test@example.com'");
  
  await assertThat("2024-01-15", matches(/^\d{4}-\d{2}-\d{2}$/));
  log("date pattern passed for '2024-01-15'");
  
  log("matches-test complete");
};
