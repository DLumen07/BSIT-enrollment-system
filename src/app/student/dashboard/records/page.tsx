
'use client';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle, Clock, CloudUpload, Download, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useStudent } from '@/app/student/context/student-context';
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const normalizeStatusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'enrolled' || normalized === 'active') {
        return 'default';
    }
    if (normalized === 'completed' || normalized === 'submitted') {
        return 'secondary';
    }
    if (normalized === 'pending') {
        return 'outline';
    }
    if (normalized === 'rejected') {
        return 'destructive';
    }
    return 'outline';
};

const formatEnrollmentLabel = (academicYear: string, semester: string) => {
    const parts = [academicYear, semester].filter((value) => value && value.trim() !== '');
    return parts.length > 0 ? parts.join(', ') : 'Unspecified term';
};

const formatDisplayDate = (value: string | null) => {
    if (!value) {
        return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes <= 0) {
        return '—';
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function RecordsPage() {
    const { studentData, setStudentData } = useStudent();
    const { toast } = useToast();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [documentName, setDocumentName] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const apiBaseUrl = useMemo(() => {
        return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
            .replace(/\/$/, '')
            .trim();
    }, []);

    const buildApiUrl = useCallback(
        (path: string) => `${apiBaseUrl}/${path.replace(/^\/+/, '')}`,
        [apiBaseUrl],
    );

    const enrollmentHistory = useMemo(() => {
        return studentData?.records?.enrollmentHistory ?? [];
    }, [studentData?.records?.enrollmentHistory]);

    const documents = useMemo(() => {
        return studentData?.records?.documents ?? [];
    }, [studentData?.records?.documents]);

    const handleFileReset = useCallback(() => {
        setSelectedFile(null);
        setDocumentName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files && event.target.files.length > 0 ? event.target.files[0] : null;

        if (file && file.size > MAX_FILE_SIZE_BYTES) {
            toast({
                variant: 'destructive',
                title: 'File too large',
                description: 'Please upload a file that is 10MB or smaller.',
            });
            event.target.value = '';
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
        if (file && documentName.trim() === '') {
            const derivedName = file.name.replace(/\.[^.]+$/, '').trim();
            if (derivedName !== '') {
                setDocumentName(derivedName);
            }
        }
    }, [documentName, toast]);

    const refreshStudentRecords = useCallback(async () => {
        const email = studentData?.contact?.email;
        if (!email) {
            return;
        }

        try {
            const response = await fetch(
                `${apiBaseUrl}/student_profile.php?email=${encodeURIComponent(email)}`,
                {
                    method: 'GET',
                    credentials: 'include',
                },
            );

            const payload = await response.json();
            if (!response.ok || !payload || payload.status !== 'success' || !payload.data) {
                throw new Error(payload?.message ?? 'Unable to refresh student records.');
            }

            const announcements = Array.isArray(payload.data.announcements)
                ? payload.data.announcements
                : [];
            const records = payload.data.records && typeof payload.data.records === 'object'
                ? {
                        enrollmentHistory: Array.isArray(payload.data.records.enrollmentHistory)
                            ? payload.data.records.enrollmentHistory
                            : [],
                        documents: Array.isArray(payload.data.records.documents)
                            ? payload.data.records.documents
                            : [],
                    }
                : { enrollmentHistory: [], documents: [] };

            setStudentData({
                ...payload.data,
                announcements,
                records,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Refresh failed',
                description: error instanceof Error ? error.message : 'Unable to refresh records right now.',
            });
        }
    }, [apiBaseUrl, setStudentData, studentData?.contact?.email, toast]);

    const handleUpload = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedFile) {
            toast({
                variant: 'destructive',
                title: 'No file selected',
                description: 'Please choose a document to upload.',
            });
            return;
        }

        if (!studentData?.contact?.email) {
            toast({
                variant: 'destructive',
                title: 'Missing student email',
                description: 'We could not determine which student account to attach this document to.',
            });
            return;
        }

        const trimmedName = documentName.trim() !== ''
            ? documentName.trim()
            : selectedFile.name.replace(/\.[^.]+$/, '').trim();

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('document', selectedFile);
            formData.append('email', studentData.contact.email);
            if (trimmedName !== '') {
                formData.append('document_name', trimmedName);
            }

            const response = await fetch(`${apiBaseUrl}/upload_student_document.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const payload = await response.json();

            if (!response.ok || payload?.status !== 'success') {
                throw new Error(payload?.message ?? 'Failed to upload the document.');
            }

            const newDocument = payload?.data?.document;
            if (newDocument) {
                setStudentData((previous) => {
                    if (!previous) {
                        return previous;
                    }

                    const existingRecords = previous.records ?? { enrollmentHistory: [], documents: [] };

                    return {
                        ...previous,
                        records: {
                            enrollmentHistory: existingRecords.enrollmentHistory ?? [],
                            documents: [newDocument, ...(existingRecords.documents ?? [])],
                        },
                    };
                });
            }

            toast({
                title: 'Document uploaded',
                description: `${trimmedName !== '' ? trimmedName : selectedFile.name} has been submitted.`,
            });

            handleFileReset();
            await refreshStudentRecords();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Upload failed',
                description: error instanceof Error ? error.message : 'Unable to upload the document right now.',
            });
        } finally {
            setUploading(false);
        }
    }, [selectedFile, documentName, studentData?.contact?.email, apiBaseUrl, refreshStudentRecords, setStudentData, toast, handleFileReset]);

    return (
        <main className="flex-1 space-y-6 p-4 sm:p-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">My Records</h1>
                <p className="text-muted-foreground">
                    Review your enrollment history and submit required documents.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Enrollment History</CardTitle>
                            <CardDescription>A timeline of your academic standing across semesters.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {enrollmentHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                                    <FileText className="h-10 w-10 text-muted-foreground" />
                                    <p>No enrollment history is available yet.</p>
                                </div>
                            ) : (
                                <div className="relative pl-6">
                                    <div className="absolute left-6 top-0 bottom-0 w-0.5 rounded-full bg-border" />
                                    {enrollmentHistory.map((entry, index) => {
                                        const statusVariant = normalizeStatusVariant(entry.status);
                                        const icon = statusVariant === 'secondary' || statusVariant === 'default' ? (
                                            <CheckCircle className="h-6 w-6 text-green-500" />
                                        ) : (
                                            <Clock className="h-6 w-6 text-primary" />
                                        );

                                        return (
                                            <div key={`${entry.academicYear}-${entry.semester}-${index}`} className="relative mb-8 last:mb-0">
                                                <div className="absolute -left-9 flex h-6 w-6 items-center justify-center rounded-full bg-background">
                                                    {icon}
                                                </div>
                                                <div className="ml-4">
                                                    <p className="font-semibold">{formatEnrollmentLabel(entry.academicYear, entry.semester)}</p>
                                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                                        <Badge variant={statusVariant}>{entry.status || '—'}</Badge>
                                                        <span className="text-muted-foreground">{formatDisplayDate(entry.recordedAt)}</span>
                                                    </div>
                                                    {typeof entry.gpa === 'number' && !Number.isNaN(entry.gpa) && (
                                                        <p className="mt-1 text-sm">
                                                            GPA: <span className="font-medium">{entry.gpa.toFixed(2)}</span>
                                                        </p>
                                                    )}
                                                    {entry.notes && entry.notes.trim() !== '' && (
                                                        <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Submit Document</CardTitle>
                            <CardDescription>Upload images or PDF files required by the registrar.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpload}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="document-name">Document Name</Label>
                                    <Input
                                        id="document-name"
                                        placeholder="e.g., Birth Certificate"
                                        value={documentName}
                                        onChange={(event) => setDocumentName(event.target.value)}
                                        className="rounded-xl"
                                        disabled={uploading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="document-file">Attachment</Label>
                                    <Input
                                        id="document-file"
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                                        onChange={handleFileChange}
                                        ref={fileInputRef}
                                        className="rounded-xl"
                                        disabled={uploading}
                                    />
                                    <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, WEBP, PDF (max 10MB).</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleFileReset}
                                    className="rounded-xl"
                                    disabled={uploading}
                                >
                                    Clear
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-xl"
                                    disabled={uploading || !selectedFile}
                                >
                                    <CloudUpload className="mr-2 h-4 w-4" />
                                    {uploading ? 'Uploading…' : 'Upload Document'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Document Records</CardTitle>
                            <CardDescription>Your submitted and pending requirement files.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {documents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                                    <FileText className="h-10 w-10 text-muted-foreground" />
                                    <p>No documents have been uploaded yet.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Document</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Uploaded</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.map((doc) => {
                                            const variant = normalizeStatusVariant(doc.status);
                                            const downloadUrl = doc.filePath ? buildApiUrl(doc.filePath) : null;
                                            return (
                                                <TableRow key={doc.id}>
                                                    <TableCell className="font-medium">{doc.name || doc.fileName}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={variant}>{doc.status}</Badge>
                                                    </TableCell>
                                                    <TableCell>{formatDisplayDate(doc.uploadedAt)}</TableCell>
                                                    <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {downloadUrl ? (
                                                            <Button asChild variant="outline" size="sm" className="rounded-full">
                                                                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                                                    <Download className="mr-2 h-4 w-4" /> View
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Unavailable</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
