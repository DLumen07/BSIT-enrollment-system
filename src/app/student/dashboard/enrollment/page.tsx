
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSignature } from 'lucide-react';
import Link from 'next/link';

export default function EnrollmentPage() {
    return (
        <main className="flex-1 p-4 sm:p-6">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Online Enrollment</CardTitle>
                    <CardDescription>
                        Complete your enrollment for the Academic Year 2024-2025, 1st Semester.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                        <FileSignature className="h-16 w-16 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Ready to Enroll?</h2>
                        <p className="text-muted-foreground mb-6">
                            Click the button below to start the enrollment process. Ensure your required documents are ready for submission.
                        </p>
                        <Button asChild size="lg">
                            <Link href="/student/dashboard/enrollment/form">Enroll Now</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
