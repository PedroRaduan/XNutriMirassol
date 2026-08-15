"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

type SafeImageProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  eager?: boolean;
};

export function SafeImage({ src, alt, sizes, className, eager = false }: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <span
        data-testid="image-fallback"
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className="absolute inset-0 grid place-items-center bg-[#efeeeb] text-[var(--muted)]"
      >
        <ImageOff size={28} aria-hidden="true" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      sizes={sizes}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
