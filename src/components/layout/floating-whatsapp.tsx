import { MessageCircle } from "lucide-react";
import { getWhatsAppHref } from "@/lib/whatsapp";

export function FloatingWhatsApp() {
  return (
    <a
      href={getWhatsAppHref()}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a XNutri pelo WhatsApp"
      className="fixed bottom-20 right-3 z-40 hidden size-10 items-center justify-center rounded-full border border-green-700 bg-[#168447] text-white shadow-sm transition-colors hover:bg-[#116d3a] focus:outline-none focus:ring-4 focus:ring-green-100 min-[380px]:inline-flex sm:h-11 sm:w-auto sm:gap-2 sm:px-4 md:bottom-6 md:right-6"
    >
      <MessageCircle size={18} />
      <span className="hidden text-sm font-semibold sm:inline">WhatsApp</span>
    </a>
  );
}
