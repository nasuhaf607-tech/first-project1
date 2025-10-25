-- dbuser schema for phpMyAdmin import
-- This will create the database and required tables used by the application

CREATE DATABASE IF NOT EXISTS dbuser CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dbuser;

-- Users table (includes optional driver-related columns)
CREATE TABLE IF NOT EXISTS tbuser (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  userType VARCHAR(50) NOT NULL,
  phoneNum VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  icNumber VARCHAR(20) NULL,
  licenseNumber VARCHAR(50) NULL,
  vehicleType VARCHAR(50) NULL,
  vehicleNumber VARCHAR(20) NULL,
  address TEXT NULL,
  emergencyContact VARCHAR(100) NULL,
  emergencyPhone VARCHAR(20) NULL,
  experience VARCHAR(20) NULL,
  languages TEXT NULL,
  availability VARCHAR(50) NULL,
  icPhoto VARCHAR(255) NULL,
  selfiePhoto VARCHAR(255) NULL,
  licensePhoto VARCHAR(255) NULL,
  vehiclePhoto VARCHAR(255) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userType (userType),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- Bookings table
CREATE TABLE IF NOT EXISTS tbbook (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pickup VARCHAR(255) NOT NULL,
  pickup_lat DOUBLE DEFAULT NULL,
  pickup_lng DOUBLE DEFAULT NULL,
  destination VARCHAR(255) NOT NULL,
  dest_lat DOUBLE DEFAULT NULL,
  dest_lng DOUBLE DEFAULT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  specialNeeds TEXT,
  recurring TINYINT(1) DEFAULT 0,
  email VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  driver_email VARCHAR(100) DEFAULT NULL,
  ride_id VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date_time (date, time),
  INDEX idx_book_email (email),
  INDEX idx_driver_email (driver_email)
) ENGINE=InnoDB;

-- Accessibility needs table
CREATE TABLE IF NOT EXISTS tbaccessibilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  needs TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Real-time driver location table
CREATE TABLE IF NOT EXISTS tblocation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ride_id VARCHAR(64) NOT NULL,
  driver_id VARCHAR(100) NOT NULL,
  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  speed DOUBLE DEFAULT NULL,
  heading DOUBLE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_driver_ride (ride_id, driver_id),
  INDEX idx_ride_id (ride_id),
  INDEX idx_driver_id (driver_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;