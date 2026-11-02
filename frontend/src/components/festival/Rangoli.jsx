const Rangoli = ({ className = "" }) => (
  <svg className={`diwali-rangoli ${className}`.trim()} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <g transform="translate(60 60)" fill="none" stroke="#FFC83D" strokeWidth="2">
      <circle r="45" />
      <circle r="34" stroke="#FF9933" />
      <circle r="22" stroke="#F0C452" />
      <path d="M0-54c16 13 16 25 0 38C-16-29-16-41 0-54Zm54 54C41 16 29 16 16 0 29-16 41-16 54 0ZM0 54c-16-13-16-25 0-38 16 13 16 25 0 38Zm-54-54c13-16 25-16 38 0-13 16-25 16-38 0Z" fill="rgba(255,153,51,.18)" />
      <path d="M0-36c11 9 11 18 0 27-11-9-11-18 0-27Zm36 36c-9 11-18 11-27 0 9-11 18-11 27 0ZM0 36c-11-9-11-18 0-27 11 9 11 18 0 27Zm-36-36c9-11 18-11 27 0-9 11-18 11-27 0Z" fill="rgba(255,200,61,.2)" />
      <circle r="5" fill="#FF9933" />
      <circle cx="0" cy="-45" r="2" fill="#FFC83D" />
      <circle cx="45" cy="0" r="2" fill="#FFC83D" />
      <circle cx="0" cy="45" r="2" fill="#FFC83D" />
      <circle cx="-45" cy="0" r="2" fill="#FFC83D" />
    </g>
  </svg>
);

export default Rangoli;
