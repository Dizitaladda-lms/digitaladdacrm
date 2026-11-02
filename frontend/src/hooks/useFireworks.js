import { useCallback } from "react";
import confetti from "canvas-confetti";
import { useTheme } from "../context/ThemeContext";

const DURATION_MS = 2400;
const BURST_INTERVAL_MS = 400;
const PARTICLES_PER_SIDE = 8;

let animationFrame = 0;
let visibilityListener = null;

const clearVisibilityListener = () => {
  if (!visibilityListener) return;
  document.removeEventListener("visibilitychange", visibilityListener);
  visibilityListener = null;
};

const stopFireworks = () => {
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  clearVisibilityListener();
  confetti.reset();
};

const runFireworks = () => {
  if (document.hidden) return;
  stopFireworks();

  const startedAt = performance.now();
  let lastBurstAt = -BURST_INTERVAL_MS;
  visibilityListener = () => {
    if (document.hidden) stopFireworks();
  };
  document.addEventListener("visibilitychange", visibilityListener);

  const animate = (now) => {
    if (document.hidden) {
      stopFireworks();
      return;
    }

    if (now - startedAt >= DURATION_MS) {
      animationFrame = 0;
      clearVisibilityListener();
      return;
    }

    if (now - lastBurstAt >= BURST_INTERVAL_MS) {
      lastBurstAt = now;
      [0.18 + Math.random() * 0.2, 0.62 + Math.random() * 0.2].forEach((x) => {
        confetti({
          particleCount: PARTICLES_PER_SIDE,
          spread: 360,
          startVelocity: 28,
          gravity: 1.2,
          ticks: 48,
          scalar: 0.7,
          zIndex: 50,
          origin: { x, y: 0.58 + Math.random() * 0.18 },
          colors: ["#ffc83d", "#ff9933", "#e64b3c", "#fff6e5"],
          disableForReducedMotion: true,
        });
      });
    }

    animationFrame = window.requestAnimationFrame(animate);
  };

  animationFrame = window.requestAnimationFrame(animate);
};

export const fireWorks = (enabled = false) => {
  if (!enabled) return;
  runFireworks();
};

const useFireworks = () => {
  const { festivalActive, animationsEnabled } = useTheme();
  return useCallback(() => {
    fireWorks(festivalActive && animationsEnabled);
  }, [animationsEnabled, festivalActive]);
};

export default useFireworks;
