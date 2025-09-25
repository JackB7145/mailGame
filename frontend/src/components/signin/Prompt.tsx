import React from "react";

interface PromptProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (value: string) => void;
  autoFocus?: boolean;
}

export default function Prompt({
  value,
  onChange,
  onSubmit,
  autoFocus = true,
}: PromptProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    onSubmit(value.trim());
  };

  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
      <span>&gt;&nbsp;</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        spellCheck={false}
        style={inputStyle}
      />
      <span style={cursorStyle}>█</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#00ff6a",
  fontFamily: "Courier New, ui-monospace, Menlo, Monaco, monospace",
  fontSize: 18,
  outline: "none",
  width: 360,
};

const cursorStyle: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 4,
  animation: "blink 1s steps(2, start) infinite",
};
