'use client';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { Toaster } from 'sonner';

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <AuthProvider>
            {children}
            <Toaster position="top-center" richColors />
        </AuthProvider>
    );
}
