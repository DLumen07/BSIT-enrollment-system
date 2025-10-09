
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ManageBlocksPage() {
  return (
    <>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span>Admin</span>
                <ChevronRight className="h-4 w-4" />
                <span>Manage Enrollment</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground">Manage Blocks</span>
                </div>
            </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Blocks</CardTitle>
                    <CardDescription>Organize students into blocks or sections.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Block management content goes here.</p>
                </CardContent>
            </Card>
        </main>
    </>
  );
}
