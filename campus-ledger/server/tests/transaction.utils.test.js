const {
  normalizeTransactionData,
  validateTransactionData,
} = require("../src/utils/transaction.js");

describe("normalizeTransactionData", () => {
  test("converts fields to correct types", () => {
    const input = {
      name: " Coffee ",
      date: "2025-01-10",
      price: "4.50",
    };

    const result = normalizeTransactionData(input);

    expect(result.name).toBe("Coffee");
    expect(result.price).toBe(4.5);
    expect(result.date instanceof Date).toBe(true);
  });
});

describe("validateTransactionData", () => {
  it("accepts valid data", () => {
    const validData = {
      name: "Coffee",
      price: 3.5,
      date: "2024-01-01",
    };

    expect(() => validateTransactionData(validData)).not.toThrow();
  });
});
