'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReportsPage from '../reports/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdmin } from '../../context/admin-context';

export default function ReadOnlyReportsPage() {
    const { adminData } = useAdmin();
    const router = useRouter();
    const isModerator = adminData.currentUser?.role === 'Moderator';

    useEffect(() => {
        if (isModerator) {
            router.push('/admin/dashboard');
        }
    }, [isModerator, router]);

    if (isModerator) {
        return null;
    }

    return (
        <div className="flex-1">
            <Alert className="m-4 rounded-xl border-dashed">
                <AlertTitle>Read-Only Reports</AlertTitle>
                <AlertDescription>
                    Moderators can review enrollment analytics here. For any adjustments, please coordinate with an Admin or Super Admin.
                </AlertDescription>
            </Alert>
            <ReportsPage />
        </div>
    );
}
