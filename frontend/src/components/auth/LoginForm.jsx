import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import { IS_MAINTENANCE_MODE } from "../../config/maintenanceConfig";
import "./auth.css";

const LoginForm = () => {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
  });

  const onSubmit = async (formData) => {
    try {
      setLoading(true);
      const response = await login(formData);

      if (response.success) {
        toast.success("Welcome Back 👋");

        const role = response?.data?.user?.role || response?.user?.role;

        if (IS_MAINTENANCE_MODE) {
          if (["MANAGER", "SUPER_ADMIN", "ADMIN", "HR"].includes(role)) {
            navigate("/my-attendance", { replace: true });
          } else {
            navigate("/employee/my-attendance", { replace: true });
          }
          return;
        }

        switch (role) {
          case "MANAGER":
          case "SUPER_ADMIN":
          case "ADMIN":
            navigate("/dashboard", { replace: true });
            break;

          case "HR":
            navigate("/reports", { replace: true });
            break;

          case "SALES_HEAD":
            navigate("/leads", { replace: true });
            break;

          case "COUNSELLOR":
          case "EMPLOYEE":
          case "TRAINER":
          case "INTERN":
          case "TL":
            navigate("/employee/dashboard", { replace: true });
            break;

          default:
            toast.error("Unauthorized Role");
            navigate("/", { replace: true });
        }
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Login Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
      <div className="auth-input-wrap">
        <Mail size={18} className="auth-input-icon" />
        <input
          type="text"
          placeholder="Work email address"
          autoComplete="username"
          {...register("email", {
            required: "Email address is required",
          })}
        />
        {errors.email && <p className="auth-error">{errors.email.message}</p>}
      </div>

      <div className="auth-input-wrap">
        <Lock size={18} className="auth-input-icon" />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          autoComplete="current-password"
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 6,
              message: "Password must be at least 6 characters",
            },
          })}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="auth-toggle-btn"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        {errors.password && <p className="auth-error">{errors.password.message}</p>}
      </div>

      <div className="auth-form__row">
        <label className="auth-form__remember">
          <input type="checkbox" />
          Remember me
        </label>
        <button type="button" className="auth-form__link">
          Forgot password?
        </button>
      </div>

      <button type="submit" disabled={loading} className="auth-button">
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <div className="auth-divider">Secure access</div>

      <div className="auth-footer">
        <p>© 2026 DIZITALADDA</p>
        <p>Education CRM & Learning Management Platform</p>
      </div>
    </form>
  );
};

export default LoginForm;
