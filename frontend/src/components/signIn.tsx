import { useCallback, useRef, useState, useEffect } from "react";
import BootOverlay from "./signin/BootOverlay";
import TerminalChrome from "./signin/TerminalChrome";
import Typewriter from "./signin/Typewriter";
import Prompt from "./signin/Prompt";

interface Props {
  onSuccess: () => void;
}

export default function SignIn({ onSuccess }: Props) {
  // gate
  const [unlocked, setUnlocked] = useState(false);

  // boot typing done?
  const [bootDone, setBootDone] = useState(false);

  // terminal output lines (after boot)
  const [postLines, setPostLines] = useState<string[]>([]);

  // controlled prompt state
  const [promptValue, setPromptValue] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  // ---- success / fail sounds (HTMLAudio; simple + reliable after first gesture) ----
  const successSfx = useRef<HTMLAudioElement | null>(null);
  const failSfx = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // will work after the first user gesture (the overlay click/key)
    successSfx.current = new Audio("/success.mp3");
    failSfx.current = new Audio("/fail.mp3");
    if (successSfx.current) successSfx.current.volume = 0.6;
    if (failSfx.current) failSfx.current.volume = 0.6;
  }, []);

  const bootLines = [
    "Initializing system...",
    "Loading authentication module...",
    "Welcome to MailMe.io",
    "Please enter your name:",
  ];

  // Fullscreen (inside gesture)
  const goFullscreen = async () => {
    const el: any = document.documentElement;
    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;
    if (req) {
      try {
        await req.call(el);
      } catch {/* ignore */}
    }
  };

  // Overlay: click/keypress starts
  const handleStart = useCallback(async () => {
    await goFullscreen();
    setUnlocked(true); // Typewriter uses /public/typing.wav; already handled in subcomponent
  }, []);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setShowPrompt(true);
  }, []);

  // Submit name:
  //  - echo first ("> name")
  //  - if valid: play success, show Access Granted, hide/clear prompt immediately, then onSuccess
  //  - if invalid: play fail, show error, hide prompt for ~2s, then show again cleared for retry
  const handleSubmitName = useCallback(
    (name: string) => {
      // Echo the typed command first
      setPostLines((prev) => [...prev, `> ${name}`]);

      const isAllowed = name === "Jack" || name === "Kylee";

      if (isAllowed) {
        setPostLines((prev) => [...prev, `Access Granted. Welcome, ${name}!`]);
        setShowPrompt(false);   // hide prompt so input isn't visible
        setPromptValue("");     // clear
        // success sound
        try { successSfx.current?.play().catch(() => {}); } catch {}

        // transition shortly after
        setTimeout(onSuccess, 900);
      } else {
        setPostLines((prev) => [...prev, "User not recognized. Try again."]);
        // fail sound
        try { failSfx.current?.play().catch(() => {}); } catch {}

        // hide prompt briefly, then re-show cleared for retry
        setShowPrompt(false);
        setPromptValue("");
        setTimeout(() => {
          setShowPrompt(true);
        }, 2000); // ~2 seconds
      }
    },
    [onSuccess]
  );

  return (
    <>
      {!unlocked && <BootOverlay onStart={handleStart} />}

      <TerminalChrome>
        {/* Boot sequence */}
        <Typewriter
          lines={bootLines}
          enabled={unlocked && !bootDone}
          intervalMs={40}
          onComplete={handleBootComplete}
        />

        {/* Post-boot output */}
        {postLines.map((l, i) => (
          <div key={`post-${i}`}>{l}</div>
        ))}

        {/* Prompt */}
        {bootDone && showPrompt && (
          <Prompt
            value={promptValue}
            onChange={setPromptValue}
            onSubmit={handleSubmitName}
          />
        )}
      </TerminalChrome>
    </>
  );
}
