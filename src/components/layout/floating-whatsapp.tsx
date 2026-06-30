import { MessageCircle } from "lucide-react";
import { getWhatsAppHref } from "@/lib/whatsapp";

export function FloatingWhatsApp() {
  return (
    <a
      href={getWhatsAppHref()}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a XNutri pelo WhatsApp"
      className="fixed bottom-20 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#16a34a] px-4 text-sm font-black text-white shadow-[0_16px_35px_rgb(22_163_74_/_32%)] transition hover:-translate-y-0.5 hover:bg-[#12823d] focus:outline-none focus:ring-4 focus:ring-green-200 md:bottom-6 md:right-6"
    >
      <MessageCircle size={20} />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
