import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import bookingRestApi from "../restapi/bookingRestApi";
import resourceRestApi from "../restapi/resourceRestApi";
import "../styles/dashboard.css";
import "../styles/resources.css";
import "../styles/bookings.css";

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];

// Generate 30-minute intervals for UTC time selection
const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, "0");
    TIME_OPTIONS.push(`${hh}:00`);
    TIME_OPTIONS.push(`${hh}:30`);
}

const DURATION_OPTIONS = [
    { label: "30 minutes", minutes: 30 },
    { label: "60 minutes (1 hr)", minutes: 60 },
    { label: "90 minutes (1.5 hrs)", minutes: 90 },
    { label: "120 minutes (2 hrs)", minutes: 120 },
    { label: "150 minutes (2.5 hrs)", minutes: 150 },
    { label: "180 minutes (3 hrs max)", minutes: 180 },
];

export default function BookingsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === "ADMIN";


    const [activeTab, setActiveTab] = useState("my");

    const [bookings, setBookings] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [error, setError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    const [availableResources, setAvailableResources] = useState([]);
    e
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        resourceId: "",
        date: new Date().toISOString().slice(0, 10),
        startTime: "10:00",
        durationMinutes: 60,
        purpose: "",
        ticketId: "",
    });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState("");

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState(null);
    const [rejectionNote, setRejectionNote] = useState("");
    const [rejectLoading, setRejectLoading] = useState(false);
    const [rejectError, setRejectError] = useState("");
    const [actionLoadingId, setActionLoadingId] = useState(null);

    useEffect(() => {
        resourceRestApi.getResources({ page: 1 })
            .then((res) => {
                const list = res.resources || res.data || [];
                setAvailableResources(list.filter((r) => r.isActive));
                if (list.length > 0 && !createForm.resourceId) {
                    setCreateForm((prev) => ({ ...prev, resourceId: list[0]._id }));
                }
            })
            .catch(() => { });
    }, []);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = { page };
            if (statusFilter !== "ALL") params.status = statusFilter;

            let data;
            if (activeTab === "all" && isAdmin) {
                data = await bookingRestApi.getAllBookings(params);
                const list = data.bookings || data.data || [];
                setBookings(list);
                setTotal(list.length);
                setTotalPages(1);
            } else {
                data = await bookingRestApi.getMyBookings(params);
                const list = data.bookings || data.data || [];
                setBookings(list);
                setTotal(data.pagination?.totalBookings ?? list.length);
                setTotalPages(data.pagination?.totalPages ?? 1);
            }
        } catch (err) {
            console.error("Error loading bookings:", err);
            setError(err.response?.data?.message || "Failed to load bookings");
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, activeTab, isAdmin]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setCreateError("");

        const trimmedPurpose = createForm.purpose.trim();
        if (trimmedPurpose.length < 5 || trimmedPurpose.length > 200) {
            setCreateError("Purpose must be between 5 and 200 characters");
            return;
        }

        if (!createForm.resourceId) {
            setCreateError("Please select a resource");
            return;
        }
        const startIso = `${createForm.date}T${createForm.startTime}:00.000Z`;
        const startDate = new Date(startIso);
        const endDate = new Date(startDate.getTime() + Number(createForm.durationMinutes) * 60 * 1000);
        const endIso = endDate.toISOString();

        setCreateLoading(true);
        try {
            const payload = {
                resourceId: createForm.resourceId,
                startTime: startIso,
                endTime: endIso,
                purpose: trimmedPurpose,
            };
            if (createForm.ticketId?.trim()) {
                payload.ticketId = createForm.ticketId.trim();
            }

            await bookingRestApi.createBooking(payload);
            setShowCreateModal(false);
            setActionSuccess("Booking created successfully!");
            setCreateForm((prev) => ({ ...prev, purpose: "", ticketId: "" }));
            fetchBookings();
            setTimeout(() => setActionSuccess(""), 4000);
        } catch (err) {
            setCreateError(
                err.response?.data?.message ||
                "Failed to create booking. Please check for scheduling conflicts."
            );
        } finally {
            setCreateLoading(false);
        }
    };

    const handleCancel = async (booking) => {
        if (!window.confirm("Are you sure you want to cancel this booking?")) return;

        setActionLoadingId(booking._id);
        setError("");
        setActionSuccess("");
        try {
            await bookingRestApi.cancelBooking(booking._id);
            setActionSuccess("Booking cancelled successfully");
            fetchBookings();
            setTimeout(() => setActionSuccess(""), 4000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to cancel booking");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleApprove = async (id) => {
        setActionLoadingId(id);
        setError("");
        setActionSuccess("");
        try {
            await bookingRestApi.approveBooking(id);
            setActionSuccess("Booking approved successfully");
            fetchBookings();
            setTimeout(() => setActionSuccess(""), 4000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to approve booking");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleOpenReject = (id) => {
        setRejectTargetId(id);
        setRejectionNote("");
        setRejectError("");
        setShowRejectModal(true);
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        const trimmedNote = rejectionNote.trim();
        if (trimmedNote.length < 5 || trimmedNote.length > 200) {
            setRejectError("Rejection note is required and must be between 5 and 200 characters");
            return;
        }

        setRejectLoading(true);
        setRejectError("");
        try {
            await bookingRestApi.rejectBooking(rejectTargetId, trimmedNote);
            setShowRejectModal(false);
            setActionSuccess("Booking rejected successfully");
            fetchBookings();
            setTimeout(() => setActionSuccess(""), 4000);
        } catch (err) {
            setRejectError(err.response?.data?.message || "Failed to reject booking");
        } finally {
            setRejectLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="bookings-wrapper">
            <header className="dashboard-header">
                <div className="header-left">
                    <div className="brand-logo">⚡ TriageSync</div>
                    <span className="brand-subtitle">Facility & Resource Reservations</span>
                </div>
                <div className="header-right">
                    <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
                        🎫 Tickets
                    </button>
                    <button className="btn-secondary" onClick={() => navigate("/stats")}>
                        📊 Stats
                    </button>
                    <button className="btn-secondary" onClick={() => navigate("/resources")}>
                        🏢 Resources
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

            <main className="bookings-container">
                <div className="overview-bar">
                    <div>
                        <h2>Bookings & Reservations</h2>
                        <p className="overview-sub">
                            Reserve facilities, track approvals, and manage your scheduled time slots.
                        </p>
                    </div>
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        ➕ New Booking
                    </button>
                </div>

                {isAdmin && (
                    <div className="tab-nav">
                        <button
                            className={`tab-btn ${activeTab === "my" ? "active" : ""}`}
                            onClick={() => { setActiveTab("my"); setPage(1); }}
                        >
                            👤 My Bookings
                        </button>
                        <button
                            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
                            onClick={() => { setActiveTab("all"); setPage(1); }}
                        >
                            🛡️ All Bookings (Admin View)
                        </button>
                    </div>
                )}

                <div className="filters-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>
                            Filter by Status:
                        </span>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            {STATUS_FILTERS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {actionSuccess && <div className="alert-banner success">{actionSuccess}</div>}
                {error && <div className="alert-banner error">{error}</div>}

                <div className="table-card">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <span>Loading bookings...</span>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">📅</span>
                            <h3>No bookings found</h3>
                            <p>You don&apos;t have any reservations matching this filter.</p>
                            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                                Create Your First Booking
                            </button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="tickets-table">
                                <thead>
                                    <tr>
                                        <th>Resource</th>
                                        <th>Time Slot</th>
                                        <th>Purpose</th>
                                        {activeTab === "all" && <th>Booked By</th>}
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((b) => {
                                        const resName = b.resourceId?.name || "Resource";
                                        const resType = b.resourceId?.type || "";
                                        const startDate = new Date(b.startTime);
                                        const endDate = new Date(b.endTime);
                                        const isPast = startDate <= new Date();
                                        const isOwner = String(b.userId?._id || b.userId) === String(user?._id || user?.id);
                                        const canCancel = (b.status === "PENDING" || b.status === "APPROVED") && !isPast && isOwner;

                                        return (
                                            <tr key={b._id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: "#f8fafc" }}>{resName}</div>
                                                    {resType && (
                                                        <span className={`badge-pill type-${resType.toLowerCase()}`}>
                                                            {resType}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="time-slot-display">
                                                        <span className="time-slot-primary">
                                                            {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {" → "}
                                                            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="time-slot-secondary">
                                                            UTC: {b.startTime?.slice(0, 16)}Z to {b.endTime?.slice(11, 16)}Z
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ maxWidth: "260px" }}>
                                                    <div style={{ color: "#e2e8f0" }}>{b.purpose}</div>
                                                    {b.ticketId && (
                                                        <span className="ext-badge" style={{ marginTop: "0.3rem", display: "inline-block" }}>
                                                            Ticket Linked
                                                        </span>
                                                    )}
                                                    {b.status === "REJECTED" && (b.rejectionNote || b.decisionNote) && (
                                                        <div className="rejection-note-callout">
                                                            <strong>Reason:</strong> {b.rejectionNote || b.decisionNote}
                                                        </div>
                                                    )}
                                                </td>
                                                {activeTab === "all" && (
                                                    <td>
                                                        <div style={{ fontSize: "0.85rem", color: "#f8fafc" }}>
                                                            {b.userId?.name || "User"}
                                                        </div>
                                                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                                                            {b.userId?.email}
                                                        </div>
                                                    </td>
                                                )}
                                                <td>
                                                    <span className={`status-badge status-${b.status?.toLowerCase()}`}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                                        {canCancel && (
                                                            <button
                                                                className="btn-cancel-booking"
                                                                disabled={actionLoadingId === b._id}
                                                                onClick={() => handleCancel(b)}
                                                            >
                                                                {actionLoadingId === b._id ? "Canceling..." : "Cancel"}
                                                            </button>
                                                        )}

                                                        {isAdmin && b.status === "PENDING" && (
                                                            <>
                                                                <button
                                                                    className="btn-approve"
                                                                    disabled={actionLoadingId === b._id}
                                                                    onClick={() => handleApprove(b._id)}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    className="btn-reject"
                                                                    disabled={actionLoadingId === b._id}
                                                                    onClick={() => handleOpenReject(b._id)}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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

            {showCreateModal && (
                <div className="drawer-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-box" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Reserve a Facility (POST /api/bookings)</h3>
                                <p>Select your resource, date, and 30-minute interval time slot.</p>
                            </div>
                            <button className="drawer-close" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleCreateSubmit}>
                            <div className="modal-body">
                                {createError && <div className="alert-banner error">{createError}</div>}

                                <div className="form-group">
                                    <label>Facility / Resource *</label>
                                    <select
                                        required
                                        value={createForm.resourceId}
                                        onChange={(e) => setCreateForm({ ...createForm, resourceId: e.target.value })}
                                    >
                                        <option value="">-- Choose Resource --</option>
                                        {availableResources.map((r) => (
                                            <option key={r._id} value={r._id}>
                                                {r.name} ({r.type} - Capacity {r.capacity})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Booking Date *</label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().slice(0, 10)}
                                        value={createForm.date}
                                        onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                                    />
                                </div>

                                <div className="time-picker-row">
                                    <div className="form-group">
                                        <label>Start Time (UTC) *</label>
                                        <select
                                            value={createForm.startTime}
                                            onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                                        >
                                            {TIME_OPTIONS.map((t) => (
                                                <option key={t} value={t}>{t} UTC</option>
                                            ))}
                                        </select>
                                        <span className="grid-helper-tip">30-min grid alignment</span>
                                    </div>

                                    <div className="form-group">
                                        <label>Duration *</label>
                                        <select
                                            value={createForm.durationMinutes}
                                            onChange={(e) => setCreateForm({ ...createForm, durationMinutes: Number(e.target.value) })}
                                        >
                                            {DURATION_OPTIONS.map((d) => (
                                                <option key={d.minutes} value={d.minutes}>{d.label}</option>
                                            ))}
                                        </select>
                                        <span className="grid-helper-tip">Allowed: 30 to 180 min</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Purpose (5 to 200 characters) *</label>
                                    <textarea
                                        rows={3}
                                        required
                                        minLength={5}
                                        maxLength={200}
                                        placeholder="e.g. Quarterly team sprint retrospective and planning"
                                        value={createForm.purpose}
                                        onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                                    />
                                    <div className={`char-counter ${createForm.purpose.trim().length >= 5 && createForm.purpose.trim().length <= 200 ? "valid" : "invalid"}`}>
                                        {createForm.purpose.trim().length} / 200 characters (min 5)
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Link Support Ticket ID (optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Optional Ticket MongoDB ObjectId"
                                        value={createForm.ticketId}
                                        onChange={(e) => setCreateForm({ ...createForm, ticketId: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={createLoading}>
                                    {createLoading ? "Submitting..." : "Confirm Booking"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRejectModal && (
                <div className="drawer-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="modal-box" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Reject Booking</h3>
                                <p>Provide an explanation for the rejection (5–200 characters).</p>
                            </div>
                            <button className="drawer-close" onClick={() => setShowRejectModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleRejectSubmit}>
                            <div className="modal-body">
                                {rejectError && <div className="alert-banner error">{rejectError}</div>}

                                <div className="form-group">
                                    <label>Rejection Note (5–200 chars) *</label>
                                    <textarea
                                        rows={4}
                                        required
                                        minLength={5}
                                        maxLength={200}
                                        placeholder="State reason for rejection, e.g. Facility is booked for mandatory maintenance."
                                        value={rejectionNote}
                                        onChange={(e) => setRejectionNote(e.target.value)}
                                    />
                                    <div className={`char-counter ${rejectionNote.trim().length >= 5 && rejectionNote.trim().length <= 200 ? "valid" : "invalid"}`}>
                                        {rejectionNote.trim().length} / 200 characters (min 5)
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowRejectModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-reject" disabled={rejectLoading}>
                                    {rejectLoading ? "Rejecting..." : "Confirm Rejection"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
