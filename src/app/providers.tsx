'use client';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { QueryProvider } from '@/providers/QueryProvider';
import { Toaster } from 'sonner';

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <QueryProvider>
            <AuthProvider>
                {children}
                <Toaster position="top-center" richColors />
            </AuthProvider>
        </QueryProvider>
    );
}
