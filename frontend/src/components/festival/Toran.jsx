import { useEffect, useMemo, useState } from "react";

const PETAL_COUNTS = [12, 9, 6];

const getFlower = (key, x, y, angle, scale, className = "") => (
  <g
    key={key}
    className={className}
    transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}
    filter="url(#diwali-flower-shadow)"
  >
    <g className="diwali-toran__petal-layer">
      {PETAL_COUNTS.map((count, layer) => {
        const radius = [10.5, 7.3, 4.1][layer];
        const rx = [4.5, 3.8, 3.1][layer];
        const ry = [8.8, 7.2, 5.3][layer];
        return (
          <g key={count}>
            {Array.from({ length: count }, (_, petal) => (
              <ellipse
                key={petal}
                cx="0"
                cy={-radius}
                rx={rx}
                ry={ry}
                fill={`url(#diwali-petal-gradient-${layer})`}
                transform={`rotate(${(petal * 360) / count})`}
                stroke="#d95a12"
                strokeOpacity="0.22"
                strokeWidth="0.55"
              />
            ))}
          </g>
        );
      })}
    </g>
    <circle r="3.15" fill="url(#diwali-flower-center)" />
    <circle cx="-0.8" cy="-1" r="0.75" fill="#ffb132" opacity="0.85" />
  </g>
);

const getInitialWidth = () => (
  typeof window === "undefined" ? 1280 : Math.max(1, window.innerWidth)
);

