const DiyaGlow = ({ size = 28, className = "" }) => (
  <svg
    className={`diwali-diya ${className}`.trim()}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M24 7c-5 5-5 10 0 13 5-3 5-8 0-13Z" fill="#FFB52E" className="diwali-diya__flame" />
    <path d="M24 11c-2 3-2 5 0 7 2-2 2-4 0-7Z" fill="#FFF6C7" className="diwali-diya__core" />
    <path d="M10 25c2 9 7 14 14 14s12-5 14-14H10Z" fill="#B94719" />
    <path d="M8 24h32c-2 6-7 9-16 9S10 30 8 24Z" fill="#F28C28" />
    <path d="M13 25c2 3 6 4 11 4s9-1 11-4" stroke="#FFD56A" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 39h20" stroke="#FFD56A" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default DiyaGlow;
