"use client";

import { useActionState } from "react";
import { Banknote, DoorOpen, Plus, WalletCards } from "lucide-react";
import { closePOSSession, createCashMovement, openPOSSession, type POSActionState } from "@/lib/actions/pos";

const initialState: POSActionState = { ok: false, message: "" };

export function POSOpenSessionForm() {
  const [state, action, pending] = useActionState(openPOSSession, initialState);

  return (
    <form action={action} className="surface grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-[#fff1ef] text-[var(--brand)]">
          <DoorOpen size={22} />
        </span>
        <div>
          <h2 className="text-xl font-black">Abrir caixa</h2>
          <p className="text-sm font-semibold text-[var(--muted)]">Informe o valor inicial em dinheiro para comecar a vender.</p>
        </div>
      </div>
      <label className="text-sm font-black">
        Valor inicial
        <input className="field mt-2 text-lg font-black" name="openingAmount" type="number" min={0} step="0.01" defaultValue="0.00" />
      </label>
      <label className="text-sm font-black">
        Observacao
        <textarea className="field mt-2 min-h-20" name="notes" placeholder="Opcional" />
      </label>
      {state.message && (
        <p className={`rounded-md border p-3 text-sm font-bold ${state.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
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
  const [state, action, pending] = useActionState(createCashMovement, initialState);

  return (
    <form action={action} className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-black uppercase text-[var(--muted)]">
          Tipo
          <select className="field mt-1" name="type" defaultValue="CASH_IN">
            <option value="CASH_IN">Reforco</option>
            <option value="CASH_OUT">Sangria</option>
          </select>
        </label>
        <label className="text-xs font-black uppercase text-[var(--muted)]">
          Valor
          <input className="field mt-1" name="amount" type="number" min={0} step="0.01" />
        </label>
      </div>
      <input className="field" name="reason" placeholder="Motivo" />
      {state.message && <p className={`text-xs font-bold ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</p>}
      <button className="btn btn-secondary min-h-11" disabled={pending}>
        <Plus size={16} />
        {pending ? "Registrando..." : "Registrar movimentacao"}
      </button>
    </form>
  );
}

export function POSCloseSessionForm({ sessionId, expectedAmount }: { sessionId: string; expectedAmount: number }) {
  const [state, action, pending] = useActionState(closePOSSession, initialState);

  return (
    <form action={action} className="grid gap-3 rounded-lg border border-[#ffd8d1] bg-[#fff8f7] p-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex items-center gap-2 text-sm font-black text-[var(--brand-dark)]">
        <Banknote size={16} />
        Fechamento
      </div>
      <p className="text-xs font-semibold text-[var(--muted)]">Esperado em dinheiro: R$ {expectedAmount.toFixed(2).replace(".", ",")}</p>
      <input className="field" name="closingAmount" type="number" min={0} step="0.01" placeholder="Valor contado no caixa" />
      <textarea className="field min-h-16" name="notes" placeholder="Observacoes do fechamento" />
      {state.message && <p className={`text-xs font-bold ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</p>}
      <button className="btn btn-dark min-h-11" disabled={pending}>
        {pending ? "Fechando..." : "Fechar caixa"}
      </button>
    </form>
  );
}
