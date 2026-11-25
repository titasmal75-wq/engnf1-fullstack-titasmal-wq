import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, GuestRoute } from "../components/ProtectedRoute";
import { ROUTES } from "./routePaths";


import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";
import StatsPage from "../pages/StatsPage";
import ResourcesPage from "../pages/ResourcesPage";
import BookingsPage from "../pages/BookingsPage";


export function AppRoutes() {
    return (
        <Routes>

            <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />


            <Route element={<GuestRoute />}>
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            </Route>


            <Route element={<ProtectedRoute />}>
                <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                <Route path={ROUTES.STATS} element={<StatsPage />} />
                <Route path={ROUTES.ADMIN_STATS} element={<StatsPage />} />
                <Route path={ROUTES.RESOURCES} element={<ResourcesPage />} />
                <Route path={ROUTES.BOOKINGS} element={<BookingsPage />} />
            </Route>


            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
    );
}

export default AppRoutes;
