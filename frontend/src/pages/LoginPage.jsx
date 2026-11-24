import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const successMessage = location.state?.message;

    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.email || !form.password) {
            setError("Email and password are required");
            return;
        }

        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate("/dashboard");
        } catch (err) {
            const message =
                err.response?.data?.message ||
                (err.request
                    ? "Unable to reach server. Please ensure the backend is running."
                    : err.message || "Login failed. Check your credentials.");
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                <h1 className="auth-title">Sign in</h1>
                <p className="auth-sub">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" className="auth-link">
                        Register
                    </Link>
                </p>

                {successMessage && (
                    <p className="auth-success">{successMessage}</p>
                )}
                {error && <p className="auth-error">{error}</p>}

                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="jane@example.com"
                    />

                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Your password"
                    />

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </form>
            </div>
        </div>
    );
}
