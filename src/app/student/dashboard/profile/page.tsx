
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStudent, type StudentDataType, normalizeStudentPayload } from '@/app/student/context/student-context';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { resolveMediaUrl } from '@/lib/utils';


const InfoField = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
        <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">{label}</Label>
            <p className="font-medium">{value}</p>
        </div>
    );
};

type EditableStudentProfile = {
    firstName: string;
    lastName: string;
    middleName: string;
    birthdate: string;
    sex: string;
    civilStatus: string;
    nationality: string;
    religion: string;
    dialect: string;
    email: string;
    phoneNumber: string;
    currentAddress: string;
    permanentAddress: string;
    fathersName: string;
    fathersOccupation: string;
    mothersName: string;
    mothersOccupation: string;
    guardiansName: string;
    emergencyContactName: string;
    emergencyContactAddress: string;
    emergencyContactNumber: string;
    elementarySchool: string;
    elemYearGraduated: string;
    secondarySchool: string;
    secondaryYearGraduated: string;
    collegiateSchool: string;
};

const createEditableDataFromStudent = (student: StudentDataType): EditableStudentProfile => ({
    firstName: student.personal.firstName ?? '',
    lastName: student.personal.lastName ?? '',
    middleName: student.personal.middleName ?? '',
    birthdate: student.personal.birthdate ?? '',
    sex: student.personal.sex ?? '',
    civilStatus: student.personal.civilStatus ?? '',
    nationality: student.personal.nationality ?? '',
    religion: student.personal.religion ?? '',
    dialect: student.personal.dialect ?? '',
    email: student.contact.email ?? '',
    phoneNumber: student.contact.phoneNumber ?? '',
    currentAddress: student.address.currentAddress ?? '',
    permanentAddress: student.address.permanentAddress ?? '',
    fathersName: student.family.fathersName ?? '',
    fathersOccupation: student.family.fathersOccupation ?? '',
    mothersName: student.family.mothersName ?? '',
    mothersOccupation: student.family.mothersOccupation ?? '',
    guardiansName: student.family.guardiansName ?? '',
    emergencyContactName: student.additional.emergencyContactName ?? '',
    emergencyContactAddress: student.additional.emergencyContactAddress ?? '',
    emergencyContactNumber: student.additional.emergencyContactNumber ?? '',
    elementarySchool: student.education.elementarySchool ?? '',
    elemYearGraduated: student.education.elemYearGraduated ?? '',
    secondarySchool: student.education.secondarySchool ?? '',
    secondaryYearGraduated: student.education.secondaryYearGraduated ?? '',
    collegiateSchool: student.education.collegiateSchool ?? '',
});

