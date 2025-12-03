
'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle, Clock, CloudUpload, Download, FileText, Trash2, History, FileCheck, AlertCircle, Calendar } from 'lucide-react';
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
        <main className="flex-1 space-y-6 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <History className="h-6 w-6 text-blue-500" />
                </div>
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">My Records</h1>
                    <p className="text-muted-foreground">
                        Review your enrollment history and submit required documents.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-2xl border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-sm">
                        <CardHeader className="border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-green-500/10">
                                    <Clock className="h-4 w-4 text-green-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Enrollment History</CardTitle>
                                    <CardDescription>A timeline of your academic standing across semesters.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {enrollmentHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-sm text-muted-foreground">
                                    <div className="p-3 rounded-full bg-white/5">
                                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                    <p>No enrollment history is available yet.</p>
                                </div>
                            ) : (
                                <div className="relative pl-6 space-y-8">
                                    <div className="absolute left-6 top-2 bottom-2 w-px bg-white/10" />
                                    {enrollmentHistory.map((entry, index) => {
                                        const statusVariant = normalizeStatusVariant(entry.status);
                                        const isCompleted = statusVariant === 'secondary' || statusVariant === 'default';
                                        
                                        return (
                                            <div key={`${entry.academicYear}-${entry.semester}-${index}`} className="relative pl-8 group">
                                                <div className={`absolute left-0 top-1 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-background ${
                                                    isCompleted ? 'bg-green-500/10' : 'bg-blue-500/10'
                                                }`}>
                                                    {isCompleted ? (
                                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                                    ) : (
                                                        <Clock className="h-5 w-5 text-blue-500" />
                                                    )}
                                                </div>
                                                <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                        <h3 className="font-semibold text-lg text-foreground">
                                                            {formatEnrollmentLabel(entry.academicYear, entry.semester)}
                                                        </h3>
                                                        <Badge variant={statusVariant} className="w-fit capitalize">
                                                            {entry.status || '—'}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Calendar className="h-4 w-4" />
                                                            <span>{formatDisplayDate(entry.recordedAt)}</span>
                                                        </div>
                                                        {typeof entry.gwa === 'number' && !Number.isNaN(entry.gwa) && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground">GWA:</span>
                                                                <span className="font-bold text-foreground">{entry.gwa.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {entry.notes && entry.notes.trim() !== '' && (
                                                        <div className="mt-3 pt-3 border-t border-white/10">
                                                            <p className="text-sm text-muted-foreground italic">"{entry.notes}"</p>
                                                        </div>
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
                    <Card className="rounded-2xl border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-sm">
                        <CardHeader className="border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-orange-500/10">
                                    <CloudUpload className="h-4 w-4 text-orange-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Submit Document</CardTitle>
                                    <CardDescription>Upload registrar requirements.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <form onSubmit={handleUpload}>
                            <CardContent className="space-y-4 pt-6">
                                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm">
                                    <div className="flex items-center gap-2 mb-2 text-foreground font-medium">
                                        <AlertCircle className="h-4 w-4 text-blue-400" />
                                        Required Documents
                                    </div>
                                    <ul className="space-y-1.5 ml-6 list-disc text-muted-foreground">
                                        {REQUIRED_DOCUMENTS.map((doc) => (
                                            <li key={doc.value}>{doc.label}</li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="document-name" className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Requirement Type</Label>
                                    <Select
                                        value={documentName}
                                        onValueChange={setDocumentName}
                                        disabled={uploading}
                                    >
                                        <SelectTrigger id="document-name" className="rounded-xl border-white/10 bg-white/5">
                                            <SelectValue placeholder="Select document type" />
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
                                    <Label htmlFor="document-file" className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">File Attachment</Label>
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Input
                                            id="document-file"
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                                            onChange={handleFileChange}
                                            ref={fileInputRef}
                                            className="rounded-xl border-white/10 bg-white/5 file:text-foreground cursor-pointer"
                                            disabled={uploading}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Supported: JPG, PNG, PDF (Max 10MB)
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end p-6">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleFileReset}
                                    className="rounded-xl hover:bg-white/10"
                                    disabled={uploading}
                                >
                                    Clear
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={uploading || !selectedFile || !documentName}
                                >
                                    {uploading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Uploading...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <CloudUpload className="h-4 w-4" />
                                            Upload
                                        </span>
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    <Card className="rounded-2xl border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-sm">
                        <CardHeader className="border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-purple-500/10">
                                    <FileCheck className="h-4 w-4 text-purple-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Uploaded Files</CardTitle>
                                    <CardDescription>Your submitted documents.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {documents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                                    <div className="p-3 rounded-full bg-white/5">
                                        <FileText className="h-6 w-6 text-muted-foreground/50" />
                                    </div>
                                    <p>No documents uploaded yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/10">
                                    {documents.map((doc) => {
                                        const variant = normalizeStatusVariant(doc.status);
                                        const downloadUrl = doc.filePath ? buildApiUrl(doc.filePath) : null;
                                        const canDelete = typeof doc.id === 'number' && doc.id > 0;
                                        const isDeleting = deletingDocumentId === doc.id;
                                        
                                        return (
                                            <div key={doc.id} className="p-4 hover:bg-white/5 transition-colors">
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="font-medium text-sm text-foreground line-clamp-1" title={doc.name || doc.fileName || ''}>
                                                        {doc.name || doc.fileName}
                                                    </div>
                                                    <Badge variant={variant} className="shrink-0 text-[10px] h-5 px-1.5">
                                                        {doc.status}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                                    <span>{formatDisplayDate(doc.uploadedAt)}</span>
                                                    <span>{formatFileSize(doc.fileSize)}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {downloadUrl ? (
                                                        <Button asChild variant="outline" size="sm" className="h-7 text-xs w-full border-white/10 hover:bg-white/10 hover:text-foreground rounded-lg">
                                                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="mr-2 h-3 w-3" /> View
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm" disabled className="h-7 text-xs w-full border-white/10 opacity-50 rounded-lg">
                                                            Unavailable
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                                                        disabled={!canDelete || isDeleting}
                                                        onClick={() => canDelete && promptDeleteDocument(doc)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
                <AlertDialogContent className="rounded-2xl border-white/10 bg-[#020617]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingDeleteDoc
                                ? `"${pendingDeleteDoc.label}" will be permanently removed. You cannot undo this action.`
                                : 'This document will be permanently removed. You cannot undo this action.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/10 hover:text-foreground">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-red-600 text-white hover:bg-red-700"
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
