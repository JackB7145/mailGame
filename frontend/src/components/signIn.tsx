import { useCallback, useRef, useState, useEffect } from "react";
import BootOverlay from "./signin/BootOverlay";
import TerminalChrome from "./signin/TerminalChrome";
import Typewriter from "./signin/Typewriter";
import Prompt from "./signin/Prompt";
import { usernameExists } from "../lib/api";
import { loadCustomization } from "../game/state/session"; // <-- single hydrate entrypoint

interface Props {
  onSuccess: () => void;
}

const AUTH_KEY = "mailme:auth";
const ACTIVE_USER_KEY = "mailme:activeUser";
const AUTH_TTL_MS = 60 * 60 * 1000; // 60 minutes

function setAuthToken() {
  try {
    const token = {
      v: Math.random().toString(36).slice(2) + Date.now().toString(36),
      t: Date.now(), // issuedAt
      ttl: AUTH_TTL_MS
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(token));
  } catch { /* ignore */ }
}

function setActiveUser(username: string) {
  try {
    const clean = username.trim().replace(/^@/, "");
    localStorage.setItem(
      ACTIVE_USER_KEY,
      JSON.stringify({ username: clean, t: Date.now() })
    );
  } catch { /* ignore */ }
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

  // Optional: if this component mounts while an active user already exists,
  // this will hydrate customization/color immediately (no-op if none).
  useEffect(() => {
    (async () => { await loadCustomization().catch(() => {}); })();
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

  // Submit name -> /v1/users/exists, then set token/user and hydrate via loadCustomization()
  const handleSubmitName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      setPostLines((prev) => [...prev, `> ${name}`]); // echo

      if (!trimmed) {
        setPostLines((prev) => [...prev, "Please enter a non-empty name."]);
        return;
      }

      // hide prompt while checking
      setShowPrompt(false);
      setPromptValue("");
      setPostLines((prev) => [...prev, "Checking user directory..."]);

      try {
        const exists = await usernameExists(trimmed);

        if (exists) {
          setPostLines((prev) => [...prev, `Access Granted. Welcome, ${trimmed}!`]);
          try { successSfx.current?.play().catch(() => {}); } catch {}

          // persist 60-min auth token + active user
          setAuthToken();
          setActiveUser(trimmed);

          // ---- single hydrate path (color/hat/position + CSS vars) ----
          setPostLines((prev) => [...prev, "Syncing preferences..."]);
          try {
            await loadCustomization(); // reads activeUser from localStorage internally
          } catch (e: any) {
            setPostLines((prev) => [...prev, `Preferences sync failed: ${e?.message || "error"}`]);
          }

          // transition shortly after
          setTimeout(onSuccess, 900);
        } else {
          setPostLines((prev) => [...prev, "User not recognized. Try again."]);
          try { failSfx.current?.play().catch(() => {}); } catch {}
          setTimeout(() => setShowPrompt(true), 1200);
        }
      } catch (err: any) {
        setPostLines((prev) => [
          ...prev,
          `Lookup failed: ${err?.message || "network error"}`,
        ]);
        try { failSfx.current?.play().catch(() => {}); } catch {}
        setTimeout(() => setShowPrompt(true), 1500);
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
