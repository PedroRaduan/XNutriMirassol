import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-16">
      <section className="surface w-full max-w-xl p-6 text-center sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff1ef] text-[var(--brand)]">
          <Search size={26} />
        </span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[var(--brand)]">Erro 404</p>
        <h1 className="mt-2 text-3xl font-black">Essa página não está por aqui</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">O endereço pode ter mudado. Volte para a vitrine e encontre o que precisa.</p>
        <Link className="btn btn-primary mt-6" href="/catalogo">
          <ArrowLeft size={18} /> Ver produtos
        </Link>
      </section>
    </main>
  );
}
