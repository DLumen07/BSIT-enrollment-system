--
-- Main `users` table for authentication and roles
--
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('student','instructor','admin') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Profile tables, linked to the `users` table
--
CREATE TABLE `student_profiles` (
  `user_id` int(11) NOT NULL,
  `student_id_number` varchar(255) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `avatar_url` text,
  `course` enum('BSIT','ACT') NOT NULL,
  `year_level` int(11) NOT NULL,
  `enrollment_status` enum('Enrolled','Not Enrolled','Graduated') NOT NULL DEFAULT 'Not Enrolled',
  `block_id` int(11) DEFAULT NULL,
  `specialization` enum('AP','DD') DEFAULT NULL,
  `sex` enum('Male','Female') DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `instructor_profiles` (
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` text,
  `department` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `admin_profiles` (
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` text,
  `admin_role` enum('Super Admin','Admin','Moderator') NOT NULL,
  PRIMARY KEY (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Academic structure tables
--
CREATE TABLE `subjects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL UNIQUE,
  `description` varchar(255) NOT NULL,
  `units` int(11) NOT NULL,
  `prerequisite_id` int(11) DEFAULT NULL,
  `year_level` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`prerequisite_id`) REFERENCES `subjects`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `blocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL UNIQUE,
  `year_level` int(11) NOT NULL,
  `course` enum('BSIT','ACT') NOT NULL,
  `specialization` enum('AP','DD') DEFAULT NULL,
  `capacity` int(11) NOT NULL DEFAULT 40,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `block_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `instructor_id` int(11) DEFAULT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `room` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`block_id`) REFERENCES `blocks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Student data tables
--
CREATE TABLE `student_grades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_user_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `grade` decimal(3,2) NOT NULL,
  `academic_year` varchar(255) NOT NULL,
  `semester` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `enrollment_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_user_id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `block_name` varchar(255) NOT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rejection_reason` text,
  `form_data` text NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `student_subjects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_user_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Add indexes for performance
--
ALTER TABLE `student_profiles` ADD INDEX `idx_block_id` (`block_id`);
ALTER TABLE `schedules` ADD INDEX `idx_block_id` (`block_id`);
ALTER TABLE `schedules` ADD INDEX `idx_subject_id` (`subject_id`);
ALTER TABLE `schedules` ADD INDEX `idx_instructor_id` (`instructor_id`);
ALTER TABLE `student_grades` ADD INDEX `idx_student_user_id` (`student_user_id`);
ALTER TABLE `student_grades` ADD INDEX `idx_subject_id` (`subject_id`);
ALTER TABLE `enrollment_applications` ADD INDEX `idx_student_user_id` (`student_user_id`);
ALTER TABLE `student_subjects` ADD INDEX `idx_student_user_id` (`student_user_id`);
ALTER TABLE `student_subjects` ADD INDEX `idx_subject_id` (`subject_id`);
