# Backend Integration Guide

This document provides a step-by-step guide on how to connect the Next.js frontend of the Enrollment System to a backend API.

## 1. Environment Configuration

Before connecting to the backend, you need to set up your environment variables. This ensures that your API keys and database credentials are secure and easy to manage.

### Frontend Environment (`.env`)

The frontend uses a `.env` file to manage the base URL for the backend API.

1.  **Create a `.env` file** in the root directory of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
2.  **Update the `NEXT_PUBLIC_API_BASE_URL`** variable in your new `.env` file to point to your backend's API endpoint.
    ```
    NEXT_PUBLIC_API_BASE_URL=http://localhost/api/v1/endpoints
    ```
    This variable will be used throughout the application to make API calls, so you only need to set it in one place.

### Backend Environment (`api/v1/.env`)

The PHP backend uses a `.env` file to manage database credentials.

1.  **Navigate to the `api/v1` directory.**
2.  **Create a `.env` file** by copying the example file:
    ```bash
    cp .env.example .env
    ```
3.  **Update the database credentials** in `api/v1/.env` to match your local database setup:
    ```
    DB_HOST=localhost
    DB_NAME=your_database_name
    DB_USER=your_username
    DB_PASS=your_password
    ```

---

## 2. Core Concept: The Context Providers

The application's state is managed in "Providers" located in the `src/app/[portal]/context/` directories:
- **`AdminProvider`**: Manages all data for the administrator portal.
- **`StudentProvider`**: Manages data for the student portal.
- **`InstructorProvider`**: Manages data for the instructor portal.

Currently, these providers are initialized with mock data. To connect to your backend, you only need to modify these files to fetch data from your API instead of using the mock data.

---

## 3. Step-by-Step Integration Example: `AdminProvider`

The following steps show how to connect the `AdminProvider` to your backend. The same principles apply to `StudentProvider` and `InstructorProvider`.

### A. Locate the Admin Context File

Open the following file in your editor:
`src/app/admin/context/admin-context.tsx`

### B. Identify the Data Fetching Location

Inside `AdminProvider`, you will find a `useEffect` hook where the application's initial data is loaded. You will see a commented-out section prepared for fetching data from an API.

### C. Implement the API Fetch Call

To switch from mock data to your live backend:

1.  **Delete or comment out** the line that sets the mock data: `setAdminData(mockAdminData);`
2.  **Uncomment** the `fetchAdminData` function and the call to it: `fetchAdminData();`
3.  **Update the API Endpoint**: The `fetch` call should use the `NEXT_PUBLIC_API_BASE_URL` environment variable to construct the API endpoint.

**Example (After modification):**
```tsx
// ...

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Use the environment variable for the base URL
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin_data.php`);
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

### D. Handling Data Mutations (Create, Update, Delete)

When a user performs an action that changes data (e.g., deleting a user), you need to send a request to your backend and then update the local state.

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
        // 1. Make the API call using the base URL from the environment variable
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users.php?id=${selectedUser.id}`, {
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
By following this pattern, you can systematically connect the entire application to your backend. The UI components will automatically re-render with the new data.