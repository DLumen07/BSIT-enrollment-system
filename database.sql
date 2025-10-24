CREATE TABLE `student_profiles` (
  `user_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` text NOT NULL,
  `course` varchar(255) NOT NULL,
  `year_level` int(11) NOT NULL,
  `specialization` varchar(255) NOT NULL,
  `block` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `instructor_profiles` (
  `user_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` text NOT NULL,
  `department` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `admin_profiles` (
  `user_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` text NOT NULL,
  `admin_role` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_code` varchar(255) NOT NULL,
  `subject_name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `units` int(11) NOT NULL,
  `course` varchar(255) NOT NULL,
  `year_level` int(11) NOT NULL,
  `specialization` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `blocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `block_name` varchar(255) NOT NULL,
  `course` varchar(255) NOT NULL,
  `year_level` int(11) NOT NULL,
  `specialization` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `classes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_id` int(11) NOT NULL,
  `instructor_id` varchar(255) NOT NULL,
  `block_id` int(11) NOT NULL,
  `room` varchar(255) NOT NULL,
  `day_of_week` varchar(255) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
