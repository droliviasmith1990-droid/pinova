'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { OnboardingChecklist } from '@/components/ui/OnboardingChecklist';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
    children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <Header />
            <main className="pl-64 pt-16 min-h-screen">
                <div className="p-8 max-w-7xl mx-auto">
                    {/* Breadcrumbs */}
                    <Breadcrumbs />

                    {/* Page Content */}
                    {children}
                </div>
            </main>

            {/* Onboarding Checklist */}
            <OnboardingChecklist />
        </div>
    );
}
