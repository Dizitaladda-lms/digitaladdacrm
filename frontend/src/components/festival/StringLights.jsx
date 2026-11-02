const bulbs = ["#ffc83d", "#ff9933", "#e64b3c", "#ffc83d", "#ff9933", "#e64b3c", "#ffc83d", "#ff9933", "#e64b3c", "#ffc83d", "#ff9933", "#e64b3c"];

const StringLights = ({ animationsEnabled }) => (
  <div className={`diwali-string-lights${animationsEnabled ? "" : " diwali-static"}`} aria-hidden="true">
    <svg className="diwali-string-lights__wire" viewBox="0 0 1440 54" preserveAspectRatio="none">
      <path d="M0 5C180 55 360 5 540 28S900 55 1080 28 1260 5 1440 34" />
    </svg>
    <div className="diwali-string-lights__bulbs">
      {bulbs.map((color, index) => (
        <span
          key={index}
          className="diwali-bulb"
          style={{ "--bulb-color": color, "--bulb-delay": `${index * 0.18}s` }}
        />
      ))}
    </div>
  </div>
);

export default StringLights;
