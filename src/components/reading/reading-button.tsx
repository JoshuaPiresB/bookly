"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import {
  formatReadingPageInput,
  getValidPageCount,
  validateReadingPageInput,
} from "@/features/reading/reading-page-input";
import { mutate } from "@/lib/client-api";

type ReadingButtonProps = {
  externalId: string;
  currentPage?: number;
  pageCount: number | null;
  status?: string;
  label?: string;
};

export function ReadingButton({
  externalId,
  currentPage = 0,
  pageCount,
  status,
  label,
}: ReadingButtonProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(() => formatReadingPageInput(currentPage));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, transition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();
  const validPageCount = getValidPageCount(pageCount);
  const pageValidation = validateReadingPageInput(page, validPageCount);

  function openDialog() {
    setPage(formatReadingPageInput(status === "READ" ? 0 : currentPage));
    setError("");
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        disabled={refreshing}
        className="secondary-button mt-4"
        onClick={openDialog}
      >
        {label ??
          (status === "READING"
            ? "Atualizar leitura"
            : status === "READ"
              ? "Ler novamente"
              : "Começar leitura")}
      </button>

      {open && (
        <Dialog
          title={status === "READING" ? "Continuar leitura" : "Começar leitura"}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form
            className="space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;

              const validation = validateReadingPageInput(page, validPageCount);
              if (!validation.success) {
                setError(validation.message);
                return;
              }

              setBusy(true);
              setError("");

              try {
                await mutate(
                  `/api/books/${encodeURIComponent(externalId)}/reading`,
                  "PATCH",
                  { status: "READING", currentPage: validation.page },
                );
                showToast("Leitura atualizada.");
                setOpen(false);
                transition(() => router.refresh());
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Não foi possível atualizar a leitura.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {status === "READ" && (
              <p className="text-sm text-muted">
                Uma nova leitura substituirá o progresso e as datas da leitura
                anterior. Suas resenhas e anotações serão preservadas.
              </p>
            )}

            <label className="block text-sm font-medium">
              Página atual
              <input
                autoFocus
                type="number"
                required
                min={0}
                max={validPageCount ?? 2147483647}
                step={1}
                value={page}
                onChange={(event) => {
                  setPage(event.target.value);
                  setError("");
                }}
                className="field mt-2"
              />
            </label>

            {validPageCount !== null && (
              <p className="text-sm text-muted">
                Total: {validPageCount} páginas
              </p>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="secondary-button"
              >
                Cancelar
              </button>
              <button
                disabled={busy || !pageValidation.success}
                className="primary-button"
              >
                {busy ? "Salvando…" : "Salvar leitura"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
