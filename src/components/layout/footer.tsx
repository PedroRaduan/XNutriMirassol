import Link from "next/link";
import { AtSign, Mail, MapPin, MessageCircle, ShieldCheck, Store, Truck } from "lucide-react";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { prisma } from "@/lib/db/prisma";

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

const trustItems = [
  { Icon: ShieldCheck, label: "Compra segura" },
  { Icon: Store, label: "Retirada em Mirassol" },
  { Icon: Truck, label: "Entrega regional" },
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
  const email = getText(store, "email", "contato@xnutri.com.br");
  const whatsapp = getText(store, "whatsapp", "5517997000000");
  const instagram = getText(store, "instagram", "https://instagram.com");
  const businessHours = getText(store, "businessHours", "Segunda a sexta: 9h as 18h. Sabado: 9h as 13h.");
  const footerText = getText(home, "footerText", "Treino, saude e estilo com atendimento local.");
  const institutionalText = getText(
    home,
    "institutionalText",
    "Suplementos, vitaminas, roupas e acessorios fitness com compra online, retirada na loja e suporte proximo em Mirassol-SP.",
  );

  return (
    <footer className="mt-20 overflow-hidden bg-[var(--ink)] text-white">
      <div className="border-b border-white/10 bg-gradient-to-r from-[var(--brand-dark)] via-[var(--brand)] to-[var(--brand-hot)]">
        <div className="container-x flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <strong className="text-xl">{footerText}</strong>
          <Link href="/catalogo" className="btn bg-white text-[var(--ink)] hover:bg-[#f2f3f5]">
            Ver produtos
          </Link>
        </div>
      </div>

      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.25fr_1fr_1fr]">
        <div>
          <XNutriLogo tone="light" />
          <p className="mt-5 max-w-md text-sm leading-6 text-white/70">{institutionalText}</p>
          <div className="mt-6 grid gap-2 text-sm text-white/70">
            <span className="inline-flex items-center gap-2"><MapPin size={16} className="text-[var(--brand)]" /> {city}-{state}</span>
            <span className="inline-flex items-center gap-2"><Mail size={16} className="text-[var(--brand)]" /> {email}</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Institucional</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {institutional.map(([label, href]) => (
              <Link key={href} href={href} className="text-white/70 hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Atendimento</h2>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/70">
            {businessHours.split(".").filter(Boolean).map((line) => <span key={line}>{line.trim()}</span>)}
            <div className="flex flex-wrap gap-2 pt-2">
              {trustItems.map(({ Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-black text-white/80">
                  <Icon size={14} className="text-[var(--brand)]" />
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <a className="btn border border-white/10 bg-white/10 px-3 text-white hover:bg-white/15" href={`https://wa.me/${whatsapp}`} aria-label="WhatsApp">
                <MessageCircle size={18} />
              </a>
              <a className="btn border border-white/10 bg-white/10 px-3 text-white hover:bg-white/15" href={instagram} aria-label="Instagram">
                <AtSign size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        XNutri Comercio de Suplementos - {city}-{state}. Pagamentos processados por Mercado Pago.
      </div>
    </footer>
  );
}
