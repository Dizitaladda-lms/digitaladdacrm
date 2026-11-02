import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import "../../styles/festival.css";
import FallingPetals from "./FallingPetals";
import FestivalGreeting from "./FestivalGreeting";
import StringLights from "./StringLights";
import Toran from "./Toran";

const interactiveTarget = (target) => target instanceof Element
  && Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true'], [role='button']"));

const CursorSparkles = ({ enabled }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!enabled || !window.matchMedia?.("(pointer: fine)").matches) return undefined;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const particles = [];
    let frameId = 0;
    let lastTrailAt = 0;
    let isVisible = !document.hidden;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const addParticle = (x, y, amount = 1) => {
      for (let index = 0; index < amount; index += 1) {
        if (particles.length >= 12) particles.shift();
        particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.5 - Math.random() * 0.8,
          life: 0.65 + Math.random() * 0.35,
          size: 1 + Math.random() * 1.7,
          rotation: Math.random() * Math.PI,
        });
      }
      if (!frameId && isVisible) frameId = window.requestAnimationFrame(draw);
    };

    const draw = () => {
      frameId = 0;
      if (!isVisible) return;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.025;
        particle.rotation += 0.08;
        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = particle.life;
        context.fillStyle = "#ffc83d";
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        context.restore();
      }
      if (particles.length) frameId = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => {
      const now = performance.now();
      if (!interactiveTarget(event.target) && now - lastTrailAt > 55) {
        lastTrailAt = now;
        addParticle(event.clientX, event.clientY);
      }
    };
    const onPointerDown = (event) => {
      if (!interactiveTarget(event.target)) addParticle(event.clientX, event.clientY, 5);
    };
    const onVisibilityChange = () => {
      isVisible = !document.hidden;
      if (!isVisible && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      } else if (isVisible && particles.length && !frameId) {
        frameId = window.requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className="diwali-sparkle-canvas" aria-hidden="true" />;
};

const DiwaliTheme = () => {
  const { festivalActive, animationsEnabled } = useTheme();
  const { pathname } = useLocation();
  const [isHidden, setIsHidden] = useState(() => document.hidden);

  useEffect(() => {
    const updateVisibility = () => setIsHidden(document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  if (!festivalActive) return null;

  const showGreeting = pathname === "/" || pathname === "/dashboard" || pathname === "/employee/dashboard";
  return (
    <>
      <div
        className={`diwali-theme${isHidden ? " diwali-theme--paused" : ""}`}
        aria-hidden="true"
      >
        <StringLights animationsEnabled={animationsEnabled} />
        <Toran animationsEnabled={animationsEnabled} />
        <FallingPetals animationsEnabled={animationsEnabled} />
        <CursorSparkles enabled={animationsEnabled && !isHidden} />
      </div>
      {showGreeting && <FestivalGreeting />}
    </>
  );
};

export default DiwaliTheme;
