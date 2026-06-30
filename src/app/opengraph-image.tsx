import { ImageResponse } from "next/og";

export const alt = "XNutri Suplementos Nutricionais em Mirassol-SP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0b0c0f 0%, #231113 58%, #ef392f 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "72px 82px",
      }}
    >
      <div style={{ position: "absolute", width: 460, height: 460, borderRadius: 999, right: -120, top: -160, background: "rgba(255,255,255,.09)" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: 999, right: 120, bottom: -180, background: "rgba(255,255,255,.07)" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 86, height: 86, borderRadius: 20, background: "#ef392f", fontSize: 60, fontWeight: 900, fontStyle: "italic" }}>X</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 48, fontWeight: 900, fontStyle: "italic", letterSpacing: -3 }}>nutri</span>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2.5, color: "#ff7b74" }}>SUPLEMENTOS NUTRICIONAIS</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 850 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 3, color: "#ff8b84" }}>MIRASSOL-SP · TREINO E ESTILO</span>
          <span style={{ marginTop: 16, fontSize: 70, lineHeight: 1.02, fontWeight: 900, letterSpacing: -3 }}>Performance para quem treina de verdade.</span>
          <span style={{ marginTop: 24, fontSize: 26, color: "rgba(255,255,255,.78)" }}>Suplementos, roupas fitness, entrega regional e retirada na loja.</span>
        </div>
      </div>
    </div>,
    size,
  );
}
