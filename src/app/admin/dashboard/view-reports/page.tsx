'use client';

import ReportsPage from '../reports/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ReadOnlyReportsPage() {
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
