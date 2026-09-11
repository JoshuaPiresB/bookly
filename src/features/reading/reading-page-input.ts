export type ReadingPageValidation =
  | { success: true; page: number }
  | { success: false; message: string };

export function formatReadingPageInput(value: number | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? String(value)
    : "0";
}

export function getValidPageCount(value: number | null) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function validateReadingPageInput(
  value: string,
  pageCount: number | null,
): ReadingPageValidation {
  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    return { success: false, message: "Informe uma página inteira." };
  }

  const page = Number(normalized);

  if (!Number.isSafeInteger(page)) {
    return { success: false, message: "Informe uma página válida." };
  }

  const validPageCount = getValidPageCount(pageCount);

  if (validPageCount !== null && page > validPageCount) {
    return {
      success: false,
      message: "A página atual não pode ultrapassar o total de páginas do livro.",
    };
  }

  return { success: true, page };
}
