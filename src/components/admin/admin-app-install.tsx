import { AppInstall } from "@/components/pwa/app-install";

/**
 * Rendered only after the server-side ADMIN role check in the protected admin
 * layout. This service worker is network-only, so it never caches admin or
 * customer data for offline use.
 */
export function AdminAppInstall() {
  return (
    <AppInstall
      appName="a Administração XNutri"
      installLabel="Instalar Administração"
      scope="/admin"
      serviceWorkerUrl="/admin-sw.js"
      className="sm:items-end"
    />
  );
}
