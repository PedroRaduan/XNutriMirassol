"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Imprimir comprovante" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-primary print:hidden" onClick={() => window.print()}>
      <Printer size={17} />
      {label}
    </button>
  );
}
