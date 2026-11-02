const Toran = ({ animationsEnabled }) => (
  <svg
    className={`diwali-toran${animationsEnabled ? "" : " diwali-static"}`}
    viewBox="0 0 1440 100"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M0 4 Q720 82 1440 4" fill="none" stroke="#B47718" strokeWidth="2" />
    {Array.from({ length: 25 }, (_, index) => {
      const x = index * 60;
      const y = 8 + Math.sin((index / 24) * Math.PI) * 70;
      return (
        <g key={index} transform={`translate(${x} ${y})`}>
          <path d="M0 0c-18 2-22 14-20 24 13-1 21-8 20-24Z" fill="#317445" />
          <path d="M0 0c18 2 22 14 20 24C7 23-1 16 0 0Z" fill="#47854C" />
          <path d="M0 0v22" stroke="#B47718" strokeWidth="1" />
          <circle cy="25" r="5" fill={index % 2 ? "#FF9933" : "#FFC83D"} />
          <circle cy="32" r="3" fill="#E95B36" />
        </g>
      );
    })}
  </svg>
);

export default Toran;
