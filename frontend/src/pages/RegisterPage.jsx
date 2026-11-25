import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.name || !form.email || !form.password) {
            setError("All fields are required");
            return;
        }

        if (form.password.length < 8) {
            setError("Password must contain at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            await register(form.name, form.email, form.password);
            navigate("/login", {
                state: { message: "Account created successfully! Please sign in." },
            });
        } catch (err) {
            const message =
                err.response?.data?.error?.message ||
                err.response?.data?.message ||
                (err.request
                    ? "Unable to reach server. Please ensure the backend is running."
                    : err.message || "Registration failed. Try again.");
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                <h1 className="auth-title">Create account</h1>
                <p className="auth-sub">
                    Already have an account?{" "}
                    <Link to="/login" className="auth-link">
                        Sign in
                    </Link>
                </p>

                {error && <p className="auth-error">{error}</p>}

                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    <label htmlFor="name">Full name</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Jane Doe"
                    />

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
                        autoComplete="new-password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Min. 8 characters"
                    />

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Creating account…" : "Create account"}
                    </button>
                </form>
            </div>
        </div>
    );
}
