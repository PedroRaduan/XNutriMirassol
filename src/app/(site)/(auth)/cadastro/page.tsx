import Link from "next/link";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata = {
  title: "Cadastro",
  description: "Crie sua conta na XNutri para comprar suplementos e acompanhar pedidos.",
};

export default function RegisterPage() {
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black">Criar conta</h1>
        <p className="mt-3 text-[var(--muted)]">Compre mais rápido, salve endereços e acompanhe seu histórico.</p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-5 text-sm text-[var(--muted)]">
          Já tem conta? <Link href="/login" className="font-black text-[var(--brand)]">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
