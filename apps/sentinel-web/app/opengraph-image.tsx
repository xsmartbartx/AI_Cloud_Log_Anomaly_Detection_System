import { ImageResponse } from "next/og";

export const alt = "Linegist: the ten lines worth reading";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const lines = [
  { w: 520, hot: false }, { w: 640, hot: false }, { w: 430, hot: false },
  { w: 760, hot: true }, { w: 580, hot: false }, { w: 480, hot: false },
];

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#09090b", color: "#f4f4f5", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#4f46e5", display: "flex" }} />
          Linegist
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "flex", width: l.w, height: l.hot ? 18 : 10, borderRadius: 9, background: l.hot ? "#818cf8" : "#27272a" }} />
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>The ten lines worth reading.</div>
          <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa" }}>Flat price per scan. Hard cap. Nothing stored by default.</div>
        </div>
      </div>
    ),
    size,
  );
}
