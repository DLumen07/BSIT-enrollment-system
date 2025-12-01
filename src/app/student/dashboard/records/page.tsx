
'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle, Clock, CloudUpload, Download, FileText, Trash2 } from 'lucide-react';
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
import { notifyDataChanged, DATA_SYNC_CHANNEL } from '@/lib/live-sync';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const REQUIRED_DOCUMENTS = [
    { value: 'Birth Certificate', label: 'Birth Certificate' },
    { value: 'Form 138 / Report Card', label: 'Form 138 / Report Card' },
    { value: 'Good Moral Certificate', label: 'Good Moral Certificate' },
];

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
    const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteDoc, setPendingDeleteDoc] = useState<{ id: number; label: string } | null>(null);
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
    }, [toast]);

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

        if (documentName.trim() === '') {
            toast({
                variant: 'destructive',
                title: 'Select a requirement',
                description: 'Please choose which registrar requirement this upload fulfills.',
            });
            return;
        }

        const trimmedName = documentName.trim();

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
            notifyDataChanged();
            notifyDataChanged('student-documents');
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

    useEffect(() => {
        if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
            return;
        }

        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel(DATA_SYNC_CHANNEL);
        } catch (error) {
            console.warn('[StudentRecords] Unable to subscribe to data sync channel.', error);
            return;
        }

        const handler = (event: MessageEvent<{ topic?: string }>) => {
            if (event.data?.topic === 'student-documents') {
                refreshStudentRecords();
            }
        };

        channel.addEventListener('message', handler);
        return () => {
            channel?.removeEventListener('message', handler);
            channel?.close();
        };
    }, [refreshStudentRecords]);

    const handleDeleteDocument = useCallback(async (documentId: number) => {
        if (!studentData?.contact?.email) {
            toast({
                variant: 'destructive',
                title: 'Missing student email',
                description: 'We could not determine which student account owns this document.',
            });
            return false;
        }

        setDeletingDocumentId(documentId);
        try {
            const response = await fetch(`${apiBaseUrl}/delete_student_document.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ documentId, email: studentData.contact.email }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload || payload.status !== 'success') {
                throw new Error(payload?.message ?? 'Failed to delete the document.');
            }

            setStudentData((previous) => {
                if (!previous) {
                    return previous;
                }
                const existingRecords = previous.records ?? { enrollmentHistory: [], documents: [] };
                return {
                    ...previous,
                    records: {
                        enrollmentHistory: existingRecords.enrollmentHistory ?? [],
                        documents: (existingRecords.documents ?? []).filter((doc) => doc.id !== documentId),
                    },
                };
            });

            toast({
                title: 'Document removed',
                description: 'The document has been deleted successfully.',
            });

            await refreshStudentRecords();
            notifyDataChanged();
            notifyDataChanged('student-documents');
            return true;
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Delete failed',
                description: error instanceof Error ? error.message : 'Unable to delete the document right now.',
            });
            return false;
        } finally {
            setDeletingDocumentId(null);
        }
    }, [apiBaseUrl, refreshStudentRecords, setStudentData, studentData?.contact?.email, toast]);

    const promptDeleteDocument = useCallback((doc: { id?: number; name?: string | null; fileName?: string | null }) => {
        if (!doc.id || doc.id <= 0) {
            return;
        }
        const label = doc.name?.trim() || doc.fileName?.trim() || 'this document';
        setPendingDeleteDoc({ id: doc.id, label });
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
        setDeleteDialogOpen(open);
        if (!open) {
            setPendingDeleteDoc(null);
        }
    }, []);

    const confirmDeleteDocument = useCallback(async () => {
        if (!pendingDeleteDoc) {
            return;
        }
        const success = await handleDeleteDocument(pendingDeleteDoc.id);
        if (success) {
            setDeleteDialogOpen(false);
            setPendingDeleteDoc(null);
        }
    }, [handleDeleteDocument, pendingDeleteDoc]);

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
                                                    {typeof entry.gwa === 'number' && !Number.isNaN(entry.gwa) && (
                                                        <p className="mt-1 text-sm">
                                                            GWA: <span className="font-medium">{entry.gwa.toFixed(2)}</span>
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
                            <CardDescription>Upload the registrar requirements listed below.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpload}>
                            <CardContent className="space-y-4">
                                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground">Required documents:</p>
                                    <ul className="mt-2 space-y-1 list-disc list-inside">
                                        {REQUIRED_DOCUMENTS.map((doc) => (
                                            <li key={doc.value}>{doc.label}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="document-name">Select Requirement</Label>
                                    <Select
                                        value={documentName}
                                        onValueChange={setDocumentName}
                                        disabled={uploading}
                                    >
                                        <SelectTrigger id="document-name" className="rounded-xl">
                                            <SelectValue placeholder="Choose a document" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {REQUIRED_DOCUMENTS.map((doc) => (
                                                <SelectItem key={doc.value} value={doc.value}>
                                                    {doc.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    disabled={uploading || !selectedFile || !documentName}
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
                                            const canDelete = typeof doc.id === 'number' && doc.id > 0;
                                            const isDeleting = deletingDocumentId === doc.id;
                                            return (
                                                <TableRow key={doc.id}>
                                                    <TableCell className="font-medium">{doc.name || doc.fileName}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={variant}>{doc.status}</Badge>
                                                    </TableCell>
                                                    <TableCell>{formatDisplayDate(doc.uploadedAt)}</TableCell>
                                                    <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {downloadUrl ? (
                                                                <Button asChild variant="outline" size="sm" className="rounded-full">
                                                                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                                                        <Download className="mr-2 h-4 w-4" /> View
                                                                    </a>
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">Unavailable</span>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                disabled={!canDelete || isDeleting}
                                                                onClick={() => canDelete && promptDeleteDocument(doc)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="sr-only">Delete document</span>
                                                            </Button>
                                                        </div>
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
            <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingDeleteDoc
                                ? `"${pendingDeleteDoc.label}" will be permanently removed. You cannot undo this action.`
                                : 'This document will be permanently removed. You cannot undo this action.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(event) => {
                                event.preventDefault();
                                confirmDeleteDocument();
                            }}
                            disabled={!pendingDeleteDoc || deletingDocumentId === pendingDeleteDoc.id}
                        >
                            {pendingDeleteDoc && deletingDocumentId === pendingDeleteDoc.id ? 'Removing…' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
