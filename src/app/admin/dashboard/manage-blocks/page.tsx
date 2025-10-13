
'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type YearLevel = '1st-year' | '2nd-year' | '3rd-year' | '4th-year';

const yearLevelsConfig: {value: YearLevel, label: string, description: string}[] = [
    { value: '1st-year', label: '1st Year', description: 'Manage sections for 1st year student for first semester.' },
    { value: '2nd-year', label: '2nd Year', description: 'Manage sections for 2nd year student for first semester.' },
    { value: '3rd-year', label: '3rd Year', description: 'Manage sections for 3rd year student for first semester.' },
    { value: '4th-year', label: '4th Year', description: 'Manage sections for 4th year student for first semester.' },
];

const recentBlocks = [
    { name: 'BSIT 1-A', yearLevel: '1st Year', dateCreated: '2024-07-28' },
    { name: 'BSIT 3-C', yearLevel: '3rd Year', dateCreated: '2024-07-27' },
    { name: 'BSIT 2-B', yearLevel: '2nd Year', dateCreated: '2024-07-27' },
    { name: 'BSIT 4-A', yearLevel: '4th Year', dateCreated: '2024-07-26' },
    { name: 'BSIT 1-B', yearLevel: '1st Year', dateCreated: '2024-07-26' },
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

                <Card>
                    <CardHeader>
                        <CardTitle>Recently Created Blocks</CardTitle>
                        <CardDescription>
                            A list of the most recently added blocks.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Block Name</TableHead>
                                    <TableHead>Year Level</TableHead>
                                    <TableHead className="text-right">Date Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentBlocks.map((block) => (
                                    <TableRow key={block.name}>
                                        <TableCell className="font-medium">{block.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{block.yearLevel}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{block.dateCreated}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </>
    );
}
