# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Connecting to a Backend

This application uses a centralized state management pattern via React Context to make connecting to a backend straightforward. All data for the student and admin portals is managed through dedicated "providers."

-   **Student Data**: Managed by `StudentProvider` in `src/app/student/context/student-context.tsx`.
-   **Admin Data**: Managed by `AdminProvider` in `src/app/admin/context/admin-context.tsx`.

To connect your backend (e.g., a PHP API), you only need to modify these two provider files.

### How It Works

1.  **The Provider**: Wraps a section of the app (like the entire student or admin dashboard). It fetches and holds the data in a React state.
2.  **The Hook**: A custom hook (`useStudent()` or `useAdmin()`) allows any component within the provider to easily access the shared data.
3.  **Updating State**: The provider also exposes a setter function (e.g., `setStudentData`) that components can use to update the central state. All components using that data will automatically re-render with the new information.

---

### Step-by-Step Integration Guide

Here’s how to connect the `AdminProvider` to your backend. The same principles apply to the `StudentProvider`.

#### 1. Locate the Admin Context File

Open `src/app/admin/context/admin-context.tsx`.

You will see the `AdminProvider` component, which currently initializes its state with `mockAdminData`:

```tsx
// src/app/admin/context/admin-context.tsx

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [adminData, setAdminData] = useState<AdminDataType>(mockAdminData);
  // ...
};
```

#### 2. Fetch Initial Data from Your API

Replace the mock data with a `useEffect` hook to fetch data from your API when the component first loads. You should also add loading and error states.

**Example:**

```tsx
// src/app/admin/context/admin-context.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';

// ... (keep the existing type definitions)

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [adminData, setAdminData] = useState<AdminDataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Replace this URL with your actual API endpoint
        const response = await fetch('https://your-api.com/admin/data');
        if (!response.ok) {
          throw new Error('Failed to fetch data from the server.');
        }
        const data = await response.json();
        setAdminData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []); // The empty dependency array ensures this runs only once

  // You can add loading/error UI handling here if you want
  if (loading) {
    return <div>Loading admin dashboard...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  // Note: You might need to adjust child components to handle `adminData` potentially being `null`
  // or ensure you provide a default empty state.
  return (
    <AdminContext.Provider value={{ adminData: adminData!, setAdminData }}>
      {children}
    </AdminContext.Provider>
  );
};

// ... (rest of the file)
```

#### 3. Handle Data Mutations (Create, Update, Delete)

In the components, instead of just calling `setAdminData`, you would first make an API call to your backend. After a successful response, you update the local state using `setAdminData`.

**Example:** Let's look at the `handleDeleteUser` function in `src/app/admin/dashboard/administrators/page.tsx`.

**Before (Client-side only):**

```tsx
const handleDeleteUser = () => {
    if (!selectedUser) return;
    setAdminData(prev => ({
        ...prev,
        adminUsers: prev.adminUsers.filter(u => u.id !== selectedUser.id)
    }));
    // ...
};
```

**After (Connected to a backend):**

```tsx
const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
        // 1. Make the API call to your backend
        const response = await fetch(`https://your-api.com/admin/users/${selectedUser.id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete user.');
        }

        // 2. If successful, update the local state to reflect the change
        setAdminData(prev => ({
            ...prev,
            adminUsers: prev.adminUsers.filter(u => u.id !== selectedUser.id)
        }));

        // Close dialogs, etc.
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);

    } catch (error) {
        // Handle any errors, e.g., show a toast notification
        console.error("Failed to delete user:", error);
        alert("Could not delete user. Please try again.");
    }
};
```

By following this pattern, you can systematically connect every part of the application to your backend while keeping the UI components clean and decoupled from the data-fetching logic.
