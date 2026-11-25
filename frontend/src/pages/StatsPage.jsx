import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ticketRestApi from "../restapi/ticketRestApi";
import Navbar from "../components/Navbar";
import "../styles/stats.css";

export default function StatsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === "ADMIN";

    const [activeTab, setActiveTab] = useState(isAdmin ? "admin" : "ticket");
    const [ticketStats, setTicketStats] = useState(null);
    const [adminStats, setAdminStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchAllStats = async () => {
            setLoading(true);
            setError("");
            try {
                // Fetch basic ticket stats
                const tData = await ticketRestApi.getStats();
                setTicketStats(tData);

                // If admin, also fetch comprehensive admin stats
                if (isAdmin) {
                    try {
                        const aData = await ticketRestApi.getAdminStats();
                        setAdminStats(aData.data || aData);
                    } catch (adminErr) {
                        console.warn("Could not load admin stats:", adminErr);
                    }
                }
            } catch (err) {
                console.error("Error loading stats:", err);
                setError(err.response?.data?.error?.message || err.response?.data?.message || "Failed to load statistics");
            } finally {
                setLoading(false);
            }
        };

        fetchAllStats();
    }, [isAdmin]);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    // Calculate total bookings from status breakdown
    const totalBookingsCount = adminStats?.bookingsByStatus
        ? Object.values(adminStats.bookingsByStatus).reduce((a, b) => a + b, 0)
        : 0;

    const maxLeaderboardCount = adminStats?.topResources?.length > 0
        ? Math.max(...adminStats.topResources.map((r) => r.bookingCount || 1))
        : 1;

    return (
        <div className="stats-wrapper">
            <Navbar
                subtitle={
                    isAdmin
                        ? "Admin Executive & Operational Statistics"
                        : "Model Agreement & Ticket Stats"
                }
            />

            <main className="stats-main">
                <div className="overview-bar">
                    <div>
                        <h2>{isAdmin ? "Operational & AI System Analytics" : "Ticket Statistics & Model Accuracy"}</h2>
                        <p className="overview-sub">
                            {isAdmin
                                ? "System-wide telemetry covering facility bookings, active resources, and triage accuracy."
                                : "Aggregated classification metrics and agreement rates between auto-triage and human review."}
                        </p>
                    </div>
                </div>

                {isAdmin && (
                    <div className="stats-tab-bar">
                        <button
                            className={`stats-tab-btn ${activeTab === "admin" ? "active" : ""}`}
                            onClick={() => setActiveTab("admin")}
                        >
                            🛡️ Executive Admin Overview
                        </button>
                        <button
                            className={`stats-tab-btn ${activeTab === "ticket" ? "active" : ""}`}
                            onClick={() => setActiveTab("ticket")}
                        >
                            🤖 Ticket & AI Classifier Health
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <span>Loading platform telemetry...</span>
                    </div>
                )}

                {error && <div className="alert-banner error">{error}</div>}

                {/* ADMIN OVERVIEW TAB */}
                {isAdmin && activeTab === "admin" && adminStats && (
                    <>
                        {/* High level executive KPI row */}
                        <div className="kpi-row">
                            <div className="kpi-card">
                                <span className="kpi-label">Active Resources</span>
                                <span className="kpi-value resources">{adminStats.activeResources ?? 0}</span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label">Total Reservations</span>
                                <span className="kpi-value bookings">{totalBookingsCount}</span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label">Total Tickets</span>
                                <span className="kpi-value">
                                    {adminStats.ticketStats?.totalTickets ?? ticketStats?.totalTickets ?? 0}
                                </span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label">AI Agreement Rate</span>
                                <span className="kpi-value agreement">
                                    {adminStats.ticketStats?.modelAgreementRate ?? ticketStats?.modelAgreementRate ?? 0}%
                                </span>
                            </div>
                        </div>

                        {/* Booking Status Breakdown */}
                        <div className="section-subheading">
                            <span>📅 Booking Pipeline by Status</span>
                        </div>
                        <div className="status-kpi-grid">
                            <div className="status-mini-card pending">
                                <span className="status-mini-title">Pending Approval</span>
                                <span className="status-mini-val">{adminStats.bookingsByStatus?.PENDING ?? 0}</span>
                            </div>
                            <div className="status-mini-card approved">
                                <span className="status-mini-title">Approved</span>
                                <span className="status-mini-val">{adminStats.bookingsByStatus?.APPROVED ?? 0}</span>
                            </div>
                            <div className="status-mini-card rejected">
                                <span className="status-mini-title">Rejected</span>
                                <span className="status-mini-val">{adminStats.bookingsByStatus?.REJECTED ?? 0}</span>
                            </div>
                            <div className="status-mini-card cancelled">
                                <span className="status-mini-title">Cancelled</span>
                                <span className="status-mini-val">{adminStats.bookingsByStatus?.CANCELLED ?? 0}</span>
                            </div>
                        </div>

                        {/* Top 3 Most Booked Facilities */}
                        <div className="section-subheading">
                            <span>🏆 Top 3 Most Booked Facilities</span>
                        </div>
                        <div className="leaderboard-card">
                            {!adminStats.topResources || adminStats.topResources.length === 0 ? (
                                <p style={{ color: "#64748b", fontStyle: "italic" }}>No facility bookings recorded yet.</p>
                            ) : (
                                adminStats.topResources.map((item, idx) => (
                                    <div key={item.resourceId || idx} className="leaderboard-item">
                                        <div className={`rank-badge rank-${idx + 1}`}>
                                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                                        </div>
                                        <div className="leaderboard-info">
                                            <div className="leaderboard-name">{item.name || "Facility"}</div>
                                            <div className="leaderboard-bar-track">
                                                <div
                                                    className="leaderboard-bar-fill"
                                                    style={{
                                                        width: `${Math.max(10, ((item.bookingCount || 0) / maxLeaderboardCount) * 100)}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="leaderboard-count">
                                            {item.bookingCount} {item.bookingCount === 1 ? "booking" : "bookings"}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* TICKET STATS & ACCURACY */}
                {(!isAdmin || activeTab === "ticket" || (isAdmin && activeTab === "admin")) && (
                    <>
                        <div className="section-subheading">
                            <span>🤖 AI Classifier Agreement & Breakdown</span>
                        </div>

                        {/* Agreement rate progress bar */}
                        {ticketStats && (
                            <div className="agreement-bar-wrap">
                                <div className="agreement-bar-label">
                                    AI vs Human Agreement Rate:&nbsp;
                                    <strong>{ticketStats.modelAgreementRate}%</strong>
                                    &nbsp;({ticketStats.reviewedCount} human-reviewed tickets)
                                </div>
                                <div className="agreement-track">
                                    <div
                                        className="agreement-fill"
                                        style={{ width: `${Math.min(100, ticketStats.modelAgreementRate)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {ticketStats && (
                            <div className="stats-grid">
                                {/* By Category */}
                                <div className="stats-card">
                                    <h4>By Category</h4>
                                    <table className="stats-table">
                                        <thead>
                                            <tr><th>Category</th><th>Count</th></tr>
                                        </thead>
                                        <tbody>
                                            {(ticketStats.byCategory || []).map((row) => (
                                                <tr key={row._id}>
                                                    <td>
                                                        <span className={`badge-pill category-${(row._id ?? "").toLowerCase()}`}>
                                                            {row._id ?? "Unknown"}
                                                        </span>
                                                    </td>
                                                    <td>{row.count}</td>
                                                </tr>
                                            ))}
                                            {(ticketStats.byCategory?.length ?? 0) === 0 && (
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
                                            {(ticketStats.byPriority || []).map((row) => (
                                                <tr key={row._id}>
                                                    <td>
                                                        <span className={`badge-pill priority-${(row._id ?? "").toLowerCase()}`}>
                                                            {row._id ?? "Unknown"}
                                                        </span>
                                                    </td>
                                                    <td>{row.count}</td>
                                                </tr>
                                            ))}
                                            {(ticketStats.byPriority?.length ?? 0) === 0 && (
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
                                            {(ticketStats.byStatus || []).map((row) => (
                                                <tr key={row._id}>
                                                    <td>
                                                        <span className={`badge-pill status-${(row._id ?? "").toLowerCase()}`}>
                                                            {row._id ?? "Unknown"}
                                                        </span>
                                                    </td>
                                                    <td>{row.count}</td>
                                                </tr>
                                            ))}
                                            {(ticketStats.byStatus?.length ?? 0) === 0 && (
                                                <tr><td colSpan={2} className="empty-cell">No data</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
