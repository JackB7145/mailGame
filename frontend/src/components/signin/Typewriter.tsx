import { useEffect, useRef, useState } from "react";

interface TypewriterProps {
  lines: string[];
  enabled: boolean;
  intervalMs?: number;
  onComplete?: (fullLines: string[]) => void;
}

export default function Typewriter({
  lines,
  enabled,
  intervalMs = 40,
  onComplete,
}: TypewriterProps) {
  const [done, setDone] = useState<string[]>([]);
  const [buffer, setBuffer] = useState("");
  const [idx, setIdx] = useState(0);

  // audio (Web Audio) – uses /public/typing.wav
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const typingBufRef = useRef<AudioBuffer | null>(null);

  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      audioCtxRef.current = new Ctx();
      gainRef.current = audioCtxRef.current.createGain();
      gainRef.current.gain.value = 0.35;
      gainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume().catch(() => {});
    }
    if (!typingBufRef.current) {
      try {
        const res = await fetch("/typing.wav");
        const arr = await res.arrayBuffer();
        typingBufRef.current = await audioCtxRef.current.decodeAudioData(arr);
      } catch {
        /* silent failure */
      }
    }
  };

  const playTick = (rate = 1.8, dur = 0.03) => {
    const ctx = audioCtxRef.current;
    const buf = typingBufRef.current;
    const gain = gainRef.current;
    if (!ctx || !buf || !gain) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.connect(gain);
    src.start(0, 0, Math.min(dur, buf.duration));
  };

  useEffect(() => {
    if (!enabled) return;
    // keep audio lazy; if user never interacts, it'll stay silent but type
    ensureAudio();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (idx >= lines.length) {
      onComplete?.(done.slice());
      return;
    }
    const text = lines[idx];
    let i = 0;
    const id = setInterval(() => {
      if (i < text.length) {
        setBuffer(text.slice(0, i + 1));
        playTick();
        i++;
      } else {
        clearInterval(id);
        setDone((prev) => [...prev, text]);
        setBuffer("");
        setIdx((p) => p + 1);
      }
    }, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idx, intervalMs]);

  return (
    <>
      {done.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      {!!buffer && (
        <div>
          {buffer}
          <span style={cursorStyle}>█</span>
        </div>
      )}
    </>
  );
}

const cursorStyle: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 4,
  animation: "blink 1s steps(2, start) infinite",
};