const Toran = ({ animationsEnabled }) => {
  const [width, setWidth] = useState(getInitialWidth);

  useEffect(() => {
    let resizeFrame = 0;
    const updateWidth = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        setWidth((currentWidth) => (
          currentWidth === window.innerWidth ? currentWidth : Math.max(1, window.innerWidth)
        ));
      });
    };

    window.addEventListener("resize", updateWidth, { passive: true });
    return () => {
      window.removeEventListener("resize", updateWidth);
      window.cancelAnimationFrame(resizeFrame);
    };
  }, []);

  const mobile = width <= 640;
  const scale = mobile ? 0.68 : 1;
  const swagCount = Math.max(1, Math.ceil(width / (mobile ? 190 : 285)));
  const swagWidth = width / swagCount;
  const height = mobile ? 132 : 174;
  const garland = useMemo(() => {
    const swags = [];
    const junctions = [];

    for (let index = 0; index < swagCount; index += 1) {
      const left = index * swagWidth;
      const sag = swagWidth * (mobile ? 0.16 : 0.18);
      const flowerCount = Math.max(7, Math.ceil(swagWidth / (mobile ? 22 : 27)));
      const flowers = [];
      const leaves = [];

      for (let flowerIndex = 0; flowerIndex < flowerCount; flowerIndex += 1) {
        const t = (flowerIndex + 0.5) / flowerCount;
        const x = t * swagWidth;
        const y = 9 + 4 * sag * t * (1 - t);
        const tangent = Math.atan((4 * sag * (1 - 2 * t)) / swagWidth) * (180 / Math.PI);
        const sizeVariation = 0.84 + Math.random() * 0.32;
        flowers.push(getFlower(
          `flower-${index}-${flowerIndex}`,
          x,
          y + (Math.random() - 0.5) * 3,
          tangent + (Math.random() - 0.5) * 24,
          scale * sizeVariation
        ));

        if (flowerIndex % 3 === 1) {
          const leafSide = flowerIndex % 2 ? -1 : 1;
          leaves.push(
            <g
              key={`leaf-${index}-${flowerIndex}`}
              transform={`translate(${x + leafSide * 10} ${y - 5}) rotate(${leafSide * (28 + Math.random() * 18)}) scale(${scale})`}
              filter="url(#diwali-leaf-shadow)"
            >
              <path d="M0 0C-7-12-5-20 1-25 8-16 7-7 0 0Z" fill="url(#diwali-leaf-gradient)" />
              <path d="M0-2 1-21" fill="none" stroke="#1b6336" strokeWidth="1" opacity="0.8" />
              <path d="m0-10-4-5m5 1 4-5" fill="none" stroke="#72a85a" strokeWidth="0.7" opacity="0.75" />
            </g>
          );
        }
      }

      swags.push(
        <g
          key={`swag-position-${index}`}
          transform={`translate(${left} 0)`}
        >
          <g
            className={`diwali-toran__swag${animationsEnabled ? "" : " diwali-static"}`}
            style={{ "--swag-delay": `${index * -0.65}s`, "--swag-duration": `${4.2 + (index % 3) * 0.7}s` }}
          >
            <path
              d={`M0 8 Q${swagWidth / 2} ${8 + 2 * sag} ${swagWidth} 8`}
              fill="none"
              stroke="#76501b"
              strokeWidth={mobile ? "2" : "2.6"}
              strokeLinecap="round"
            />
            <path
              d={`M0 7 Q${swagWidth / 2} ${6 + 2 * sag} ${swagWidth} 7`}
              fill="none"
              stroke="#d9a83b"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            {leaves}
            {flowers}
          </g>
        </g>
      );

      junctions.push(
        <g
          key={`junction-position-${index}`}
          transform={`translate(${left} 10) scale(${scale})`}
        >
          <g
            className={`diwali-toran__junction${animationsEnabled ? "" : " diwali-static"}`}
            style={{ "--swag-delay": `${index * -0.9 - 0.3}s`, "--swag-duration": `${5 + (index % 2) * 1.1}s` }}
          >
            <path d="M0 0c-1 12 2 22 0 34" fill="none" stroke="#76501b" strokeWidth="1.5" />
            {Array.from({ length: 5 }, (_, flowerIndex) => getFlower(
              `hanging-${index}-${flowerIndex}`,
              Math.sin(flowerIndex * 0.7) * 2.2,
              12 + flowerIndex * 13,
              Math.sin(flowerIndex * 0.7) * 10,
              0.63 + (flowerIndex % 2) * 0.04
            ))}
            <path d="M0 72c-8 7-9 14-2 19 5-5 5-11 2-19Zm0 0c8 7 9 14 2 19-5-5-5-11-2-19Z" fill="url(#diwali-leaf-gradient)" />
            <path d="M0 73v19" stroke="#d9a83b" strokeWidth="1" />
          </g>
        </g>
      );
    }

    junctions.push(
      <g
        key="junction-end"
        transform={`translate(${width} 10) scale(${scale})`}
      >
        <g
          className={`diwali-toran__junction${animationsEnabled ? "" : " diwali-static"}`}
          style={{ "--swag-delay": `${swagCount * -0.9}s`, "--swag-duration": "5.6s" }}
        >
          <path d="M0 0c-1 12 2 22 0 34" fill="none" stroke="#76501b" strokeWidth="1.5" />
          {Array.from({ length: 5 }, (_, flowerIndex) => getFlower(
            `hanging-end-${flowerIndex}`,
            Math.sin(flowerIndex * 0.7) * 2.2,
            12 + flowerIndex * 13,
            Math.sin(flowerIndex * 0.7) * 10,
            0.63 + (flowerIndex % 2) * 0.04
          ))}
          <path d="M0 72c-8 7-9 14-2 19 5-5 5-11 2-19Zm0 0c8 7 9 14 2 19-5-5-5-11-2-19Z" fill="url(#diwali-leaf-gradient)" />
          <path d="M0 73v19" stroke="#d9a83b" strokeWidth="1" />
        </g>
      </g>
    );

    return { swags, junctions };
  }, [animationsEnabled, mobile, scale, swagCount, swagWidth, width]);

  return (
    <svg
      className="diwali-toran"
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      style={{ "--toran-height": `${height}px` }}
    >
      <defs>
        <radialGradient id="diwali-petal-gradient-0" cx="30%" cy="24%" r="78%">
          <stop offset="0%" stopColor="#ffe773" />
          <stop offset="42%" stopColor="#ffba25" />
          <stop offset="78%" stopColor="#f47a13" />
          <stop offset="100%" stopColor="#bd3f0b" />
        </radialGradient>
        <radialGradient id="diwali-petal-gradient-1" cx="28%" cy="20%" r="82%">
          <stop offset="0%" stopColor="#fff18b" />
          <stop offset="40%" stopColor="#ffc23c" />
          <stop offset="78%" stopColor="#f47b16" />
          <stop offset="100%" stopColor="#c7440d" />
        </radialGradient>
        <radialGradient id="diwali-petal-gradient-2" cx="30%" cy="20%" r="82%">
          <stop offset="0%" stopColor="#ffe989" />
          <stop offset="45%" stopColor="#ffad2e" />
          <stop offset="100%" stopColor="#d54a0e" />
        </radialGradient>
        <radialGradient id="diwali-flower-center" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#762707" />
          <stop offset="100%" stopColor="#351509" />
        </radialGradient>
        <linearGradient id="diwali-leaf-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6fa652" />
          <stop offset="50%" stopColor="#34814a" />
          <stop offset="100%" stopColor="#155433" />
        </linearGradient>
        <filter id="diwali-flower-shadow" x="-45%" y="-45%" width="190%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.7" floodColor="#4a210c" floodOpacity="0.43" />
        </filter>
        <filter id="diwali-leaf-shadow" x="-50%" y="-40%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#143a23" floodOpacity="0.4" />
        </filter>
      </defs>
      {garland.swags}
      {garland.junctions}
    </svg>
  );
};

export default Toran;
