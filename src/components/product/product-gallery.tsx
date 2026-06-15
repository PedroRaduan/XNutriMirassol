"use client";

import Image from "next/image";
import { useState } from "react";

type ImageItem = {
  id: string;
  url: string;
  alt: string;
};

export function ProductGallery({ images }: { images: ImageItem[] }) {
  const [selected, setSelected] = useState(images[0]);
  const [zoom, setZoom] = useState(false);

  if (!selected) return null;

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="relative aspect-square overflow-hidden rounded-lg border border-[var(--line)] bg-white"
      >
        <Image src={selected.url} alt={selected.alt} fill priority sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover" />
      </button>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelected(image)}
              className="relative aspect-square overflow-hidden rounded-md border border-[var(--line)] bg-white"
            >
              <Image src={image.url} alt={image.alt} fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <button
          type="button"
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/80 p-5"
          aria-label="Fechar zoom"
        >
          <span className="relative block h-[88vh] w-full max-w-5xl">
            <Image src={selected.url} alt={selected.alt} fill sizes="90vw" className="object-contain" />
          </span>
        </button>
      )}
    </div>
  );
}
