
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MoreHorizontal, CheckCircle2, XCircle, Pencil, X, RotateCw, Trash2, Search, FilterX, Filter, PlusCircle, UserPlus, AlertTriangle, BadgeCheck, FileText, Download, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAdmin, Application, ApplicationDocument, rejectionReasons } from '../../context/admin-context';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Student, Subject } from '../../context/admin-context';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const UNITS_FOR_2ND_YEAR = 36;
const UNITS_FOR_3RD_YEAR = 72;
const UNITS_FOR_4TH_YEAR = 108;

type CredentialRequirement = {
    key: keyof Application['credentials'];
    label: string;
    requiredFor: Array<Application['status']>;
    keywords?: string[];
};

type CredentialStatus = 'submitted' | 'pending' | 'rejected' | 'missing';

type CredentialStatusInfo = {
    status: CredentialStatus;
    document: ApplicationDocument | null;
};

const credentialLabels: CredentialRequirement[] = [
    { key: 'birthCertificate', label: 'Birth Certificate', requiredFor: ['New', 'Transferee'], keywords: ['birth certificate'] },
    { key: 'grades', label: 'Form 138 / Report Card', requiredFor: ['New', 'Transferee'], keywords: ['form 138', 'report card'] },
    { key: 'goodMoral', label: 'Good Moral Certificate', requiredFor: ['New', 'Transferee'], keywords: ['good moral'] },
    { key: 'registrationForm', label: 'Finished Registration Form', requiredFor: ['New', 'Old', 'Transferee'], keywords: ['registration form'] },
];

const normalizeForMatch = (value: string | null | undefined): string => {
    if (!value) {
        return '';
    }
    return value.toLowerCase();
};

const collapseForMatch = (value: string): string => value.replace(/[^a-z0-9]/g, '');

const getDocumentTimestamp = (document: ApplicationDocument): number => {
    const source = document.updatedAt ?? document.uploadedAt;
    if (!source) {
        return 0;
    }
    const parsed = Date.parse(source);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const findDocumentForCredential = (documents: ApplicationDocument[], keywords?: string[]): ApplicationDocument | null => {
    const normalizedKeywords = (keywords ?? [])
        .map((keyword) => normalizeForMatch(keyword).trim())
        .filter((keyword) => keyword !== '');

    if (normalizedKeywords.length === 0) {
        return null;
    }

    let bestMatch: ApplicationDocument | null = null;
    let bestTimestamp = -Infinity;

    documents.forEach((document) => {
        const combined = `${document.name ?? ''} ${document.fileName ?? ''}`;
        const normalizedCombined = normalizeForMatch(combined);
        const collapsedCombined = collapseForMatch(normalizedCombined);

        const matches = normalizedKeywords.some((keyword) => {
            const collapsedKeyword = collapseForMatch(keyword);
            return (
                normalizedCombined.includes(keyword)
                || (collapsedKeyword !== '' && collapsedCombined.includes(collapsedKeyword))
            );
        });

        if (!matches) {
            return;
        }

        const timestamp = getDocumentTimestamp(document);
        if (timestamp > bestTimestamp) {
            bestMatch = document;
            bestTimestamp = timestamp;
        }
    });

    return bestMatch;
};

const mapDocumentStatus = (status: ApplicationDocument['status']): CredentialStatus => {
    if (status === 'Pending') {
        return 'pending';
    }
    if (status === 'Rejected') {
        return 'rejected';
    }
    return 'submitted';
};

const credentialStatusMeta: Record<CredentialStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
    submitted: { label: 'Submitted', icon: CheckCircle2, className: 'text-green-500' },
    pending: { label: 'Pending Review', icon: Clock, className: 'text-amber-500' },
    rejected: { label: 'Rejected', icon: XCircle, className: 'text-red-500' },
    missing: { label: 'Not submitted', icon: AlertTriangle, className: 'text-muted-foreground' },
};

const defaultCredentialStatus: CredentialStatusInfo = { status: 'missing', document: null };

const formatDocumentDate = (value: string | null | undefined): string => {
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

const formatDocumentSize = (bytes: number | null | undefined): string => {
    if (bytes === null || bytes === undefined || bytes <= 0) {
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

const toRecord = (value: unknown): Record<string, unknown> | null => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return null;
};

const pickRecord = (source: Record<string, unknown> | null, key: string): Record<string, unknown> | null => {
    if (!source) {
        return null;
    }
    return toRecord(source[key] ?? null);
};

const getStringValue = (source: Record<string, unknown> | null, key: string): string | null => {
    if (!source || !Object.prototype.hasOwnProperty.call(source, key)) {
        return null;
    }
    const raw = source[key];
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        return trimmed === '' ? null : trimmed;
    }
    return null;
};

const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry !== '');
};

const withFallback = (value: string | null | undefined, fallback = 'Not provided'): string => {
    if (value && value.trim() !== '') {
        return value;
    }
    return fallback;
};

const getRequestedSubjectCodes = (application: Application | null): string[] => {
    if (!application || !application.formSnapshot) {
        return [];
    }

    const root = toRecord(application.formSnapshot);
    if (!root) {
        return [];
    }

    const nestedForm = pickRecord(root, 'formSnapshot');
    const academic = pickRecord(nestedForm, 'academic') ?? pickRecord(root, 'academic');
    const applicationSnapshot = pickRecord(root, '_application');
    const applicationAcademic = pickRecord(applicationSnapshot, 'academic');

    const buckets: string[][] = [];
    buckets.push(toStringArray(root['subjects'] ?? null));
    if (academic) {
        buckets.push(toStringArray(academic['subjects'] ?? null));
    }
    if (applicationAcademic) {
        buckets.push(toStringArray(applicationAcademic['subjects'] ?? null));
    }

    const uniqueCodes = new Set<string>();
    buckets.flat().forEach((code) => {
        if (code) {
            uniqueCodes.add(code);
        }
    });

    return Array.from(uniqueCodes);
};


