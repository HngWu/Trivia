# Specification: Fuzzy Answer Matching Algorithm

## Overview
The Fuzzy Answer Matching system is designed to provide a fair and forgiving experience for players in a trivia battle. It balances strict correctness with user intent, specifically handling common variations in numerical answers and names.

## Core Requirements
1. **Case Insensitivity:** All comparisons must ignore case.
2. **Numerical Tolerance:** Small errors in numbers (especially dates) should be forgiven.
3. **Range Support:** Questions with range-based answers should be validated correctly.
4. **Partial Name Matching:** Multi-word names should accept significant individual words.
5. **Normalization:** Punctuation and extra whitespace must be stripped.

## Implementation Details (`src/lib/validation.ts`)

### 1. Normalization
Before any logic is applied, the strings are trimmed and converted to lowercase. A secondary normalization step removes all common punctuation: `[.,/#!$%^&*;:{}=\-_`~()]`.

### 2. Numerical Logic
- **Regex Cleaning:** Non-numeric characters (except `.` and `-`) are stripped to handle formatted numbers (e.g., `1,000` -> `1000`).
- **Exact Match:** `userNum === correctNum`.
- **Date/Small Number Tolerance:** If the difference is `<= 1`, the answer is accepted. This is primarily for "±1 year" scenarios.
- **Percentage Tolerance:** For larger values, a `2%` margin of error is allowed: `abs(diff / correctNum) <= 0.02`.

### 3. Range Matching
If the correct answer contains a hyphen (e.g., `1990-1995`):
- The range is parsed into `min` and `max`.
- If the user's number falls within `[min, max]`, it is correct.
- **Note:** Individual tolerance is disabled if a range match is attempted.

### 4. Multi-word/Name Matching
If the correct answer has 2 or more significant words:
- The strings are split by whitespace.
- A "stop word" filter removes common words like `the`, `and`, `with`, etc.
- Significant words must have a length `> 2`.
- If the user provides **at least one** significant word that exists in the correct answer's significant word set, the answer is accepted.

## Verification Strategy
- **Unit Tests:** `tests/validation.test.ts` covers exact matches, ranges, dates, names, and punctuation handling.
- **Server-Side Validation:** The logic is executed in the `submitAnswer` server action to ensure authoritative scoring.
- **Client-Side Feedback:** The same logic is used in the `RoomPage` for instant optimistic UI updates.
