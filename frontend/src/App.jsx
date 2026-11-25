import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, GuestRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import StatsPage from "./pages/StatsPage";
import ResourcesPage from "./pages/ResourcesPage";
import BookingsPage from "./pages/BookingsPage";

export default function App() {
    return (
        <BrowserRouter>
        <AuthProvider>
            <Routes>

                <Route path="/" element={<Navigate to="/dashboard" replace />} />


                <Route element={<GuestRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Route>


                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/stats" element={<StatsPage />} />
                    <Route path="/admin/stats" element={<StatsPage />} />
                    <Route path="/resources" element={<ResourcesPage />} />
                    <Route path="/bookings" element={<BookingsPage />} />
                </Route>


                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </AuthProvider>
        </BrowserRouter>
    );
}


