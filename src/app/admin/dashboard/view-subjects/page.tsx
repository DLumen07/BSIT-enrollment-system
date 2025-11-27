'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '../../context/admin-context';

const YEAR_LEVELS: Array<{ key: string; label: string }> = [
    { key: '1st-year', label: '1st Year' },
    { key: '2nd-year', label: '2nd Year' },
    { key: '3rd-year', label: '3rd Year' },
    { key: '4th-year', label: '4th Year' },
];

const semesterLabelMap: Record<string, string> = {
    '1st-sem': '1st Semester',
    '2nd-sem': '2nd Semester',
    summer: 'Summer',
};

export default function ViewSubjectsPage() {
    const { adminData } = useAdmin();
    const { subjects } = adminData;

    const totalSubjects = Object.values(subjects).reduce((total, list) => total + list.length, 0);

    return (
        <main className="flex-1 space-y-6 p-4 sm:p-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Subject Catalog (Read-Only)</h1>
                <p className="text-muted-foreground">
                    Browse every published subject along with its semester placement, units, and prerequisite expectations.
                </p>
            </div>

            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Catalog Snapshot</CardTitle>
                    <CardDescription>This data is synchronized from the registrar configuration and cannot be modified by your role.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-6 text-sm">
                    <div>
                        <p className="font-medium text-muted-foreground">Total Subjects</p>
                        <p className="text-2xl font-semibold">{totalSubjects}</p>
                    </div>
                    <div>
                        <p className="font-medium text-muted-foreground">Year Levels Covered</p>
                        <p className="text-2xl font-semibold">{YEAR_LEVELS.filter(({ key }) => (subjects[key] ?? []).length > 0).length}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {YEAR_LEVELS.map(({ key, label }) => {
                    const entries = subjects[key] ?? [];
                    return (
                        <Card key={key} className="rounded-xl">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{label}</CardTitle>
                                        <CardDescription>Subjects assigned to this year level.</CardDescription>
                                    </div>
                                    <Badge variant="secondary">{entries.length} listed</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {entries.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No subjects are configured for this year level.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {entries.map((subject) => (
                                            <div
                                                key={subject.id}
                                                className="rounded-xl border p-4"
                                            >
                                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <p className="text-base font-semibold">{subject.code} · {subject.description}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {semesterLabelMap[subject.semester] ?? subject.semester} · {subject.units} unit{subject.units === 1 ? '' : 's'}
                                                        </p>
                                                    </div>
                                                    <div className="text-sm">
                                                        <p className="font-medium text-muted-foreground">Prerequisites</p>
                                                        {subject.prerequisites.length === 0 ? (
                                                            <p>None</p>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-1">
                                                                {subject.prerequisites.map((code) => (
                                                                    <Badge key={`${subject.id}-${code}`} variant="outline">
                                                                        {code}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </main>
    );
}
