import { validateAnswer } from "../src/lib/validation";

describe("validateAnswer", () => {
  test("exact matches", () => {
    expect(validateAnswer("Washington", "Washington")).toBe(true);
    expect(validateAnswer("washington", "Washington")).toBe(true);
    expect(validateAnswer("  Washington  ", "Washington")).toBe(true);
  });

  test("numerical tolerance", () => {
    // Years (4 digits) +/- 1
    expect(validateAnswer("1990", "1991")).toBe(true);
    expect(validateAnswer("1992", "1991")).toBe(true);
    expect(validateAnswer("1993", "1991")).toBe(false);
    
    // Large numbers (2% margin) - Non-years
    expect(validateAnswer("5000", "5050")).toBe(true); // Within 2% (50/5000 = 1%)
    expect(validateAnswer("5000", "5150")).toBe(false); // Outside 2% (150/5000 = 3%)
    
    // Small integers (0-100) +/- 1
    expect(validateAnswer("50", "51")).toBe(true);
    expect(validateAnswer("52", "51")).toBe(true);
    expect(validateAnswer("53", "51")).toBe(false);
  });

  test("range matching", () => {
    expect(validateAnswer("1992", "1990-1995")).toBe(true);
    expect(validateAnswer("1990", "1990-1995")).toBe(true);
    expect(validateAnswer("1995", "1990-1995")).toBe(true);
    expect(validateAnswer("1989", "1990-1995")).toBe(false);
  });

  test("fuzzy matches for text type", () => {
    const type = "text";
    expect(validateAnswer("Washington", "George Washington", type)).toBe(true);
    expect(validateAnswer("George", "George Washington", type)).toBe(true);
    expect(validateAnswer("Einstein", "Albert Einstein", type)).toBe(true);
    expect(validateAnswer("Gatsby", "The Great Gatsby", type)).toBe(true);
    expect(validateAnswer("The", "The Great Gatsby", type)).toBe(false); // Stop word
  });

  test("no fuzzy matches for non-text type", () => {
    expect(validateAnswer("Washington", "George Washington")).toBe(false);
    expect(validateAnswer("Einstein", "Albert Einstein", "multiple_choice")).toBe(false);
  });

  test("comma and punctuation handling", () => {
    expect(validateAnswer("1,000", "1000")).toBe(true);
    expect(validateAnswer("1000", "1,000")).toBe(true);
    expect(validateAnswer("Washington!", "Washington")).toBe(true);
  });
});
