-- Seed data for bsit_enrollment database
-- Users
INSERT INTO users (id, email, password_hash, role, created_at) VALUES
  (1, 'superadmin@bsit.edu', '$2y$10$d4mcotUPb4BxGRK8VCHrFuC0lyQihxri11bXLla8YCsJYqyMlYkLW', 'admin', NOW()),
  (2, 'student1@bsit.edu', '$2y$10$BIv9VZq4bYxDJc5/WTpiw.EMGNEZSOK9af47ac9d0njQ5c4PdbWUC', 'student', NOW()),
  (3, 'student2@bsit.edu', '$2y$10$BIv9VZq4bYxDJc5/WTpiw.EMGNEZSOK9af47ac9d0njQ5c4PdbWUC', 'student', NOW()),
  (4, 'student3@bsit.edu', '$2y$10$BIv9VZq4bYxDJc5/WTpiw.EMGNEZSOK9af47ac9d0njQ5c4PdbWUC', 'student', NOW()),
  (5, 'instructor1@bsit.edu', '$2y$10$BIv9VZq4bYxDJc5/WTpiw.EMGNEZSOK9af47ac9d0njQ5c4PdbWUC', 'instructor', NOW()),
  (6, 'instructor2@bsit.edu', '$2y$10$BIv9VZq4bYxDJc5/WTpiw.EMGNEZSOK9af47ac9d0njQ5c4PdbWUC', 'instructor', NOW())
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = VALUES(role);

-- Admin profile
INSERT INTO admin_profiles (user_id, name, admin_role, avatar_url) VALUES
  (1, 'Jane Superadmin', 'Super Admin', 'https://picsum.photos/seed/admin/64/64')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  admin_role = VALUES(admin_role),
  avatar_url = VALUES(avatar_url);

-- System settings
INSERT INTO system_settings (id, academic_year, semester, enrollment_start_date, enrollment_end_date, phased_schedule_json)
VALUES
  (1, '2024-2025', '1st-sem', '2024-08-01', '2024-08-15', NULL)
ON DUPLICATE KEY UPDATE
  academic_year = VALUES(academic_year),
  semester = VALUES(semester),
  enrollment_start_date = VALUES(enrollment_start_date),
  enrollment_end_date = VALUES(enrollment_end_date),
  phased_schedule_json = VALUES(phased_schedule_json);

-- Blocks
INSERT INTO blocks (id, name, year_level, course, specialization, capacity) VALUES
  (1, 'BSIT 3-A', 3, 'BSIT', 'AP', 40),
  (2, 'BSIT 3-B', 3, 'BSIT', 'DD', 40),
  (3, 'ACT 1-A', 1, 'ACT', NULL, 40)
ON DUPLICATE KEY UPDATE
  year_level = VALUES(year_level),
  course = VALUES(course),
  specialization = VALUES(specialization),
  capacity = VALUES(capacity);

-- Subjects
INSERT INTO subjects (id, code, description, units, semester, prerequisite_id, year_level) VALUES
  (8, 'IT 101', 'Introduction to Computing', 3, '1st-sem', NULL, 1),
  (9, 'IT 201', 'Data Structures & Algorithms', 3, '1st-sem', 8, 2),
  (10, 'IT 301', 'Web Development', 3, '1st-sem', 9, 3),
  (11, 'MATH 101', 'Calculus I', 3, '1st-sem', NULL, 1)
ON DUPLICATE KEY UPDATE
  code = VALUES(code),
  description = VALUES(description),
  units = VALUES(units),
  semester = VALUES(semester),
  prerequisite_id = VALUES(prerequisite_id),
  year_level = VALUES(year_level);

-- Subject prerequisites
INSERT INTO subject_prerequisites (subject_id, prerequisite_subject_id) VALUES
  (9, 8),
  (10, 9)
ON DUPLICATE KEY UPDATE
  prerequisite_subject_id = VALUES(prerequisite_subject_id);

-- Student profiles
INSERT INTO student_profiles (
  user_id, student_id_number, name, course, year_level, enrollment_status,
  block_id, specialization, sex, phone_number, status, enrollment_track
) VALUES
  (2, '24-00-0001', 'Alice Johnson', 'BSIT', 3, 'Enrolled', 1, 'AP', 'Female', '09123456789', 'Old', 'Regular'),
  (3, '24-00-0002', 'Bob Williams', 'BSIT', 3, 'Not Enrolled', 2, 'DD', 'Male', '09123456780', 'Old', 'Irregular'),
  (4, '24-00-0003', 'Charlie Brown', 'ACT', 1, 'Enrolled', 3, NULL, 'Male', '09123456781', 'New', 'Regular')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  course = VALUES(course),
  year_level = VALUES(year_level),
  enrollment_status = VALUES(enrollment_status),
  block_id = VALUES(block_id),
  specialization = VALUES(specialization),
  sex = VALUES(sex),
  phone_number = VALUES(phone_number),
  status = VALUES(status),
  enrollment_track = VALUES(enrollment_track);

-- Instructor profiles
INSERT INTO instructor_profiles (user_id, name, avatar_url, department) VALUES
  (5, 'Dr. Alan Turing', 'https://picsum.photos/seed/turing/64/64', 'College of Computer Studies'),
  (6, 'Prof. Ada Lovelace', 'https://picsum.photos/seed/lovelace/64/64', 'College of Computer Studies')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  avatar_url = VALUES(avatar_url),
  department = VALUES(department);

