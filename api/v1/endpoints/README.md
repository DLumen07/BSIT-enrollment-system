# API Endpoint Documentation

This document provides a comprehensive guide to all the API endpoints for the BSIT Enrollment System. All endpoints are located in this directory and are designed to be RESTful.

---

## Table of Contents
1.  [Users & Authentication](#users--authentication)
2.  [Subjects](#subjects)
3.  [Blocks](#blocks)
4.  [Schedules / Classes](#schedules--classes)
5.  [Grades](#grades)
6.  [Enrollment & Applications](#enrollment--applications)
7.  [Profiles](#profiles)
8.  [Reporting](#reporting)

---

## Users & Authentication

### `login.php`
- **Purpose:** Authenticates a user and returns their profile.
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "user_password"
  }
  ```
- **Success Response:** `200 OK` with user profile data.
- **Error Response:** `401 Unauthorized`.

### `create_user.php`
- **Purpose:** Creates a new user account (student, instructor, or admin).
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "email": "newuser@example.com",
    "password": "password123",
    "role": "student"
  }
  ```
- **Success Response:** `201 Created`
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `read_users.php`
- **Purpose:** Retrieves a list of all users.
- **Method:** `GET`
- **Success Response:** `200 OK` with a list of user records.
- **Error Response:** `404 Not Found`.

### `update_user.php`
- **Purpose:** Updates a user's core information (email, role).
- **Method:** `PUT`
- **Request Body:**
  ```json
  {
    "id": "1",
    "email": "updated@example.com",
    "role": "admin"
  }
  ```
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `delete_user.php`
- **Purpose:** Deletes a user by their ID.
- **Method:** `DELETE`
- **Request Body:** `{"id": "1"}`
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

---

## Subjects

### `create_subject.php`
- **Purpose:** Creates a new academic subject.
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "subject_code": "IT 101",
    "subject_name": "Introduction to Computing",
    "description": "Fundamentals of computing.",
    "units": 3,
    "course": "BSIT",
    "year_level": 1,
    "specialization": ""
  }
  ```
- **Success Response:** `201 Created`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `read_subjects.php`
- **Purpose:** Retrieves a list of all subjects.
- **Method:** `GET`
- **Success Response:** `200 OK` with a list of subject records.
- **Error Response:** `404 Not Found`.

### `update_subject.php`
- **Purpose:** Updates an existing subject.
- **Method:** `PUT`
- **Request Body:**
  ```json
  {
    "id": "1",
    "subject_code": "IT 101",
    "subject_name": "Intro to Computing",
    "description": "Updated description.",
    "units": 3,
    "course": "BSIT",
    "year_level": 1,
    "specialization": ""
  }
  ```
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `delete_subject.php`
- **Purpose:** Deletes a subject by its ID.
- **Method:** `DELETE`
- **Request Body:** `{"id": "1"}`
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

---

## Blocks

### `create_block.php`
- **Purpose:** Creates a new class section or block.
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "block_name": "BSIT 1-A",
    "course": "BSIT",
    "year_level": 1,
    "specialization": ""
  }
  ```
- **Success Response:** `201 Created`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `read_blocks.php`
- **Purpose:** Retrieves a list of all blocks.
- **Method:** `GET`
- **Success Response:** `200 OK` with a list of block records.
- **Error Response:** `404 Not Found`.

### `update_block.php`
- **Purpose:** Updates an existing block.
- **Method:** `PUT`
- **Request Body:**
  ```json
  {
    "id": "1",
    "block_name": "BSIT 1-A",
    "course": "BSIT",
    "year_level": 1,
    "specialization": ""
  }
  ```
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `delete_block.php`
- **Purpose:** Deletes a block by its ID.
- **Method:** `DELETE`
- **Request Body:** `{"id": "1"}`
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

---

## Schedules / Classes

### `create_class.php`
- **Purpose:** Creates a new class schedule.
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "subject_id": "1",
    "instructor_id": "2",
    "block_id": "3",
    "room": "Lab 1",
    "day_of_week": "Monday",
    "start_time": "09:00",
    "end_time": "12:00"
  }
  ```
- **Success Response:** `201 Created`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `read_classes.php`
- **Purpose:** Retrieves a list of all class schedules.
- **Method:** `GET`
- **Success Response:** `200 OK` with a list of class records.
- **Error Response:** `404 Not Found`.

### `update_class.php`
- **Purpose:** Updates an existing class schedule.
- **Method:** `PUT`
- **Request Body:** (Same as `create_class.php` but with an `id`)
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `delete_class.php`
- **Purpose:** Deletes a class schedule by its ID.
- **Method:** `DELETE`
- **Request Body:** `{"id": "1"}`
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

---

## Grades

### `create_grade.php`
- **Purpose:** Adds a new grade for a student.
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "student_user_id": "1",
    "subject_id": "2",
    "grade": "1.75",
    "academic_year": "2023-2024",
    "semester": "1st"
  }
  ```
- **Success Response:** `201 Created`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `read_grades.php`
- **Purpose:** Retrieves all grades for a specific student.
- **Method:** `GET`
- **Query Parameter:** `student_user_id={id}`
- **Success Response:** `200 OK` with a list of grade records.
- **Error Response:** `404 Not Found`.

### `update_grade.php`
- **Purpose:** Updates an existing grade.
- **Method:** `PUT`
- **Request Body:**
  ```json
  {
    "id": "1",
    "grade": "1.50"
  }
  ```
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

---

## Enrollment & Applications

### `submit_application.php`
- **Purpose:** Allows a student to submit an enrollment application.
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "student_user_id": "1",
    "block_name": "BSIT 1-A",
    "form_data": { "...all form fields..." }
  }
  ```
- **Success Response:** `201 Created`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `approve_application.php`
- **Purpose:** Approves or rejects an enrollment application.
- **Method:** `PUT`
- **Request Body:**
  ```json
  {
    "id": "1",
    "status": "approved", // or "rejected"
    "rejection_reason": "Optional reason if rejected."
  }
  ```
- **Success Response:** `200 OK`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

### `enroll_student.php`
- **Purpose:** Enrolls a student in a specific subject (Direct Enroll).
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "student_user_id": "1",
    "subject_id": "2"
  }
  ```
- **Success Response:** `201 Created`.
- **Error Response:** `400 Bad Request`, `503 Service Unavailable`.

---

## Profiles

These endpoints manage the detailed profiles for each user type.

### `create_student_profile.php`
- **Method:** `POST`
- **Purpose:** Creates a detailed profile for a student user.

### `read_student_profiles.php`
- **Method:** `GET`
- **Purpose:** Retrieves all student profiles.

### `create_instructor_profile.php`
- **Method:** `POST`
- **Purpose:** Creates a detailed profile for an instructor user.

### `read_instructor_profiles.php`
- **Method:** `GET`
- **Purpose:** Retrieves all instructor profiles.

### `create_admin_profile.php`
- **Method:** `POST`
- **Purpose:** Creates a detailed profile for an admin user.

### `read_admin_profiles.php`
- **Method:** `GET`
- **Purpose:** Retrieves all admin profiles.

---

## Reporting

### `get_report_data.php`
- **Purpose:** Retrieves aggregated data for the admin dashboard.
- **Method:** `GET`
- **Success Response:** `200 OK`
  ```json
  {
    "total_students": 50,
    "total_instructors": 10,
    "total_subjects": 30,
    "total_blocks": 5,
    "pending_applications": 3
  }
  ```
- **Error Response:** `404 Not Found`.