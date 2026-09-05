"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { Banknote, DoorOpen, Plus, WalletCards, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { closePOSSession, createCashMovement, openPOSSession, type POSActionState } from "@/lib/actions/pos";

const initialState: POSActionState = { ok: false, message: "" };

function useSessionForm(serverAction: (state: POSActionState, data: FormData) => Promise<POSActionState>) {
  const [state, action, pending] = useActionState(serverAction, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
    else if (state.message) ref.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
  }, [state]);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }
  return { state, pending, formProps: { ref, action, onSubmit, "aria-busy": pending } };
}

export function POSOpenSessionForm() {
  const { state, pending, formProps } = useSessionForm(openPOSSession);

  return (
    <form {...formProps} className="surface grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-[#fff1ef] text-[var(--brand)]">
          <DoorOpen size={22} />
        </span>
        <div>
          <h2 className="text-xl font-black">Abrir caixa</h2>
          <p className="text-sm font-semibold text-[var(--muted)]">Informe o valor inicial em dinheiro para começar a vender.</p>
        </div>
      </div>
      <label className="text-sm font-black">
        Valor inicial
        <input className="field mt-2 text-lg font-black" name="openingAmount" type="number" required inputMode="decimal" min={0} step="0.01" defaultValue="0.00" />
      </label>
      <label className="text-sm font-black">
        Observação
        <textarea className="field mt-2 min-h-20" name="notes" placeholder="Opcional" />
      </label>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} tabIndex={-1} className={`rounded-md border p-3 text-sm font-bold ${state.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      )}
      <button className="btn btn-primary min-h-12" disabled={pending}>
        <WalletCards size={18} />
        {pending ? "Abrindo..." : "Abrir caixa"}
      </button>
    </form>
  );
}

export function POSCashMovementForm({ sessionId }: { sessionId: string }) {
  const { state, pending, formProps } = useSessionForm(createCashMovement);

  return (
    <form {...formProps} className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-black uppercase text-[var(--muted)]">
          Tipo
          <select className="field mt-1" name="type" defaultValue="CASH_IN">
            <option value="CASH_IN">Reforço</option>
            <option value="CASH_OUT">Sangria</option>
          </select>
        </label>
        <label className="text-xs font-black uppercase text-[var(--muted)]">
          Valor
          <input className="field mt-1" name="amount" type="number" required inputMode="decimal" min={0.01} step="0.01" />
        </label>
      </div>
      <input className="field" name="reason" placeholder="Motivo" aria-label="Motivo" required />
      {state.message && <p role={state.ok ? "status" : "alert"} tabIndex={-1} className={`text-xs font-bold ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</p>}
      <button className="btn btn-secondary min-h-11" disabled={pending}>
        <Plus size={16} />
        {pending ? "Registrando..." : "Registrar movimentação"}
      </button>
    </form>
  );
}

export function POSCloseSessionForm({ sessionId, expectedAmount }: { sessionId: string; expectedAmount: number }) {
  const { state, pending, formProps } = useSessionForm(closePOSSession);

  return (
    <form {...formProps} className="grid gap-3 rounded-lg border border-[#ffd8d1] bg-[#fff8f7] p-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex items-center gap-2 text-sm font-black text-[var(--brand-dark)]">
        <Banknote size={16} />
        Fechamento
      </div>
      <p className="text-xs font-semibold text-[var(--muted)]">Esperado em dinheiro: R$ {expectedAmount.toFixed(2).replace(".", ",")}</p>
      <input className="field" name="closingAmount" type="number" required inputMode="decimal" min={0} step="0.01" placeholder="Valor contado no caixa" aria-label="Valor contado no caixa" />
      <textarea className="field min-h-16" name="notes" placeholder="Observações do fechamento" aria-label="Observações do fechamento" />
      {state.message && <p role={state.ok ? "status" : "alert"} tabIndex={-1} className={`text-xs font-bold ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</p>}
      <button className="btn btn-dark min-h-11" disabled={pending}>
        {pending ? "Fechando..." : "Fechar caixa"}
      </button>
    </form>
  );
}

export function POSSessionManager({
  sessionId,
  openedAt,
  openingAmount,
  expectedAmount,
}: {
  sessionId: string;
  openedAt: Date;
  openingAmount: number;
  expectedAmount: number;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  return (
    <>
      <button
        type="button"
        className="btn min-h-9 border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white hover:bg-white/15"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Gerenciar caixa"
      >
        <WalletCards size={15} />
        <span className="hidden sm:inline">Gerenciar caixa</span>
      </button>
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(760px,calc(100%-24px))] overflow-y-auto bg-transparent p-0 backdrop:bg-black/45"
        aria-labelledby="pos-session-manager-title"
      >
        <section className="surface overflow-hidden shadow-xl">
          <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-4">
            <div>
              <h2 id="pos-session-manager-title" className="text-xl font-black">Gerenciar caixa</h2>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Movimentações e fechamento ficam separados da venda para evitar ações acidentais.</p>
            </div>
            <button type="button" className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-[#f3f2f0]" onClick={() => dialogRef.current?.close()} aria-label="Fechar gerenciamento do caixa">
              <X size={18} />
            </button>
          </header>
          <dl className="grid gap-2 border-b border-[var(--line)] bg-[#fafafa] p-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs font-black uppercase text-[var(--muted)]">Aberto em</dt><dd className="mt-1 font-black">{formatDate(openedAt)}</dd></div>
            <div><dt className="text-xs font-black uppercase text-[var(--muted)]">Valor inicial</dt><dd className="mt-1 font-black">{formatCurrency(openingAmount)}</dd></div>
            <div><dt className="text-xs font-black uppercase text-[var(--muted)]">Dinheiro esperado</dt><dd className="mt-1 font-black text-[var(--brand)]">{formatCurrency(expectedAmount)}</dd></div>
          </dl>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-black">Reforço ou sangria</h3>
              <POSCashMovementForm sessionId={sessionId} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black">Encerrar expediente</h3>
              <POSCloseSessionForm sessionId={sessionId} expectedAmount={expectedAmount} />
            </div>
          </div>
        </section>
      </dialog>
    </>
  );
}
