import { useEffect, useState } from "react";
import {
  Mail,
  Phone,
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

const sanitizeCredentialText = (value) =>
  String(value || "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .trim();

const getTargetRouteForRole = (rawRole) => {
  const role = String(rawRole || "").trim().toUpperCase();
  if (IS_MAINTENANCE_MODE) {
    return ["MANAGER", "SUPER_ADMIN", "ADMIN", "HR"].includes(role)
      ? "/my-attendance"
      : "/employee/my-attendance";
  }

  switch (role) {
    case "MANAGER":
    case "SUPER_ADMIN":
    case "ADMIN":
      return "/dashboard";
    case "HR":
      return "/reports";
    case "SALES_HEAD":
      return "/leads";
    case "DEPARTMENT_HEAD":
    case "SUB_TL":
    case "COUNSELLOR":
    case "EMPLOYEE":
    case "TRAINER":
    case "INTERN":
    case "TL":
      return "/employee/dashboard";
    default:
      return null;
  }
};

const LoginForm = () => {
  const navigate = useNavigate();

  const { user, loading: authLoading, login } = useAuth();

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
  });

  useEffect(() => {
    if (!authLoading && user?.role) {
      const targetRoute = getTargetRouteForRole(user.role);
      if (targetRoute) {
        navigate(targetRoute, { replace: true });
      }
    }
  }, [authLoading, user, navigate]);

  const identifierValue = watch("email", "");
  const isPhoneInput =
    Boolean(identifierValue) &&
    !String(identifierValue).includes("@") &&
    /^[\d+\s()-]+$/.test(String(identifierValue).trim());

  const onSubmit = async (formData) => {
    try {
      setLoading(true);
      const rawIdentifier = sanitizeCredentialText(formData.email);
      const trimmedIdentifier = rawIdentifier.includes("@")
        ? rawIdentifier.replace(/\s+/g, "").toLowerCase()
        : rawIdentifier;
      const cleanedPassword = sanitizeCredentialText(formData.password);

      const response = await login({
        ...formData,
        email: trimmedIdentifier,
        identifier: trimmedIdentifier,
        password: cleanedPassword,
      });

      if (response?.success) {
        toast.success("Welcome Back 👋");

        const role = response?.data?.user?.role || response?.user?.role;
        const targetRoute = getTargetRouteForRole(role);

        if (targetRoute) {
          navigate(targetRoute, { replace: true });
        } else {
          toast.error("Unauthorized Role");
          navigate("/", { replace: true });
        }
      }
    } catch (error) {
      const serverMessage =
        typeof error?.response?.data?.message === "string"
          ? error.response.data.message
          : typeof error?.response?.data?.error === "string"
          ? error.response.data.error
          : null;
      const fallbackMessage =
        typeof navigator !== "undefined" && navigator.onLine === false
          ? "No internet connection. Please check your network and try again."
          : error?.code === "ECONNABORTED"
          ? "Connection timed out. Please try again."
          : "Login failed. Please check your credentials or network and try again.";
      toast.error(serverMessage || fallbackMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
      <div className="auth-input-wrap">
        {isPhoneInput ? (
          <Phone size={18} className="auth-input-icon" />
        ) : (
          <Mail size={18} className="auth-input-icon" />
        )}
        <input
          type="text"
          placeholder="Work email, phone number, or Employee ID"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...register("email", {
            required: "Email or phone number is required",
            validate: (val) => {
              const v = sanitizeCredentialText(val);
              if (!v) return "Email or phone number is required";
              if (v.includes("@")) {
                const cleanEmail = v.replace(/\s+/g, "");
                return (
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
                  "Enter a valid email address"
                );
              }
              const digits = v.replace(/\D/g, "");
              if (digits.length >= 10 && digits.length <= 15) {
                return true;
              }
              if (/^[A-Za-z0-9_-]{3,24}$/.test(v)) {
                return true;
              }
              return "Enter a valid work email or 10-digit phone number";
            },
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
