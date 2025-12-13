'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// Route label mapping
const routeLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'campaigns': 'Campaigns',
    'templates': 'Templates',
    'settings': 'Settings',
    'new': 'New Campaign',
    'editor': 'Template Editor',
};

export function Breadcrumbs() {
    const pathname = usePathname();

    // Don't show on root dashboard
    if (pathname === '/dashboard') {
        return null;
    }

    const pathSegments = pathname.split('/').filter(Boolean);

    // Build breadcrumb items
    const breadcrumbs = pathSegments.map((segment, index) => {
        const href = '/' + pathSegments.slice(0, index + 1).join('/');
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        const isLast = index === pathSegments.length - 1;

        // Handle dynamic segments (like campaign IDs)
        const isDynamic = /^[a-f0-9-]+$/.test(segment) && segment.length > 10;
        const displayLabel = isDynamic ? 'Details' : label;

        return {
            href,
            label: displayLabel,
            isLast,
        };
    });

    return (
        <nav className="flex items-center gap-1 text-sm py-2 animate-fade-in-up" aria-label="Breadcrumb">
            <Link
                href="/dashboard"
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
            >
                <Home className="w-4 h-4" />
                <span className="sr-only">Home</span>
            </Link>

            {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-1">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    {crumb.isLast ? (
                        <span className="font-medium text-gray-900 px-2 py-1">
                            {crumb.label}
                        </span>
                    ) : (
                        <Link
                            href={crumb.href}
                            className="text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                        >
                            {crumb.label}
                        </Link>
                    )}
                </div>
            ))}
        </nav>
    );
}
