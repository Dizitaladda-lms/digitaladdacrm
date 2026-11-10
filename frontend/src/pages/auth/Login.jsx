import LoginBanner from "../../components/auth/LoginBanner";
import LoginCard from "../../components/auth/LoginCard";
import "../../components/auth/auth.css";

const Login = () => {
  return (
    <main className="auth-shell">
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