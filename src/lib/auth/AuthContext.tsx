'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ============================================
// User-friendly error messages
// ============================================
function getErrorMessage(error: AuthError | Error | null): string {
    if (!error) return '';

    const message = error.message.toLowerCase();

    // Map Supabase errors to user-friendly messages
    if (message.includes('invalid login credentials')) {
        return 'Incorrect email or password';
    }
    if (message.includes('user already registered') || message.includes('already registered')) {
        return 'This email is already in use';
    }
    if (message.includes('password') && message.includes('6')) {
        return 'Password must be at least 6 characters';
    }
    if (message.includes('invalid email')) {
        return 'Please enter a valid email address';
    }
    if (message.includes('email not confirmed')) {
        return 'Please check your email to confirm your account';
    }
    if (message.includes('network') || message.includes('fetch')) {
        return 'Connection error. Please check your internet and try again.';
    }
    if (message.includes('rate limit')) {
        return 'Too many attempts. Please wait a moment and try again.';
    }

    // Return original message if no mapping found
    return error.message;
}

// ============================================
// Types
// ============================================
interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    error: string | null;
    signUp: (email: string, password: string) => Promise<{ error: string | null; success: boolean }>;
    signIn: (email: string, password: string) => Promise<{ error: string | null; success: boolean }>;
    signOut: () => Promise<void>;
    clearError: () => void;
}

// ============================================
// Context
// ============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clear error after timeout
    const setErrorWithTimeout = useCallback((errorMessage: string | null) => {
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }
        setError(errorMessage);
        if (errorMessage) {
            errorTimeoutRef.current = setTimeout(() => {
                setError(null);
            }, 5000);
        }
    }, []);

    const clearError = useCallback(() => {
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }
        setError(null);
    }, []);

    // Listen to auth state changes
    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setLoading(false);
            return;
        }

        // Get initial session
        const getInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setCurrentUser(session?.user ?? null);
            } catch (err) {
                console.error('Error getting session:', err);
            } finally {
                setLoading(false);
            }
        };

        getInitialSession();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setCurrentUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
        };
    }, []);

    // Sign up with email/password
    const signUp = useCallback(async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
            setErrorWithTimeout('Authentication service not configured');
            return { error: 'Authentication service not configured', success: false };
        }

        clearError();

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/editor`,
                },
            });

            if (authError) {
                const friendlyError = getErrorMessage(authError);
                setErrorWithTimeout(friendlyError);
                return { error: friendlyError, success: false };
            }

            // Check if email confirmation is required
            if (data.user && !data.session) {
                // User created but needs email confirmation
                return { error: null, success: true };
            }

            return { error: null, success: true };
        } catch (err) {
            const friendlyError = getErrorMessage(err as Error);
            setErrorWithTimeout(friendlyError);
            return { error: friendlyError, success: false };
        }
    }, [setErrorWithTimeout, clearError]);

    // Sign in with email/password
    const signIn = useCallback(async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
            setErrorWithTimeout('Authentication service not configured');
            return { error: 'Authentication service not configured', success: false };
        }

        clearError();

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                const friendlyError = getErrorMessage(authError);
                setErrorWithTimeout(friendlyError);
                return { error: friendlyError, success: false };
            }

            return { error: null, success: true };
        } catch (err) {
            const friendlyError = getErrorMessage(err as Error);
            setErrorWithTimeout(friendlyError);
            return { error: friendlyError, success: false };
        }
    }, [setErrorWithTimeout, clearError]);

    // Sign out
    const signOut = useCallback(async () => {
        if (!isSupabaseConfigured()) return;

        clearError();
        await supabase.auth.signOut();
        setCurrentUser(null);
    }, [clearError]);

    const value: AuthContextType = {
        currentUser,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================
// Hook
// ============================================
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
