"use client";

import { Download, MonitorDown, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type AppInstallProps = {
  appName: string;
  installLabel: string;
  scope: `/${string}`;
  serviceWorkerUrl: `/${string}.js`;
  className?: string;
};

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

/**
 * Registers a network-only service worker and exposes the browser install
 * prompt. Installation never grants access: the protected route still checks
 * the authenticated user and role on every request.
 */
export function AppInstall({
  appName,
  installLabel,
  scope,
  serviceWorkerUrl,
  className = "",
}: AppInstallProps) {
  const [promptEvent, setPromptEvent] = useState<DeferredInstallPrompt | null>(null);
  const [installed, setInstalled] = useState(true);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setInstalled(isStandalone());
      setIsIos(isIosDevice());
    });

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(serviceWorkerUrl, {
        scope,
        updateViaCache: "none",
      }).catch(() => undefined);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as DeferredInstallPrompt);
      setInstalled(false);
    };

    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [scope, serviceWorkerUrl]);

  async function install() {
    if (!promptEvent) return;

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  if (installed) return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()} data-pwa-install={scope}>
      {promptEvent ? (
        <button
          type="button"
          onClick={() => void install()}
          className="btn btn-secondary px-3"
          aria-label={`${installLabel}: ${appName}`}
        >
          <Download size={17} aria-hidden="true" />
          {installLabel}
        </button>
      ) : (
        <div className="rounded-md border border-[var(--line)] bg-[#fafafa] px-3 py-2 text-xs font-semibold leading-5 text-[var(--muted)]">
          {isIos ? (
            <span className="inline-flex items-center gap-1.5">
              <Smartphone size={15} aria-hidden="true" />
              No Safari: Compartilhar → Adicionar à Tela de Início.
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <MonitorDown size={15} aria-hidden="true" />
              Use o menu do Chrome ou Edge para instalar {appName}.
            </span>
          )}
        </div>
      )}
      <p className="text-xs font-medium text-[var(--muted)]">
        A instalação não libera acesso: seu login e suas permissões continuam obrigatórios.
      </p>
    </div>
  );
}
