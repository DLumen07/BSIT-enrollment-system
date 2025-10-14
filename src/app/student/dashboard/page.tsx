
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const [isEnrolled, setIsEnrolled] = useState(false);

  return (
    <main className="flex-1 p-4 sm:p-6">
        <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">Welcome, Student!</h1>
            {!isEnrolled && (
                 <p className="text-muted-foreground">
                    It looks like you haven't enrolled yet. Please complete your enrollment to access all features.
                </p>
            )}
        </div>

        {!isEnrolled && (
            <Alert className="mt-6 border-accent rounded-xl">
                <Info className="h-4 w-4" />
                <AlertTitle>Important Notice</AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    You are not yet officially enrolled for the current academic year. Please proceed to the enrollment page to complete the process.
                    <Button asChild variant="accent" className="mt-2 sm:mt-0 rounded-lg">
                        <Link href="/student/dashboard/enrollment">Go to Enrollment</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Enrollment Status</CardTitle>
                    <CardDescription>Your current enrollment details.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isEnrolled ? (
                        <>
                            <p className="font-semibold text-green-500">Enrolled</p>
                            <p className="text-sm text-muted-foreground">A.Y. 2024-2025, 1st Semester</p>
                        </>
                    ) : (
                         <p className="font-semibold text-destructive">Not Enrolled</p>
                    )}
                </CardContent>
            </Card>
             <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Current Block</CardTitle>
                    <CardDescription>Your assigned section.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isEnrolled ? (
                        <p className="font-semibold">BSIT 2-A</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">N/A</p>
                    )}
                </CardContent>
            </Card>
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Announcements</CardTitle>
                    <CardDescription>Latest news and updates.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">Midterm examinations are next week. Good luck!</p>
                </CardContent>
            </Card>
        </div>
    </main>
  );
}
