
'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type YearLevel = '1st-year' | '2nd-year' | '3rd-year' | '4th-year';

const yearLevelsConfig: {value: YearLevel, label: string, description: string}[] = [
    { value: '1st-year', label: '1st Year', description: 'Manage sections for incoming freshmen.' },
    { value: '2nd-year', label: '2nd Year', description: 'Organize blocks for sophomore students.' },
    { value: '3rd-year', label: '3rd Year', description: 'Handle regular and irregular junior students.' },
    { value: '4th-year', label: '4th Year', description: 'Finalize sections for graduating students.' },
];


export default function ManageBlocksPage() {
    return (
        <>
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="space-y-0.5">
                     <h1 className="text-2xl font-bold tracking-tight">Manage Blocks</h1>
                    <p className="text-muted-foreground">
                        Select a year level to manage student blocks, schedules, and class lists.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {yearLevelsConfig.map(yl => (
                       <Link href={`/admin/dashboard/manage-blocks/${yl.value}`} key={yl.value}>
                            <Card className="hover:border-primary transition-colors hover:bg-primary/5">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="space-y-1.5">
                                        <CardTitle>{yl.label}</CardTitle>
                                        <CardDescription>
                                           {yl.description}
                                        </CardDescription>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                            </Card>
                       </Link>
                    ))}
                </div>
            </main>
        </>
    );
}
