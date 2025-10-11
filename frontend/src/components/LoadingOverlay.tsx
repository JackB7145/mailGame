import { useAccent } from "../hooks/useAccents";

export default function LoadingOverlay() {
  const { rgba } = useAccent();
  return (
    <div style={overlay}>
      <div style={spinner(rgba)} />
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.75)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const spinner = (rgba: any): React.CSSProperties => ({
  width: 64,
  height: 64,
  border: `6px solid ${rgba(0.25)}`,
  borderTop: `6px solid ${rgba(1)}`,
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
});

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
