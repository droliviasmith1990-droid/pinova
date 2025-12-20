"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import {
  ChevronRight,
  Search,
  Bell,
  Plus,
  User,
  Settings,
  LogOut,
  CreditCard
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROUTE_CONFIG: Record<string, { title: string; description: string; section: string }> = {
  "/dashboard": { 
    title: "Dashboard", 
    description: "Overview of your pin generation activity",
    section: "Overview"
  },
  "/dashboard/campaigns": { 
    title: "Campaigns", 
    description: "Manage your bulk pin generation campaigns",
    section: "Campaigns"
  },
  "/dashboard/campaigns/new": {
    title: "New Campaign",
    description: "Create a new bulk generation campaign",
    section: "Campaigns"
  },
  "/dashboard/templates": { 
    title: "Templates", 
    description: "Manage your design templates",
    section: "Library"
  },
  "/dashboard/categories": { 
    title: "Categories", 
    description: "Organize your pins with categories",
    section: "Library"
  },
  "/dashboard/tags": { 
    title: "Tags", 
    description: "Manage detailed tags for your content",
    section: "Library"
  },
};

export function PageHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");

  // Get current route config or default
  const currentRoute = ROUTE_CONFIG[pathname] || {
    title: "Dashboard",
    description: "Pinterest Pin Generator",
    section: "Overview"
  };

  // Update local state if URL changes
  useEffect(() => {
    setSearchValue(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = useCallback((term: string) => {
    setSearchValue(term);
  }, []);

  const executeSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue) {
      params.set("q", searchValue);
    } else {
      params.delete("q");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="h-16 px-6 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between transition-all duration-300 shadow-sm support-backdrop-blur:bg-white/60">
      
      {/* Left: Breadcrumbs / Context */}
      <div className="flex items-center min-w-0 gap-3">
         <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100/80 transition-all text-gray-500 hover:text-gray-900 group">
            <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform text-gray-400 group-hover:text-gray-900">grid_view</span>
         </Link>
         
         {currentRoute.section !== "Overview" && (
           <>
             <ChevronRight className="h-4 w-4 text-gray-300" strokeWidth={2} />
             <div className="flex flex-col">
               <span className="text-xs text-gray-400 font-medium">{currentRoute.section}</span>
               <span className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">
                  {currentRoute.title}
               </span>
             </div>
           </>
         )}
      </div>

      {/* Right: Actions, Search, Profile */}
      <div className="flex items-center gap-5">
        {/* Search Bar - Sleek Pill */}
        <div className="relative group hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
             <Search className="h-4 w-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
            placeholder="Search campaigns..."
            className="block w-64 pl-10 pr-4 py-2 border border-gray-200/60 rounded-full bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-200 focus:bg-white transition-all text-sm font-medium hover:bg-white hover:border-gray-300 hover:shadow-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 border-l border-gray-200/60 pl-5">
           {/* Notification Bell */}
           <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100/80 text-gray-500 hover:text-gray-900 transition-all hover:scale-105 active:scale-95 group">
              <Bell className="h-5 w-5 group-hover:fill-current" strokeWidth={1.8} />
              <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white"></span>
           </button>

           {/* Primary Action - Gradient Button */}
           <Link 
              href="/dashboard/campaigns/new" 
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all shadow-creative-md hover:shadow-creative-lg bg-linear-to-br from-gray-900 to-gray-800 text-white hover:scale-105 active:scale-95 border border-transparent hover:border-white/20"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span>Create</span>
           </Link>

           {/* User Profile */}
           <div className="pl-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-9 h-9 rounded-full bg-linear-to-br from-purple-500 to-blue-600 border-2 border-white shadow-creative-sm cursor-pointer flex items-center justify-center text-white font-bold text-xs hover:ring-2 hover:ring-purple-100 transition-all outline-none hover:scale-105 active:scale-95">
                    JD
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 p-1 border-gray-100 shadow-creative-lg rounded-xl">
                  <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100 mx-2" />
                  <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-purple-50 focus:text-purple-700 font-medium px-3 py-2">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-purple-50 focus:text-purple-700 font-medium px-3 py-2">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-purple-50 focus:text-purple-700 font-medium px-3 py-2">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100 mx-2" />
                  <DropdownMenuItem className="rounded-lg cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-medium px-3 py-2">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </div>
      </div>
    </header>
  );
}
