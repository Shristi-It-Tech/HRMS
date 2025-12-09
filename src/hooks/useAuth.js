import { useState, useEffect, useMemo, useCallback } from 'react';
import { showSwal } from '../utils/swal';

const ROLE_PERMISSIONS = {
    employee: ['attendance:clock_in', 'attendance:clock_out'],
    supervisor: ['attendance:clock_in', 'attendance:clock_out', 'attendance:view', 'attendance:review'],
    manager: ['attendance:clock_in', 'attendance:clock_out', 'attendance:view', 'attendance:show'],
    owner: ['attendance:show', 'attendance:view', 'attendance:review'],
};

const API_BASE_URL = (() => {
    try {
        const base = import.meta?.env?.VITE_API_BASE_URL;
        if (base) {
            return base.endsWith('/') ? base.slice(0, -1) : base;
        }
    } catch {
        // fallback to localhost
    }
    return 'http://localhost:4000';
})();

const safeParse = (key, fallback = null) => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch {
        localStorage.removeItem(key);
        return fallback;
    }
};

export const useAuth = () => {
    const [authUser, setAuthUser] = useState(() => safeParse('authUser', null));
    const [authTokens, setAuthTokens] = useState(() => safeParse('authTokens', null));
    const [isLoading, setIsLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [managers, setManagers] = useState([]);
    const [pendingLeave, setPendingLeave] = useState([]);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('authUser', JSON.stringify(authUser));
        localStorage.setItem('authTokens', JSON.stringify(authTokens));
    }, [authUser, authTokens]);

    const buildUrl = (endpoint) => {
        if (!API_BASE_URL) return endpoint;
        if (endpoint.startsWith('http')) return endpoint;
        return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    };

    const refreshAccessToken = useCallback(async () => {
        if (!authTokens?.refreshToken) return null;
        const response = await fetch(buildUrl('/api/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: authTokens.refreshToken })
        });
        if (!response.ok) throw new Error('Failed to refresh token');
        const data = await response.json();
        const updatedTokens = { token: data.accessToken, refreshToken: data.refreshToken || authTokens.refreshToken };
        setAuthTokens(updatedTokens);
        setAuthUser(prev => (prev ? { ...prev, ...data.user, token: data.accessToken } : prev));
        return data.accessToken;
    }, [authTokens]);

    const parseJsonSafe = async (response) => {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return response.json();
        }
        return null;
    };

    const handleLogin = async (email, password) => {
        setIsLoading(true);
        try {
            const response = await fetch(buildUrl('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!response.ok) {
                const errorPayload = await parseJsonSafe(response);
                throw new Error(errorPayload?.message || 'Login failed');
            }
            const data = await parseJsonSafe(response);
            if (!data) {
                throw new Error('Login succeeded but no payload was returned');
            }
            const { accessToken, refreshToken, user } = data;
            const payload = { ...user, token: accessToken };
            setAuthUser(payload);
            setAuthTokens({ token: accessToken, refreshToken });
            showSwal('Login Successful!', `Welcome back, ${user.name} (${user.role.toUpperCase()})!`, 'success', 2000);
        } catch (error) {
            showSwal('Login Failed', error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch(buildUrl('/api/auth/logout'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: authTokens?.refreshToken })
            });
        } catch (_) {
            // swallow errors
        }
        setAuthUser(null);
        setAuthTokens(null);
        setIsLogoutModalOpen(false);
        showSwal('Logout Successful', 'You have been signed out.', 'success', 1500);
    };

    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true);
    };

    const permissions = useMemo(() => {
        if (!authUser?.role) return [];
        return ROLE_PERMISSIONS[authUser.role] || [];
    }, [authUser]);

    const hasPermission = useMemo(() => {
        return (permission) => permissions.includes(permission);
    }, [permissions]);

    const apiFetch = useMemo(() => {
        return async (endpoint, options = {}, retry = true) => {
            const url = buildUrl(endpoint);
            const headers = {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            };
            if (authUser?.token) {
                headers.Authorization = `Bearer ${authUser.token}`;
            }
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401 && retry) {
                try {
                    const newToken = await refreshAccessToken();
                    if (!newToken) {
                        throw new Error('Session expired. Please log in again.');
                    }
                    headers.Authorization = `Bearer ${newToken}`;
                    const retryResponse = await fetch(url, { ...options, headers });
                    const payload = retryResponse.headers.get('content-type')?.includes('application/json')
                        ? await retryResponse.json()
                        : await retryResponse.text();
                    if (!retryResponse.ok) {
                        const error = new Error(payload?.message || 'Request failed after refresh');
                        error.payload = payload;
                        throw error;
                    }
                    return payload;
                } catch (err) {
                    // On refresh failure, force logout to clear bad tokens.
                    handleLogout();
                    const message = err?.message || 'Session error. Please log in again.';
                    const error = new Error(message);
                    error.payload = err?.payload;
                    throw error;
                }
            }
            const payload = response.headers.get('content-type')?.includes('application/json')
                ? await response.json()
                : await response.text();
            if (!response.ok) {
                const error = new Error(payload?.message || `Request failed with status ${response.status}`);
                error.payload = payload;
                throw error;
            }
            return payload;
        };
    }, [authUser, refreshAccessToken]);

    return {
        authUser,
        setAuthUser,
        authTokens,
        setAuthTokens,
        isLoading,
        employees,
        setEmployees,
        managers,
        setManagers,
        pendingLeave,
        setPendingLeave,
        isLogoutModalOpen,
        setIsLogoutModalOpen,
        handleLogin,
        handleLogout,
        handleLogoutClick,
        permissions,
        hasPermission,
        apiFetch,
    };
};
