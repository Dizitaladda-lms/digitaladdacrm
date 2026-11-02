import { useMemo } from "react";

const Flower = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    {Array.from({ length: 10 }, (_, index) => (
      <ellipse
        key={index}
        cx="16"
        cy="8"
        rx="3"
        ry="7"
        fill={index % 2 ? "#FF9A20" : "#FFC247"}
        transform={`rotate(${index * 36} 16 16)`}
      />
    ))}
    <circle cx="16" cy="16" r="4" fill="#9E4A1A" />
  </svg>
);

const FallingPetals = ({ animationsEnabled }) => {
  const items = useMemo(() => Array.from({ length: 12 }, (_, index) => ({
    id: index,
    left: `${Math.random() * 100}%`,
    size: `${14 + Math.random() * 15}px`,
    duration: `${12 + Math.random() * 10}s`,
    delay: `${-Math.random() * 22}s`,
    sway: `${-30 + Math.random() * 60}px`,
    diya: index % 5 === 0,
  })), []);

  return (
    <div className={`diwali-petals${animationsEnabled ? "" : " diwali-static"}`} aria-hidden="true">
      {items.map((item) => (
        <span
          key={item.id}
          className={`diwali-petal${item.diya ? " diwali-petal--diya" : ""}`}
          style={{
            "--petal-left": item.left,
            "--petal-size": item.diya ? "21px" : item.size,
            "--petal-duration": item.duration,
            "--petal-delay": item.delay,
            "--petal-sway": item.sway,
          }}
        >
          {item.diya ? (
            <svg viewBox="0 0 48 48" focusable="false">
              <path d="M24 5c-5 6-4 10 0 13 4-3 5-7 0-13Z" fill="#FFC247" />
              <path d="M11 25h26c-2 8-7 12-13 12s-11-4-13-12Z" fill="#D75B1D" />
              <path d="M9 24h30" stroke="#FFD66B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : <Flower />}
        </span>
      ))}
    </div>
  );
};

export default FallingPetals;
