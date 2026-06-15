import Link from "next/link";
import { AtSign, Mail, MapPin, MessageCircle } from "lucide-react";

const institutional = [
  ["Sobre", "/sobre"],
  ["Contato", "/contato"],
  ["FAQ", "/faq"],
  ["Trocas", "/trocas"],
  ["Privacidade", "/privacidade"],
  ["Termos", "/termos"],
  ["Entrega", "/entrega"],
  ["Retirada na Loja", "/retirada-na-loja"],
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--line)] bg-white">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full border-4 border-[var(--ink)] bg-white font-black italic text-[var(--brand)]">X</span>
            <span className="text-xl font-black italic">Xnutri</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">
            Suplementos, vitaminas, roupas e acessórios fitness com atendimento local em Mirassol-SP.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-2"><MapPin size={16} /> Mirassol-SP</span>
            <span className="inline-flex items-center gap-2"><Mail size={16} /> contato@xnutri.com.br</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-black uppercase tracking-wide">Institucional</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {institutional.map(([label, href]) => (
              <Link key={href} href={href} className="text-[var(--muted)] hover:text-[var(--brand)]">
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-black uppercase tracking-wide">Atendimento</h2>
          <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--muted)]">
            <span>Segunda a sexta: 9h às 18h</span>
            <span>Sábado: 9h às 13h</span>
            <div className="flex gap-2 pt-2">
              <a className="btn btn-secondary px-3" href="https://wa.me/5517997000000" aria-label="WhatsApp">
                <MessageCircle size={18} />
              </a>
              <a className="btn btn-secondary px-3" href="https://instagram.com" aria-label="Instagram">
                <AtSign size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--line)] py-4 text-center text-xs text-[var(--muted)]">
        XNutri Comércio de Suplementos - Mirassol-SP. Pagamentos processados por Mercado Pago.
      </div>
    </footer>
  );
}
