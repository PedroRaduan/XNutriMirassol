import { AppInstall } from "@/components/pwa/app-install";

export function PDVAppInstall() {
  return (
    <AppInstall
      appName="o PDV XNutri"
      installLabel="Instalar PDV"
      scope="/pdv"
      serviceWorkerUrl="/pdv-sw.js"
      className="mb-4 rounded-lg border border-[var(--line)] bg-white p-3 shadow-sm sm:items-end"
    />
  );
}
