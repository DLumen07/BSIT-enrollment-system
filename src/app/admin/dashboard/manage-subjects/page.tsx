
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ManageSubjectsPage() {
  return (
    <>
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Subjects</CardTitle>
                    <CardDescription>Add, edit, or remove subjects offered.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Subject management content goes here.</p>
                </CardContent>
            </Card>
        </main>
    </>
  );
}
