import Link from "next/link";
import { AtSign, Mail, MapPin, MessageCircle } from "lucide-react";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { prisma } from "@/lib/db/prisma";
import { getWhatsAppHref } from "@/lib/whatsapp";

const institutional = [
  ["Sobre", "/sobre"],
  ["Contato", "/contato"],
  ["FAQ", "/faq"],
  ["Trocas e devoluções", "/trocas"],
  ["Privacidade", "/privacidade"],
  ["Termos", "/termos"],
];

const categories = [
  ["Catálogo", "/catalogo"],
  ["Suplementos", "/catalogo?category=suplementos"],
  ["Moda fitness", "/catalogo?category=roupas-fitness"],
  ["Ofertas", "/catalogo?sort=discounts"],
  ["Entrega", "/entrega"],
  ["Retirada", "/retirada-na-loja"],
];

type SettingValue = Record<string, string | number | boolean | null | undefined>;

function getText(value: unknown, key: string, fallback = "") {
  if (!value || typeof value !== "object") return fallback;
  const item = (value as SettingValue)[key];
  return item === undefined || item === null ? fallback : String(item);
}

export async function Footer() {
  const settings = await prisma.storeSetting
    .findMany({ where: { key: { in: ["store", "home"] } } })
    .catch(() => []);
  const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  const store = byKey.get("store");
  const home = byKey.get("home");
  const city = getText(store, "city", "Mirassol");
  const state = getText(store, "state", "SP");
  const legalName = getText(store, "legalName", "XNutri Comércio de Suplementos");
  const cnpj = getText(store, "cnpj");
  const address = getText(store, "address", "Rua 9 de Julho, 1250 - Centro");
  const phone = getText(store, "phone", "(17) 99700-0000");
  const email = getText(store, "email", "contato@xnutri.com.br");
  const whatsapp = getText(store, "whatsapp", "5517997000000");
  const instagram = getText(store, "instagram", "https://instagram.com");
  const businessHours = getText(store, "businessHours", "Segunda a sexta: 9h às 18h. Sábado: 9h às 13h.");
  const footerText = getText(home, "footerText", "Treino, saúde e estilo com atendimento local.");
  const institutionalText = getText(
    home,
    "institutionalText",
    "Suplementos, vitaminas, moda fitness e acessórios com compra online, retirada na loja e suporte próximo em Mirassol/SP.",
  );
  const whatsappHref = getWhatsAppHref(whatsapp);

  return (
    <footer className="mt-10 border-t border-[#302e2a] bg-[var(--ink)] text-white">
      <div className="container-x grid gap-8 py-9 md:grid-cols-[1.25fr_0.8fr_0.9fr_1fr] md:py-11">
        <div>
          <XNutriLogo tone="light" />
          <strong className="mt-4 block text-base">{footerText}</strong>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/65">{institutionalText}</p>
          <div className="mt-4 grid gap-2 text-sm text-white/65">
            <span className="inline-flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-[var(--brand)]" /> {address}, {city}-{state}</span>
            <span className="inline-flex items-center gap-2"><Mail size={16} className="text-[var(--brand)]" /> {email}</span>
            <span>Telefone/WhatsApp: {phone}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 md:contents">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-white">Loja</h2>
            <div className="mt-3 grid gap-2.5 text-sm">
              {categories.map(([label, href]) => (
                <Link key={href} href={href} className="text-white/70 hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-white">Institucional</h2>
            <div className="mt-3 grid gap-2.5 text-sm">
            {institutional.map(([label, href]) => (
              <Link key={href} href={href} className="text-white/70 hover:text-white">
                {label}
              </Link>
            ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-white">Atendimento e pagamento</h2>
          <div className="mt-3 flex flex-col gap-2.5 text-sm leading-5 text-white/65">
            {businessHours.split(".").filter(Boolean).map((line) => <span key={line}>{line.trim()}</span>)}
            <span>PIX e cartão processados pelo PagBank.</span>
            <span>Retirada sem frete e entrega regional.</span>
            <div className="flex gap-2 pt-2">
              <a className="btn border border-white/15 bg-transparent px-3 text-white hover:bg-white/10" href={whatsappHref} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <MessageCircle size={18} />
                WhatsApp
              </a>
              <a className="btn border border-white/15 bg-transparent px-3 text-white hover:bg-white/10" href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                <AtSign size={18} />
                Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/45">
        {legalName}{cnpj ? ` · CNPJ ${cnpj}` : ""} · {city}-{state}. Pagamentos processados por PagBank.
      </div>
    </footer>
  );
}
