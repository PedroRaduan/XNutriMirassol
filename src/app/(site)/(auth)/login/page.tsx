import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export const metadata = {
  title: "Login",
  description: "Entre na sua conta XNutri para acompanhar pedidos, endereços e histórico de compras.",
};

export default function LoginPage() {
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black">Entrar</h1>
        <p className="mt-3 text-[var(--muted)]">Acesse sua conta para acompanhar pedidos e gerenciar seus dados.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <div className="mt-5 flex justify-between text-sm font-semibold">
          <Link href="/cadastro" className="text-[var(--brand)]">Criar conta</Link>
          <Link href="/recuperar-senha" className="text-[var(--brand)]">Recuperar senha</Link>
        </div>
      </div>
    </div>
  );
}
