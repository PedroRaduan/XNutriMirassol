import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

export const metadata = {
  title: "Login",
  description: "Entre na sua conta XNutri para acompanhar pedidos, endereços e histórico de compras.",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

const oauthMessages: Record<string, string> = {
  GoogleNotConfigured: "O login com Google ainda não foi configurado neste ambiente.",
  OAuthAccountNotLinked: "Este e-mail já possui uma conta. Entre com sua senha e tente vincular o Google novamente.",
  AccessDenied: "O acesso com Google não foi autorizado.",
  OAuthSignin: "Não foi possível iniciar o login com Google. Tente novamente.",
  OAuthCallbackError: "O Google não conseguiu concluir o login. Tente novamente.",
  Configuration: "O login com Google está temporariamente indisponível.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedCallback = params.callbackUrl ?? "/cliente";
  const callbackUrl = requestedCallback.startsWith("/") && !requestedCallback.startsWith("//")
    ? requestedCallback
    : "/cliente";
  const oauthError = params.error
    ? (oauthMessages[params.error] ?? "Não foi possível entrar. Tente novamente.")
    : undefined;

  return (
    <div className="container-x grid min-h-[66vh] place-items-center py-8 md:py-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Entrar</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Acompanhe pedidos, endereços e suas compras na XNutri.</p>
        <div className="mt-5">
          <LoginForm callbackUrl={callbackUrl} googleEnabled={isGoogleAuthConfigured()} oauthError={oauthError} />
        </div>
        <div className="mt-5 flex justify-between text-sm font-semibold">
          <Link href="/cadastro" className="text-[var(--brand)]">Criar conta</Link>
          <Link href="/recuperar-senha" className="text-[var(--brand)]">Recuperar senha</Link>
        </div>
      </div>
    </div>
  );
}
