import LoginBanner from "../../components/auth/LoginBanner";
import LoginCard from "../../components/auth/LoginCard";
import "../../components/auth/auth.css";
import DiyaGlow from "../../components/festival/DiyaGlow";

const Login = () => {
  return (
    <main className="auth-shell">
      <DiyaGlow size={58} className="diwali-login-diya" />
      <div className="auth-panel">
        <LoginBanner />
        <section className="auth-card-panel">
          <LoginCard />
        </section>
      </div>
    </main>
  );
};

export default Login;