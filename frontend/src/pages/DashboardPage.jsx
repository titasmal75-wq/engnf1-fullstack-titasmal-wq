import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ticketRestApi from "../restapi/ticketRestApi";
import "../styles/dashboard.css";

const CATEGORIES = ["BILLING", "LOGIN", "DELIVERY", "BUG", "FEATURE_REQUEST"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [tickets, setTickets] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");

    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [ticketDetail, setTicketDetail] = useState(null);
    const [events, setEvents] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [patchLoading, setPatchLoading] = useState(false);
    const [patchError, setPatchError] = useState("");
    const [patchSuccess, setPatchSuccess] = useState("");

    const [showImportModal, setShowImportModal] = useState(false);
    const [importJson, setImportJson] = useState(`[
  {
    "externalId": "EXT-101",
    "subject": "Unable to process payment for subscription",
    "body": "User reported that their credit card was billed but the invoice shows error."
  },
  {
    "externalId": "EXT-102",
    "subject": "Login page gives 500 error after password reset",
    "body": "Crash occurs when clicking login with the newly created password."
  }
]`);
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [importError, setImportError] = useState("");


    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = {
                page,
                limit: 10,
            };
            if (statusFilter) params.status = statusFilter;
            if (categoryFilter) params.category = categoryFilter;
            if (priorityFilter) params.priority = priorityFilter;
            if (debouncedSearch.trim()) params.q = debouncedSearch.trim();

            const data = await ticketRestApi.getTickets(params);
            setTickets(data.tickets || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error("Error fetching tickets:", err);
            setError(err.response?.data?.message || "Failed to load tickets");
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, categoryFilter, priorityFilter, debouncedSearch]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    // Fetch ticket detail
    const openTicketDetail = async (id) => {
        setSelectedTicketId(id);
        setLoadingDetail(true);
        setPatchError("");
        setPatchSuccess("");
        try {
            const data = await ticketRestApi.getTicketById(id);
            setTicketDetail(data.ticket);
            setEvents(data.events || []);
        } catch (err) {
            console.error("Error fetching ticket detail:", err);
            setPatchError(err.response?.data?.message || "Failed to load ticket details");
        } finally {
            setLoadingDetail(false);
        }
    };

    const closeTicketDetail = () => {
        setSelectedTicketId(null);
        setTicketDetail(null);
        setEvents([]);
        setPatchError("");
        setPatchSuccess("");
    };


    const handleUpdateField = async (field, value) => {
        if (!ticketDetail) return;
        setPatchLoading(true);
        setPatchError("");
        setPatchSuccess("");
        try {
            const updates = { [field]: value };
            const data = await ticketRestApi.updateTicket(
                ticketDetail._id,
                updates,
                user?.email || "Agent"
            );
            setTicketDetail(data.ticket);
            setEvents(data.events || []);
            setPatchSuccess(`Updated ${field} successfully`);

            setTickets((prev) =>
                prev.map((t) => (t._id === data.ticket._id ? data.ticket : t))
            );
        } catch (err) {
            console.error("Error updating ticket:", err);
            setPatchError(err.response?.data?.message || "Update failed");
        } finally {
            setPatchLoading(false);
        }
    };


    const handleImport = async () => {
        setImportLoading(true);
        setImportError("");
        setImportResult(null);
        try {
            let parsed;
            try {
                parsed = JSON.parse(importJson);
            } catch {
                throw new Error("Invalid JSON format. Please check the syntax.");
            }

            const ticketsArray = Array.isArray(parsed) ? parsed : parsed.tickets;
            if (!Array.isArray(ticketsArray) || ticketsArray.length === 0) {
                throw new Error("JSON must be a non-empty array or { tickets: [...] }");
            }

            const result = await ticketRestApi.importTickets(ticketsArray);
            setImportResult(result);
            fetchTickets();
        } catch (err) {
            console.error("Import error:", err);
            setImportError(err.response?.data?.message || err.message || "Failed to import");
        } finally {
            setImportLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="dashboard-wrapper">

            <header className="dashboard-header">
                <div className="header-left">
                    <div className="brand-logo">⚡ TriageSync</div>
                    <span className="brand-subtitle">AI-Assisted Ticket Classifier & Review</span>
                </div>
                <div className="header-right">
                    <div className="user-mini-badge">
                        <span className="avatar-mini">{user?.name?.charAt(0).toUpperCase()}</span>
                        <div className="user-mini-text">
                            <span className="user-name">{user?.name}</span>
                            <span className="role-chip">{user?.role}</span>
                        </div>
                    </div>
                    <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                        📥 Import Tickets
                    </button>
                    <button className="btn-secondary" onClick={() => navigate("/stats")}>
                        📊 Stats
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        Log out
                    </button>
                </div>
            </header>

            <main className="dashboard-container">

                <div className="overview-bar">
                    <div>
                        <h2>Ticket Triage Inbox</h2>
                        <p className="overview-sub">
                            Manage AI-classified tickets, review categories, and maintain human override logs.
                        </p>
                    </div>
                    <div className="stats-badges">
                        <div className="stat-card">
                            <span className="stat-label">Total Tickets</span>
                            <span className="stat-num">{total}</span>
                        </div>
                    </div>
                </div>

                <div className="filters-card">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by subject or description (injection-safe)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clear-btn" onClick={() => setSearchQuery("")}>
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="filter-dropdowns">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Statuses</option>
                            {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>

                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Categories</option>
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>

                        <select
                            value={priorityFilter}
                            onChange={(e) => {
                                setPriorityFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Priorities</option>
                            {PRIORITIES.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>

                        {(statusFilter || categoryFilter || priorityFilter || searchQuery) && (
                            <button
                                className="reset-filters-btn"
                                onClick={() => {
                                    setStatusFilter("");
                                    setCategoryFilter("");
                                    setPriorityFilter("");
                                    setSearchQuery("");
                                    setPage(1);
                                }}
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                </div>

                {error && <div className="alert-banner error">{error}</div>}


                <div className="table-card">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <span>Loading tickets...</span>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">📭</span>
                            <h3>No tickets found</h3>
                            <p>No tickets matched your filter criteria, or none have been imported yet.</p>
                            <button className="btn-primary" onClick={() => setShowImportModal(true)}>
                                Import Sample Tickets
                            </button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="tickets-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Subject & Details</th>
                                        <th>Category</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Review State</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((t) => (
                                        <tr
                                            key={t._id}
                                            onClick={() => openTicketDetail(t._id)}
                                            className={selectedTicketId === t._id ? "selected-row" : ""}
                                        >
                                            <td className="cell-id">
                                                <span className="ext-badge">{t.externalId}</span>
                                            </td>
                                            <td className="cell-subject">
                                                <div className="subject-title">{t.subject}</div>
                                                <div className="body-preview">{t.body}</div>
                                            </td>
                                            <td>
                                                <span className={`badge-pill category-${t.category.toLowerCase()}`}>
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge-pill priority-${t.priority.toLowerCase()}`}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge-pill status-${t.status.toLowerCase()}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td>
                                                {t.isHumanOverride ? (
                                                    <span className="override-indicator human" title="Manual human edit made">
                                                        👤 Override
                                                    </span>
                                                ) : (
                                                    <span className="override-indicator auto" title="Classified by AI rule service">
                                                        🤖 AI Auto
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-inspect"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openTicketDetail(t._id);
                                                    }}
                                                >
                                                    Triage →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="pagination-bar">
                            <span className="pagination-info">
                                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total)
                            </span>
                            <div className="pagination-controls">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    ‹ Prev
                                </button>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    Next ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {selectedTicketId && (
                <div className="drawer-overlay" onClick={closeTicketDetail}>
                    <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-header">
                            <div>
                                <span className="drawer-ext-id">
                                    {ticketDetail ? ticketDetail.externalId : "Loading..."}
                                </span>
                                <h3>Ticket Review & Event Audit</h3>
                            </div>
                            <button className="drawer-close" onClick={closeTicketDetail}>
                                ✕
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <span>Loading details & events...</span>
                            </div>
                        ) : ticketDetail ? (
                            <div className="drawer-content">
                                {patchError && <div className="alert-banner error">{patchError}</div>}
                                {patchSuccess && <div className="alert-banner success">{patchSuccess}</div>}

                                <div className="detail-section">
                                    <h4 className="section-title">Subject & Description</h4>
                                    <h3 className="detail-subject">{ticketDetail.subject}</h3>
                                    <div className="detail-body-box">{ticketDetail.body}</div>
                                </div>

                                <div className="detail-section">
                                    <h4 className="section-title">Classification & Controls (PATCH)</h4>
                                    <div className="control-grid">
                                        <div className="control-group">
                                            <label>Status</label>
                                            <select
                                                value={ticketDetail.status}
                                                disabled={patchLoading}
                                                onChange={(e) => handleUpdateField("status", e.target.value)}
                                            >
                                                {STATUSES.map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="control-group">
                                            <label>Category</label>
                                            <select
                                                value={ticketDetail.category}
                                                disabled={patchLoading}
                                                onChange={(e) => handleUpdateField("category", e.target.value)}
                                            >
                                                {CATEGORIES.map((c) => (
                                                    <option key={c} value={c}>
                                                        {c}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="control-group">
                                            <label>Priority</label>
                                            <select
                                                value={ticketDetail.priority}
                                                disabled={patchLoading}
                                                onChange={(e) => handleUpdateField("priority", e.target.value)}
                                            >
                                                {PRIORITIES.map((p) => (
                                                    <option key={p} value={p}>
                                                        {p}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="meta-info-grid">
                                        <div className="meta-item">
                                            <span className="meta-key">AI Auto Category:</span>
                                            <span className="meta-val">{ticketDetail.autoCategory}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-key">Human Override:</span>
                                            <span className="meta-val">
                                                {ticketDetail.isHumanOverride ? "✅ Yes (Preserved)" : "No"}
                                            </span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-key">Created:</span>
                                            <span className="meta-val">
                                                {new Date(ticketDetail.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Event Audit Timeline */}
                                <div className="detail-section">
                                    <h4 className="section-title">Audit Log / Ticket Events</h4>
                                    {events.length === 0 ? (
                                        <p className="no-events-text">No events recorded for this ticket yet.</p>
                                    ) : (
                                        <div className="timeline-container">
                                            {events.map((ev, idx) => (
                                                <div key={ev._id || idx} className="timeline-item">
                                                    <div className="timeline-marker"></div>
                                                    <div className="timeline-body">
                                                        <div className="timeline-header">
                                                            <span className="event-field-badge">{ev.field}</span>
                                                            <span className="event-actor">by {ev.actor}</span>
                                                            <span className="event-time">
                                                                {new Date(ev.createdAt).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        <div className="event-change">
                                                            <span className="old-val">{String(ev.oldValue ?? "None")}</span>
                                                            <span className="arrow-sep">→</span>
                                                            <span className="new-val">{String(ev.newValue)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Import Tickets Modal (POST /api/tickets/import) */}
            {showImportModal && (
                <div className="drawer-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Batch Import Tickets (POST /api/tickets/import)</h3>
                                <p>Provide JSON with tickets to be classified and upserted.</p>
                            </div>
                            <button className="drawer-close" onClick={() => setShowImportModal(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            {importError && <div className="alert-banner error">{importError}</div>}
                            {importResult && (
                                <div className="alert-banner success">
                                    <strong>Import Complete:</strong>
                                    <ul>
                                        <li>Total processed: {importResult.total}</li>
                                        <li>Imported: {importResult.importedCount}</li>
                                        <li>Updated: {importResult.updatedCount}</li>
                                        <li>Skipped Override (Preserved): {importResult.skippedOverrideCount}</li>
                                    </ul>
                                </div>
                            )}

                            <label className="input-label">Payload JSON (array of {`{ externalId, subject, body }`}):</label>
                            <textarea
                                className="import-textarea"
                                rows={10}
                                value={importJson}
                                onChange={(e) => setImportJson(e.target.value)}
                            />
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowImportModal(false)}>
                                Close
                            </button>
                            <button
                                className="btn-primary"
                                disabled={importLoading}
                                onClick={handleImport}
                            >
                                {importLoading ? "Importing..." : "Execute Import"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
