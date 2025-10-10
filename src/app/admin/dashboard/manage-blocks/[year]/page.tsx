
'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const yearLevelMap: Record<string, string> = {
    '1st-year': '1st Year',
    '2nd-year': '2nd Year',
    '3rd-year': '3rd Year',
    '4th-year': '4th Year',
};

export default function YearLevelBlocksPage() {
    const params = useParams();
    const year = params.year as string;
    const yearLabel = yearLevelMap[year] || 'Unknown Year';

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
             <div className="space-y-0.5">
                 <h1 className="text-2xl font-bold tracking-tight">Manage {yearLabel} Blocks</h1>
                <p className="text-muted-foreground">
                    Add, edit, and view blocks for {yearLabel}.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Blocks for {yearLabel}</CardTitle>
                    <CardDescription>
                        Here you can manage blocks, view enrolled students, and set schedules.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10">
                        <p className="text-sm text-muted-foreground">Block management features will be implemented here.</p>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
