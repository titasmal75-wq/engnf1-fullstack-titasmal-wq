import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import resourceRestApi from "../restapi/resourceRestApi";
import Navbar from "../components/Navbar";
import "../styles/dashboard.css";
import "../styles/resources.css";

const RESOURCE_TYPES = ["ROOM", "LAB", "EQUIPMENT"];

export default function ResourcesPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [resources, setResources] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Search and filters
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [minCapacityFilter, setMinCapacityFilter] = useState("");

    // Create / Edit modal state
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [targetResourceId, setTargetResourceId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "ROOM",
        capacity: 10,
        description: "",
        isActive: true,
    });
    const [modalError, setModalError] = useState("");
    const [modalLoading, setModalLoading] = useState(false);

    // Availability state
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    const [fromTime, setFromTime] = useState("");
    const [toTime, setToTime] = useState("");
    const [availabilityData, setAvailabilityData] = useState(null);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityError, setAvailabilityError] = useState("");

    const isAdmin = user?.role === "ADMIN";

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch resources
    const fetchResources = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = { page };
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            if (typeFilter) params.type = typeFilter;
            if (minCapacityFilter && Number(minCapacityFilter) >= 1) {
                params.minCapacity = minCapacityFilter;
            }

            const data = await resourceRestApi.getResources(params);
            const list = data.resources || data.data || [];
            setResources(list);
            const totalCount = data.total ?? data.pagination?.total ?? list.length;
            setTotal(totalCount);
            setTotalPages(data.totalPages ?? data.pagination?.totalPages ?? 1);
        } catch (err) {
            console.error("Error fetching resources:", err);
            setError(err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.errors?.[0] || "Failed to load resources");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, typeFilter, minCapacityFilter]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    // Open create modal
    const handleOpenCreate = () => {
        setEditMode(false);
        setTargetResourceId(null);
        setFormData({
            name: "",
            type: "ROOM",
            capacity: 10,
            description: "",
            isActive: true,
        });
        setModalError("");
        setShowModal(true);
    };

    // Open edit modal
    const handleOpenEdit = (res) => {
        setEditMode(true);
        setTargetResourceId(res._id);
        setFormData({
            name: res.name || "",
            type: res.type || "ROOM",
            capacity: res.capacity || 10,
            description: res.description || "",
            isActive: res.isActive ?? true,
        });
        setModalError("");
        setShowModal(true);
    };

    // Submit Create or Edit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setModalError("");

        const trimmedName = formData.name.trim();
        if (trimmedName.length < 3 || trimmedName.length > 60) {
            setModalError("Name must contain 3 to 60 characters");
            return;
        }

        const cap = Number(formData.capacity);
        if (!Number.isInteger(cap) || cap < 1 || cap > 500) {
            setModalError("Capacity must be an integer between 1 and 500");
            return;
        }

        setModalLoading(true);
        try {
            if (editMode) {
                await resourceRestApi.updateResource(targetResourceId, {
                    name: trimmedName,
                    type: formData.type,
                    capacity: cap,
                    description: formData.description?.trim() || null,
                    isActive: formData.isActive,
                });
            } else {
                await resourceRestApi.createResource({
                    name: trimmedName,
                    type: formData.type,
                    capacity: cap,
                    description: formData.description?.trim() || null,
                });
            }
            setShowModal(false);
            fetchResources();
        } catch (err) {
            setModalError(
                err.response?.data?.error?.message ||
                err.response?.data?.message ||
                err.response?.data?.errors?.[0] ||
                "Failed to save resource"
            );
        } finally {
            setModalLoading(false);
        }
    };

    // Open availability modal
    const handleOpenAvailability = (res) => {
        setSelectedResource(res);
        setAvailabilityData(null);
        setAvailabilityError("");

        // Default window: now to 24 hours later
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const formatForInput = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };
        setFromTime(formatForInput(now));
        setToTime(formatForInput(tomorrow));
        setShowAvailabilityModal(true);
    };

    // Query availability
    const handleQueryAvailability = async (e) => {
        if (e) e.preventDefault();
        if (!fromTime || !toTime) {
            setAvailabilityError("Both from and to timestamps are required");
            return;
        }

        const startDate = new Date(fromTime);
        const endDate = new Date(toTime);

        if (startDate >= endDate) {
            setAvailabilityError("from must be earlier than to");
            return;
        }

        if (endDate - startDate > 7 * 24 * 60 * 60 * 1000) {
            setAvailabilityError("Range cannot exceed 7 days");
            return;
        }

        setAvailabilityLoading(true);
        setAvailabilityError("");
        try {
            const fromUTC = startDate.toISOString().replace(/\.\d{3}Z$/, "Z");
            const toUTC = endDate.toISOString().replace(/\.\d{3}Z$/, "Z");

            const data = await resourceRestApi.getResourceAvailability(
                selectedResource._id,
                fromUTC,
                toUTC
            );
            setAvailabilityData(data);
        } catch (err) {
            setAvailabilityError(
                err.response?.data?.error?.message ||
                err.response?.data?.message ||
                err.response?.data?.errors?.[0] ||
                "Failed to check availability"
            );
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="resources-wrapper">
            <Navbar
                subtitle="Resource Management & Availability"
                extraAction={
                    user?.role === "ADMIN" ? (
                        <button className="btn-primary" onClick={handleOpenCreate}>
                            ➕ Add Resource
                        </button>
                    ) : null
                }
            />

            <main className="resources-container">
                <div className="overview-bar">
                    <div>
                        <h2>Resources & Facilities</h2>
                        <p className="overview-sub">
                            Browse rooms, laboratories, and equipment. Check real-time booking availability.
                        </p>
                    </div>
                    {isAdmin && (
                        <button className="btn-primary" onClick={handleOpenCreate}>
                            ➕ Create Resource
                        </button>
                    )}
                </div>

                <div className="filters-card">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by resource name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clear-btn" onClick={() => setSearchQuery("")}>✕</button>
                        )}
                    </div>

                    <div className="filter-dropdowns">
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Types</option>
                            {RESOURCE_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        <input
                            type="number"
                            placeholder="Min Capacity"
                            min="1"
                            max="500"
                            style={{
                                background: "#1a1e2d",
                                border: "1px solid #2d3148",
                                color: "#f8fafc",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "8px",
                                width: "130px",
                                fontSize: "0.85rem"
                            }}
                            value={minCapacityFilter}
                            onChange={(e) => {
                                setMinCapacityFilter(e.target.value);
                                setPage(1);
                            }}
                        />

                        {(typeFilter || minCapacityFilter || searchQuery) && (
                            <button
                                className="reset-filters-btn"
                                onClick={() => {
                                    setTypeFilter("");
                                    setMinCapacityFilter("");
                                    setSearchQuery("");
                                    setPage(1);
                                }}
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {error && <div className="alert-banner error">{error}</div>}

                <div className="table-card">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <span>Loading resources...</span>
                        </div>
                    ) : resources.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">🏢</span>
                            <h3>No resources found</h3>
                            <p>No facilities match your search criteria.</p>
                            {isAdmin && (
                                <button className="btn-primary" onClick={handleOpenCreate}>
                                    Create Your First Resource
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="tickets-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Capacity</th>
                                        <th>Status</th>
                                        <th>Description</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resources.map((res) => (
                                        <tr key={res._id}>
                                            <td style={{ fontWeight: 600, color: "#0f172a" }}>
                                                {res.name}
                                            </td>
                                            <td>
                                                <span className={`badge-pill type-${res.type?.toLowerCase()}`}>
                                                    {res.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>{res.capacity}</span> units
                                            </td>
                                            <td>
                                                {res.isActive ? (
                                                    <span className="badge-active">Active</span>
                                                ) : (
                                                    <span className="badge-inactive">Inactive</span>
                                                )}
                                            </td>
                                            <td style={{ color: "#64748b", maxWidth: "260px" }}>
                                                {res.description || "—"}
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn-availability"
                                                        onClick={() => handleOpenAvailability(res)}
                                                    >
                                                        📅 Availability
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            className="btn-edit"
                                                            onClick={() => handleOpenEdit(res)}
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                    )}
                                                </div>
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

            {/* Create / Edit Modal (POST / PATCH /api/resources) */}
            {showModal && (
                <div className="drawer-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>{editMode ? "Edit Resource (PATCH)" : "Create Resource (POST)"}</h3>
                                <p>
                                    {editMode
                                        ? "Update properties or toggle active status."
                                        : "Add a new room, lab, or piece of equipment."}
                                </p>
                            </div>
                            <button className="drawer-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                {modalError && <div className="alert-banner error">{modalError}</div>}

                                <div className="form-group">
                                    <label>Resource Name (3–60 chars, unique) *</label>
                                    <input
                                        type="text"
                                        required
                                        minLength={3}
                                        maxLength={60}
                                        placeholder="e.g. Conference Room C"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Type *</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        {RESOURCE_TYPES.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Capacity (1–500) *</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={500}
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description (optional, max 300 chars)</label>
                                    <textarea
                                        rows={3}
                                        maxLength={300}
                                        placeholder="Brief notes about the facility..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {editMode && (
                                    <div className="form-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            />
                                            <span>Active (visible to regular users)</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={modalLoading}>
                                    {modalLoading ? "Saving..." : editMode ? "Update Resource" : "Create Resource"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Availability Modal (GET /api/resources/:id/availability) */}
            {showAvailabilityModal && selectedResource && (
                <div className="drawer-overlay" onClick={() => setShowAvailabilityModal(false)}>
                    <div className="modal-box" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Availability for {selectedResource.name}</h3>
                                <p>Check pending and approved overlapping reservations (max 7-day window).</p>
                            </div>
                            <button className="drawer-close" onClick={() => setShowAvailabilityModal(false)}>✕</button>
                        </div>

                        <div className="modal-body">
                            {availabilityError && <div className="alert-banner error">{availabilityError}</div>}

                            <form onSubmit={handleQueryAvailability} className="availability-query-box">
                                <div className="date-group">
                                    <label>From (Local Time)</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={fromTime}
                                        onChange={(e) => setFromTime(e.target.value)}
                                    />
                                </div>

                                <div className="date-group">
                                    <label>To (Local Time)</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={toTime}
                                        onChange={(e) => setToTime(e.target.value)}
                                    />
                                </div>

                                <button type="submit" className="btn-primary" disabled={availabilityLoading}>
                                    {availabilityLoading ? "Checking..." : "Check Availability"}
                                </button>
                            </form>

                            {availabilityData && (
                                <div className="availability-results">
                                    <h4 style={{ marginBottom: "0.8rem", color: "#0f172a", fontSize: "0.95rem" }}>
                                        Overlapping Bookings ({availabilityData.bookings?.length || 0}):
                                    </h4>

                                    {availabilityData.bookings?.length === 0 ? (
                                        <div className="alert-banner success" style={{ margin: "1rem 0" }}>
                                            ✅ Resource is completely available during this time slot!
                                        </div>
                                    ) : (
                                        <div>
                                            {availabilityData.bookings.map((b, idx) => (
                                                <div key={b._id || idx} className="booking-item">
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.88rem" }}>
                                                            {new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}
                                                        </div>
                                                        <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                                                            UTC: {b.startTime} to {b.endTime}
                                                        </div>
                                                    </div>
                                                    <span className={`booking-status-badge status-${b.status?.toLowerCase()}`}>
                                                        {b.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowAvailabilityModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
