/** Calls only Bookly endpoints. The server remains responsible for validation/ownership. */
export async function mutate<T = unknown>(url: string, method: "POST" | "PATCH" | "DELETE", data?: unknown): Promise<{ data: T; message?: string }> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  if (response.status === 204) return { data: undefined as T };
  const payload = await response.json();
  if (!response.ok) {
    const fieldErrors = payload.error?.fieldErrors as Record<string, string[]> | undefined;
    throw new Error(fieldErrors ? Object.values(fieldErrors).flat().join(" ") : payload.error?.message ?? "Não foi possível concluir a ação.");
  }
  return payload;
}
