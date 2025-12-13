'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect /campaigns to /dashboard/campaigns
export default function CampaignsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/campaigns');
    }, [router]);

    return null;
}
