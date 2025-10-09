
import Link from 'next/link';
import { ChevronRight, FileSignature, LayoutGrid, BookCopy, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ManageEnrollmentPage() {
  const managementOptions = [
    {
      title: 'Manage Applications',
      description: 'Review and process student applications.',
      link: '/admin/dashboard/manage-applications',
      icon: <FileSignature className="h-8 w-8 text-primary" />,
    },
    {
      title: 'Manage Blocks',
      description: 'Organize students into blocks or sections.',
      link: '/admin/dashboard/manage-blocks',
      icon: <LayoutGrid className="h-8 w-8 text-primary" />,
    },
    {
      title: 'Manage Subjects',
      description: 'Add, edit, or remove subjects offered.',
      link: '/admin/dashboard/manage-subjects',
      icon: <BookCopy className="h-8 w-8 text-primary" />,
    },
  ];

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>Admin</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Manage Enrollment</span>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold">Enrollment Management</h1>
            <p className="text-muted-foreground">Select a category to manage enrollment details.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementOptions.map((option) => (
            <Link href={option.link} key={option.title} className="group">
                <Card className="flex flex-col h-full hover:shadow-lg transition-shadow hover:border-primary">
                    <CardHeader className="flex flex-row items-start gap-4">
                        {option.icon}
                        <div>
                            <CardTitle>{option.title}</CardTitle>
                            <CardDescription>{option.description}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-end justify-end">
                        <div className="flex items-center text-sm font-medium text-primary">
                            <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                        </div>
                    </CardContent>
                </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
