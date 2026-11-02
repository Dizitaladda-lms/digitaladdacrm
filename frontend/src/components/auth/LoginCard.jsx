import logo from "../../assets/logo/dizitaladda-logo.png";
import LoginForm from "./LoginForm";
import Rangoli from "../festival/Rangoli";
import "./auth.css";

const LoginCard = () => {
  return (
    <div className="auth-card">
      <Rangoli className="diwali-rangoli--top" />
      <Rangoli className="diwali-rangoli--bottom" />
      <div className="auth-card__inner">
        <div className="auth-card__logo">
          <img src={logo} alt="DizitalAdda — India's Most Recommended Digital Marketing Institute" />
        </div>

        <div className="auth-card__title">
          <h1>Welcome back</h1>
          <p>Sign in to access your admission and learning workspace with confidence.</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
};

export default LoginCard;