-- Instructor subjects
INSERT INTO instructor_subjects (instructor_id, subject_id) VALUES
  (5, 8),
  (5, 10),
  (6, 9)
ON DUPLICATE KEY UPDATE
  subject_id = VALUES(subject_id);

-- Enrollment applications
INSERT INTO enrollment_applications (id, student_user_id, status, block_name, `submitted_.at`, rejection_reason, form_data) VALUES
  (1, 2, 'pending', 'BSIT 3-A', NOW(), NULL, '{"birthCertificate": true, "grades": true, "goodMoral": false, "registrationForm": true}'),
  (2, 3, 'approved', 'BSIT 3-B', NOW(), NULL, '{"birthCertificate": true, "grades": true, "goodMoral": true, "registrationForm": true}'),
  (3, 4, 'rejected', 'ACT 1-A', NOW(), 'Incomplete or missing documents.', '{"birthCertificate": false, "grades": true, "goodMoral": true, "registrationForm": false}')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  block_name = VALUES(block_name),
  `submitted_.at` = VALUES(`submitted_.at`),
  rejection_reason = VALUES(rejection_reason),
  form_data = VALUES(form_data);

-- Announcements
INSERT INTO announcements (id, title, message, audience, created_by, created_at, updated_at) VALUES
  (1, 'Welcome Back!', 'Classes resume on Monday. Please check your schedules for updates.', 'All', 1, NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 7 DAY),
  (2, 'Enrollment Reminder', 'Enrollment for the 2nd semester closes this Friday.', 'Students', 1, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  message = VALUES(message),
  audience = VALUES(audience),
  created_by = VALUES(created_by),
  created_at = VALUES(created_at),
  updated_at = VALUES(updated_at);

-- Program events
INSERT INTO program_events (id, event_date, title, description, created_by, created_at, updated_at) VALUES
  (1, '2025-01-15', 'General Assembly', 'Kick-off orientation for all BSIT students.', 1, NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 30 DAY),
  (2, '2025-02-05', 'Hackathon Sprint', '48-hour campus-wide innovation challenge.', 1, NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY)
ON DUPLICATE KEY UPDATE
  event_date = VALUES(event_date),
  title = VALUES(title),
  description = VALUES(description),
  created_by = VALUES(created_by),
  created_at = VALUES(created_at),
  updated_at = VALUES(updated_at);

-- Student subjects
INSERT INTO student_subjects (id, student_user_id, subject_id) VALUES
  (1, 2, 8),
  (2, 2, 9),
  (3, 3, 8),
  (4, 4, 8)
ON DUPLICATE KEY UPDATE
  student_user_id = VALUES(student_user_id),
  subject_id = VALUES(subject_id);

-- Student grades
INSERT INTO student_grades (id, student_user_id, subject_id, grade, academic_year, semester, remark, graded_at) VALUES
  (1, 2, 8, 1.63, '2024-2025', '1st-sem', 'Passed', '2025-03-30 10:30:00'),
  (2, 2, 9, NULL, '2024-2025', '1st-sem', 'In Progress', NULL),
  (3, 3, 8, 2.00, '2024-2025', '1st-sem', 'Passed', '2025-03-30 10:30:00')
ON DUPLICATE KEY UPDATE
  grade = VALUES(grade),
  remark = VALUES(remark),
  graded_at = VALUES(graded_at),
  academic_year = VALUES(academic_year),
  semester = VALUES(semester);

-- Student grade term breakdowns
INSERT INTO student_grade_terms (id, student_grade_id, term, grade, weight, encoded_at) VALUES
  (1, 1, 'prelim', 1.50, 0.30, '2025-01-15 09:00:00'),
  (2, 1, 'midterm', 1.75, 0.30, '2025-02-20 09:00:00'),
  (3, 1, 'final', 1.60, 0.40, '2025-03-30 10:30:00'),
  (4, 2, 'prelim', 1.80, 0.30, '2025-01-15 09:15:00'),
  (5, 2, 'midterm', NULL, 0.30, '2025-02-20 09:15:00'),
  (6, 3, 'prelim', 2.10, 0.30, '2025-01-15 09:30:00'),
  (7, 3, 'midterm', 2.00, 0.30, '2025-02-21 09:00:00'),
  (8, 3, 'final', 1.90, 0.40, '2025-03-30 10:30:00')
ON DUPLICATE KEY UPDATE
  grade = VALUES(grade),
  weight = VALUES(weight),
  encoded_at = VALUES(encoded_at);

-- Schedules
INSERT INTO schedules (id, block_id, subject_id, instructor_id, day_of_week, start_time, end_time, room) VALUES
  (1, 1, 8, 5, 'Monday', '09:00:00', '10:30:00', 'Room 301'),
  (2, 1, 9, 6, 'Wednesday', '11:00:00', '12:30:00', 'Room 302'),
  (3, 3, 8, 5, 'Tuesday', '08:00:00', '09:30:00', 'Room 101')
ON DUPLICATE KEY UPDATE
  instructor_id = VALUES(instructor_id),
  day_of_week = VALUES(day_of_week),
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  room = VALUES(room);