export default function ManageApplicationsPage() {
    const { adminData, refreshAdminData } = useAdmin();
  const { pendingApplications, approvedApplications, rejectedApplications, blocks, subjects: yearLevelSubjects, students } = adminData;
  const { toast } = useToast();

    const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api').replace(/\/$/, '');
    const buildApiUrl = useCallback((endpoint: string) => `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`, [API_BASE_URL]);

    const [busyAction, setBusyAction] = useState<string | null>(null);
        const isBusy = useCallback((key: string) => busyAction === key, [busyAction]);

    const callAdminApi = useCallback(async <T = unknown>(endpoint: string, payload: unknown) => {
        const response = await fetch(buildApiUrl(endpoint), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        let data: any = null;
        try {
            data = await response.json();
        } catch (error) {
            // No body is still an error for our use case.
        }

        if (!response.ok) {
            const message = data?.message ?? `Request failed with status ${response.status}`;
            throw new Error(message);
        }

        if (!data || data.status !== 'success') {
            throw new Error(data?.message ?? 'Request failed due to an unknown server error.');
        }

        return data as { status: 'success'; data?: T; message?: string };
    }, [buildApiUrl]);

  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState<{ isOpen: boolean; application: Application | null }>({
    isOpen: false,
    application: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; application: Application | null }>({
      isOpen: false,
      application: null,
  });
    const [isDirectEnrollOpen, setIsDirectEnrollOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
      course: 'all',
      year: 'all',
      status: 'all',
  });

  // Enrollment Dialog State
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [applicationToEnroll, setApplicationToEnroll] = useState<Application | null>(null);
  const [enrollBlock, setEnrollBlock] = useState('');
    const [enlistedSubjects, setEnlistedSubjects] = useState<Subject[]>([]);
    const [prerequisiteOverrides, setPrerequisiteOverrides] = useState<string[]>([]);


    // Direct Enroll State
    const [directEnrollStep, setDirectEnrollStep] = useState(1);
    const [directEnrollSearchId, setDirectEnrollSearchId] = useState('');
    const [foundStudent, setFoundStudent] = useState<Student | null>(null);
    const [directEnrollBlock, setDirectEnrollBlock] = useState('');
    const [directEnlistedSubjects, setDirectEnlistedSubjects] = useState<Subject[]>([]);

    const completedSubjectsForFoundStudent = useMemo(() => {
        if (!foundStudent) return [];
        return adminData.getCompletedSubjects(foundStudent.studentId);
    }, [adminData, foundStudent]);

    const totalUnitsForFoundStudent = useMemo(() => {
        return completedSubjectsForFoundStudent.reduce((acc, subj) => acc + subj.units, 0);
    }, [completedSubjectsForFoundStudent]);

    const flattenedSubjectCatalog = useMemo(() => {
        return Object.values(yearLevelSubjects).flat();
    }, [yearLevelSubjects]);

    const resolveDocumentBadgeVariant = (status: Application['documents'][number]['status']) => {
        switch (status) {
            case 'Pending':
                return 'secondary' as const;
            case 'Rejected':
                return 'destructive' as const;
            default:
                return 'default' as const;
        }
    };
    
    const handleDirectEnrollSearch = () => {
        const student = students.find(s => s.studentId === directEnrollSearchId && s.status !== 'Enrolled');
        if (student) {
            setFoundStudent(student);
            setDirectEnrollStep(2);
        } else {
            toast({
                variant: 'destructive',
                title: 'Student Not Found',
                description: 'No unenrolled student found with that ID. Please check the ID or their enrollment status.',
            });
        }
    };

    const resetDirectEnroll = () => {
        setIsDirectEnrollOpen(false);
        setTimeout(() => {
            setDirectEnrollStep(1);
            setDirectEnrollSearchId('');
            setFoundStudent(null);
            setDirectEnrollBlock('');
            setDirectEnlistedSubjects([]);
        }, 300);
    };

    const handleDirectEnrollSubmit = async () => {
        if (!foundStudent || !directEnrollBlock) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a block.' });
            return;
        }

        const actionKey = `direct-enroll-${foundStudent.id}`;
        if (isBusy(actionKey)) {
            return;
        }

        setBusyAction(actionKey);
        try {
            await callAdminApi('finalize_enrollment.php', {
                mode: 'direct',
                studentUserId: foundStudent.id,
                blockName: directEnrollBlock,
                subjectIds: directEnlistedSubjects.map(subject => subject.id),
            });

            await refreshAdminData();

            toast({
                title: 'Enrollment Successful',
                description: `${foundStudent.name} has been directly enrolled in block ${directEnrollBlock}.`,
            });

            resetDirectEnroll();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Direct enrollment failed. Please try again.';
            toast({ variant: 'destructive', title: 'Enrollment Failed', description: message });
        } finally {
            setBusyAction(null);
        }
    };

     const availableBlocksForDirectEnroll = useMemo(() => {
        if (!foundStudent) return [];
        let yearKey: '1st-year' | '2nd-year' | '3rd-year' | '4th-year' = '1st-year';
        if (foundStudent.year === 1) yearKey = '1st-year';
        else if (foundStudent.year === 2) yearKey = '2nd-year';
        else if (foundStudent.year === 3) yearKey = '3rd-year';
        else if (foundStudent.year === 4) yearKey = '4th-year';
        
        return blocks.filter(b => {
             const yearMatch = b.year === yearKey;
             const courseMatch = b.course === foundStudent.course;
             const specMatch = !foundStudent.specialization || b.specialization === foundStudent.specialization;
             return yearMatch && courseMatch && specMatch;
        });
    }, [blocks, foundStudent]);

    const availableSubjectsForDirectEnroll = useMemo(() => {
        if (!foundStudent) return [];
        let yearKey: '1st-year' | '2nd-year' | '3rd-year' | '4th-year' = '1st-year';
        if (foundStudent.year === 1) yearKey = '1st-year';
        if (foundStudent.year === 2) yearKey = '2nd-year';
        if (foundStudent.year === 3) yearKey = '3rd-year';
        if (foundStudent.year === 4) yearKey = '4th-year';

        const subjectsForYear = yearLevelSubjects[yearKey] ?? [];
        const validSemesters: Array<'1st-sem' | '2nd-sem' | 'summer'> = ['1st-sem', '2nd-sem', 'summer'];
        const activeSemester = validSemesters.includes(adminData.semester as '1st-sem' | '2nd-sem' | 'summer')
            ? (adminData.semester as '1st-sem' | '2nd-sem' | 'summer')
            : '1st-sem';
        const filtered = subjectsForYear.filter(subject => subject.semester === activeSemester);
        return filtered.length > 0 ? filtered : subjectsForYear;
    }, [yearLevelSubjects, foundStudent, adminData.semester]);


    const completedSubjectsForEnrollment = useMemo(() => {
        if (!applicationToEnroll) return [];
        const student = adminData.students.find(s => s.studentId === applicationToEnroll.studentId);
        const completed = student ? adminData.getCompletedSubjects(student.studentId) : [];
        const overridden = prerequisiteOverrides.map(code => ({ code, units: 0 })); // Units don't matter for prereq check
        return [...completed, ...overridden];
    }, [adminData, applicationToEnroll, prerequisiteOverrides]);


    const availableSubjectsForEnrollment = useMemo(() => {
        if (!applicationToEnroll) {
            return [];
        }

        const requestedCodes = getRequestedSubjectCodes(applicationToEnroll);
        if (requestedCodes.length === 0) {
            return [];
        }

        const requestedSet = new Set(requestedCodes);
        const orderedSubjects: Subject[] = [];

        requestedCodes.forEach((code) => {
            const match = flattenedSubjectCatalog.find((subject) => subject.code === code);
            if (match) {
                orderedSubjects.push(match);
            }
        });

        return orderedSubjects;
    }, [applicationToEnroll, flattenedSubjectCatalog]);

    const allPrerequisites = useMemo(() => {
        const prereqs = new Set<string>();
        Object.values(yearLevelSubjects).flat().forEach((subject) => {
            getSubjectPrerequisites(subject).forEach((code) => prereqs.add(code));
        });
        const allSubjects = Object.values(yearLevelSubjects).flat();
        return Array.from(prereqs).map((code) => allSubjects.find((s) => s.code === code)).filter(Boolean) as Subject[];
    }, [yearLevelSubjects]);

  const openEnrollDialog = (application: Application) => {
    setApplicationToEnroll(application);
    setEnrollBlock(application.block || ''); // Use block from application
    setIsEnrollDialogOpen(true);
    setPrerequisiteOverrides([]);
  };

  useEffect(() => {
    setEnlistedSubjects([]);
  }, [enrollBlock]);

    useEffect(() => {
        if (!isEnrollDialogOpen) {
                return;
        }
        setEnlistedSubjects(availableSubjectsForEnrollment);
    }, [isEnrollDialogOpen, availableSubjectsForEnrollment]);


    const formReview = useMemo(() => {
        if (!selectedApplication?.formSnapshot) {
            return null;
        }

        const root = toRecord(selectedApplication.formSnapshot);
        if (!root) {
            return null;
        }

        const nestedForm = pickRecord(root, 'formSnapshot');
        const personal = pickRecord(nestedForm, 'personal') ?? pickRecord(root, 'personal');
        const contact = pickRecord(nestedForm, 'contact') ?? pickRecord(root, 'contact');
        const address = pickRecord(nestedForm, 'address') ?? pickRecord(root, 'address');
        const family = pickRecord(nestedForm, 'family') ?? pickRecord(root, 'family');
        const additional = pickRecord(nestedForm, 'additional') ?? pickRecord(root, 'additional');
        const education = pickRecord(nestedForm, 'education') ?? pickRecord(root, 'education');
        const academic = pickRecord(nestedForm, 'academic') ?? pickRecord(root, 'academic');
        const student = pickRecord(root, 'student');

        const firstName = getStringValue(personal, 'firstName');
        const middleName = getStringValue(personal, 'middleName');
        const lastName = getStringValue(personal, 'lastName');
        const nameSegments = [firstName, middleName, lastName].filter((segment): segment is string => !!segment && segment.trim() !== '');
        const fullName = nameSegments.length > 0 ? nameSegments.join(' ') : selectedApplication.name;

        const email = getStringValue(contact, 'email') ?? getStringValue(student, 'email');
        const phoneNumber = getStringValue(contact, 'phoneNumber');

        const rootSubjects = toStringArray(root['subjects'] ?? null);
        const academicSubjects = academic ? toStringArray(academic['subjects'] ?? null) : [];
        const subjectCodes = Array.from(new Set([...rootSubjects, ...academicSubjects]));

        const subjects = subjectCodes.map((code) => {
            const match = flattenedSubjectCatalog.find((subject) => subject.code === code);
            return {
                code,
                description: match?.description ?? null,
                units: match?.units ?? null,
            };
        });

        return {
            student: {
                id: getStringValue(student, 'studentIdNumber') ?? selectedApplication.studentId,
                email,
                status: getStringValue(academic, 'status') ?? getStringValue(root, 'studentStatus') ?? selectedApplication.status,
                block: getStringValue(academic, 'block') ?? getStringValue(root, 'blockName') ?? selectedApplication.block ?? null,
                specialization: getStringValue(academic, 'specialization') ?? getStringValue(root, 'specialization'),
                course: getStringValue(academic, 'course') ?? getStringValue(root, 'course') ?? selectedApplication.course,
                yearLevel: getStringValue(academic, 'yearLevel') ?? getStringValue(root, 'yearLevel') ?? `${selectedApplication.year}`,
            },
            personal: {
                name: fullName,
                birthdate: getStringValue(personal, 'birthdate'),
                sex: getStringValue(personal, 'sex'),
                civilStatus: getStringValue(personal, 'civilStatus'),
                nationality: getStringValue(personal, 'nationality'),
                religion: getStringValue(personal, 'religion'),
                dialect: getStringValue(personal, 'dialect'),
            },
            contact: {
                email,
                phoneNumber,
            },
            address: {
                currentAddress: getStringValue(address, 'currentAddress'),
                permanentAddress: getStringValue(address, 'permanentAddress'),
            },
            family: {
                fathersName: getStringValue(family, 'fathersName'),
                fathersOccupation: getStringValue(family, 'fathersOccupation'),
                mothersName: getStringValue(family, 'mothersName'),
                mothersOccupation: getStringValue(family, 'mothersOccupation'),
                guardiansName: getStringValue(family, 'guardiansName'),
            },
            additional: {
                emergencyContactName: getStringValue(additional, 'emergencyContactName'),
                emergencyContactAddress: getStringValue(additional, 'emergencyContactAddress'),
                emergencyContactNumber: getStringValue(additional, 'emergencyContactNumber'),
            },
            education: {
                elementarySchool: getStringValue(education, 'elementarySchool'),
                elemYearGraduated: getStringValue(education, 'elemYearGraduated'),
                secondarySchool: getStringValue(education, 'secondarySchool'),
                secondaryYearGraduated: getStringValue(education, 'secondaryYearGraduated'),
                collegiateSchool: getStringValue(education, 'collegiateSchool'),
            },
            subjects,
        };
    }, [selectedApplication, flattenedSubjectCatalog]);

        const selectedApplicationDocuments = selectedApplication?.documents ?? [];
        const credentialStatuses = useMemo<Partial<Record<keyof Application['credentials'], CredentialStatusInfo>>>(() => {
            if (!selectedApplication) {
                return {};
            }

            const baseCredentials = selectedApplication.credentials ?? {};
            const documents = selectedApplicationDocuments;
            const result: Partial<Record<keyof Application['credentials'], CredentialStatusInfo>> = {};

            credentialLabels.forEach((credential) => {
                const matchedDocument = findDocumentForCredential(documents, credential.keywords);
                if (matchedDocument) {
                    result[credential.key] = {
                        status: mapDocumentStatus(matchedDocument.status),
                        document: matchedDocument,
                    };
                    return;
                }

                const canUseFormSnapshot = (
                    credential.key === 'registrationForm'
                    && Boolean(baseCredentials[credential.key])
                    && Boolean(selectedApplication.formSnapshot)
                );

                result[credential.key] = canUseFormSnapshot
                    ? {
                        status: 'submitted',
                        document: null,
                    }
                    : { ...defaultCredentialStatus };
            });

            return result;
        }, [selectedApplication, selectedApplicationDocuments]);
        const formattedSubmittedAt = selectedApplication?.submittedAt ? formatDocumentDate(selectedApplication.submittedAt) : null;
        const personalBirthdate = formReview?.personal?.birthdate ? formatDocumentDate(formReview.personal.birthdate) : null;
        const contactEmail = formReview?.contact?.email ?? formReview?.student?.email ?? null;
        const contactPhone = formReview?.contact?.phoneNumber ?? null;
        const reviewSubjects = formReview?.subjects ?? [];

  const handleOpenRejectionDialog = (application: Application) => {
    setRejectionDialog({ isOpen: true, application });
  };

  const handleCloseRejectionDialog = () => {
    setRejectionDialog({ isOpen: false, application: null });
  };

  const handleApprove = async (application: Application) => {
    const actionKey = `approve-${application.id}`;
    if (isBusy(actionKey)) {
        return;
    }

    setBusyAction(actionKey);
    try {
        await callAdminApi('update_application_status.php', {
            applicationId: application.id,
            status: 'approved',
            blockName: application.block ?? null,
        });

        await refreshAdminData();

        toast({
            title: 'Application Approved',
            description: `${application.name}'s application has been marked as approved.`,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not approve the application. Please try again.';
        toast({ variant: 'destructive', title: 'Approval Failed', description: message });
    } finally {
        setBusyAction(null);
        setSelectedApplication(null);
    }
  };

  const handleReject = async (application: Application, reason: string) => {
    const actionKey = `reject-${application.id}`;
    if (isBusy(actionKey)) {
        return;
    }

    setBusyAction(actionKey);
    try {
        await callAdminApi('update_application_status.php', {
            applicationId: application.id,
            status: 'rejected',
            rejectionReason: reason,
            blockName: application.block ?? null,
        });

        await refreshAdminData();

        toast({
            title: 'Application Rejected',
            description: `${application.name}'s application has been rejected.`,
        });

        handleCloseRejectionDialog();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not reject the application. Please try again.';
        toast({ variant: 'destructive', title: 'Rejection Failed', description: message });
    } finally {
        setBusyAction(null);
        setSelectedApplication(null);
    }
  };
  
  const handleRetrieve = async (application: Application) => {
    const actionKey = `retrieve-${application.id}`;
    if (isBusy(actionKey)) {
        return;
    }

    setBusyAction(actionKey);
    try {
        await callAdminApi('update_application_status.php', {
            applicationId: application.id,
            status: 'pending',
            blockName: application.block ?? null,
        });

        await refreshAdminData();

        toast({
            title: 'Application Retrieved',
            description: `${application.name}'s application has been moved back to pending.`,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not retrieve the application. Please try again.';
        toast({ variant: 'destructive', title: 'Retrieve Failed', description: message });
    } finally {
        setBusyAction(null);
    }
  };

  const handleDelete = async (application: Application) => {
    const actionKey = `delete-${application.id}`;
    if (isBusy(actionKey)) {
        return;
    }

    setBusyAction(actionKey);
    try {
        await callAdminApi('delete_application.php', {
            applicationId: application.id,
        });

        await refreshAdminData();

        toast({
            title: 'Application Deleted',
            description: `${application.name}'s application has been removed.`,
        });

        setDeleteDialog({ isOpen: false, application: null });
        setDeleteInput('');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not delete the application. Please try again.';
        toast({ variant: 'destructive', title: 'Delete Failed', description: message });
    } finally {
        setBusyAction(null);
    }
  };
  
  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearFilters = () => {
      setSearchTerm('');
      setFilters({ course: 'all', year: 'all', status: 'all' });
  };

  const handleEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!applicationToEnroll || !enrollBlock) {
        toast({
            variant: 'destructive',
            title: 'Enrollment Failed',
            description: 'No block assigned to this application.',
        });
        return;
    }

    if (!applicationToEnroll.studentUserId) {
        toast({
            variant: 'destructive',
            title: 'Enrollment Failed',
            description: 'This application is missing the associated student record.',
        });
        return;
    }

    const actionKey = `enroll-${applicationToEnroll.id}`;
    if (isBusy(actionKey)) {
        return;
    }

    setBusyAction(actionKey);
    try {
        await callAdminApi('finalize_enrollment.php', {
            mode: 'application',
            applicationId: applicationToEnroll.id,
            studentUserId: applicationToEnroll.studentUserId,
            blockName: enrollBlock,
            subjectIds: enlistedSubjects.map(subject => subject.id),
            prerequisiteOverrides,
        });

        await refreshAdminData();

        toast({
            title: 'Enrollment Successful',
            description: `${applicationToEnroll.name} has been enrolled in block ${enrollBlock}.`,
        });

        setIsEnrollDialogOpen(false);
        setApplicationToEnroll(null);
        setEnlistedSubjects([]);
        setPrerequisiteOverrides([]);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not enroll the student. Please try again.';
        toast({ variant: 'destructive', title: 'Enrollment Failed', description: message });
    } finally {
        setBusyAction(null);
    }
  };


  const filteredApplications = useMemo(() => {
        let applications: Application[] = [];
        if (activeTab === 'pending') applications = pendingApplications;
        else if (activeTab === 'approved') applications = approvedApplications;
        else if (activeTab === 'rejected') applications = rejectedApplications;

        return applications.filter(app => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm ? 
                app.name.toLowerCase().includes(searchTermLower) || 
                app.studentId.toLowerCase().includes(searchTermLower) : true;
            
            const matchesCourse = filters.course !== 'all' ? app.course === filters.course : true;
            const matchesYear = filters.year !== 'all' ? app.year.toString() === filters.year : true;
            const matchesStatus = filters.status !== 'all' ? app.status === filters.status : true;

            return matchesSearch && matchesCourse && matchesYear && matchesStatus;
        });
    }, [activeTab, pendingApplications, approvedApplications, rejectedApplications, searchTerm, filters]);

  const allAppsForFilters = [...pendingApplications, ...approvedApplications, ...rejectedApplications];
  const courses = ['all', ...Array.from(new Set(allAppsForFilters.map(app => app.course)))];
  const years = ['all', ...Array.from(new Set(allAppsForFilters.map(app => app.year.toString())))].sort();
  const statuses = ['all', ...Array.from(new Set(allAppsForFilters.map(app => app.status)))];
  const isFiltered = searchTerm || filters.course !== 'all' || filters.year !== 'all' || filters.status !== 'all';

  function getSubjectPrerequisites(subject: Subject): string[] {
      if (Array.isArray(subject.prerequisites) && subject.prerequisites.length > 0) {
          return subject.prerequisites;
      }
      if (subject.prerequisite) {
          return [subject.prerequisite];
      }
      return [];
  }

  function hasMetPrerequisites(subject: Subject, completedSubjects: { code: string; units: number }[]): boolean {
      const prerequisites = getSubjectPrerequisites(subject);
      if (prerequisites.length === 0) {
          return true;
      }
      const completedCodes = new Set(completedSubjects.map((entry) => entry.code));
      return prerequisites.every((code) => completedCodes.has(code));
  }

    const SubjectCheckbox = ({ subject, checked, onCheckedChange, completedSubjects }: { subject: Subject; checked: boolean; onCheckedChange: (checked: boolean) => void; completedSubjects: { code: string, units: number }[] }) => {
        const prerequisites = getSubjectPrerequisites(subject);
        const unmetPrereqs = prerequisites.filter((code) => !completedSubjects.some((cs) => cs.code === code));
        const hasPassedPrerequisite = unmetPrereqs.length === 0;

    const checkbox = (
        <Checkbox
            id={`sub-${subject.id}`}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={!hasPassedPrerequisite}
        />
    );

    if (hasPassedPrerequisite) {
        return checkbox;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span>{checkbox}</span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>
                        Prerequisite{unmetPrereqs.length > 1 ? 's' : ''} not met: {unmetPrereqs.join(', ')}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const ReviewField = ({ label, value }: { label: string, value?: string | null }) => (
    value ? (
        <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value}</span>
        </div>
    ) : null
);

  return (
    <>
        <main className="flex-1 p-4 sm:p-6 space-y-6">
             <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Manage Applications</h1>
                    <p className="text-muted-foreground">
                        Review, approve, and reject applications for enrollment.
                    </p>
                </div>
                 <Dialog open={isDirectEnrollOpen} onOpenChange={setIsDirectEnrollOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Direct Enroll Student
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-xl sm:max-w-lg">
                        {directEnrollStep === 1 && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Direct Enrollment: Find Student</DialogTitle>
                                    <DialogDescription>
                                        Enter the Student ID of the student you want to enroll. Only unenrolled students can be found.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="studentId-search">Student ID</Label>
                                        <Input
                                            id="studentId-search"
                                            value={directEnrollSearchId}
                                            onChange={(e) => setDirectEnrollSearchId(e.target.value)}
                                            className="rounded-xl"
                                            placeholder="e.g., 23-00-0456"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={resetDirectEnroll} className="rounded-xl">Cancel</Button>
                                    <Button onClick={handleDirectEnrollSearch} className="rounded-xl">Find Student</Button>
                                </DialogFooter>
                            </>
                        )}
                        {directEnrollStep === 2 && foundStudent && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Direct Enrollment: Assign Block & Subjects</DialogTitle>
                                    <DialogDescription>
                                        Assign a block and subjects for {foundStudent.name}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-4">
                                    <Card className="p-4 rounded-xl bg-secondary/50 border-none">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-16 w-16">
                                                <AvatarImage src={foundStudent.avatar} alt={foundStudent.name} />
                                                <AvatarFallback>{foundStudent.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-0.5 text-sm">
                                                <p className="font-semibold text-base">{foundStudent.name}</p>
                                                <p><span className="text-muted-foreground">Email:</span> {foundStudent.email}</p>
                                                <p><span className="text-muted-foreground">Phone:</span> {foundStudent.phoneNumber}</p>
                                                <p><span className="text-muted-foreground">Sex:</span> {foundStudent.sex}</p>
                                                <p><span className="text-muted-foreground">Current Level:</span> {foundStudent.course} - {foundStudent.year} Year</p>
                                                 <p><span className="text-muted-foreground">Units Earned:</span> {totalUnitsForFoundStudent}</p>
                                            </div>
                                        </div>
                                    </Card>
                                    <div className="space-y-2">
                                        <Label htmlFor="block">Block</Label>
                                        <Select value={directEnrollBlock} onValueChange={setDirectEnrollBlock} required>
                                            <SelectTrigger id="block" className="rounded-xl"><SelectValue placeholder="Select a block" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {availableBlocksForDirectEnroll.map(b => (
                                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {directEnrollBlock && availableSubjectsForDirectEnroll.length > 0 && (
                                        <div className="space-y-3 mt-4 pt-4 border-t">
                                            <h4 className="font-medium">Enlist Subjects</h4>
                                            <div className="space-y-2">
                                                {availableSubjectsForDirectEnroll.map((subject) => {
                                                    const prerequisitesMet = hasMetPrerequisites(subject, completedSubjectsForFoundStudent);
                                                    return (
                                                        <div key={subject.id} className={cn("flex items-center space-x-2 p-2 border rounded-md", prerequisitesMet ? "" : "bg-muted/50")}>
                                                            <SubjectCheckbox
                                                                subject={subject}
                                                                checked={directEnlistedSubjects.some((s) => s.id === subject.id)}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setDirectEnlistedSubjects((prev) => [...prev, subject]);
                                                                    } else {
                                                                        setDirectEnlistedSubjects((prev) => prev.filter((s) => s.id !== subject.id));
                                                                    }
                                                                }}
                                                                completedSubjects={completedSubjectsForFoundStudent}
                                                            />
                                                            <Label htmlFor={`sub-${subject.id}`} className={cn("flex-1 font-normal", !prerequisitesMet && "text-muted-foreground")}>
                                                                {subject.code} - {subject.description}
                                                            </Label>
                                                            <span className="text-xs text-muted-foreground">{subject.units} units</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter className="sm:justify-between">
                                    <Button variant="outline" onClick={() => setDirectEnrollStep(1)} className="rounded-xl">Back</Button>
                                    <Button onClick={() => setDirectEnrollStep(3)} className="rounded-xl">Review</Button>
                                </DialogFooter>
                            </>
                        )}
                        {directEnrollStep === 3 && foundStudent && (
                             <>
                                <DialogHeader>
                                    <DialogTitle>Review Enrollment</DialogTitle>
                                    <DialogDescription>
                                        Please review the details below before finalizing the enrollment for {foundStudent.name}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-2 max-h-[60vh] overflow-y-auto pr-4">
                                     <Card className="p-4 rounded-xl bg-secondary/50 border-none">
                                        <div className="grid gap-1 text-sm">
                                            <p className="font-semibold text-base">{foundStudent.name}</p>
                                            <p><span className="text-muted-foreground">ID:</span> {foundStudent.studentId}</p>
                                            <p><span className="text-muted-foreground">Course:</span> {foundStudent.course} - {foundStudent.year} Year</p>
                                        </div>
                                    </Card>
                                    <div>
                                        <h4 className="font-semibold mb-2">Enrollment Details</h4>
                                        <div className="grid gap-1 text-sm p-3 border rounded-lg">
                                            <p><span className="text-muted-foreground">Assigned Block:</span> <span className="font-medium">{directEnrollBlock}</span></p>
                                        </div>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold mb-2">Enlisted Subjects ({directEnlistedSubjects.length})</h4>
                                        <div className="border rounded-lg max-h-40 overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Code</TableHead>
                                                        <TableHead>Description</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                {directEnlistedSubjects.length > 0 ? directEnlistedSubjects.map(sub => (
                                                    <TableRow key={sub.id}>
                                                        <TableCell>{sub.code}</TableCell>
                                                        <TableCell>{sub.description}</TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={2} className="text-center">No subjects enlisted.</TableCell>
                                                    </TableRow>
                                                )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setDirectEnrollStep(2)} className="rounded-xl">Back</Button>
                                    <Button
                                        onClick={handleDirectEnrollSubmit}
                                        className="rounded-xl"
                                        disabled={foundStudent ? isBusy(`direct-enroll-${foundStudent.id}`) : false}
                                    >
                                        Confirm Enrollment
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            <Card className="rounded-xl">
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                         <div className="relative flex-1 md:grow-0">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name or ID..."
                                className="w-full rounded-xl bg-background pl-8 md:w-[200px] lg:w-[240px]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-accent focus:text-accent rounded-xl">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 rounded-xl" align="end">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label>Course</Label>
                                            <Select value={filters.course} onValueChange={(value) => handleFilterChange('course', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl">
                                                    <SelectValue placeholder="All Courses" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {courses.map(course => <SelectItem key={course} value={course}>{course === 'all' ? 'All Courses' : course}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Year</Label>
                                            <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl">
                                                    <SelectValue placeholder="All Years" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {years.map(year => <SelectItem key={year} value={year}>{year === 'all' ? 'All Years' : `Year ${year}`}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl">
                                                    <SelectValue placeholder="All Types" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {statuses.map(status => <SelectItem key={status} value={status}>{status === 'all' ? 'All Types' : status}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {isFiltered && (
                                            <Button variant="ghost" onClick={clearFilters} className="h-10 justify-center rounded-xl">
                                                <FilterX className="mr-2 h-4 w-4" />
                                                Clear Filters
                                            </Button>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 rounded-xl">
                            <TabsTrigger value="pending" className="rounded-lg">Pending</TabsTrigger>
                            <TabsTrigger value="approved" className="rounded-lg">Approved</TabsTrigger>
                            <TabsTrigger value="rejected" className="rounded-lg">Rejected</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending">
                            <div className="border rounded-lg mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.map((application) => (
                                            <TableRow key={application.id}>
                                                <TableCell>{application.studentId}</TableCell>
                                                <TableCell className="font-medium">{application.name}</TableCell>
                                                <TableCell>{application.course}</TableCell>
                                                <TableCell>{application.year}</TableCell>
                                                <TableCell>{application.status}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => setSelectedApplication(application)}>
                                                                View Credentials
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onSelect={() => handleApprove(application)}
                                                                disabled={isBusy(`approve-${application.id}`)}
                                                            >
                                                                Approve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleOpenRejectionDialog(application)}>
                                                                Reject
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                 {filteredApplications.length === 0 && (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No pending applications match the current filters.
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="approved">
                             <div className="border rounded-lg mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.map((application) => (
                                            <TableRow key={application.id}>
                                                <TableCell>{application.studentId}</TableCell>
                                                <TableCell className="font-medium">{application.name}</TableCell>
                                                <TableCell>{application.course}</TableCell>
                                                <TableCell>{application.year}</TableCell>
                                                <TableCell>{application.status}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => openEnrollDialog(application)}>
                                                                <UserPlus className="mr-2 h-4 w-4" />
                                                                Enroll Student
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onSelect={() => handleOpenRejectionDialog(application)}>
                                                                <X className="mr-2 h-4 w-4" />
                                                                Reject
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredApplications.length === 0 && (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No approved applications match the current filters.
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="rejected">
                             <div className="border rounded-lg mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.map((application) => (
                                            <TableRow key={application.id}>
                                                <TableCell>{application.studentId}</TableCell>
                                                <TableCell className="font-medium">{application.name}</TableCell>
                                                <TableCell>{application.course}</TableCell>
                                                <TableCell>{application.year}</TableCell>
                                                 <TableCell>{application.status}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => setSelectedApplication(application)}>
                                                                View Credentials
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onSelect={() => handleRetrieve(application)}
                                                                disabled={isBusy(`retrieve-${application.id}`)}
                                                            >
                                                                <RotateCw className="mr-2 h-4 w-4" />
                                                                Retrieve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                                disabled={isBusy(`delete-${application.id}`)}
                                                                onSelect={() => {
                                                                    setDeleteDialog({ isOpen: true, application });
                                                                    setDeleteInput('');
                                                                }}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Permanently Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredApplications.length === 0 && (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No rejected applications match the current filters.
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
        
        {selectedApplication && (
            <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
                <DialogContent className="sm:max-w-lg rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Student Credentials</DialogTitle>
                        <DialogDescription>Review the submitted documents for this applicant.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <p className="text-sm font-medium text-right col-span-1">Name</p>
                            <p className="col-span-3 text-sm">{selectedApplication.name}</p>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                                <p className="text-sm font-medium text-right col-span-1">Course</p>
                            <p className="col-span-3 text-sm">{selectedApplication.course} {selectedApplication.year}</p>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                                <p className="text-sm font-medium text-right col-span-1">Type</p>
                            <p className="col-span-3 text-sm">
                                {selectedApplication.status}
                            </p>
                        </div>
                        {formattedSubmittedAt && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <p className="text-sm font-medium text-right col-span-1">Submitted</p>
                                <p className="col-span-3 text-sm">{formattedSubmittedAt}</p>
                            </div>
                        )}
                         {selectedApplication.rejectionReason && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <p className="text-sm font-medium text-right col-span-1">Reason</p>
                                <p className="col-span-3 text-sm text-destructive">{selectedApplication.rejectionReason}</p>
                            </div>
                        )}
                        <div className="space-y-3 mt-4">
                            {credentialLabels
                                .filter((cred) => cred.requiredFor.includes(selectedApplication.status))
                                .map((credential) => {
                                    const statusInfo = credentialStatuses[credential.key] ?? defaultCredentialStatus;
                                    const statusMeta = credentialStatusMeta[statusInfo.status];
                                    const StatusIcon = statusMeta.icon;
                                    const canViewForm = (
                                        credential.key === 'registrationForm'
                                        && Boolean(selectedApplication.credentials[credential.key])
                                        && Boolean(selectedApplication.formSnapshot)
                                    );

                                    return (
                                        <div key={credential.key} className="flex items-center justify-between">
                                            <span className="text-sm">{credential.label}</span>
                                            {canViewForm ? (
                                                <Button variant="secondary" size="sm" className="h-7 rounded-md" onClick={() => setIsReviewFormOpen(true)}>
                                                    <FileText className="h-3 w-3 mr-2" />
                                                    View Form
                                                </Button>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <StatusIcon className={`h-4 w-4 ${statusMeta.className}`} />
                                                    <span className="text-xs text-muted-foreground">{statusMeta.label}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                        <div className="mt-6 space-y-2">
                            <h4 className="text-sm font-semibold">Submitted Files</h4>
                            {selectedApplicationDocuments.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No documents have been uploaded yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedApplicationDocuments.map((doc) => {
                                        const downloadUrl = doc.filePath ? buildApiUrl(doc.filePath) : null;
                                        return (
                                            <div key={doc.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="font-medium">{doc.name || doc.fileName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDocumentDate(doc.uploadedAt)}
                                                        {doc.fileSize ? ` • ${formatDocumentSize(doc.fileSize)}` : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={resolveDocumentBadgeVariant(doc.status)}>{doc.status}</Badge>
                                                    {downloadUrl ? (
                                                        <Button asChild variant="outline" size="sm" className="h-8 rounded-full">
                                                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="mr-2 h-4 w-4" /> View
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Unavailable</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="destructive"
                            className="rounded-xl"
                            onClick={() => {
                                if (selectedApplication) {
                                    handleOpenRejectionDialog(selectedApplication);
                                }
                            }}
                            disabled={selectedApplication ? isBusy(`reject-${selectedApplication.id}`) || isBusy(`approve-${selectedApplication.id}`) : false}
                        >
                            Reject
                        </Button>
                        <Button
                            className="bg-green-500 hover:bg-green-600 text-white rounded-xl"
                            onClick={() => {
                                 if (selectedApplication) {
                                    handleApprove(selectedApplication);
                                }
                            }}
                            disabled={selectedApplication ? isBusy(`approve-${selectedApplication.id}`) : false}
                        >
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        
        {isReviewFormOpen && selectedApplication && (
             <Dialog open={isReviewFormOpen} onOpenChange={setIsReviewFormOpen}>
                <DialogContent className="sm:max-w-2xl rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Review Submitted Form</DialogTitle>
                        <DialogDescription>
                            This is the information submitted by {selectedApplication.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                        {formReview ? (
                            <div className="space-y-6">
                                <section>
                                    <h4 className="font-semibold mb-2">Student Details</h4>
                                    <div className="border rounded-lg p-4 space-y-1">
                                        <ReviewField label="Student ID" value={withFallback(formReview.student.id ?? selectedApplication.studentId)} />
                                        <ReviewField label="Course" value={withFallback(formReview.student.course ?? selectedApplication.course)} />
                                        <ReviewField label="Year Level" value={withFallback(formReview.student.yearLevel ?? `${selectedApplication.year}`)} />
                                        <ReviewField label="Student Type" value={withFallback(formReview.student.status ?? selectedApplication.status)} />
                                        <ReviewField label="Block" value={withFallback(formReview.student.block ?? selectedApplication.block ?? null)} />
                                        <ReviewField label="Specialization" value={withFallback(formReview.student.specialization, 'None')} />
                                        <ReviewField label="Email" value={withFallback(contactEmail)} />
                                        <ReviewField label="Phone" value={withFallback(contactPhone)} />
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-semibold mb-2">Personal Information</h4>
                                    <div className="border rounded-lg p-4 space-y-1">
                                        <ReviewField label="Full Name" value={withFallback(formReview.personal.name ?? selectedApplication.name)} />
                                        <ReviewField label="Birthdate" value={withFallback(personalBirthdate)} />
                                        <ReviewField label="Sex" value={withFallback(formReview.personal.sex)} />
                                        <ReviewField label="Civil Status" value={withFallback(formReview.personal.civilStatus)} />
                                        <ReviewField label="Nationality" value={withFallback(formReview.personal.nationality)} />
                                        <ReviewField label="Religion" value={withFallback(formReview.personal.religion)} />
                                        <ReviewField label="Dialect" value={withFallback(formReview.personal.dialect)} />
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-semibold mb-2">Address</h4>
                                    <div className="border rounded-lg p-4 space-y-1">
                                        <ReviewField label="Current Address" value={withFallback(formReview.address.currentAddress)} />
                                        <ReviewField label="Permanent Address" value={withFallback(formReview.address.permanentAddress)} />
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-semibold mb-2">Family Background</h4>
                                    <div className="border rounded-lg p-4 space-y-1">
                                        <ReviewField label="Father's Name" value={withFallback(formReview.family.fathersName)} />
                                        <ReviewField label="Father's Occupation" value={withFallback(formReview.family.fathersOccupation)} />
                                        <ReviewField label="Mother's Name" value={withFallback(formReview.family.mothersName)} />
                                        <ReviewField label="Mother's Occupation" value={withFallback(formReview.family.mothersOccupation)} />
                                        <ReviewField label="Guardian's Name" value={withFallback(formReview.family.guardiansName)} />
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-semibold mb-2">Emergency Contact</h4>
                                    <div className="border rounded-lg p-4 space-y-1">
                                        <ReviewField label="Contact Name" value={withFallback(formReview.additional.emergencyContactName)} />
                                        <ReviewField label="Contact Number" value={withFallback(formReview.additional.emergencyContactNumber)} />
                                        <ReviewField label="Contact Address" value={withFallback(formReview.additional.emergencyContactAddress)} />
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-semibold mb-2">Education History</h4>
                                    <div className="border rounded-lg p-4 space-y-1">
                                        <ReviewField label="Elementary School" value={withFallback(formReview.education.elementarySchool)} />
                                        <ReviewField label="Elementary Year Graduated" value={withFallback(formReview.education.elemYearGraduated)} />
                                        <ReviewField label="Secondary School" value={withFallback(formReview.education.secondarySchool)} />
                                        <ReviewField label="Secondary Year Graduated" value={withFallback(formReview.education.secondaryYearGraduated)} />
                                        <ReviewField label="Previous College" value={withFallback(formReview.education.collegiateSchool, 'None')} />
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-semibold mb-2">Enlisted Subjects</h4>
                                    {reviewSubjects.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No subjects were selected in this application.</p>
                                    ) : (
                                        <div className="border rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Code</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead className="w-20 text-right">Units</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {reviewSubjects.map((subject) => (
                                                        <TableRow key={`subject-${subject.code}`}>
                                                            <TableCell className="font-medium">{subject.code}</TableCell>
                                                            <TableCell>{withFallback(subject.description ?? null, 'Subject details unavailable')}</TableCell>
                                                            <TableCell className="text-right">{subject.units !== null && subject.units !== undefined ? subject.units : '—'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </section>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                                No form details were captured for this application.
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReviewFormOpen(false)} className="rounded-xl">Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

        {rejectionDialog.isOpen && rejectionDialog.application && (
            <Dialog open={rejectionDialog.isOpen} onOpenChange={(open) => !open && handleCloseRejectionDialog()}>
                <DialogContent className="sm:max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Reject Application</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting the application for <span className="font-semibold">{rejectionDialog.application.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="rejection-form" onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const reasonId = formData.get('rejection-reason') as string;
                        const customReason = formData.get('custom-reason') as string;
                        const reason = customReason || rejectionReasons.find(r => r.id === reasonId)?.label || 'No reason provided.';
                        if(rejectionDialog.application) {
                            handleReject(rejectionDialog.application, reason);
                        }
                    }}>
                        <div className="grid gap-4 py-4">
                            <Label>Select a reason:</Label>
                            <RadioGroup name="rejection-reason" defaultValue={rejectionReasons[0].id}>
                                {rejectionReasons.map((reason) => (
                                    <div key={reason.id} className="flex items-center space-x-2">
                                        <RadioGroupItem value={reason.id} id={reason.id} />
                                        <Label htmlFor={reason.id}>{reason.label}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="custom-reason">Or provide a custom reason:</Label>
                                <Textarea placeholder="Type your message here." id="custom-reason" name="custom-reason" className="rounded-xl"/>
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseRejectionDialog} className="rounded-xl">Cancel</Button>
                        <Button
                            variant="destructive"
                            type="submit"
                            form="rejection-form"
                            className="rounded-xl"
                            disabled={
                                rejectionDialog.application ? isBusy(`reject-${rejectionDialog.application.id}`) : false
                            }
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

        {isEnrollDialogOpen && applicationToEnroll && (
            <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                <DialogContent className="sm:max-w-lg rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Enroll Student</DialogTitle>
                        <DialogDescription>
                            Confirm block and enlist subjects for {applicationToEnroll.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="enroll-student-form" onSubmit={handleEnroll}>
                        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-4">
                             <div className="flex items-center justify-between gap-4 p-4 border rounded-xl">
                                <div className="flex items-center gap-4">
                                     <Avatar>
                                        <AvatarImage src={`https://picsum.photos/seed/${applicationToEnroll.id}/40/40`} alt={applicationToEnroll.name} />
                                        <AvatarFallback>{applicationToEnroll.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{applicationToEnroll.name}</p>
                                        <p className="text-sm text-muted-foreground">{applicationToEnroll.course} - {applicationToEnroll.year} Year ({applicationToEnroll.status})</p>
                                    </div>
                                </div>
                                 <div className="text-right">
                                    <Label className="text-xs">Assigned Block</Label>
                                    <p className="font-semibold">{enrollBlock || 'N/A'}</p>
                                 </div>
                            </div>
                            
                            {(applicationToEnroll.status === 'Transferee' || applicationToEnroll.status === 'New') && allPrerequisites.length > 0 && (
                                 <div className="space-y-3 mt-4 pt-4 border-t">
                                    <h4 className="font-medium">Credential Override</h4>
                                    <p className="text-xs text-muted-foreground">For transferees or new students, manually credit any prerequisites they have fulfilled.</p>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                        {allPrerequisites.map(prereq => (
                                            <div key={`prereq-${prereq.id}`} className="flex items-center space-x-2 p-2 border rounded-md">
                                                <Checkbox
                                                    id={`prereq-check-${prereq.id}`}
                                                    checked={prerequisiteOverrides.includes(prereq.code)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setPrerequisiteOverrides(prev => [...prev, prereq.code]);
                                                        } else {
                                                            setPrerequisiteOverrides(prev => prev.filter(code => code !== prereq.code));
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={`prereq-check-${prereq.id}`} className="flex-1 font-normal">
                                                    {prereq.code} - {prereq.description}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {enrollBlock && availableSubjectsForEnrollment.length > 0 && (
                                <div className="space-y-3 mt-4 pt-4 border-t">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium">Enlist Subjects</h4>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="select-all-subjects"
                                                checked={enlistedSubjects.length > 0 && enlistedSubjects.length === availableSubjectsForEnrollment.filter((s) => hasMetPrerequisites(s, completedSubjectsForEnrollment)).length}
                                                onCheckedChange={(checked) => {
                                                    const subjectsWithMetPrereqs = availableSubjectsForEnrollment.filter((s) => hasMetPrerequisites(s, completedSubjectsForEnrollment));
                                                    if (checked) {
                                                        setEnlistedSubjects(subjectsWithMetPrereqs);
                                                    } else {
                                                        setEnlistedSubjects([]);
                                                    }
                                                }}
                                            />
                                            <Label htmlFor="select-all-subjects" className="text-sm font-normal">
                                                Select All
                                            </Label>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                        {availableSubjectsForEnrollment.map((subject) => {
                                            const prerequisitesMet = hasMetPrerequisites(subject, completedSubjectsForEnrollment);
                                            return (
                                                <div key={subject.id} className={cn("flex items-center space-x-2 p-2 border rounded-md", prerequisitesMet ? "" : "bg-muted/50")}>
                                                    <SubjectCheckbox
                                                        subject={subject}
                                                        checked={enlistedSubjects.some((s) => s.id === subject.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setEnlistedSubjects((prev) => [...prev, subject]);
                                                            } else {
                                                                setEnlistedSubjects((prev) => prev.filter((s) => s.id !== subject.id));
                                                            }
                                                        }}
                                                        completedSubjects={completedSubjectsForEnrollment}
                                                    />
                                                    <Label
                                                        htmlFor={`sub-${subject.id}`}
                                                        className={cn("flex-1 font-normal cursor-pointer", !prerequisitesMet && "text-muted-foreground cursor-not-allowed")}
                                                    >
                                                        {subject.code} - {subject.description}
                                                    </Label>
                                                    <span className="text-xs text-muted-foreground">{subject.units} units</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button
                            type="submit"
                            form="enroll-student-form"
                            className="rounded-xl"
                            disabled={applicationToEnroll ? isBusy(`enroll-${applicationToEnroll.id}`) : false}
                        >
                            Confirm Enrollment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        
        {deleteDialog.isOpen && deleteDialog.application && (
            <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => {
                if (!open) {
                    setDeleteDialog({ isOpen: false, application: null });
                    setDeleteInput('');
                }
            }}>
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                             This action cannot be undone. This will permanently delete the application for <span className="font-semibold">{deleteDialog.application.name}</span>.
                            <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                         <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="mt-4 rounded-xl"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')} className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={
                                deleteInput !== 'delete' ||
                                (deleteDialog.application ? isBusy(`delete-${deleteDialog.application.id}`) : false)
                            }
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
                            onClick={() => handleDelete(deleteDialog.application!)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

    </>
  );
}

    