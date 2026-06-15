import Link from "next/link";
import { RecoveryForm } from "@/components/forms/recovery-form";

export const metadata = {
  title: "Recuperação de senha",
  description: "Solicite recuperação de senha da sua conta XNutri.",
};

export default function RecoveryPage() {
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black">Recuperar senha</h1>
        <p className="mt-3 text-[var(--muted)]">Informe seu e-mail para iniciar a recuperação segura da conta.</p>
        <div className="mt-6">
          <RecoveryForm />
        </div>
        <Link href="/login" className="mt-5 inline-block text-sm font-black text-[var(--brand)]">Voltar para login</Link>
      </div>
    </div>
  );
}
