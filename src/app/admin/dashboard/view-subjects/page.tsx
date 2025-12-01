'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

    const allSubjects = Object.values(subjects).flat();
    const totalSubjects = allSubjects.length;
    const totalUnits = allSubjects.reduce((sum, subject) => sum + subject.units, 0);
    const semesterBreakdown = allSubjects.reduce<Record<string, number>>((acc, subject) => {
        acc[subject.semester] = (acc[subject.semester] ?? 0) + 1;
        return acc;
    }, {});
    const averageUnits = totalSubjects === 0 ? 0 : totalUnits / totalSubjects;

    return (
        <main className="flex-1 space-y-6 p-4 sm:p-6">
            <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6">
                <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Moderator View
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight">Subject Catalog</h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        A guided, read-only catalog of every subject currently published by the registrar. Use this to monitor
                        coverage across year levels, semesters, and prerequisite chains without risking live data.
                    </p>
                </div>
            </section>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="rounded-2xl border">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Subjects</CardDescription>
                        <CardTitle className="text-4xl font-bold">{totalSubjects}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Across {YEAR_LEVELS.filter(({ key }) => (subjects[key] ?? []).length > 0).length} active year levels.
                        </p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border">
                    <CardHeader className="pb-2">
                        <CardDescription>Average Units</CardDescription>
                        <CardTitle className="text-4xl font-bold">{averageUnits.toFixed(1)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Based on {totalUnits} total units assigned to the catalog.
                        </p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border">
                    <CardHeader className="pb-2">
                        <CardDescription>Semester Coverage</CardDescription>
                        <CardTitle className="text-4xl font-bold">{Object.keys(semesterBreakdown).length}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {Object.entries(semesterLabelMap).map(([key, label]) => (
                            <div key={key} className="flex items-center justify-between text-muted-foreground">
                                <span>{label}</span>
                                <span className="font-semibold text-foreground">{semesterBreakdown[key] ?? 0}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                {YEAR_LEVELS.map(({ key, label }) => {
                    const entries = subjects[key] ?? [];
                    const totalUnitsForYear = entries.reduce((sum, subject) => sum + subject.units, 0);
                    const semesterCounts = entries.reduce<Record<string, number>>((acc, subject) => {
                        acc[subject.semester] = (acc[subject.semester] ?? 0) + 1;
                        return acc;
                    }, {});
                    const semesterGroups = entries.reduce<Record<string, typeof entries>>((acc, subject) => {
                        const semesterKey = subject.semester;
                        acc[semesterKey] = acc[semesterKey] ? [...acc[semesterKey], subject] : [subject];
                        return acc;
                    }, {});
                    const orderedSemesters = Object.keys(semesterLabelMap).filter((semesterKey) => semesterCounts[semesterKey]);
                    const primarySemesters = ['1st-sem', '2nd-sem'];
                    const extraSemesters = Object.keys(semesterGroups).filter(
                        (semesterKey) => !primarySemesters.includes(semesterKey)
                    );
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
                                    <div className="flex flex-col gap-6 lg:flex-row">
                                        <div className="w-full space-y-4 lg:w-1/3">
                                            <div className="rounded-2xl border bg-muted/40 p-4">
                                                <p className="text-sm text-muted-foreground">Total Units</p>
                                                <p className="text-3xl font-bold">{totalUnitsForYear}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Averaging {(totalUnitsForYear / entries.length).toFixed(1)} units per subject.
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border p-4">
                                                <p className="text-sm font-semibold">Semester Distribution</p>
                                                <div className="mt-4 space-y-4">
                                                    {orderedSemesters.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground">No semesters recorded.</p>
                                                    ) : (
                                                        orderedSemesters.map((semesterKey) => {
                                                            const count = semesterCounts[semesterKey];
                                                            const percent = Math.round((count / entries.length) * 100);
                                                            return (
                                                                <div key={semesterKey} className="space-y-2">
                                                                    <div className="flex items-center justify-between text-xs font-medium">
                                                                        <span>{semesterLabelMap[semesterKey]}</span>
                                                                        <span>{count} subj.</span>
                                                                    </div>
                                                                    <Progress value={percent} />
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full space-y-6 lg:flex-1">
                                            <div className="grid gap-4 lg:grid-cols-2">
                                                {primarySemesters.map((semesterKey) => {
                                                    const semesterEntries = semesterGroups[semesterKey] ?? [];
                                                    return (
                                                        <div key={`${key}-${semesterKey}`} className="rounded-2xl border p-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-xs font-semibold uppercase text-muted-foreground">Semester</p>
                                                                    <p className="text-lg font-bold">
                                                                        {semesterLabelMap[semesterKey] ?? semesterKey}
                                                                    </p>
                                                                </div>
                                                                <Badge variant="outline">{semesterEntries.length} subj.</Badge>
                                                            </div>
                                                            {semesterEntries.length === 0 ? (
                                                                <p className="mt-6 text-xs text-muted-foreground">No subjects scheduled.</p>
                                                            ) : (
                                                                <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-2 no-scrollbar">
                                                                    {semesterEntries.map((subject) => {
                                                                        const prerequisites = subject.prerequisites ?? [];
                                                                        return (
                                                                            <div
                                                                                key={subject.id}
                                                                                className="rounded-xl border bg-background/60 p-3"
                                                                            >
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <div>
                                                                                        <p className="text-sm font-semibold">{subject.code}</p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            {subject.description}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="text-right text-xs font-semibold">
                                                                                        <p>{subject.units} unit{subject.units === 1 ? '' : 's'}</p>
                                                                                        <p className="text-muted-foreground">ID #{subject.id}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                                                                                    <span className="font-semibold text-foreground">Prereq:</span>
                                                                                    {prerequisites.length === 0 ? (
                                                                                        <span>None</span>
                                                                                    ) : (
                                                                                        prerequisites.map((code) => (
                                                                                            <Badge key={`${subject.id}-${code}`} variant="secondary">
                                                                                                {code}
                                                                                            </Badge>
                                                                                        ))
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {extraSemesters.length > 0 && (
                                                <div className="space-y-4">
                                                    {extraSemesters.map((semesterKey) => {
                                                        const semesterEntries = semesterGroups[semesterKey] ?? [];
                                                        return (
                                                            <div key={`${key}-${semesterKey}`} className="rounded-2xl border p-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-xs font-semibold uppercase text-muted-foreground">Semester</p>
                                                                        <p className="text-lg font-bold">
                                                                            {semesterLabelMap[semesterKey] ?? semesterKey}
                                                                        </p>
                                                                    </div>
                                                                    <Badge variant="outline">{semesterEntries.length} subj.</Badge>
                                                                </div>
                                                                {semesterEntries.length === 0 ? (
                                                                    <p className="mt-6 text-xs text-muted-foreground">No subjects scheduled.</p>
                                                                ) : (
                                                                    <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-2 no-scrollbar">
                                                                        {semesterEntries.map((subject) => {
                                                                            const prerequisites = subject.prerequisites ?? [];
                                                                            return (
                                                                                <div
                                                                                    key={subject.id}
                                                                                    className="rounded-xl border bg-background/60 p-3"
                                                                                >
                                                                                    <div className="flex items-start justify-between gap-3">
                                                                                        <div>
                                                                                            <p className="text-sm font-semibold">{subject.code}</p>
                                                                                            <p className="text-xs text-muted-foreground">
                                                                                                {subject.description}
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="text-right text-xs font-semibold">
                                                                                            <p>{subject.units} unit{subject.units === 1 ? '' : 's'}</p>
                                                                                            <p className="text-muted-foreground">ID #{subject.id}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                                                                                        <span className="font-semibold text-foreground">Prereq:</span>
                                                                                        {prerequisites.length === 0 ? (
                                                                                            <span>None</span>
                                                                                        ) : (
                                                                                            prerequisites.map((code) => (
                                                                                                <Badge key={`${subject.id}-${code}`} variant="secondary">
                                                                                                    {code}
                                                                                                </Badge>
                                                                                            ))
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                Viewing {entries.length} subject{entries.length === 1 ? '' : 's'} assigned to {label}.
                                            </p>
                                        </div>
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
