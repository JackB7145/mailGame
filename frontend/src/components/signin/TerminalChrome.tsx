import { ReactNode, useEffect } from "react";

export default function TerminalChrome({ children }: { children: ReactNode }) {
  // inject blink keyframes once
  useEffect(() => {
    const id = "blink-keyframes";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.innerHTML = `@keyframes blink { 50% { opacity: 0; } }`;
      document.head.appendChild(el);
    }
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.vignette} />
      <div style={styles.scanlines} />
      <div style={styles.terminal}>{children}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: "relative",
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 800px at 50% 0%, rgba(0,255,100,0.15), transparent 60%) #000",
    overflow: "hidden",
  },
  terminal: {
    position: "relative",
    padding: 24,
    color: "#00ff6a",
    fontFamily: "Courier New, ui-monospace, Menlo, Monaco, monospace",
    fontSize: 18,
    textShadow: "0 0 6px rgba(0,255,130,0.6)",
    whiteSpace: "pre-wrap",
    maxWidth: 960,
    margin: "0 auto",
  },
  vignette: {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
    boxShadow: "inset 0 0 200px rgba(0,0,0,0.8)",
  },
  scanlines: {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
    background:
      "repeating-linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.12) 2px, transparent 2px, transparent 4px)",
    mixBlendMode: "multiply",
  },
};
