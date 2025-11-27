-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 05, 2025 at 01:31 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bsit_enrollment`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_profiles`
--

CREATE TABLE `admin_profiles` (
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` text DEFAULT NULL,
  `admin_role` enum('Super Admin','Admin','Moderator') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_profiles`
--

INSERT INTO `admin_profiles` (`user_id`, `name`, `avatar_url`, `admin_role`) VALUES
(1, 'Daren SuperAdmin', 'https://picsum.photos/seed/admin/64/64', 'Super Admin'),
(10, 'Quen Mercado', '', 'Admin'),
(11, 'Micca Tubal', '', 'Moderator');

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `semester` varchar(20) NOT NULL,
  `enrollment_start_date` date DEFAULT NULL,
  `enrollment_end_date` date DEFAULT NULL,
  `phased_schedule_json` json DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blocks`
--

CREATE TABLE `blocks` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `year_level` int(11) NOT NULL,
  `course` enum('BSIT','ACT') NOT NULL,
  `specialization` enum('AP','DD') DEFAULT NULL,
  `capacity` int(11) NOT NULL DEFAULT 40
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `blocks`
--

INSERT INTO `blocks` (`id`, `name`, `year_level`, `course`, `specialization`, `capacity`) VALUES
(1, 'BSIT 3-A', 3, 'BSIT', 'AP', 40),
(2, 'BSIT 3-B', 3, 'BSIT', 'DD', 40),
(3, 'ACT 1-A', 1, 'ACT', NULL, 40),
(11, 'ACT 2-A', 2, 'ACT', NULL, 30),
(14, 'BSIT 3-A', 3, 'BSIT', 'DD', 25);

-- --------------------------------------------------------

--
-- Table structure for table `enrollment_applications`
--

CREATE TABLE `enrollment_applications` (
  `id` int(11) NOT NULL,
  `student_user_id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `block_name` varchar(255) NOT NULL,
  `submitted_.at` timestamp NOT NULL DEFAULT current_timestamp(),
  `rejection_reason` text DEFAULT NULL,
  `form_data` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `instructor_profiles`
--

CREATE TABLE `instructor_profiles` (
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` text DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `instructor_profiles`
--

INSERT INTO `instructor_profiles` (`user_id`, `name`, `avatar_url`, `department`) VALUES
(7, 'Daren De Lumen', 'https://picsum.photos/seed/instructor-1762274031438/64/64', ''),
(8, 'Reniel Santiago', 'https://picsum.photos/seed/instructor-1762321577856/64/64', '');

-- --------------------------------------------------------

--
-- Table structure for table `instructor_subjects`
--

CREATE TABLE `instructor_subjects` (
  `instructor_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `instructor_subjects`
--

INSERT INTO `instructor_subjects` (`instructor_id`, `subject_id`) VALUES
(7, 10),
(8, 9),
(8, 10),
(8, 13);

-- --------------------------------------------------------

--
-- Table structure for table `schedules`
--

CREATE TABLE `schedules` (
  `id` int(11) NOT NULL,
  `block_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `instructor_id` int(11) DEFAULT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `room` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schedules`
--

INSERT INTO `schedules` (`id`, `block_id`, `subject_id`, `instructor_id`, `day_of_week`, `start_time`, `end_time`, `room`) VALUES
(6, 1, 10, 7, 'Monday', '08:00:00', '11:30:00', 'Room 101');



-- --------------------------------------------------------

--
-- Table structure for table `teaching_assignment_history`
--

CREATE TABLE `teaching_assignment_history` (
  `id` int(11) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `block_id` int(11) DEFAULT NULL,
  `block_name` varchar(255) NOT NULL,
  `course` enum('BSIT','ACT') DEFAULT NULL,
  `specialization` enum('AP','DD') DEFAULT NULL,
  `year_level` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `subject_code` varchar(50) NOT NULL,
  `subject_description` varchar(255) DEFAULT NULL,
  `units` int(11) DEFAULT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `room` varchar(255) DEFAULT NULL,
  `instructor_user_id` int(11) DEFAULT NULL,
  `instructor_name` varchar(255) DEFAULT NULL,
  `instructor_email` varchar(255) DEFAULT NULL,
  `academic_year` varchar(20) NOT NULL,
  `semester` varchar(20) NOT NULL,
  `captured_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE `student_grades` (
  `id` int(11) NOT NULL,
  `student_user_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `grade` decimal(4,2) DEFAULT NULL,
  `academic_year` varchar(255) NOT NULL,
  `semester` varchar(255) NOT NULL,
  `instructor_user_id` int(11) DEFAULT NULL,
  `remark` enum('Passed','Failed','Incomplete','Dropped','In Progress') DEFAULT 'In Progress',
-- --------------------------------------------------------

--
--
-- Table structure for table `student_grade_terms`
CREATE TABLE `student_grade_terms` (
  `id` int(11) NOT NULL,
  `student_grade_id` int(11) NOT NULL,
  `term` enum('prelim','midterm','final') NOT NULL,
  `grade` decimal(4,2) DEFAULT NULL,
  `weight` decimal(4,2) DEFAULT NULL,
  `encoded_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_enrollment_history`
--

CREATE TABLE `student_enrollment_history` (
  `id` int(11) NOT NULL,
  `student_user_id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `semester` varchar(20) NOT NULL,
  `status` enum('Pending','Enrolled','Not Enrolled','Graduated','Hold') NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `academic_rollover_logs`
--

CREATE TABLE `academic_rollover_logs` (
  `id` int(11) NOT NULL,
  `triggered_by_user_id` int(11) DEFAULT NULL,
  `closing_academic_year` varchar(20) NOT NULL,
  `closing_semester` varchar(20) NOT NULL,
  `next_academic_year` varchar(20) NOT NULL,
  `next_semester` varchar(20) NOT NULL,
  `promoted_count` int(11) NOT NULL DEFAULT 0,
  `held_count` int(11) NOT NULL DEFAULT 0,
  `graduated_count` int(11) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `academic_rollover_actions`
--

CREATE TABLE `academic_rollover_actions` (
  `id` int(11) NOT NULL,
  `rollover_log_id` int(11) NOT NULL,
  `student_user_id` int(11) NOT NULL,
  `previous_year_level` int(11) NOT NULL,
  `new_year_level` int(11) NOT NULL,
  `action` enum('promoted','held','graduated') NOT NULL,
  `reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `audience` enum('All','Students','Instructors') NOT NULL DEFAULT 'Students',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_profiles`
--

CREATE TABLE `student_profiles` (
  `user_id` int(11) NOT NULL,
  `student_id_number` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` text DEFAULT NULL,
  `course` enum('BSIT','ACT') NOT NULL,
  `year_level` int(11) NOT NULL,
  `enrollment_status` enum('Enrolled','Not Enrolled','Graduated') NOT NULL DEFAULT 'Not Enrolled',
  `promotion_hold_reason` text DEFAULT NULL,
  `block_id` int(11) DEFAULT NULL,
  `specialization` enum('AP','DD') DEFAULT NULL,
  `sex` enum('Male','Female') DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `current_address` text DEFAULT NULL,
  `permanent_address` text DEFAULT NULL,
  `nationality` varchar(255) DEFAULT NULL,
  `religion` varchar(255) DEFAULT NULL,
  `dialect` varchar(255) DEFAULT NULL,
  `civil_status` enum('Single','Married','Widowed','Separated') DEFAULT NULL,
  `status` enum('New','Old','Transferee') DEFAULT NULL,
  `enrollment_track` enum('Regular','Irregular') NOT NULL DEFAULT 'Regular',
  `fathers_name` varchar(255) DEFAULT NULL,
  `fathers_occupation` varchar(255) DEFAULT NULL,
  `mothers_name` varchar(255) DEFAULT NULL,
  `mothers_occupation` varchar(255) DEFAULT NULL,
  `guardians_name` varchar(255) DEFAULT NULL,
  `guardians_occupation` varchar(255) DEFAULT NULL,
  `guardians_address` text DEFAULT NULL,
  `living_with_family` enum('Yes','No') DEFAULT NULL,
  `boarding` enum('Yes','No') DEFAULT NULL,
  `differently_abled` enum('Yes','No') DEFAULT NULL,
  `disability` varchar(255) DEFAULT NULL,
  `minority_group` enum('Yes','No') DEFAULT NULL,
  `minority` varchar(255) DEFAULT NULL,
  `elementary_school` varchar(255) DEFAULT NULL,
  `elem_year_graduated` varchar(255) DEFAULT NULL,
  `secondary_school` varchar(255) DEFAULT NULL,
  `secondary_year_graduated` varchar(255) DEFAULT NULL,
  `collegiate_school` varchar(255) DEFAULT NULL,
  `collegiate_year_graduated` varchar(255) DEFAULT NULL,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_address` text DEFAULT NULL,
  `emergency_contact_number` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_profiles`
--

INSERT INTO `student_profiles` (`user_id`, `student_id_number`, `name`, `avatar_url`, `course`, `year_level`, `enrollment_status`, `block_id`, `specialization`, `sex`, `phone_number`, `middle_name`, `birthdate`, `current_address`, `permanent_address`, `nationality`, `religion`, `dialect`, `civil_status`, `status`, `enrollment_track`, `fathers_name`, `fathers_occupation`, `mothers_name`, `mothers_occupation`, `guardians_name`, `guardians_occupation`, `guardians_address`, `living_with_family`, `boarding`, `differently_abled`, `disability`, `minority_group`, `minority`, `elementary_school`, `elem_year_graduated`, `secondary_school`, `secondary_year_graduated`, `collegiate_school`, `collegiate_year_graduated`, `emergency_contact_name`, `emergency_contact_address`, `emergency_contact_number`) VALUES
(3, '24-00-0002', 'Bob Williams', NULL, 'BSIT', 3, 'Enrolled', 2, 'DD', 'Male', '09123456780', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Old', 'Irregular', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(13, '25-00-0001', 'Daren De Lumen', NULL, 'BSIT', 1, 'Not Enrolled', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'New', 'Regular', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(14, '25-00-0002', 'Daren De Lumen', NULL, 'BSIT', 1, 'Not Enrolled', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'New', 'Regular', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `student_subjects`
--

CREATE TABLE `student_subjects` (
  `id` int(11) NOT NULL,
  `student_user_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_documents`
--

CREATE TABLE `student_documents` (
  `id` int(11) NOT NULL,
  `student_user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` enum('Submitted','Pending','Approved','Rejected') NOT NULL DEFAULT 'Submitted',
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `file_mime` varchar(100) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `code` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `units` int(11) NOT NULL,
  `semester` enum('1st-sem','2nd-sem','summer') NOT NULL DEFAULT '1st-sem',
  `prerequisite_id` int(11) DEFAULT NULL,
  `year_level` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `code`, `description`, `units`, `semester`, `prerequisite_id`, `year_level`) VALUES
(9, 'IT 201', 'Data Structures & Algorithms', 3, '1st-sem', NULL, 2),
(10, 'IT 301', 'Web Development', 3, '1st-sem', 9, 3),
(11, 'MATH 101', 'Calculus I', 3, '1st-sem', NULL, 1),
(13, 'CAP 100', 'Capstone', 3, '2nd-sem', NULL, 4);

-- --------------------------------------------------------

--
-- Table structure for table `subject_prerequisites`
--

CREATE TABLE `subject_prerequisites` (
  `subject_id` int(11) NOT NULL,
  `prerequisite_subject_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subject_prerequisites`
--

INSERT INTO `subject_prerequisites` (`subject_id`, `prerequisite_subject_id`) VALUES
(10, 9),
(9, 8);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('student','instructor','admin') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `created_at`) VALUES
(1, 'superadmin@bsit.edu', '$2y$10$hc5KJFXO4MpqgaZ7ZwPvE.UnhoOvf7XGN2rXOg8iWKnLlVm0zSmYK', 'admin', '2025-10-30 02:59:37'),
(3, 'student2@bsit.edu', '$2y$10$BIv9VZq4bYxDJc5/WTpiw.EMGNEZSOK9af47ac9d0njQ5c4PdbWUC', 'student', '2025-11-04 11:19:32'),
(7, 'darendl@gmail.com', '$2y$10$0iILq0DkdLD.F82lFYOciO44zmzdD.8VdK/iiOVw0iUOZ7Km/t5lq', 'instructor', '2025-11-04 16:33:51'),
(8, 'reniel@gmail.com', '$2y$10$gxCekTj4Gc8jpUkUd/Lh5.jqrRf3UEERZvLWplKyGOs3yvymrWUFG', 'instructor', '2025-11-05 05:46:18'),
(10, 'quen@bsit.edu', '$2y$10$jESTWBJXi8QJ4e/dCwhFje48fOWsq.wk49kk4d/NDIMjGi60M4NJi', 'admin', '2025-11-05 10:03:11'),
(11, 'micca@bsit.edu', '$2y$10$3KG7Cw9rtqqgE5tFCIGX.uRY.FYCyAe6W4AovIRBTQ2zy6IpXnD/6', 'admin', '2025-11-05 11:12:10'),
(13, 'Daren@07.com', '$2y$10$DDnXi0y3c9WwWoQf85RdTeUBKeU9myJI9GQ4xVmQZxpQL67r1/VmC', 'student', '2025-11-05 11:54:38'),
(14, 'daren@gmail.com', '$2y$10$XsPilVA9pNVbSqtrljn7d.DARdzFAn99AoE/BwWdiTh9XZX0Qx9fG', 'student', '2025-11-05 12:21:19');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `blocks`
--
ALTER TABLE `blocks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_block` (`name`,`specialization`);

--
-- Indexes for table `enrollment_applications`
--
ALTER TABLE `enrollment_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_student_user_id` (`student_user_id`);

--
-- Indexes for table `instructor_profiles`
--
ALTER TABLE `instructor_profiles`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `instructor_subjects`
--
ALTER TABLE `instructor_subjects`
  ADD PRIMARY KEY (`instructor_id`,`subject_id`),
  ADD KEY `idx_subject_id` (`subject_id`);

--
-- Indexes for table `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_block_id` (`block_id`),
  ADD KEY `idx_subject_id` (`subject_id`),
  ADD KEY `idx_instructor_id` (`instructor_id`);

--
-- Indexes for table `student_grades`
--
ALTER TABLE `student_grades`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_student_grade` (`student_user_id`,`subject_id`,`academic_year`,`semester`),
  ADD KEY `idx_student_user_id` (`student_user_id`),
  ADD KEY `idx_subject_id` (`subject_id`),
  ADD KEY `idx_instructor_user_id` (`instructor_user_id`);

--
ALTER TABLE `student_profiles`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `student_id_number` (`student_id_number`),
  ADD KEY `idx_block_id` (`block_id`);

--

--
-- Indexes for table `student_grade_terms`
--
ALTER TABLE `student_grade_terms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_grade_term` (`student_grade_id`,`term`),
  ADD KEY `idx_grade_terms_grade_id` (`student_grade_id`);

--
-- Indexes for table `student_enrollment_history`
--
ALTER TABLE `student_enrollment_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_student_history_student` (`student_user_id`);

--
-- Indexes for table `academic_rollover_logs`
--
ALTER TABLE `academic_rollover_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rollover_triggered_by` (`triggered_by_user_id`);

--
-- Indexes for table `academic_rollover_actions`
--
ALTER TABLE `academic_rollover_actions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rollover_actions_log` (`rollover_log_id`),
  ADD KEY `idx_rollover_actions_student` (`student_user_id`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_announcements_audience` (`audience`),
  ADD KEY `idx_announcements_created_by` (`created_by`);

--
-- Indexes for table `student_subjects`
--
ALTER TABLE `student_subjects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_student_subject_user` (`student_user_id`),
  ADD KEY `idx_student_subject_subject` (`subject_id`);

--
-- Indexes for table `student_documents`
--
ALTER TABLE `student_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_student_documents_student` (`student_user_id`);

--
-- AUTO_INCREMENT for table `student_grade_terms`
--
ALTER TABLE `student_grade_terms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Indexes for table `subjects`
--

--
-- Constraints for table `student_grade_terms`
--
ALTER TABLE `student_grade_terms`
  ADD CONSTRAINT `student_grade_terms_ibfk_1` FOREIGN KEY (`student_grade_id`) REFERENCES `student_grades` (`id`) ON DELETE CASCADE;
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `prerequisite_id` (`prerequisite_id`);

--
-- Indexes for table `teaching_assignment_history`
--
ALTER TABLE `teaching_assignment_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_teaching_assignment_term` (`academic_year`,`semester`),
  ADD KEY `idx_teaching_assignment_instructor` (`instructor_user_id`),
  ADD KEY `idx_teaching_assignment_block` (`block_id`);

--
-- Indexes for table `subject_prerequisites`
--
ALTER TABLE `subject_prerequisites`
  ADD PRIMARY KEY (`subject_id`,`prerequisite_subject_id`),
  ADD KEY `idx_subject_prereq_requirement` (`prerequisite_subject_id`);

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `fk_announcements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `blocks`
--
ALTER TABLE `blocks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `enrollment_applications`
--
ALTER TABLE `enrollment_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `student_grades`
--
ALTER TABLE `student_grades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `student_subjects`
--
ALTER TABLE `student_subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `student_documents`
--
ALTER TABLE `student_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `teaching_assignment_history`
--
ALTER TABLE `teaching_assignment_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_enrollment_history`
--
ALTER TABLE `student_enrollment_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `academic_rollover_logs`
--
ALTER TABLE `academic_rollover_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `academic_rollover_actions`
--
ALTER TABLE `academic_rollover_actions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `enrollment_applications`
--
ALTER TABLE `enrollment_applications`
  ADD CONSTRAINT `enrollment_applications_ibfk_1` FOREIGN KEY (`student_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `instructor_profiles`
--
ALTER TABLE `instructor_profiles`
  ADD CONSTRAINT `instructor_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `instructor_subjects`
--
ALTER TABLE `instructor_subjects`
  ADD CONSTRAINT `fk_instructor_subjects_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_instructor_subjects_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `schedules_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `schedules_ibfk_3` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `student_grades`
--
ALTER TABLE `student_grades`
  ADD CONSTRAINT `student_grades_ibfk_1` FOREIGN KEY (`student_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_grades_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_grades_ibfk_3` FOREIGN KEY (`instructor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `student_profiles`
--
ALTER TABLE `student_profiles`
  ADD CONSTRAINT `student_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_subjects`
--
ALTER TABLE `student_subjects`
  ADD CONSTRAINT `student_subjects_ibfk_1` FOREIGN KEY (`student_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_subjects_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_enrollment_history`
--
ALTER TABLE `student_enrollment_history`
  ADD CONSTRAINT `student_enrollment_history_ibfk_1` FOREIGN KEY (`student_user_id`) REFERENCES `student_profiles` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `academic_rollover_logs`
--
ALTER TABLE `academic_rollover_logs`
  ADD CONSTRAINT `academic_rollover_logs_ibfk_1` FOREIGN KEY (`triggered_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `academic_rollover_actions`
--
ALTER TABLE `academic_rollover_actions`
  ADD CONSTRAINT `academic_rollover_actions_ibfk_1` FOREIGN KEY (`rollover_log_id`) REFERENCES `academic_rollover_logs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `academic_rollover_actions_ibfk_2` FOREIGN KEY (`student_user_id`) REFERENCES `student_profiles` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `subject_prerequisites`
--
ALTER TABLE `subject_prerequisites`
  ADD CONSTRAINT `fk_subject_prereq_requirement` FOREIGN KEY (`prerequisite_subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_subject_prereq_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`prerequisite_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
