import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authRestApi from "../restapi/authrestapi";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const token = localStorage.getItem("accessToken");
        if (!token) {
            setLoading(false);
            return;
        }
        authRestApi
            .getMe()
            .then((data) => {
                if (isMounted) setUser(data.user);
            })
            .catch(() => {
                localStorage.removeItem("accessToken");
                if (isMounted) setUser(null);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const login = useCallback(async (email, password) => {
        const data = await authRestApi.login(email, password);
        localStorage.setItem("accessToken", data.accessToken);
        setUser(data.user);
        return data.user;
    }, []);

    const register = useCallback(async (name, email, password) => {
        const data = await authRestApi.register(name, email, password);
        return data;
    }, []);

    const logout = useCallback(async () => {
        try {
            await authRestApi.logout();
        } catch {

        }
        localStorage.removeItem("accessToken");
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
