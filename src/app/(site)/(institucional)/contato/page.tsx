import { Mail, MapPin, MessageCircle } from "lucide-react";
import { getWhatsAppHref } from "@/lib/whatsapp";

export const metadata = { title: "Contato" };

export default function ContactPage() {
  return (
    <div className="container-x py-12">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Contato</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">Fale com a XNutri para dúvidas sobre produtos, pedidos, retirada ou entrega.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <a className="surface p-6 hover:border-[var(--brand)]" href={getWhatsAppHref(undefined, "Olá! Vim pelo site da XNutri e quero atendimento.")} target="_blank" rel="noreferrer">
          <MessageCircle className="text-[var(--brand)]" />
          <h2 className="mt-4 font-bold">WhatsApp</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">(17) 99700-0000</p>
        </a>
        <a className="surface p-6 hover:border-[var(--brand)]" href="mailto:contato@xnutri.com.br">
          <Mail className="text-[var(--brand)]" />
          <h2 className="mt-4 font-bold">E-mail</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">contato@xnutri.com.br</p>
        </a>
        <div className="surface p-6">
          <MapPin className="text-[var(--brand)]" />
          <h2 className="mt-4 font-bold">Loja</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Rua 9 de Julho, 1250, Centro, Mirassol-SP</p>
        </div>
      </div>
    </div>
  );
}
