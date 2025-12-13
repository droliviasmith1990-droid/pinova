'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    FolderOpen,
    Palette,
    Settings,
    LogOut,
    Plus,
    Sparkles,
    PenTool,
    Layers,
    FileSpreadsheet,
    ChevronRight,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

interface NavGroup {
    label: string;
    items: NavItem[];
}

interface NavItem {
    label: string;
    icon: React.ElementType;
    href: string;
    badge?: string;
}

const navGroups: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            { label: 'Dashboard', icon: Home, href: '/dashboard' },
        ],
    },
    {
        label: 'Create',
        items: [
            { label: 'Template Editor', icon: PenTool, href: '/editor' },
            { label: 'New Campaign', icon: Sparkles, href: '/dashboard/campaigns/new' },
        ],
    },
    {
        label: 'Library',
        items: [
            { label: 'My Templates', icon: Layers, href: '/dashboard/templates' },
            { label: 'Campaigns', icon: FolderOpen, href: '/dashboard/campaigns' },
        ],
    },
    {
        label: 'Account',
        items: [
            { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
        ],
    },
];

// Quick actions for primary user goals
const quickActions = [
    { label: 'New Template', icon: Plus, href: '/editor', color: 'from-blue-500 to-indigo-600' },
    { label: 'Bulk Generate', icon: Zap, href: '/dashboard/campaigns/new', color: 'from-purple-500 to-pink-600' },
];

export function Sidebar() {
    const pathname = usePathname();
    const { signOut } = useAuth();

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    };

    return (
        <aside className="w-64 border-r border-gray-200 bg-white h-screen flex flex-col fixed left-0 top-0 z-50">
            {/* Logo */}
            <div className="p-6 border-b border-gray-100">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                        <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Pin Generator</h1>
                        <p className="text-xs text-gray-500">Bulk creation tool</p>
                    </div>
                </Link>
            </div>

            {/* Quick Actions */}
            <div className="p-4 space-y-2">
                {quickActions.map((action) => (
                    <Link
                        key={action.href}
                        href={action.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-white font-medium transition-all",
                            `bg-gradient-to-r ${action.color}`,
                            "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                        )}
                    >
                        <action.icon className="w-4 h-4" />
                        {action.label}
                    </Link>
                ))}
            </div>

            {/* Navigation Groups */}
            <nav className="flex-1 px-3 py-2 overflow-y-auto">
                {navGroups.map((group) => (
                    <div key={group.label} className="mb-4">
                        <h3 className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {group.label}
                        </h3>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all group",
                                            active
                                                ? "bg-blue-50 text-blue-700"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "w-5 h-5 transition-colors",
                                            active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                                        )} />
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                        {active && (
                                            <ChevronRight className="w-4 h-4 text-blue-400" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-left group"
                >
                    <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
