import { validateAnswer } from "../src/lib/validation";

describe("validateAnswer", () => {
  test("exact matches", () => {
    expect(validateAnswer("Washington", "Washington")).toBe(true);
    expect(validateAnswer("washington", "Washington")).toBe(true);
    expect(validateAnswer("  Washington  ", "Washington")).toBe(true);
  });

  test("numerical tolerance", () => {
    expect(validateAnswer("1990", "1991")).toBe(true);
    expect(validateAnswer("1992", "1991")).toBe(true);
    expect(validateAnswer("1000", "1015")).toBe(true); // Within 2%
    expect(validateAnswer("1000", "1050")).toBe(false); // Outside 2%
  });

  test("range matching", () => {
    expect(validateAnswer("1992", "1990-1995")).toBe(true);
    expect(validateAnswer("1990", "1990-1995")).toBe(true);
    expect(validateAnswer("1995", "1990-1995")).toBe(true);
    expect(validateAnswer("1989", "1990-1995")).toBe(false);
  });

  test("partial word matches", () => {
    expect(validateAnswer("Washington", "George Washington")).toBe(true);
    expect(validateAnswer("George", "George Washington")).toBe(true);
    expect(validateAnswer("Einstein", "Albert Einstein")).toBe(true);
    expect(validateAnswer("Gatsby", "The Great Gatsby")).toBe(true);
    expect(validateAnswer("The", "The Great Gatsby")).toBe(false); // Stop word
  });

  test("comma and punctuation handling", () => {
    expect(validateAnswer("1,000", "1000")).toBe(true);
    expect(validateAnswer("1000", "1,000")).toBe(true);
    expect(validateAnswer("Washington!", "Washington")).toBe(true);
  });
});
