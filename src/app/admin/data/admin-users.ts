export type AdminRole = 'Super Admin' | 'Admin' | 'Moderator';

export type AdminUser = {
    id: number;
    name: string;
    email: string;
    role: AdminRole;
    avatar: string;
};

export const initialAdminUsers: AdminUser[] = [
    { id: 1, name: 'Alice Johnson', email: 'alice.j@example.com', role: 'Super Admin', avatar: 'https://picsum.photos/seed/aj-avatar/40/40' },
    { id: 2, name: 'Bob Williams', email: 'bob.w@example.com', role: 'Admin', avatar: 'https://picsum.photos/seed/bw-avatar/40/40' },
    { id: 3, name: 'Charlie Brown', email: 'charlie.b@example.com', role: 'Admin', avatar: 'https://picsum.photos/seed/cb-avatar/40/40' },
    { id: 4, name: 'Diana Miller', email: 'diana.m@example.com', role: 'Admin', avatar: 'https://picsum.photos/seed/dm-avatar/40/40' },
    { id: 5, name: 'Ethan Garcia', email: 'ethan.g@example.com', role: 'Moderator', avatar: 'https://picsum.photos/seed/eg-avatar/40/40' },
];

export const roles: AdminRole[] = ['Super Admin', 'Admin', 'Moderator'];
