import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Apologist AI — AI-Powered Christian Apologetics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ffffff 0%, #fffbeb 50%, #f8fafc 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle cross watermark */}
        <div
          style={{
            position: "absolute",
            fontSize: 420,
            color: "#f59e0b",
            opacity: 0.07,
            lineHeight: 1,
          }}
        >
          ✝
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, zIndex: 1 }}>
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 48, color: "#f59e0b" }}>✝</span>
            <span style={{ fontSize: 32, fontWeight: 700, color: "#64748b", letterSpacing: 2 }}>
              APOLOGIST AI
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#0f172a",
              textAlign: "center",
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            Defend Your Faith
            <br />
            <span style={{ color: "#f59e0b" }}>with AI</span>
          </div>

          {/* Sub */}
          <div
            style={{
              fontSize: 26,
              color: "#64748b",
              textAlign: "center",
              maxWidth: 780,
              lineHeight: 1.4,
            }}
          >
            Scripture-backed answers to the toughest questions about Christianity, Catholicism, Islam &amp; atheism
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {["Free to try", "Catholic perspective", "Challenge mode"].map((label) => (
              <div
                key={label}
                style={{
                  background: "#fef3c7",
                  border: "2px solid #fbbf24",
                  borderRadius: 50,
                  padding: "10px 22px",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#92400e",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
