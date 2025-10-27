# Frontend to Backend Authentication Integration

This document explains how the Next.js frontend authenticates with the PHP backend.

## The Problem

The PHP backend uses a session-based authentication system. When a user logs in, a session is created on the server, and a session cookie is sent to the client's browser. For subsequent requests to be authenticated, this session cookie must be sent back to the server with each request.

The frontend was experiencing "unauthorized" errors because, by default, the `fetch` API does not send cookies with cross-origin requests.

## The Solution

To fix this, the `credentials: 'include'` option was added to the `fetch` requests in the frontend's API helper (`src/lib/api.ts`). This option tells the browser to include the session cookie with all requests to the backend, allowing the server to authenticate the user and authorize the request.
