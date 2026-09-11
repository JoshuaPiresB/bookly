import { describe, expect, it } from "vitest";

import {
  formatReadingPageInput,
  getValidPageCount,
  validateReadingPageInput,
} from "../../src/features/reading/reading-page-input";

describe("campo de página da leitura", () => {
  it("nunca transforma um valor inicial inválido em NaN", () => {
    expect(formatReadingPageInput(Number.NaN)).toBe("0");
    expect(formatReadingPageInput(undefined)).toBe("0");
    expect(formatReadingPageInput(56)).toBe("56");
  });

  it("aceita zero e páginas inteiras dentro do total", () => {
    expect(validateReadingPageInput("0", 440)).toEqual({
      success: true,
      page: 0,
    });
    expect(validateReadingPageInput("318", 440)).toEqual({
      success: true,
      page: 318,
    });
  });

  it("rejeita valor vazio, decimal ou acima do total", () => {
    expect(validateReadingPageInput("", 440).success).toBe(false);
    expect(validateReadingPageInput("1.5", 440).success).toBe(false);
    expect(validateReadingPageInput("441", 440)).toEqual({
      success: false,
      message: "A página atual não pode ultrapassar o total de páginas do livro.",
    });
  });

  it("ignora um total inválido em vez de propagá-lo para o input", () => {
    expect(getValidPageCount(Number.NaN)).toBeNull();
    expect(validateReadingPageInput("15", Number.NaN)).toEqual({
      success: true,
      page: 15,
    });
  });
});
