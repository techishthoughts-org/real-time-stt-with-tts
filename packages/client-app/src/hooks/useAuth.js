import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
export const useAuth = () => {
    const [authState, setAuthState] = useState({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
    });
    const queryClient = useQueryClient();
    // Check authentication status on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('sessionToken');
                if (token) {
                    // Validate token with server
                    const response = await fetch('/api/auth/validate', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    if (response.ok) {
                        const userData = await response.json();
                        setAuthState({
                            user: userData.user,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        });
                    }
                    else {
                        // Token is invalid, remove it
                        localStorage.removeItem('sessionToken');
                        setAuthState({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            error: null,
                        });
                    }
                }
                else {
                    setAuthState(prev => ({ ...prev, isLoading: false }));
                }
            }
            catch {
                setAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: 'Failed to check authentication',
                });
            }
        };
        checkAuth();
    }, []);
    // Login mutation
    const loginMutation = useMutation(async (credentials) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }
        return response.json();
    }, {
        onSuccess: (data) => {
            localStorage.setItem('sessionToken', data.token);
            setAuthState({
                user: data.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
            // Invalidate and refetch user-related queries
            queryClient.invalidateQueries(['user']);
            queryClient.invalidateQueries(['conversations']);
        },
        onError: (error) => {
            setAuthState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Login failed',
            }));
        },
    });
    // Logout mutation
    const logoutMutation = useMutation(async () => {
        const token = localStorage.getItem('sessionToken');
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        }
    }, {
        onSuccess: () => {
            localStorage.removeItem('sessionToken');
            setAuthState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
            // Clear all queries
            queryClient.clear();
        },
    });
    // Register mutation
    const registerMutation = useMutation(async (userData) => {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }
        return response.json();
    }, {
        onError: (error) => {
            setAuthState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Registration failed',
            }));
        },
    });
    // Get user profile
    const { data: userProfile } = useQuery(['user', 'profile'], async () => {
        const token = localStorage.getItem('sessionToken');
        if (!token)
            throw new Error('No token');
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }
        return response.json();
    }, {
        enabled: authState.isAuthenticated,
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    });
    const login = useCallback((credentials) => {
        loginMutation.mutate(credentials);
    }, [loginMutation]);
    const logout = useCallback(() => {
        logoutMutation.mutate();
    }, [logoutMutation]);
    const register = useCallback((userData) => {
        registerMutation.mutate(userData);
    }, [registerMutation]);
    const clearError = useCallback(() => {
        setAuthState(prev => ({ ...prev, error: null }));
    }, []);
    return {
        // State
        user: userProfile?.user || authState.user,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading || loginMutation.isLoading || logoutMutation.isLoading,
        error: authState.error,
        // Actions
        login,
        logout,
        register,
        clearError,
        // Mutation states
        isLoggingIn: loginMutation.isLoading,
        isLoggingOut: logoutMutation.isLoading,
        isRegistering: registerMutation.isLoading,
    };
};
