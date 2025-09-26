// src/game/audio/music.ts
import Phaser from "phaser";

export class Music {
  private static current?: Phaser.Sound.BaseSound;
  private static htmlFallback?: HTMLAudioElement;
  private static armed = false;

  // Central volume [0..1] – restore from storage if present
  private static vol = (() => {
    try {
      const saved = parseFloat(localStorage.getItem("courier:volume") || "");
      if (!Number.isNaN(saved)) return clamp01(saved);
    } catch {}
    return 0.5;
  })();

  /** Start bgm if not already playing. Uses Phaser WebAudio; falls back to <audio>. */
  static play(scene: Phaser.Scene, key = "bgm", volume = this.vol) {
    // If already playing (either engine), just ensure volume is correct and return
    if (this.current?.isPlaying || this.htmlFallback) {
      this.setVolume(volume, scene, 0);
      return this.current;
    }

    const startPhaser = () => {
      if (this.current?.isPlaying) return;
      try {
        const s = scene.sound.add(key, { loop: true, volume: 0 });
        s.play(); // may throw if audio is still locked
        this.vol = clamp01(volume);
        scene.tweens.add({ targets: s, volume: this.vol, duration: 120, ease: "Sine.easeOut" });
        this.current = s;
        scene.sound.pauseOnBlur = false;
        this.disarm(scene);
        // if a <audio> fallback was playing from earlier, kill it now
        if (this.htmlFallback) { try { this.htmlFallback.pause(); } catch {} this.htmlFallback = undefined; }
        console.debug("[Music] WebAudio started");
      } catch (err) {
        console.warn("[Music] WebAudio play failed, falling back to <audio>", err);
        this.startHtmlFallback(volume);
        this.disarm(scene);
      }
    };

    if (!scene.sound.locked) {
      startPhaser();
      return this.current;
    }

    // Arm one-shots to start after first gesture/unlock
    if (!this.armed) {
      this.armed = true;
      const onUnlock = () => { startPhaser(); };
      scene.sound.once("unlocked", onUnlock);

      const onGesture = () => { startPhaser(); };
      scene.input.once("pointerdown", onGesture);
      scene.input.keyboard?.once("keydown", onGesture as any);

      const domGesture = () => { startPhaser(); };
      window.addEventListener("touchstart", domGesture, { once: true, passive: true });
      window.addEventListener("pointerdown", domGesture, { once: true });

      (scene as any).__musicCleanup = () => {
        window.removeEventListener("touchstart", domGesture as any);
        window.removeEventListener("pointerdown", domGesture as any);
      };
      console.debug("[Music] armed for unlock/gesture");
    }
    return this.current;
  }

  static setVolume(v: number, scene?: Phaser.Scene, tweenMs = 0) {
  this.vol = clamp01(v);

  if (this.htmlFallback) {
    this.htmlFallback.volume = this.vol; // exact 0 = mute
  }

  const s = this.current;
  if (s) {
    if (scene && tweenMs > 0) {
      // Tween the 'volume' property; works across Phaser sound types
      scene.tweens.add({ targets: s, volume: this.vol, duration: tweenMs, ease: "Sine.easeOut" });
    } else {
      // Some Phaser typings don’t expose setVolume; fall back to property write
      const anyS = s as any;
      if (typeof anyS.setVolume === "function") anyS.setVolume(this.vol);
      else anyS.volume = this.vol;
    }
  }

  try { localStorage.setItem("courier:volume", String(this.vol)); } catch {}
}


  static getVolume() { return this.vol; }

  private static startHtmlFallback(volume: number) {
    try {
      const el = new Audio("bgm.mp3"); // served from /public
      el.loop = true;
      this.vol = clamp01(volume);
      el.volume = this.vol;
      el.play().then(() => {
        this.htmlFallback = el;
        console.debug("[Music] HTMLAudio fallback started");
      }).catch(err => {
        console.error("[Music] HTMLAudio fallback failed to play", err);
      });
    } catch (e) {
      console.error("[Music] HTMLAudio fallback error", e);
    }
  }

  private static disarm(scene: Phaser.Scene) {
    if (!this.armed) return;
    this.armed = false;
    const cleanup = (scene as any).__musicCleanup;
    if (typeof cleanup === "function") {
      try { cleanup(); } catch {}
      (scene as any).__musicCleanup = undefined;
    }
  }

  static fadeOut(scene: Phaser.Scene, ms = 600) {
    if (this.htmlFallback) {
      const el = this.htmlFallback;
      const start = el.volume;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        el.volume = start * (1 - k);
        if (k < 1) requestAnimationFrame(step);
        else { try { el.pause(); } catch {}; this.htmlFallback = undefined; }
      };
      requestAnimationFrame(step);
      return;
    }

    const s = this.current;
    if (!s) return;
    scene.tweens.add({
      targets: s,
      volume: 0,
      duration: ms,
      onComplete: () => {
        try { s.stop(); } catch {}
        this.current = undefined;
      },
    });
  }

  static stop() {
    if (this.htmlFallback) {
      try { this.htmlFallback.pause(); } catch {}
      this.htmlFallback = undefined;
    }
    const s = this.current;
    if (s) { try { s.stop(); } catch {} this.current = undefined; }
  }

  static isPlaying() {
    return !!this.htmlFallback || !!this.current?.isPlaying;
  }
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
