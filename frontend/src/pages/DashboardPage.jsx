import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-header">
                <h1>Dashboard</h1>
                <button className="logout-btn" onClick={handleLogout}>
                    Log out
                </button>
            </header>

            <main className="dashboard-main">
                <div className="user-card">
                    <div className="user-avatar">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                        <h2>{user?.name}</h2>
                        <p>{user?.email}</p>
                        <span className="role-badge">{user?.role}</span>
                    </div>
                </div>

                <p className="welcome-text">
                    Welcome back, <strong>{user?.name}</strong>! You are logged in
                    as <strong>{user?.role}</strong>.
                </p>
            </main>
        </div>
    );
}
