import { useEffect, useRef } from "react";

interface BootOverlayProps {
  onStart: () => void;
  label?: string;
  sublabel?: string;
}

export default function BootOverlay({
  onStart,
  label = "CLICK TO START",
  sublabel = "(enables sound & fullscreen)",
}: BootOverlayProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onStart}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStart();
        }
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        onStart();
      }}
      style={styles.overlay}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, letterSpacing: 1, marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{sublabel}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "grid",
    placeItems: "center",
    background: "rgba(0,0,0,0.92)",
    color: "#00ff6a",
    fontFamily: "Courier New, ui-monospace, Menlo, Monaco, monospace",
    cursor: "pointer",
    userSelect: "none",
    outline: "none",
  },
};
