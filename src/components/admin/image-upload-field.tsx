"use client";

import { useState, useTransition } from "react";
import { ImageUp } from "lucide-react";

type ImageUploadFieldProps = {
  name: string;
  placeholder?: string;
  required?: boolean;
};

export function ImageUploadField({ name, placeholder = "URL da imagem", required }: ImageUploadFieldProps) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-2">
      <input
        className="field"
        name={name}
        type="url"
        placeholder={placeholder}
        required={required}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <label className="btn btn-secondary cursor-pointer">
        <ImageUp size={18} />
        {pending ? "Enviando..." : "Subir imagem"}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            if (file.size > 4 * 1024 * 1024) {
              setMessage("A imagem deve ter no máximo 4 MB.");
              event.target.value = "";
              return;
            }

            const formData = new FormData();
            formData.set("file", file);
            setMessage("");
            startTransition(async () => {
              try {
                const response = await fetch("/api/admin/uploads/cloudinary", {
                  method: "POST",
                  body: formData,
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                  setMessage(data.error ?? "Falha no upload.");
                  return;
                }

                setUrl(data.url);
                setMessage("Imagem enviada.");
              } catch {
                setMessage("Não foi possível enviar a imagem. Confira sua conexão e tente novamente.");
              }
            });
          }}
        />
      </label>
      {message && <span className="text-xs font-bold text-[var(--muted)]">{message}</span>}
    </div>
  );
}
