import Phaser from "phaser";

export class Music {
  private static current?: Phaser.Sound.BaseSound;
  private static htmlFallback?: HTMLAudioElement;
  private static armed = false;

  static play(scene: Phaser.Scene, key = "bgm", volume = 0.35) {
    // Already playing?
    if (this.current?.isPlaying || this.htmlFallback) {
      console.debug("[Music] already playing");
      return this.current;
    }

    const startPhaser = () => {
      if (this.current?.isPlaying || this.htmlFallback) return;
      try {
        const s = scene.sound.add(key, { loop: true, volume: 0 });
        s.play(); // can throw if still locked
        scene.tweens.add({ targets: s, volume, duration: 800, ease: "Sine.easeOut" });
        this.current = s;
        scene.sound.pauseOnBlur = false;
        this.disarm(scene);
        console.debug("[Music] Phaser WebAudio started");
      } catch (err) {
        console.warn("[Music] WebAudio play failed, falling back to <audio>", err);
        this.startHtmlFallback(volume);
        this.disarm(scene);
      }
    };

    // If unlocked, try immediately
    if (!scene.sound.locked) {
      startPhaser();
      return this.current;
    }

    // Otherwise arm once; any gesture/unlock triggers start
    if (!this.armed) {
      this.armed = true;
      const onUnlock = () => { startPhaser(); };
      scene.sound.once("unlocked", onUnlock);

      const onGesture = () => { startPhaser(); };
      scene.input.once("pointerdown", onGesture);
      scene.input.keyboard?.once("keydown", onGesture as any);

      // extra DOM safety for mobile
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

  private static startHtmlFallback(volume: number) {
    try {
      const el = new Audio("bgm.mp3"); // relative path (works under subpaths)
      el.loop = true;
      el.volume = Math.max(0, Math.min(1, volume));
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
