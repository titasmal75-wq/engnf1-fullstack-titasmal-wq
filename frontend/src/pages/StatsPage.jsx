import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import "../styles/stats.css";

export default function StatsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await api.get("/stats");
                setStats(res.data);
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load stats");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const toMap = (arr) =>
        Object.fromEntries((arr || []).map((x) => [x._id ?? "Unknown", x.count]));

    return (
        <div className="stats-wrapper">
            <header className="dashboard-header">
                <div className="header-left">
                    <div className="brand-logo">⚡ TriageSync</div>
                    <span className="brand-subtitle">Model Agreement &amp; Stats</span>
                </div>
                <div className="header-right">
                    <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
                        ← Dashboard
                    </button>
                    <div className="user-mini-badge">
                        <span className="avatar-mini">{user?.name?.charAt(0).toUpperCase()}</span>
                        <div className="user-mini-text">
                            <span className="user-name">{user?.name}</span>
                            <span className="role-chip">{user?.role}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>Log out</button>
                </div>
            </header>

            <main className="stats-main">
                <h2>Ticket Statistics &amp; Model Accuracy</h2>
                <p className="overview-sub">
                    Aggregated counts by category, priority and status. Agreement rate measures
                    how often the AI classification matches the human-reviewed category.
                </p>

                {loading && (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <span>Loading stats...</span>
                    </div>
                )}

                {error && <div className="alert-banner error">{error}</div>}

                {stats && (
                    <>
                        {/* Top KPI row */}
                        <div className="kpi-row">
                            <div className="kpi-card">
                                <span className="kpi-label">Total Tickets</span>
                                <span className="kpi-value">{stats.totalTickets ?? 0}</span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label">Reviewed</span>
                                <span className="kpi-value reviewed">{stats.reviewedCount ?? 0}</span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label">Model Agreement Rate</span>
                                <span className="kpi-value agreement">{stats.modelAgreementRate ?? 0}%</span>
                            </div>
                        </div>

                        {/* Agreement bar */}
                        <div className="agreement-bar-wrap">
                            <div className="agreement-bar-label">
                                AI vs Human Agreement&nbsp;
                                <strong>{stats.modelAgreementRate}%</strong>
                                &nbsp;(out of {stats.reviewedCount} reviewed)
                            </div>
                            <div className="agreement-track">
                                <div
                                    className="agreement-fill"
                                    style={{ width: `${Math.min(100, stats.modelAgreementRate)}%` }}
                                />
                            </div>
                        </div>

                        <div className="stats-grid">
                            {/* By Category */}
                            <div className="stats-card">
                                <h4>By Category</h4>
                                <table className="stats-table">
                                    <thead>
                                        <tr><th>Category</th><th>Count</th></tr>
                                    </thead>
                                    <tbody>
                                        {(stats.byCategory || []).map((row) => (
                                            <tr key={row._id}>
                                                <td>
                                                    <span className={`badge-pill category-${(row._id ?? "").toLowerCase()}`}>
                                                        {row._id ?? "Unknown"}
                                                    </span>
                                                </td>
                                                <td>{row.count}</td>
                                            </tr>
                                        ))}
                                        {(stats.byCategory?.length ?? 0) === 0 && (
                                            <tr><td colSpan={2} className="empty-cell">No data</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* By Priority */}
                            <div className="stats-card">
                                <h4>By Priority</h4>
                                <table className="stats-table">
                                    <thead>
                                        <tr><th>Priority</th><th>Count</th></tr>
                                    </thead>
                                    <tbody>
                                        {(stats.byPriority || []).map((row) => (
                                            <tr key={row._id}>
                                                <td>
                                                    <span className={`badge-pill priority-${(row._id ?? "").toLowerCase()}`}>
                                                        {row._id ?? "Unknown"}
                                                    </span>
                                                </td>
                                                <td>{row.count}</td>
                                            </tr>
                                        ))}
                                        {(stats.byPriority?.length ?? 0) === 0 && (
                                            <tr><td colSpan={2} className="empty-cell">No data</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* By Status */}
                            <div className="stats-card">
                                <h4>By Status</h4>
                                <table className="stats-table">
                                    <thead>
                                        <tr><th>Status</th><th>Count</th></tr>
                                    </thead>
                                    <tbody>
                                        {(stats.byStatus || []).map((row) => (
                                            <tr key={row._id}>
                                                <td>
                                                    <span className={`badge-pill status-${(row._id ?? "").toLowerCase()}`}>
                                                        {row._id ?? "Unknown"}
                                                    </span>
                                                </td>
                                                <td>{row.count}</td>
                                            </tr>
                                        ))}
                                        {(stats.byStatus?.length ?? 0) === 0 && (
                                            <tr><td colSpan={2} className="empty-cell">No data</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
