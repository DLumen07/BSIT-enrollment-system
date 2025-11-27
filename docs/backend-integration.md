# Backend Integration Guide

This document provides a step-by-step guide on how to connect the Next.js frontend of the Enrollment System to a backend API. The application is designed with a centralized state management system (`React Context`) that makes this process straightforward.

The backend can be built with any technology (PHP, Node.js, Python, etc.) as long as it exposes RESTful API endpoints that return JSON data.

## Core Concept: The Context Providers

The application's state is managed in "Providers" located in the `src/app/[portal]/context/` directories:
- **`AdminProvider`**: Manages all data for the administrator portal.
- **`StudentProvider`**: Manages data for the student portal.
- **`InstructorProvider`**: Manages data for the instructor portal.

Currently, these providers are initialized with mock data. To connect to your backend, you only need to modify these files to fetch data from your API instead of using the mock data.

---

## Step-by-Step Integration Example: `AdminProvider`

The following steps show how to connect the `AdminProvider` to your backend. The same principles apply to `StudentProvider` and `InstructorProvider`.

### 1. Locate the Admin Context File

Open the following file in your editor:
`src/app/admin/context/admin-context.tsx`

### 2. Identify the Data Fetching Location

Inside `AdminProvider`, you will find a `useEffect` hook. This is where the application's initial data is loaded. Currently, it's set up to use mock data. You will see a commented-out section prepared for fetching data from an API.

```tsx
// src/app/admin/context/admin-context.tsx

// ... (imports and type definitions)

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [adminData, setAdminData] = useState<AdminDataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // To connect to a backend, you would fetch data here.
    // The code below is a template for fetching data.
    /*
    const fetchAdminData = async () => {
      try {
        // Replace with your actual API endpoint.
        // Example for a PHP backend: 'https://your-domain.com/api/admin_data.php'
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
    
    // Uncomment the line below to enable API fetching
    // fetchAdminData();
    */

    // For now, we are using mock data.
    setAdminData(mockAdminData); // This line uses the mock data
    setLoading(false);
  }, []);

  // ... (rest of the provider)
};
```

### 3. Implement the API Fetch Call

To switch from mock data to your live backend:

1.  **Delete or comment out** the line that sets the mock data: `setAdminData(mockAdminData);`
2.  **Uncomment** the `fetchAdminData` function and the call to it: `fetchAdminData();`
3.  **Update the API Endpoint**: Change the URL in the `fetch` call to your actual backend endpoint. For example, if you are using PHP, your endpoint might look like `https://your-domain.com/api/get_admin_data.php`.

**Example (After modification):**
```tsx
// ...

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Use your actual PHP API endpoint here
        const response = await fetch('https://your-domain.com/api/get_admin_data.php');
        if (!response.ok) {
          throw new Error('Failed to fetch data from the server.');
        }
        const data = await response.json();
        setAdminData(data); // Set the state with data from the API
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch data from the API instead of using mocks
    fetchAdminData();

    // setAdminData(mockAdminData); // This is now disabled
    // setLoading(false);
  }, []);

// ...
```

### 4. Handling Data Mutations (Create, Update, Delete)

When a user performs an action that changes data (e.g., deleting a user), you need to send a request to your backend and then update the local state to reflect the change in the UI.

The logic for these actions is located in the respective page components (e.g., `src/app/admin/dashboard/administrators/page.tsx`).

**Example: Deleting a User**

Find the `handleDeleteUser` function in `src/app/admin/dashboard/administrators/page.tsx`.

**Before (Mock Data):**
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

**After (API Integration):**
```tsx
const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
        // 1. Make the API call to your backend (e.g., delete_user.php)
        const response = await fetch(`https://your-domain.com/api/users.php?id=${selectedUser.id}`, {
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
        
        // Show success message
        toast({ title: 'User Deleted' });

    } catch (error) {
        console.error("Failed to delete user:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete user.' });
    }
};
```
By following this pattern—making an API call and then updating the local state with `setAdminData`, `setStudentData`, etc.—you can systematically connect the entire application to your backend. The UI components will automatically re-render with the new data.

### Academic Term Management APIs

- `update_system_settings.php` &mdash; Persists changes to the active academic year, semester, and global enrollment window. Use this when adjusting dates without promoting students.
- `academic_rollover.php` &mdash; Generates a dry-run preview or executes the full rollover. Send `{ dryRun: true }` to retrieve the promotion summary, then repeat the call with `dryRun: false` after the administrator confirms.
