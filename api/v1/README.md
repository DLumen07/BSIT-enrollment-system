# Enrollment System API v1

This directory contains the first version of the Enrollment System\'s PHP-based backend API. It is designed to be a RESTful service that the frontend application can interact with to manage data for students, instructors, and administrators.

## API Structure

The API is organized into two main folders, following the principles of separation of concerns to ensure maintainability and scalability:

-   **`/endpoints`**: This folder contains the API\'s public-facing endpoints. Each file in this directory corresponds to a specific URL and is responsible for handling incoming HTTP requests. These files act as the "controllers," managing the request-response cycle. They receive requests, call the appropriate data models to interact with the database, and then format and return the response as JSON.

-   **`/models`**: This folder contains the data models for the application. Each file in this folder typically represents a database table (e.g., `admin_profile.php` corresponds to the `admin_profiles` table). These models are responsible for all database interactions, including creating, reading, updating, and deleting records. They encapsulate the business logic and data access, providing a clean and reusable interface for the endpoints.

## Connecting to the Frontend

This API is designed to work with any frontend framework that can make HTTP requests. The frontend for this project is a Next.js application, and it is already set up to connect to a backend API.

### Base URL

All endpoints in this API are located under the `/api/v1/endpoints/` directory. When deploying this API, your web server (e.g., Apache, Nginx) will be configured to serve these files. The base URL for the API will depend on your server\'s configuration. For example, if your domain is `https://your-app.com`, the API endpoints will be accessible at `https://your-app.com/api/v1/endpoints/`.

### Frontend Integration Guide

The frontend application uses a centralized state management system with React Context. To connect to this API, you only need to modify the existing "Providers" to fetch data from these API endpoints instead of using the mock data.

For a detailed, step-by-step guide on how to do this, please refer to the **[Backend Integration Guide](../../docs/backend-integration.md)**.

### Example: Fetching Data

Here\'s a simple example of how you might fetch a list of all blocks from the API using JavaScript\'s `fetch` API:

```javascript
async function getBlocks() {
  try {
    const response = await fetch(\'https://your-app.com/api/v1/endpoints/read_blocks.php\');
    if (!response.ok) {
      throw new Error(`HTTP error! status: \${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Could not fetch blocks:", error);
  }
}
```

This `README.md` file should provide a good overview for any developer looking to understand and connect to this API.