const EMPTY_EDITABLE_PROFILE: EditableStudentProfile = {
    firstName: '',
    lastName: '',
    middleName: '',
    birthdate: '',
    sex: '',
    civilStatus: '',
    nationality: '',
    religion: '',
    dialect: '',
    email: '',
    phoneNumber: '',
    currentAddress: '',
    permanentAddress: '',
    fathersName: '',
    fathersOccupation: '',
    mothersName: '',
    mothersOccupation: '',
    guardiansName: '',
    emergencyContactName: '',
    emergencyContactAddress: '',
    emergencyContactNumber: '',
    elementarySchool: '',
    elemYearGraduated: '',
    secondarySchool: '',
    secondaryYearGraduated: '',
    collegiateSchool: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeDateForApi = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed === '') {
        return '';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


export default function StudentProfilePage() {
    const { toast } = useToast();
    const { studentData, setStudentData } = useStudent();
    const router = useRouter();
    const searchParams = useSearchParams();

    const apiBaseUrl = React.useMemo(() => {
        return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
            .replace(/\/$/, '')
            .trim();
    }, []);

    const [editableData, setEditableData] = React.useState<EditableStudentProfile>(() =>
        studentData ? createEditableDataFromStudent(studentData) : EMPTY_EDITABLE_PROFILE,
    );
    const [saving, setSaving] = React.useState(false);
    const [formError, setFormError] = React.useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = React.useState(false);
    const avatarInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (studentData) {
            setEditableData(createEditableDataFromStudent(studentData));
        }
    }, [studentData]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target;
        setEditableData(prev => {
            if (!(id in prev)) {
                return prev;
            }
            return {
                ...prev,
                [id]: value,
            } as EditableStudentProfile;
        });
    };

    const handleSelectChange = (field: keyof EditableStudentProfile, value: string) => {
        setEditableData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAvatarButtonClick = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!studentData) {
            return;
        }

        const file = event.target.files?.[0] ?? null;
        event.target.value = '';
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid file',
                description: 'Please choose a valid image file.',
                variant: 'destructive',
            });
            return;
        }

        const maxSizeBytes = 5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            toast({
                title: 'File too large',
                description: 'Please pick an image smaller than 5 MB.',
                variant: 'destructive',
            });
            return;
        }

        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append('role', 'student');
            if (studentData.contact.email) {
                formData.append('email', studentData.contact.email);
            }
            if (studentData.academic.studentId) {
                formData.append('student_id', studentData.academic.studentId);
            }
            formData.append('avatar', file);

            const response = await fetch(`${apiBaseUrl}/upload_avatar.php`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            let payload: any = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok || !payload || payload.status !== 'success') {
                const message = payload?.message ?? `Failed to upload avatar (status ${response.status}).`;
                throw new Error(message);
            }

            const newAvatarUrl = resolveMediaUrl(payload.data?.avatarUrl ?? payload.avatarUrl ?? null, apiBaseUrl);
            if (!newAvatarUrl) {
                throw new Error('Server did not return a valid avatar URL.');
            }

            setStudentData(prev => {
                if (!prev) {
                    return prev;
                }
                return {
                    ...prev,
                    personal: {
                        ...prev.personal,
                        avatarUrl: newAvatarUrl,
                    },
                };
            });

            toast({
                title: 'Profile photo updated',
                description: 'Your new avatar is ready.',
            });
        } catch (error) {
            toast({
                title: 'Upload failed',
                description: error instanceof Error ? error.message : 'Unable to upload avatar right now.',
                variant: 'destructive',
            });
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!studentData) {
            return;
        }

        setSaving(true);
        setFormError(null);

        const previousEmail = studentData.contact.email ?? '';
        const payload = {
            email: previousEmail,
            profile: {
                firstName: editableData.firstName.trim(),
                lastName: editableData.lastName.trim(),
                middleName: editableData.middleName.trim(),
                birthdate: normalizeDateForApi(editableData.birthdate),
                sex: editableData.sex.trim(),
                civilStatus: editableData.civilStatus.trim(),
                nationality: editableData.nationality.trim(),
                religion: editableData.religion.trim(),
                dialect: editableData.dialect.trim(),
                email: editableData.email.trim(),
                phoneNumber: editableData.phoneNumber.trim(),
                currentAddress: editableData.currentAddress.trim(),
                permanentAddress: editableData.permanentAddress.trim(),
                fathersName: editableData.fathersName.trim(),
                fathersOccupation: editableData.fathersOccupation.trim(),
                mothersName: editableData.mothersName.trim(),
                mothersOccupation: editableData.mothersOccupation.trim(),
                guardiansName: editableData.guardiansName.trim(),
                emergencyContactName: editableData.emergencyContactName.trim(),
                emergencyContactAddress: editableData.emergencyContactAddress.trim(),
                emergencyContactNumber: editableData.emergencyContactNumber.trim(),
                elementarySchool: editableData.elementarySchool.trim(),
                elemYearGraduated: editableData.elemYearGraduated.trim(),
                secondarySchool: editableData.secondarySchool.trim(),
                secondaryYearGraduated: editableData.secondaryYearGraduated.trim(),
                collegiateSchool: editableData.collegiateSchool.trim(),
            },
        };

        if (!payload.profile.firstName || !payload.profile.lastName) {
            const message = 'First name and last name are required.';
            setFormError(message);
            toast({
                title: 'Missing information',
                description: message,
                variant: 'destructive',
            });
            setSaving(false);
            return;
        }

        if (!payload.profile.email || !EMAIL_REGEX.test(payload.profile.email)) {
            const message = 'A valid email address is required.';
            setFormError(message);
            toast({
                title: 'Invalid email',
                description: message,
                variant: 'destructive',
            });
            setSaving(false);
            return;
        }

        try {
            const response = await fetch(`${apiBaseUrl}/update_student_profile.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            let result: { status?: string; message?: string; data?: StudentDataType } | null = null;
            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (!response.ok || !result || result.status !== 'success' || !result.data) {
                const message =
                    result?.message ?? `Failed to update profile (status ${response.status}).`;
                throw new Error(message);
            }

            const normalizedProfile = normalizeStudentPayload(result.data, apiBaseUrl);
            setStudentData(normalizedProfile);
            setEditableData(createEditableDataFromStudent(normalizedProfile));

            const updatedEmail = normalizedProfile.contact.email ?? '';
            if (typeof window !== 'undefined' && updatedEmail !== '') {
                window.sessionStorage.setItem('bsit_student_email', updatedEmail);
            }

            if (updatedEmail && updatedEmail !== previousEmail) {
                const params = new URLSearchParams(searchParams.toString());
                params.set('email', updatedEmail);
                const queryString = params.toString();
                router.replace(
                    queryString !== ''
                        ? `/student/dashboard/profile?${queryString}`
                        : '/student/dashboard/profile',
                );
            }

            toast({
                title: 'Profile saved',
                description: 'Your profile has been updated successfully.',
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unable to update profile.';
            setFormError(message);
            toast({
                title: 'Update failed',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    if (!studentData) {
        return <div>Loading profile...</div>;
    }

    const avatarInitials = (
        `${editableData.firstName.slice(0, 1)}${editableData.lastName.slice(0, 1)}`.toUpperCase() ||
        'SN'
    );

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
                <p className="text-muted-foreground">
                    View and manage your personal, academic, and contact information.
                </p>
            </div>
            
             <form onSubmit={handleFormSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="rounded-xl">
                            <CardContent className="pt-6 flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage
                                            src={studentData.personal.avatarUrl ?? undefined}
                                            alt={`${studentData.personal.firstName} avatar`}
                                            data-ai-hint="person avatar"
                                        />
                                        <AvatarFallback>{avatarInitials}</AvatarFallback>
                                    </Avatar>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background hover:bg-muted"
                                        onClick={handleAvatarButtonClick}
                                        disabled={avatarUploading}
                                        aria-busy={avatarUploading}
                                    >
                                        <Camera className="h-4 w-4" />
                                        <span className="sr-only">{avatarUploading ? 'Uploading photo' : 'Change photo'}</span>
                                    </Button>
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={handleAvatarFileChange}
                                    />
                                </div>
                                <h2 className="text-xl font-semibold">{`${studentData.personal.firstName} ${studentData.personal.lastName}`}</h2>
                                <p className="text-sm text-muted-foreground">{studentData.academic.studentId}</p>
                                <p className="text-sm text-muted-foreground">{studentData.academic.course}</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle>Academic Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <InfoField label="Student ID" value={studentData.academic.studentId} />
                                <InfoField label="Course" value={studentData.academic.course} />
                                <InfoField label="Year Level" value={studentData.academic.yearLevel} />
                                <InfoField label="Block" value={studentData.academic.block} />
                                <InfoField label="Status" value={studentData.academic.statusDisplay || studentData.academic.status} />
                                <InfoField label="Track" value={studentData.academic.enrollmentTrack} />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="personal" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 rounded-xl">
                                <TabsTrigger value="personal">Personal</TabsTrigger>
                                <TabsTrigger value="address">Address & Family</TabsTrigger>
                                <TabsTrigger value="additional">Additional</TabsTrigger>
                                <TabsTrigger value="education">Education</TabsTrigger>
                            </TabsList>

                            <TabsContent value="personal">
                                <Card className="rounded-xl mt-4">
                                    <CardHeader>
                                        <CardTitle>Personal & Contact</CardTitle>
                                        <CardDescription>Your personal and contact details.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName">First Name</Label>
                                                <Input id="firstName" value={editableData.firstName} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastName">Last Name</Label>
                                                <Input id="lastName" value={editableData.lastName} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="middleName">Middle Name</Label>
                                                <Input id="middleName" value={editableData.middleName} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="birthdate">Date of Birth</Label>
                                                <Input
                                                    id="birthdate"
                                                    type="date"
                                                    value={editableData.birthdate || ''}
                                                    onChange={handleInputChange}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sex</Label>
                                                <Select
                                                    value={editableData.sex || undefined}
                                                    onValueChange={(value) => handleSelectChange('sex', value)}
                                                >
                                                    <SelectTrigger className="rounded-xl">
                                                        <SelectValue placeholder="Select sex" />
                                                    </SelectTrigger>
                                                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Civil Status</Label>
                                                 <Select
                                                    value={editableData.civilStatus || undefined}
                                                    onValueChange={(value) => handleSelectChange('civilStatus', value)}
                                                >
                                                    <SelectTrigger className="rounded-xl">
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Single">Single</SelectItem>
                                                        <SelectItem value="Married">Married</SelectItem>
                                                        <SelectItem value="Widowed">Widowed</SelectItem>
                                                        <SelectItem value="Separated">Separated</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="nationality">Nationality</Label>
                                                <Input id="nationality" value={editableData.nationality} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="border-t pt-4 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="religion">Religion</Label>
                                                    <Input id="religion" value={editableData.religion} onChange={handleInputChange} className="rounded-xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="dialect">Dialect</Label>
                                                    <Input id="dialect" value={editableData.dialect} onChange={handleInputChange} className="rounded-xl" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email Address</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={editableData.email}
                                                    onChange={handleInputChange}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phoneNumber">Contact Number</Label>
                                                <Input
                                                    id="phoneNumber"
                                                    type="tel"
                                                    value={editableData.phoneNumber}
                                                    onChange={handleInputChange}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="address">
                                <Card className="rounded-xl mt-4">
                                    <CardHeader>
                                        <CardTitle>Address & Family</CardTitle>
                                        <CardDescription>Your address and family background.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="currentAddress">Current Address</Label>
                                            <Input id="currentAddress" value={editableData.currentAddress} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="permanentAddress">Permanent Address</Label>
                                            <Input id="permanentAddress" value={editableData.permanentAddress} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <div className="border-t pt-4 space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="fathersName">Father's Name</Label>
                                                <Input id="fathersName" value={editableData.fathersName} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="fathersOccupation">Father's Occupation</Label>
                                                <Input id="fathersOccupation" value={editableData.fathersOccupation} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="mothersName">Mother's Name</Label>
                                                <Input id="mothersName" value={editableData.mothersName} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="mothersOccupation">Mother's Occupation</Label>
                                                <Input id="mothersOccupation" value={editableData.mothersOccupation} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="guardiansName">Guardian's Name</Label>
                                                <Input id="guardiansName" value={editableData.guardiansName} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            
                            <TabsContent value="additional">
                                <Card className="rounded-xl mt-4">
                                    <CardHeader>
                                        <CardTitle>Additional Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                                            <Input id="emergencyContactName" value={editableData.emergencyContactName} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="emergencyContactAddress">Emergency Address</Label>
                                            <Input id="emergencyContactAddress" value={editableData.emergencyContactAddress} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="emergencyContactNumber">Emergency Number</Label>
                                            <Input
                                                id="emergencyContactNumber"
                                                type="tel"
                                                value={editableData.emergencyContactNumber}
                                                onChange={handleInputChange}
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="education">
                                <Card className="rounded-xl mt-4">
                                    <CardHeader>
                                        <CardTitle>Educational Background</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="elementarySchool">Elementary School</Label>
                                                <Input id="elementarySchool" value={editableData.elementarySchool} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="elemYearGraduated">Year Graduated</Label>
                                                <Input id="elemYearGraduated" value={editableData.elemYearGraduated} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="secondarySchool">Secondary School</Label>
                                                <Input id="secondarySchool" value={editableData.secondarySchool} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="secondaryYearGraduated">Year Graduated</Label>
                                                <Input id="secondaryYearGraduated" value={editableData.secondaryYearGraduated} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="collegiateSchool">Collegiate School (if transferee)</Label>
                                            <Input id="collegiateSchool" value={editableData.collegiateSchool} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                        <div className="flex flex-col items-end gap-2 mt-6">
                            {formError && (
                                <p className="text-sm text-destructive text-right max-w-xl">
                                    {formError}
                                </p>
                            )}
                            <Button type="submit" className="rounded-xl" disabled={saving}>
                                {saving ? 'Saving...' : 'Save All Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </main>
    );
}
