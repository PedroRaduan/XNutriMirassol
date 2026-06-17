import { cn } from "@/lib/utils";

type XNutriLogoProps = {
  tone?: "dark" | "light";
  subtitle?: boolean;
  className?: string;
};

export function XNutriLogo({ tone = "dark", subtitle = true, className }: XNutriLogoProps) {
  return (
    <span className={cn("xnutri-logo", tone === "light" && "xnutri-logo-light", className)}>
      <span className="xnutri-logo-mark" aria-hidden="true">X</span>
      <span>
        <span className="xnutri-logo-word">nutri</span>
      </span>
      {subtitle && <span className="xnutri-logo-subtitle">Suplementos Nutricionais</span>}
    </span>
  );
}
