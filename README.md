# BSIT Enrollment System

This is a comprehensive enrollment system for a BSIT program, built with Next.js and React. It features separate portals for administrators and students, each with a rich set of functionalities.

## Features

### Admin Portal
-   Full CRUD operations for students, instructors, administrators, subjects, and blocks.
-   Intelligent enrollment workflow with dynamic prerequisite checking.
-   Interactive visual schedule management with conflict detection.
-   Reporting and data visualization.

### Student Portal
-   Self-service dashboard to view profile, grades, and class schedule.
-   Multi-step enrollment application form.
-   Ability to view and print the Official Registration Form (ORF).

## Getting Started

To get the application up and running, you need to configure your environment variables for both the frontend and the backend.

### Frontend Setup

1.  **Navigate to the root directory.**
2.  **Create a `.env` file** by copying the example file:
    ```bash
    cp .env.example .env
    ```
3.  **Update `.env`** with the URL of your backend API:
    ```
    NEXT_PUBLIC_API_BASE_URL=http://your-backend-api.com/api/v1/endpoints
    ```

### Backend Setup

1.  **Navigate to the `api/v1` directory.**
2.  **Create a `.env` file** for the backend:
    ```bash
    cp .env.example .env
    ```
3.  **Update `api/v1/.env`** with your database credentials:
    ```
    DB_HOST=your_database_host
    DB_NAME=your_database_name
    DB_USER=your_database_user
    DB_PASS=your_database_password
    ```

## System Architecture

For a detailed explanation of the system's architecture, state management, and core logic, please refer to the **[System Overview Document](./docs/system-overview.md)**.

## Connecting to a Backend API

This application is designed for easy integration with any backend API (e.g., PHP, Node.js, Python). For a step-by-step guide on how to connect the frontend to your backend, please see the **[Backend Integration Guide](./docs/backend-integration.md)**.
