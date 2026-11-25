import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../routes/routePaths";

export default function Navbar({ subtitle, extraAction }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate(ROUTES.LOGIN);
    };

    const navLinks = [
        { label: "🎫 Tickets", path: ROUTES.DASHBOARD },
        { label: "📊 Stats", path: ROUTES.STATS },
        { label: "🏢 Resources", path: ROUTES.RESOURCES },
        { label: "📅 Bookings", path: ROUTES.BOOKINGS },
    ];

    const isActive = (path) => {
        if (path === ROUTES.STATS && location.pathname.startsWith("/admin/stats")) return true;
        return location.pathname === path;
    };

    return (
        <header className="dashboard-header">
            <div className="header-left">
                <div className="brand-logo" onClick={() => navigate(ROUTES.DASHBOARD)}>
                    <span className="brand-icon">⚡</span>
                    <span>TriageSync</span>
                </div>
                {subtitle && <span className="brand-subtitle">{subtitle}</span>}
                <span className="sync-pulse-badge" title="Live System Active">
                    <span className="pulse-dot"></span>
                    <span className="pulse-text">Live Sync</span>
                </span>
            </div>

            <button
                className="mobile-menu-toggle"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label="Toggle Navigation Menu"
            >
                {mobileOpen ? "✕" : "☰"}
            </button>

            <div className={`header-right ${mobileOpen ? "mobile-open" : ""}`}>
                <nav className="nav-links-list">
                    {navLinks.map((link) => (
                        <button
                            key={link.path}
                            className={`nav-link-btn ${isActive(link.path) ? "active" : ""}`}
                            onClick={() => {
                                navigate(link.path);
                                setMobileOpen(false);
                            }}
                        >
                            {link.label}
                        </button>
                    ))}
                </nav>

                {extraAction && (
                    <div
                        className="header-extra-action"
                        onClick={() => setMobileOpen(false)}
                    >
                        {extraAction}
                    </div>
                )}

                <div className="user-mini-badge">
                    <span className="avatar-mini">{user?.name?.charAt(0).toUpperCase() || "U"}</span>
                    <div className="user-mini-text">
                        <span className="user-name">{user?.name || "User"}</span>
                        <span className="role-chip">{user?.role || "USER"}</span>
                    </div>
                </div>

                <button className="logout-btn" onClick={handleLogout}>
                    Log out
                </button>
            </div>
        </header>
    );
}
