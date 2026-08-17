"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ImageUp } from "lucide-react";

type ImageUploadFieldProps = {
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  multiple?: boolean;
  multiline?: boolean;
  label?: string;
};

export function ImageUploadField({
  name,
  placeholder = "URL da imagem",
  required,
  defaultValue = "",
  multiple = false,
  multiline = false,
  label,
}: ImageUploadFieldProps) {
  const fieldId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState(defaultValue);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;

    const handleReset = () => {
      setUrl(defaultValue);
      setMessage("");
    };

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultValue]);

  return (
    <div ref={containerRef} className="grid gap-2">
      {label && <label className="text-sm font-black" htmlFor={fieldId}>{label}</label>}
      {multiline ? (
        <textarea
          id={fieldId}
          className="field min-h-24"
          name={name}
          placeholder={placeholder}
          required={required}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      ) : (
        <input
          id={fieldId}
          className="field"
          name={name}
          type="url"
          placeholder={placeholder}
          required={required}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      )}
      <label className="btn btn-secondary cursor-pointer">
        <ImageUp size={18} />
        {pending ? "Enviando..." : multiple ? "Selecionar imagens do computador" : "Selecionar imagem do computador"}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple={multiple}
          disabled={pending}
          onChange={(event) => {
            const input = event.currentTarget;
            const files = Array.from(input.files ?? []).slice(0, multiple ? 10 : 1);
            if (files.length === 0) return;

            if (files.some((file) => file.size > 4 * 1024 * 1024)) {
              setMessage("Cada imagem deve ter no máximo 4 MB.");
              input.value = "";
              return;
            }

            setMessage("");
            startTransition(async () => {
              try {
                const uploadedUrls: string[] = [];
                for (const file of files) {
                  const formData = new FormData();
                  formData.set("file", file);
                  const response = await fetch("/api/admin/uploads/cloudinary", {
                    method: "POST",
                    body: formData,
                  });
                  const data = await response.json().catch(() => ({}));

                  if (!response.ok || typeof data.url !== "string") {
                    throw new Error(data.error ?? "Falha no upload.");
                  }
                  uploadedUrls.push(data.url);
                }

                setUrl((current) => multiple
                  ? [current.trim(), ...uploadedUrls].filter(Boolean).join("\n")
                  : uploadedUrls[0]);
                setMessage(uploadedUrls.length > 1 ? `${uploadedUrls.length} imagens enviadas.` : "Imagem enviada.");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
              } finally {
                input.value = "";
              }
            });
          }}
        />
      </label>
      {message && <span className="text-xs font-bold text-[var(--muted)]">{message}</span>}
    </div>
  );
}
