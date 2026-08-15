import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SafeImage } from "@/components/ui/safe-image";

describe("SafeImage", () => {
  it("mostra um fallback acessível quando a imagem falha", () => {
    render(
      <div className="relative size-24">
        <SafeImage src="https://res.cloudinary.com/demo/image/upload/inexistente.jpg" alt="Produto XNutri" sizes="96px" />
      </div>,
    );

    fireEvent.error(screen.getByAltText("Produto XNutri"));
    expect(screen.getByTestId("image-fallback")).toHaveAttribute("aria-label", "Produto XNutri");
  });
});
