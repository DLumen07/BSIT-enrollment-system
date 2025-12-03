
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MoreHorizontal, CheckCircle2, XCircle, Pencil, X, RotateCw, Trash2, Search, FilterX, Filter, PlusCircle, UserPlus, AlertTriangle, BadgeCheck, FileText, Download, Clock, BookOpen, User, Calendar, MapPin, Users, GraduationCap, Phone, Mail } from 'lucide-react';
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
import { UNIFAST_FEE_ITEMS, UNIFAST_FEE_TOTALS, formatCurrency } from '@/lib/unifast-fees';

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

        const currentUserRole = adminData.currentUser?.role ?? null;
        const canManageApprovedApplications = currentUserRole === 'Super Admin' || currentUserRole === 'Admin';

        const showRestrictedActionToast = useCallback(() => {
                toast({
                        variant: 'destructive',
                        title: 'Action restricted',
                        description: 'Only Admin or Super Admin accounts can enroll or modify approved applications.',
                });
        }, [toast]);

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
        if (!canManageApprovedApplications) {
            showRestrictedActionToast();
            return;
        }
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

    const enrollmentSpecialization = useMemo(() => {
        if (!applicationToEnroll?.formSnapshot) return null;
        const root = toRecord(applicationToEnroll.formSnapshot);
        if (!root) return null;
        const nestedForm = pickRecord(root, 'formSnapshot');
        const academic = pickRecord(nestedForm, 'academic') ?? pickRecord(root, 'academic');
        const spec = getStringValue(academic, 'specialization') ?? getStringValue(root, 'specialization');

        if (spec === 'AP') return 'Application Programming';
        if (spec === 'DD') return 'Digital Design';
        return spec;
    }, [applicationToEnroll]);

    const allPrerequisites = useMemo(() => {
        const prereqs = new Set<string>();
        Object.values(yearLevelSubjects).flat().forEach((subject) => {
            getSubjectPrerequisites(subject).forEach((code) => prereqs.add(code));
        });
        const allSubjects = Object.values(yearLevelSubjects).flat();
        return Array.from(prereqs).map((code) => allSubjects.find((s) => s.code === code)).filter(Boolean) as Subject[];
    }, [yearLevelSubjects]);

    const openEnrollDialog = (application: Application) => {
        if (!canManageApprovedApplications) {
                showRestrictedActionToast();
                return;
        }
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

    if (!canManageApprovedApplications) {
        showRestrictedActionToast();
        return;
    }

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
        <main className="flex-1 p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Manage Applications</h1>
                    <p className="text-muted-foreground">
                        Review, approve, and reject applications for enrollment.
                    </p>
                </div>
                 {canManageApprovedApplications ? (
                    <Dialog open={isDirectEnrollOpen} onOpenChange={setIsDirectEnrollOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/20 border-0">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Direct Enroll Student
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-xl sm:max-w-lg bg-slate-900/95 border-white/10 text-slate-200">
                        {directEnrollStep === 1 && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="text-white">Direct Enrollment: Find Student</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Enter the Student ID of the student you want to enroll. Only unenrolled students can be found.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="studentId-search" className="text-slate-300">Student ID</Label>
                                        <Input
                                            id="studentId-search"
                                            value={directEnrollSearchId}
                                            onChange={(e) => setDirectEnrollSearchId(e.target.value)}
                                            className="rounded-xl bg-transparent border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                            placeholder="e.g., 23-00-0456"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={resetDirectEnroll} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Cancel</Button>
                                    <Button onClick={handleDirectEnrollSearch} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0">Find Student</Button>
                                </DialogFooter>
                            </>
                        )}
                        {directEnrollStep === 2 && foundStudent && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="text-white">Direct Enrollment: Assign Block & Subjects</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Assign a block and subjects for {foundStudent.name}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-4">
                                    <Card className="p-4 rounded-xl bg-transparent border-white/10">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-16 w-16 border-2 border-white/10">
                                                <AvatarImage src={foundStudent.avatar} alt={foundStudent.name} />
                                                <AvatarFallback className="bg-blue-600 text-white">{foundStudent.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-0.5 text-sm text-slate-300">
                                                <p className="font-semibold text-base text-white">{foundStudent.name}</p>
                                                <p><span className="text-slate-500">Email:</span> {foundStudent.email}</p>
                                                <p><span className="text-slate-500">Phone:</span> {foundStudent.phoneNumber}</p>
                                                <p><span className="text-slate-500">Sex:</span> {foundStudent.sex}</p>
                                                <p><span className="text-slate-500">Current Level:</span> {foundStudent.course} - {foundStudent.year} Year</p>
                                                 <p><span className="text-slate-500">Units Earned:</span> {totalUnitsForFoundStudent}</p>
                                            </div>
                                        </div>
                                    </Card>
                                    <div className="space-y-2">
                                        <Label htmlFor="block" className="text-slate-300">Block</Label>
                                        <Select value={directEnrollBlock} onValueChange={setDirectEnrollBlock} required>
                                            <SelectTrigger id="block" className="rounded-xl bg-transparent border-white/10 text-white focus:ring-blue-500/20"><SelectValue placeholder="Select a block" /></SelectTrigger>
                                            <SelectContent className="rounded-xl bg-slate-900/95 border-white/10 text-slate-200">
                                                {availableBlocksForDirectEnroll.map(b => (
                                                    <SelectItem key={b.id} value={b.name} className="focus:bg-white/10 focus:text-white">{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {directEnrollBlock && availableSubjectsForDirectEnroll.length > 0 && (
                                        <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
                                            <h4 className="font-medium text-white">Enlist Subjects</h4>
                                            <div className="space-y-2">
                                                {availableSubjectsForDirectEnroll.map((subject) => {
                                                    const prerequisitesMet = hasMetPrerequisites(subject, completedSubjectsForFoundStudent);
                                                    return (
                                                        <div key={subject.id} className={cn("flex items-center space-x-2 p-2 border rounded-md border-white/10", prerequisitesMet ? "bg-transparent" : "bg-red-500/5 border-red-500/20")}>
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
                                                            <Label htmlFor={`sub-${subject.id}`} className={cn("flex-1 font-normal text-slate-300", !prerequisitesMet && "text-red-400")}>
                                                                {subject.code} - {subject.description}
                                                            </Label>
                                                            <span className="text-xs text-slate-500">{subject.units} units</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter className="sm:justify-between">
                                    <Button variant="outline" onClick={() => setDirectEnrollStep(1)} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Back</Button>
                                    <Button onClick={() => setDirectEnrollStep(3)} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0">Review</Button>
                                </DialogFooter>
                            </>
                        )}
                        {directEnrollStep === 3 && foundStudent && (
                             <>
                                <DialogHeader>
                                    <DialogTitle className="text-white">Review Enrollment</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Please review the details below before finalizing the enrollment for {foundStudent.name}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-2 max-h-[60vh] overflow-y-auto pr-4">
                                     <Card className="p-4 rounded-xl bg-transparent border-white/10">
                                        <div className="grid gap-1 text-sm text-slate-300">
                                            <p className="font-semibold text-base text-white">{foundStudent.name}</p>
                                            <p><span className="text-slate-500">ID:</span> {foundStudent.studentId}</p>
                                            <p><span className="text-slate-500">Course:</span> {foundStudent.course} - {foundStudent.year} Year</p>
                                        </div>
                                    </Card>
                                    <div>
                                        <h4 className="font-semibold mb-2 text-white">Enrollment Details</h4>
                                        <div className="grid gap-1 text-sm p-3 border rounded-lg border-white/10 bg-transparent">
                                            <p className="text-slate-300"><span className="text-slate-500">Assigned Block:</span> <span className="font-medium text-white">{directEnrollBlock}</span></p>
                                        </div>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold mb-2 text-white">Enlisted Subjects ({directEnlistedSubjects.length})</h4>
                                        <div className="border rounded-lg max-h-40 overflow-y-auto border-white/10 bg-transparent">
                                            <Table>
                                                <TableHeader className="bg-transparent">
                                                    <TableRow className="border-white/10 hover:bg-transparent">
                                                        <TableHead className="text-slate-400">Code</TableHead>
                                                        <TableHead className="text-slate-400">Description</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                {directEnlistedSubjects.length > 0 ? directEnlistedSubjects.map(sub => (
                                                    <TableRow key={sub.id} className="border-white/5 hover:bg-white/5">
                                                        <TableCell className="text-slate-300">{sub.code}</TableCell>
                                                        <TableCell className="text-slate-300">{sub.description}</TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow className="border-white/5 hover:bg-transparent">
                                                        <TableCell colSpan={2} className="text-center text-slate-500">No subjects enlisted.</TableCell>
                                                    </TableRow>
                                                )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setDirectEnrollStep(2)} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Back</Button>
                                    <Button
                                        onClick={handleDirectEnrollSubmit}
                                        className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0"
                                        disabled={foundStudent ? isBusy(`direct-enroll-${foundStudent.id}`) : false}
                                    >
                                        Confirm Enrollment
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                    </Dialog>
                 ) : (
                    <Badge variant="outline" className="rounded-full px-4 py-1 text-muted-foreground">
                        View-only access
                    </Badge>
                 )}
            </div>
            <Card className="rounded-xl border-white/10 bg-transparent shadow-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                         <div className="relative flex-1 md:grow-0">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name or ID..."
                                className="w-full rounded-full bg-transparent border-white/10 pl-8 md:w-[200px] lg:w-[240px] focus:bg-white/5 transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="gap-2 rounded-full border-white/10 bg-transparent hover:bg-white/5 hover:text-accent transition-colors">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 rounded-xl bg-slate-900/95 border-white/10 text-slate-200" align="end">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label>Course</Label>
                                            <Select value={filters.course} onValueChange={(value) => handleFilterChange('course', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl bg-transparent border-white/10 text-white">
                                                    <SelectValue placeholder="All Courses" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl bg-slate-900/95 border-white/10 text-slate-200">
                                                    {courses.map(course => <SelectItem key={course} value={course} className="focus:bg-white/10 focus:text-white">{course === 'all' ? 'All Courses' : course}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Year</Label>
                                            <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl bg-transparent border-white/10 text-white">
                                                    <SelectValue placeholder="All Years" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl bg-slate-900/95 border-white/10 text-slate-200">
                                                    {years.map(year => <SelectItem key={year} value={year} className="focus:bg-white/10 focus:text-white">{year === 'all' ? 'All Years' : `Year ${year}`}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl bg-transparent border-white/10 text-white">
                                                    <SelectValue placeholder="All Types" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl bg-slate-900/95 border-white/10 text-slate-200">
                                                    {statuses.map(status => <SelectItem key={status} value={status} className="focus:bg-white/10 focus:text-white">{status === 'all' ? 'All Types' : status}</SelectItem>)}
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
                        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-transparent border border-white/10 p-1">
                            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">Pending</TabsTrigger>
                            <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all">Approved</TabsTrigger>
                            <TabsTrigger value="rejected" className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all">Rejected</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending">
                            <div className="border border-white/10 rounded-xl mt-4 overflow-hidden bg-transparent">
                                <Table>
                                    <TableHeader className="bg-transparent">
                                        <TableRow className="border-white/10 hover:bg-transparent">
                                            <TableHead className="text-muted-foreground">Student ID</TableHead>
                                            <TableHead className="text-muted-foreground">Student Name</TableHead>
                                            <TableHead className="text-muted-foreground">Course</TableHead>
                                            <TableHead className="text-muted-foreground">Year</TableHead>
                                            <TableHead className="text-muted-foreground">Type</TableHead>
                                            {canManageApprovedApplications && (
                                                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.map((application) => (
                                            <TableRow key={application.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                                <TableCell className="font-mono text-xs">{application.studentId}</TableCell>
                                                <TableCell className="font-medium">{application.name}</TableCell>
                                                <TableCell>{application.course}</TableCell>
                                                <TableCell>{application.year}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20">
                                                        {application.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-white hover:bg-white/10">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-slate-900/95 border-white/10 text-slate-200">
                                                            <DropdownMenuItem onSelect={() => setSelectedApplication(application)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                                View Credentials
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-white/10" />
                                                            <DropdownMenuItem
                                                                onSelect={() => handleApprove(application)}
                                                                disabled={isBusy(`approve-${application.id}`)}
                                                                className="focus:bg-green-500/20 focus:text-green-400 text-green-400 cursor-pointer"
                                                            >
                                                                Approve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleOpenRejectionDialog(application)} className="focus:bg-red-500/20 focus:text-red-400 text-red-400 cursor-pointer">
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
                            {!canManageApprovedApplications && (
                                <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-transparent p-4 text-sm text-muted-foreground">
                                    Approved applications are finalized by the Registrar Admin. You can monitor their status here, but only the registrar completes the enrollment process for these students.
                                </div>
                            )}
                             <div className="border border-white/10 rounded-xl mt-4 overflow-hidden bg-transparent">
                                <Table>
                                    <TableHeader className="bg-transparent">
                                        <TableRow className="border-white/10 hover:bg-transparent">
                                            <TableHead className="text-muted-foreground">Student ID</TableHead>
                                            <TableHead className="text-muted-foreground">Student Name</TableHead>
                                            <TableHead className="text-muted-foreground">Course</TableHead>
                                            <TableHead className="text-muted-foreground">Year</TableHead>
                                            <TableHead className="text-muted-foreground">Type</TableHead>
                                            <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.map((application) => (
                                            <TableRow key={application.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                                <TableCell className="font-mono text-xs">{application.studentId}</TableCell>
                                                <TableCell className="font-medium">{application.name}</TableCell>
                                                <TableCell>{application.course}</TableCell>
                                                <TableCell>{application.year}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20">
                                                        {application.status}
                                                    </Badge>
                                                </TableCell>
                                                {canManageApprovedApplications && (
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-white hover:bg-white/10">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-slate-900/95 border-white/10 text-slate-200">
                                                                <DropdownMenuItem onSelect={() => setSelectedApplication(application)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                                    <FileText className="mr-2 h-4 w-4" />
                                                                    View Credentials
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator className="bg-white/10" />
                                                                <DropdownMenuItem onSelect={() => openEnrollDialog(application)} className="focus:bg-blue-500/20 focus:text-blue-400 text-blue-400 cursor-pointer">
                                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                                    Enroll Student
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator className="bg-white/10" />
                                                                <DropdownMenuItem onSelect={() => handleOpenRejectionDialog(application)} className="focus:bg-red-500/20 focus:text-red-400 text-red-400 cursor-pointer">
                                                                    <X className="mr-2 h-4 w-4" />
                                                                    Reject
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                )}
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
                             <div className="border border-white/10 rounded-xl mt-4 overflow-hidden bg-transparent">
                                <Table>
                                    <TableHeader className="bg-transparent">
                                        <TableRow className="border-white/10 hover:bg-transparent">
                                            <TableHead className="text-muted-foreground">Student ID</TableHead>
                                            <TableHead className="text-muted-foreground">Student Name</TableHead>
                                            <TableHead className="text-muted-foreground">Course</TableHead>
                                            <TableHead className="text-muted-foreground">Year</TableHead>
                                            <TableHead className="text-muted-foreground">Type</TableHead>
                                            <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.map((application) => (
                                            <TableRow key={application.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                                <TableCell className="font-mono text-xs">{application.studentId}</TableCell>
                                                <TableCell className="font-medium">{application.name}</TableCell>
                                                <TableCell>{application.course}</TableCell>
                                                <TableCell>{application.year}</TableCell>
                                                 <TableCell>
                                                    <Badge variant="secondary" className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20">
                                                        {application.status}
                                                    </Badge>
                                                 </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-white hover:bg-white/10">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-slate-900/95 border-white/10 text-slate-200">
                                                            <DropdownMenuItem onSelect={() => setSelectedApplication(application)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                                View Credentials
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onSelect={() => handleRetrieve(application)}
                                                                disabled={isBusy(`retrieve-${application.id}`)}
                                                                className="focus:bg-blue-500/20 focus:text-blue-400 text-blue-400 cursor-pointer"
                                                            >
                                                                <RotateCw className="mr-2 h-4 w-4" />
                                                                Retrieve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-white/10" />
                                                            <DropdownMenuItem
                                                                className="text-red-400 focus:bg-red-500/20 focus:text-red-300 cursor-pointer"
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
                <DialogContent className="sm:max-w-lg rounded-xl bg-slate-900/95 border-white/10 text-slate-200 p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-6 pb-4 border-b border-white/10">
                        <DialogTitle className="text-xl font-semibold text-white">Student Credentials</DialogTitle>
                        <DialogDescription className="text-slate-400">Review the submitted documents for this applicant.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-6 space-y-6">
                        {/* Student Profile Card */}
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <Avatar className="h-12 w-12 border border-white/10">
                                <AvatarImage src={`https://picsum.photos/seed/${selectedApplication.id}/48/48`} />
                                <AvatarFallback className="bg-blue-600 text-white font-medium">
                                    {selectedApplication.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1 flex-1">
                                <h4 className="font-semibold text-white leading-none">{selectedApplication.name}</h4>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        <span>{selectedApplication.course} {selectedApplication.year}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" />
                                        <span>{selectedApplication.status}</span>
                                    </div>
                                </div>
                                {formattedSubmittedAt && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Submitted {formattedSubmittedAt}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedApplication.rejectionReason && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                                <span className="font-medium text-red-400 block mb-1">Rejection Reason:</span>
                                <span className="text-slate-300">{selectedApplication.rejectionReason}</span>
                            </div>
                        )}

                        {/* Credentials List */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Required Documents</h5>
                            <div className="grid gap-2">
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
                                            <div key={credential.key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full bg-white/5 ${statusInfo.status === 'submitted' ? 'text-green-400' : 'text-slate-400'}`}>
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium text-slate-200">{credential.label}</p>
                                                        <div className="flex items-center gap-1.5">
                                                            <StatusIcon className={`h-3 w-3 ${statusMeta.className}`} />
                                                            <span className={`text-xs ${statusMeta.className}`}>{statusMeta.label}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {canViewForm && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8 px-3 rounded-lg border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors" 
                                                        onClick={() => setIsReviewFormOpen(true)}
                                                    >
                                                        View Form
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-4 border-t border-white/10 bg-white/5">
                        <div className="flex w-full gap-3">
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 h-11"
                                onClick={() => {
                                    if (selectedApplication) {
                                        handleOpenRejectionDialog(selectedApplication);
                                    }
                                }}
                                disabled={selectedApplication ? isBusy(`reject-${selectedApplication.id}`) || isBusy(`approve-${selectedApplication.id}`) : false}
                            >
                                Reject Application
                            </Button>
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl border-0 h-11 font-medium shadow-lg shadow-blue-900/20"
                                onClick={() => {
                                     if (selectedApplication) {
                                        handleApprove(selectedApplication);
                                    }
                                }}
                                disabled={selectedApplication ? isBusy(`approve-${selectedApplication.id}`) : false}
                            >
                                Approve Application
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        
        {isReviewFormOpen && selectedApplication && (
             <Dialog open={isReviewFormOpen} onOpenChange={setIsReviewFormOpen}>
                <DialogContent className="sm:max-w-3xl rounded-xl bg-slate-900/95 border-white/10 text-slate-200 p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-6 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3 pr-10">
                            <DialogTitle className="text-xl font-semibold text-white">Review Submitted Form</DialogTitle>
                            <Badge variant="outline" className="border-blue-500/20 text-blue-400 bg-blue-500/10">
                                {selectedApplication.status}
                            </Badge>
                        </div>
                        <DialogDescription className="text-slate-400">
                            Detailed enrollment information for <span className="text-white font-medium">{selectedApplication.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8">
                        {formReview ? (
                            <>
                                {/* Student Details */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold text-white">Student Details</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Student ID</p>
                                            <p className="font-medium text-white">{withFallback(formReview.student.id ?? selectedApplication.studentId)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Course</p>
                                            <p className="font-medium text-white">{withFallback(formReview.student.course ?? selectedApplication.course)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Year Level</p>
                                            <p className="font-medium text-white">{withFallback(formReview.student.yearLevel ?? `${selectedApplication.year}`)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Block</p>
                                            <p className="font-medium text-white">{withFallback(formReview.student.block ?? selectedApplication.block ?? null)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Specialization</p>
                                            <p className="font-medium text-white">{withFallback(formReview.student.specialization, 'None')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Email</p>
                                            <p className="font-medium text-white truncate" title={withFallback(contactEmail)}>{withFallback(contactEmail)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Phone</p>
                                            <p className="font-medium text-white">{withFallback(contactPhone)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Information */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                                            <BadgeCheck className="h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold text-white">Personal Information</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Full Name</p>
                                            <p className="font-medium text-white">{withFallback(formReview.personal.name ?? selectedApplication.name)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Birthdate</p>
                                            <p className="font-medium text-white">{withFallback(personalBirthdate)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Sex</p>
                                            <p className="font-medium text-white">{withFallback(formReview.personal.sex)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Civil Status</p>
                                            <p className="font-medium text-white">{withFallback(formReview.personal.civilStatus)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Nationality</p>
                                            <p className="font-medium text-white">{withFallback(formReview.personal.nationality)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Religion</p>
                                            <p className="font-medium text-white">{withFallback(formReview.personal.religion)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold text-white">Address</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Current Address</p>
                                            <p className="font-medium text-white">{withFallback(formReview.address.currentAddress)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Permanent Address</p>
                                            <p className="font-medium text-white">{withFallback(formReview.address.permanentAddress)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Family Background */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold text-white">Family Background</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Father's Name</p>
                                            <p className="font-medium text-white">{withFallback(formReview.family.fathersName)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Father's Occupation</p>
                                            <p className="font-medium text-white">{withFallback(formReview.family.fathersOccupation)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Mother's Name</p>
                                            <p className="font-medium text-white">{withFallback(formReview.family.mothersName)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Mother's Occupation</p>
                                            <p className="font-medium text-white">{withFallback(formReview.family.mothersOccupation)}</p>
                                        </div>
                                        <div className="space-y-1 sm:col-span-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Guardian's Name</p>
                                            <p className="font-medium text-white">{withFallback(formReview.family.guardiansName)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Contact */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold text-white">Emergency Contact</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Contact Name</p>
                                            <p className="font-medium text-white">{withFallback(formReview.additional.emergencyContactName)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Contact Number</p>
                                            <p className="font-medium text-white">{withFallback(formReview.additional.emergencyContactNumber)}</p>
                                        </div>
                                        <div className="space-y-1 sm:col-span-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Contact Address</p>
                                            <p className="font-medium text-white">{withFallback(formReview.additional.emergencyContactAddress)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Education History */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                                            <GraduationCap className="h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold text-white">Education History</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="space-y-1 sm:col-span-2">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider">Elementary School</p>
                                                <p className="font-medium text-white">{withFallback(formReview.education.elementarySchool)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider">Year Graduated</p>
                                                <p className="font-medium text-white">{withFallback(formReview.education.elemYearGraduated)}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                                            <div className="space-y-1 sm:col-span-2">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider">Secondary School</p>
                                                <p className="font-medium text-white">{withFallback(formReview.education.secondarySchool)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider">Year Graduated</p>
                                                <p className="font-medium text-white">{withFallback(formReview.education.secondaryYearGraduated)}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1 pt-2 border-t border-white/5">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Previous College</p>
                                            <p className="font-medium text-white">{withFallback(formReview.education.collegiateSchool, 'None')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Enlisted Subjects */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                                            <BookOpen className="h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold text-white">Enlisted Subjects</h4>
                                    </div>
                                    {reviewSubjects.length === 0 ? (
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                                            <p className="text-sm text-slate-400">No subjects were selected in this application.</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
                                            <Table>
                                                <TableHeader className="bg-white/5">
                                                    <TableRow className="border-white/10 hover:bg-transparent">
                                                        <TableHead className="text-slate-400 font-medium">Code</TableHead>
                                                        <TableHead className="text-slate-400 font-medium">Description</TableHead>
                                                        <TableHead className="w-24 text-right text-slate-400 font-medium">Units</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {reviewSubjects.map((subject) => (
                                                        <TableRow key={`subject-${subject.code}`} className="border-white/5 hover:bg-white/5">
                                                            <TableCell className="font-medium text-blue-400">{subject.code}</TableCell>
                                                            <TableCell className="text-slate-300">{withFallback(subject.description ?? null, 'Subject details unavailable')}</TableCell>
                                                            <TableCell className="text-right text-slate-300">{subject.units !== null && subject.units !== undefined ? subject.units : '—'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-white/10 bg-white/5 text-center">
                                <FileText className="h-12 w-12 text-slate-600 mb-3" />
                                <p className="text-slate-400 font-medium">No form details available</p>
                                <p className="text-sm text-slate-500">The application form snapshot could not be loaded.</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="p-6 pt-4 border-t border-white/10 bg-white/5">
                        <Button variant="outline" onClick={() => setIsReviewFormOpen(false)} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">Close Review</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

        {rejectionDialog.isOpen && rejectionDialog.application && (
            <Dialog open={rejectionDialog.isOpen} onOpenChange={(open) => !open && handleCloseRejectionDialog()}>
                <DialogContent className="sm:max-w-md rounded-xl bg-slate-900/95 border-white/10 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-white">Reject Application</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Provide a reason for rejecting the application for <span className="font-semibold text-white">{rejectionDialog.application.name}</span>.
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
                            <Label className="text-slate-300">Select a reason:</Label>
                            <RadioGroup name="rejection-reason" defaultValue={rejectionReasons[0].id} className="gap-3">
                                {rejectionReasons.map((reason) => (
                                    <div key={reason.id} className="flex items-center space-x-2">
                                        <RadioGroupItem value={reason.id} id={reason.id} className="border-white/20 text-blue-500" />
                                        <Label htmlFor={reason.id} className="text-slate-300 font-normal cursor-pointer">{reason.label}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            <div className="grid w-full gap-1.5 mt-2">
                                <Label htmlFor="custom-reason" className="text-slate-300">Or provide a custom reason:</Label>
                                <Textarea placeholder="Type your message here." id="custom-reason" name="custom-reason" className="rounded-xl bg-transparent border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 min-h-[100px]"/>
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseRejectionDialog} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Cancel</Button>
                        <Button
                            variant="destructive"
                            type="submit"
                            form="rejection-form"
                            className="rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
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
                <DialogContent className="sm:max-w-3xl rounded-xl bg-slate-900/95 border-white/10 text-slate-200 p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-6 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3 pr-10">
                            <DialogTitle className="text-xl font-semibold text-white">Enroll Student</DialogTitle>
                            <Badge variant="outline" className="border-blue-500/20 text-blue-400 bg-blue-500/10">
                                {applicationToEnroll.status}
                            </Badge>
                        </div>
                        <DialogDescription className="text-slate-400">
                            Confirm block and enlist subjects for <span className="text-white font-medium">{applicationToEnroll.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="enroll-student-form" onSubmit={handleEnroll}>
                        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8">
                             {/* Student Profile Card */}
                             <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                <Avatar className="h-12 w-12 border border-white/10">
                                    <AvatarImage src={`https://picsum.photos/seed/${applicationToEnroll.id}/48/48`} alt={applicationToEnroll.name} />
                                    <AvatarFallback className="bg-blue-600 text-white font-medium">{applicationToEnroll.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 flex-1">
                                    <h4 className="font-semibold text-white leading-none">{applicationToEnroll.name}</h4>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            <span>{applicationToEnroll.course} {applicationToEnroll.year}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5" />
                                            <span>{applicationToEnroll.status}</span>
                                        </div>
                                        {enrollmentSpecialization && (
                                            <div className="flex items-center gap-1.5">
                                                <BadgeCheck className="h-3.5 w-3.5" />
                                                <span>{enrollmentSpecialization}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Assigned Block</p>
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-sm font-mono">
                                        {enrollBlock || 'N/A'}
                                    </Badge>
                                </div>
                            </div>

                            {(applicationToEnroll.status === 'Transferee' || applicationToEnroll.status === 'New') && allPrerequisites.length > 0 && (
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                                            <BadgeCheck className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">Credential Override</h4>
                                            <p className="text-xs text-slate-400">For transferees or new students, manually credit any prerequisites they have fulfilled.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 rounded-xl bg-white/5 border border-white/10 max-h-48 overflow-y-auto">
                                        {allPrerequisites.map(prereq => (
                                            <div key={`prereq-${prereq.id}`} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
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
                                                    className="mt-0.5 border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                                <div className="grid gap-0.5">
                                                    <Label htmlFor={`prereq-check-${prereq.id}`} className="font-medium text-slate-200 cursor-pointer leading-none">
                                                        {prereq.code}
                                                    </Label>
                                                    <p className="text-xs text-slate-500 line-clamp-1" title={prereq.description}>{prereq.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {enrollBlock && availableSubjectsForEnrollment.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                                                <BookOpen className="h-4 w-4" />
                                            </div>
                                            <h4 className="font-semibold text-white">Enlist Subjects</h4>
                                        </div>
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
                                                className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <Label htmlFor="select-all-subjects" className="text-sm font-medium text-slate-300 cursor-pointer">
                                                Select All
                                            </Label>
                                        </div>
                                    </div>
                                    
                                    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                                        <div className="max-h-[300px] overflow-y-auto">
                                            <Table>
                                                <TableHeader className="bg-white/5 sticky top-0 z-10 backdrop-blur-sm">
                                                    <TableRow className="border-white/10 hover:bg-transparent">
                                                        <TableHead className="w-[50px]"></TableHead>
                                                        <TableHead className="text-slate-400">Code</TableHead>
                                                        <TableHead className="text-slate-400">Description</TableHead>
                                                        <TableHead className="text-right text-slate-400">Units</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {availableSubjectsForEnrollment.map((subject) => {
                                                        const prerequisitesMet = hasMetPrerequisites(subject, completedSubjectsForEnrollment);
                                                        const isSelected = enlistedSubjects.some((s) => s.id === subject.id);
                                                        
                                                        return (
                                                            <TableRow 
                                                                key={subject.id} 
                                                                className={cn(
                                                                    "border-white/5 transition-colors", 
                                                                    isSelected ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-white/5",
                                                                    !prerequisitesMet && "opacity-60 bg-red-500/5 hover:bg-red-500/10"
                                                                )}
                                                            >
                                                                <TableCell className="py-3">
                                                                    <SubjectCheckbox
                                                                        subject={subject}
                                                                        checked={isSelected}
                                                                        onCheckedChange={(checked) => {
                                                                            if (checked) {
                                                                                setEnlistedSubjects((prev) => [...prev, subject]);
                                                                            } else {
                                                                                setEnlistedSubjects((prev) => prev.filter((s) => s.id !== subject.id));
                                                                            }
                                                                        }}
                                                                        completedSubjects={completedSubjectsForEnrollment}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="font-medium text-slate-200 py-3">
                                                                    <Label htmlFor={`sub-${subject.id}`} className={cn("cursor-pointer", !prerequisitesMet && "text-red-400 cursor-not-allowed")}>
                                                                        {subject.code}
                                                                    </Label>
                                                                </TableCell>
                                                                <TableCell className="text-slate-400 py-3">
                                                                    <Label htmlFor={`sub-${subject.id}`} className={cn("cursor-pointer font-normal", !prerequisitesMet && "text-red-400 cursor-not-allowed")}>
                                                                        {subject.description}
                                                                    </Label>
                                                                </TableCell>
                                                                <TableCell className="text-right text-slate-400 py-3">{subject.units}</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-green-500/10 text-green-400">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">Assessment of Fees</h4>
                                            <p className="text-xs text-slate-400 max-w-md">
                                                Republic Act 10931 (Universal Access to Quality Tertiary Education Act) covers mandatory fees.
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="rounded-full whitespace-nowrap bg-blue-500/10 text-blue-400 border-blue-500/20">RA 10931</Badge>
                                </div>
                                <div className="border rounded-xl overflow-hidden border-white/10 bg-white/5">
                                    <Table>
                                        <TableHeader className="bg-white/5">
                                            <TableRow className="border-white/10 hover:bg-transparent">
                                                <TableHead className="w-1/3 text-slate-400">Fee</TableHead>
                                                <TableHead className="text-right text-slate-400">Amount</TableHead>
                                                <TableHead className="text-right text-slate-400">Paid</TableHead>
                                                <TableHead className="text-right text-slate-400">Balance</TableHead>
                                                <TableHead className="text-right text-slate-400">UniFAST</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {UNIFAST_FEE_ITEMS.map((fee) => (
                                                <TableRow key={fee.description} className="border-white/5 hover:bg-white/5">
                                                    <TableCell className="font-medium text-slate-300">{fee.description}</TableCell>
                                                    <TableCell className="text-right text-slate-300">{formatCurrency(fee.amount)}</TableCell>
                                                    <TableCell className="text-right text-slate-500">{formatCurrency(fee.paid)}</TableCell>
                                                    <TableCell className="text-right text-slate-500">{formatCurrency(fee.balance)}</TableCell>
                                                    <TableCell className="text-right text-slate-500">{formatCurrency(fee.unifast)}</TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-white/10 font-semibold border-white/10 hover:bg-white/10">
                                                <TableCell className="text-white">Total</TableCell>
                                                <TableCell className="text-right text-white">{formatCurrency(UNIFAST_FEE_TOTALS.amount)}</TableCell>
                                                <TableCell className="text-right text-white">{formatCurrency(UNIFAST_FEE_TOTALS.paid)}</TableCell>
                                                <TableCell className="text-right text-white">{formatCurrency(UNIFAST_FEE_TOTALS.balance)}</TableCell>
                                                <TableCell className="text-right text-white">{formatCurrency(UNIFAST_FEE_TOTALS.unifast)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </form>
                    <DialogFooter className="p-6 pt-4 border-t border-white/10 bg-white/5">
                        <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">Cancel</Button>
                        <Button
                            type="submit"
                            form="enroll-student-form"
                            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/20"
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
                <AlertDialogContent className="rounded-xl bg-slate-900/95 border-white/10 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                             This action cannot be undone. This will permanently delete the application for <span className="font-semibold text-white">{deleteDialog.application.name}</span>.
                            <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                         <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="mt-4 rounded-xl bg-transparent border-white/10 text-white placeholder:text-slate-500 focus:border-red-500/50 focus:ring-red-500/20"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={
                                deleteInput !== 'delete' ||
                                (deleteDialog.application ? isBusy(`delete-${deleteDialog.application.id}`) : false)
                            }
                            className="bg-red-600 hover:bg-red-500 text-white rounded-xl border-0"
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

    