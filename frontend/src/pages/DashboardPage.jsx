import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ticketRestApi from "../restapi/ticketRestApi";
import { ROUTES } from "../routes/routePaths";
import Navbar from "../components/Navbar";
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
    const [ticketStats, setTicketStats] = useState(null);


    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");


    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [ticketDetail, setTicketDetail] = useState(null);
    const [events, setEvents] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);


    const [savingField, setSavingField] = useState(null);
    const [patchError, setPatchError] = useState("");
    const [patchSuccess, setPatchSuccess] = useState("");
    const successTimerRef = useRef(null);


    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


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
    const [jsonValidationNotice, setJsonValidationNotice] = useState("");


    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);


    useEffect(() => {
        return () => {
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
        };
    }, []);

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
            setTickets(data.data || data.tickets || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error("Error fetching tickets:", err);
            setError(err.response?.data?.error?.message || err.response?.data?.message || "Failed to load tickets");
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, categoryFilter, priorityFilter, debouncedSearch]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        ticketRestApi.getStats()
            .then(setTicketStats)
            .catch((err) => {
                console.error("Error fetching ticket stats:", err);
            });
    }, []);


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
            setPatchError(err.response?.data?.error?.message || err.response?.data?.message || "Failed to load ticket details");
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
        setSavingField(null);
    };


    const handleUpdateField = async (field, value) => {
        if (!ticketDetail) return;

        if (field === "status" && !STATUSES.includes(value)) {
            setPatchError(`Validation Error: "${value}" is not a valid status.`);
            return;
        }
        if (field === "category" && !CATEGORIES.includes(value)) {
            setPatchError(`Validation Error: "${value}" is not a valid category.`);
            return;
        }
        if (field === "priority" && !PRIORITIES.includes(value)) {
            setPatchError(`Validation Error: "${value}" is not a valid priority.`);
            return;
        }

        if (ticketDetail[field] === value) return;

        const prevTicket = { ...ticketDetail };
        const prevTicketsList = [...tickets];
        const prevEvents = [...events];

        const optimisticTicket = {
            ...ticketDetail,
            [field]: value,
            isHumanOverride: true,
        };
        setTicketDetail(optimisticTicket);


        setTickets((prev) =>
            prev.map((t) => (t._id === ticketDetail._id ? { ...t, [field]: value, isHumanOverride: true } : t))
        );


        const optimisticEvent = {
            _id: `temp-${Date.now()}`,
            ticketId: ticketDetail._id,
            field,
            oldValue: ticketDetail[field],
            newValue: value,
            actor: user?.email ? `${user.email} (You)` : "Agent (You)",
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };
        setEvents((prev) => [optimisticEvent, ...prev]);


        setSavingField(field);
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
            setTickets((prev) =>
                prev.map((t) => (t._id === data.ticket._id ? data.ticket : t))
            );

            setPatchSuccess(`⚡ Instant Sync: Updated ${field} → "${value}"`);

            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            successTimerRef.current = setTimeout(() => {
                setPatchSuccess("");
            }, 3500);
        } catch (err) {
            console.error("Optimistic update failed:", err);

            setTicketDetail(prevTicket);
            setTickets(prevTicketsList);
            setEvents(prevEvents);

            const serverMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || "Network error";
            setPatchError(`⚠️ Update failed: ${serverMsg}. Reverted ${field} back to "${prevTicket[field]}".`);
        } finally {
            setSavingField(null);
        }
    };


    const handleImport = async () => {
        setImportLoading(true);
        setImportError("");
        setImportResult(null);
        setJsonValidationNotice("");

        try {
            if (!importJson || !importJson.trim()) {
                throw new Error("Validation Error: JSON payload cannot be empty.");
            }

            let parsed;
            try {
                parsed = JSON.parse(importJson);
            } catch (jsonErr) {
                throw new Error(`JSON Syntax Error: ${jsonErr.message}. Please check brackets and quotes.`);
            }

            const ticketsArray = Array.isArray(parsed) ? parsed : parsed.tickets;
            if (!Array.isArray(ticketsArray) || ticketsArray.length === 0) {
                throw new Error("Validation Error: JSON must be an array of tickets or an object with { tickets: [...] }.");
            }


            for (let i = 0; i < ticketsArray.length; i++) {
                const item = ticketsArray[i];
                const indexLabel = `Ticket #${i + 1}`;

                if (!item || typeof item !== "object") {
                    throw new Error(`Validation Error on ${indexLabel}: Item must be a valid JSON object.`);
                }
                if (!item.externalId || typeof item.externalId !== "string" || !item.externalId.trim()) {
                    throw new Error(`Validation Error on ${indexLabel}: "externalId" is required.`);
                }
                if (!item.subject || typeof item.subject !== "string" || item.subject.trim().length < 3) {
                    throw new Error(`Validation Error on ${indexLabel}: "subject" is required and must be at least 3 characters.`);
                }
                if (item.subject.trim().length > 150) {
                    throw new Error(`Validation Error on ${indexLabel}: "subject" exceeds maximum allowed length (150 characters).`);
                }
                if (!item.body || typeof item.body !== "string" || item.body.trim().length < 5 || item.body.trim().length > 2000) {
                    throw new Error(`Validation Error on ${indexLabel}: "body" must be 5 to 2000 characters.`);
                }
            }

            const result = await ticketRestApi.importTickets(ticketsArray);
            setImportResult(result);
            fetchTickets();
        } catch (err) {
            console.error("Import error:", err);
            setImportError(err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to import tickets");
        } finally {
            setImportLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate(ROUTES.LOGIN);
    };

    return (
        <div className="dashboard-wrapper">
            <Navbar
                subtitle="Smart AI Ticket Classification & Human Review"
                extraAction={
                    <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                        📥 Import
                    </button>
                }
            />

            <main className="dashboard-container">

                <div className="overview-bar">
                    <div className="overview-title-group">
                        <div className="overview-heading-row">
                            <h2>Ticket Triage Inbox</h2>
                            <span className="badge-optimistic-tag">⚡ Optimistic Real-Time UI</span>
                        </div>
                        <p className="overview-sub">
                            AI-classified queue with instant optimistic triage, automatic rollback, and full audit logs.
                        </p>
                    </div>
                    <div className="stats-badges">
                        <div className="stat-card">
                            <span className="stat-label">Total Tickets</span>
                            <span className="stat-num">{total}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Reviewed</span>
                            <span className="stat-num">{ticketStats?.reviewedCount ?? 0}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Model Agreement</span>
                            <span className="stat-num">{ticketStats?.modelAgreementRate ?? 0}%</span>
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
                            <button className="clear-btn" onClick={() => setSearchQuery("")} title="Clear search">
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
                            className="filter-select"
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
                            className="filter-select"
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
                            className="filter-select"
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
                                            className={`ticket-table-row ${selectedTicketId === t._id ? "selected-row" : ""}`}
                                        >
                                            <td className="cell-id">
                                                <span className="ext-badge">{t.externalId}</span>
                                            </td>
                                            <td className="cell-subject">
                                                <div className="subject-title">{t.subject}</div>
                                                <div className="body-preview">{t.body}</div>
                                            </td>
                                            <td>
                                                <span className={`badge-pill category-${t.category?.toLowerCase()}`}>
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge-pill priority-${t.priority?.toLowerCase()}`}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge-pill status-${t.status?.toLowerCase()}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td>
                                                {t.isHumanOverride ? (
                                                    <span className="override-indicator human" title="Manual human edit made">
                                                        👤 Human
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
                                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total tickets)
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
                            <button className="drawer-close" onClick={closeTicketDetail} title="Close drawer">
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

                                <div className={`optimistic-status-bar ${savingField ? "syncing" : "synced"}`}>
                                    <div className="sync-status-indicator">
                                        <span className={`sync-dot ${savingField ? "pulsing" : "ready"}`}></span>
                                        <span className="sync-status-title">
                                            {savingField
                                                ? `Optimistically saving ${savingField}...`
                                                : "Instant Optimistic Sync Ready"}
                                        </span>
                                    </div>
                                    <span className="sync-mode-tag">Zero-Latency UI</span>
                                </div>

                                {patchError && <div className="alert-banner error">{patchError}</div>}
                                {patchSuccess && <div className="alert-banner success">{patchSuccess}</div>}

                                <div className="detail-section">
                                    <h4 className="section-title">Subject & Description</h4>
                                    <h3 className="detail-subject">{ticketDetail.subject}</h3>
                                    <div className="detail-body-box">{ticketDetail.body}</div>
                                </div>

                                <div className="detail-section">
                                    <div className="section-title-row">
                                        <h4 className="section-title">Classification & Controls (PATCH)</h4>
                                        <span className="live-feedback-text">
                                            {savingField ? `Saving ${savingField}...` : "Changes save instantly"}
                                        </span>
                                    </div>

                                    <div className="control-grid">
                                        <div className={`control-group ${savingField === "status" ? "field-saving" : ""}`}>
                                            <div className="control-label-row">
                                                <label>Status</label>
                                                {savingField === "status" && (
                                                    <span className="mini-saving-tag">Saving...</span>
                                                )}
                                            </div>
                                            <select
                                                value={ticketDetail.status}
                                                disabled={savingField === "status"}
                                                onChange={(e) => handleUpdateField("status", e.target.value)}
                                                className="control-select"
                                            >
                                                {STATUSES.map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className={`control-group ${savingField === "category" ? "field-saving" : ""}`}>
                                            <div className="control-label-row">
                                                <label>Category</label>
                                                {savingField === "category" && (
                                                    <span className="mini-saving-tag">Saving...</span>
                                                )}
                                            </div>
                                            <select
                                                value={ticketDetail.category}
                                                disabled={savingField === "category"}
                                                onChange={(e) => handleUpdateField("category", e.target.value)}
                                                className="control-select"
                                            >
                                                {CATEGORIES.map((c) => (
                                                    <option key={c} value={c}>
                                                        {c}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className={`control-group ${savingField === "priority" ? "field-saving" : ""}`}>
                                            <div className="control-label-row">
                                                <label>Priority</label>
                                                {savingField === "priority" && (
                                                    <span className="mini-saving-tag">Saving...</span>
                                                )}
                                            </div>
                                            <select
                                                value={ticketDetail.priority}
                                                disabled={savingField === "priority"}
                                                onChange={(e) => handleUpdateField("priority", e.target.value)}
                                                className="control-select"
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
                                            <span className="meta-val">{ticketDetail.autoCategory || "None"}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-key">Human Override:</span>
                                            <span className="meta-val">
                                                {ticketDetail.isHumanOverride ? "✅ Yes (Preserved)" : "No (AI untouched)"}
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


                                <div className="detail-section">
                                    <div className="section-title-row">
                                        <h4 className="section-title">Audit Log / Ticket Events</h4>
                                        <span className="timeline-count-badge">{events.length} records</span>
                                    </div>

                                    {events.length === 0 ? (
                                        <p className="no-events-text">No events recorded for this ticket yet.</p>
                                    ) : (
                                        <div className="timeline-container">
                                            {events.map((ev, idx) => (
                                                <div
                                                    key={ev._id || idx}
                                                    className={`timeline-item ${ev.isOptimistic ? "optimistic-item" : ""}`}
                                                >
                                                    <div className={`timeline-marker ${ev.isOptimistic ? "pulse-marker" : ""}`}></div>
                                                    <div className="timeline-body">
                                                        <div className="timeline-header">
                                                            <span className="event-field-badge">{ev.field}</span>
                                                            <span className="event-actor">by {ev.actor}</span>
                                                            {ev.isOptimistic ? (
                                                                <span className="optimistic-chip">Syncing...</span>
                                                            ) : (
                                                                <span className="event-time">
                                                                    {new Date(ev.createdAt).toLocaleTimeString()}
                                                                </span>
                                                            )}
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

            {showImportModal && (
                <div className="drawer-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Batch Import Tickets</h3>
                                <p>Provide JSON array with tickets. Includes schema validation before submission.</p>
                            </div>
                            <button className="drawer-close" onClick={() => setShowImportModal(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            {importError && <div className="alert-banner error">{importError}</div>}
                            {jsonValidationNotice && (
                                <div className="alert-banner warning">{jsonValidationNotice}</div>
                            )}
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

                            <label className="input-label">
                                Payload JSON (array of {`{ externalId, subject, body }`}):
                            </label>
                            <textarea
                                className="import-textarea"
                                rows={9}
                                value={importJson}
                                onChange={(e) => {
                                    setImportJson(e.target.value);
                                    setImportError("");
                                }}
                                placeholder="[ { 'externalId': 'EXT-1', 'subject': '...', 'body': '...' } ]"
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
                                {importLoading ? "Validating & Importing..." : "Validate & Execute Import"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
