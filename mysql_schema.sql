-- Molecule: Chemistry Q&A App MySQL Database Schema
-- Run this in your MySQL database to set up the tables and triggers.

-- 1. USERS TABLE (Replaces Supabase auth.users)
-- Stores user authentication information.
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. PROFILES TABLE
-- Stores user information. Linked to users.
CREATE TABLE profiles (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  avatar_url TEXT,
  points INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT username_length CHECK (CHAR_LENGTH(username) >= 3)
);

-- Trigger: Automatically create a profile when a new user signs up
DELIMITER //
CREATE TRIGGER on_user_created
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  DECLARE username_prefix VARCHAR(255);
  DECLARE username_suffix VARCHAR(255);
  SET username_suffix = SUBSTRING(NEW.id, 1, 8);
  SET username_prefix = CONCAT('chemist_', username_suffix);
  INSERT INTO profiles (id, username, avatar_url, points)
  VALUES (
    NEW.id,
    username_prefix,
    CONCAT('https://api.dicebear.com/7.x/bottts/svg?seed=', NEW.id),
    0
  );
END //
DELIMITER ;


-- 3. GROUPS TABLE (Sub-molecules/Subreddits)
-- Chemistry sub-communities (e.g. Organic, Inorganic)
CREATE TABLE groups (
  id CHAR(36) PRIMARY KEY DEFAULT UUID(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT group_name_length CHECK (CHAR_LENGTH(name) >= 3)
);


-- 4. QUESTIONS TABLE
-- Chemistry questions uploaded by students
CREATE TABLE questions (
  id CHAR(36) PRIMARY KEY DEFAULT UUID(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  group_id CHAR(36),
  author_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
);


-- 5. ANSWERS TABLE
-- Answers posted by students to chemistry questions
CREATE TABLE answers (
  id CHAR(36) PRIMARY KEY DEFAULT UUID(),
  question_id CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  author_id CHAR(36) NOT NULL,
  is_accepted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
);


-- 6. UPVOTES TABLE
-- Stores answer upvotes to calculate points
CREATE TABLE upvotes (
  id CHAR(36) PRIMARY KEY DEFAULT UUID(),
  answer_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_upvote (answer_id, user_id)
);


-- 7. KNOWLEDGE BASE TABLE
-- Stores textbook & notes PDF metadata
CREATE TABLE knowledge_base (
  id CHAR(36) PRIMARY KEY DEFAULT UUID(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- 8. SECURE TRIGGERS & FUNCTIONS FOR POINTS (GAMIFICATION)
-- Award 10 points for an upvote, deduct 10 points when upvote is removed.
-- Award 50 points when an answer is marked as accepted/helpful.

-- A. Trigger for Upvotes (Points allocation)
DELIMITER //
CREATE TRIGGER on_upvote_insert
AFTER INSERT ON upvotes
FOR EACH ROW
BEGIN
  DECLARE target_author_id CHAR(36);
  SELECT author_id INTO target_author_id FROM answers WHERE id = NEW.answer_id;
  UPDATE profiles 
  SET points = points + 10 
  WHERE id = target_author_id;
END //

CREATE TRIGGER on_upvote_delete
AFTER DELETE ON upvotes
FOR EACH ROW
BEGIN
  DECLARE target_author_id CHAR(36);
  SELECT author_id INTO target_author_id FROM answers WHERE id = OLD.answer_id;
  UPDATE profiles 
  SET points = points - 10 
  WHERE id = target_author_id;
END //
DELIMITER ;


-- B. Stored Procedure for accepting an answer
DELIMITER //
CREATE PROCEDURE accept_answer(IN answer_id_param CHAR(36), IN user_id_param CHAR(36))
BEGIN
  DECLARE question_owner_id CHAR(36);
  DECLARE answer_author_id CHAR(36);
  DECLARE current_accepted_status BOOLEAN;
  
  -- Get question details & author of the answer
  SELECT q.author_id, a.author_id, a.is_accepted 
  INTO question_owner_id, answer_author_id, current_accepted_status
  FROM answers a
  JOIN questions q ON q.id = a.question_id
  WHERE a.id = answer_id_param;

  -- Security check: ONLY the question owner can mark an answer as accepted
  IF (user_id_param = question_owner_id) THEN
    IF (current_accepted_status = FALSE) THEN
      -- Mark as accepted
      UPDATE answers SET is_accepted = TRUE WHERE id = answer_id_param;
      -- Reward 50 points to the answerer
      UPDATE profiles SET points = points + 50 WHERE id = answer_author_id;
    ELSE
      -- Un-mark as accepted (toggle)
      UPDATE answers SET is_accepted = FALSE WHERE id = answer_id_param;
      -- Deduct 50 points from the answerer
      UPDATE profiles SET points = points - 50 WHERE id = answer_author_id;
    END IF;
  ELSE
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Unauthorized: Only the creator of the question can mark this answer as helpful.';
  END IF;
END //
DELIMITER ;


-- 9. INITIAL SEED DATA FOR KNOWLEDGE BASE (OPTIONAL but helpful)
INSERT INTO knowledge_base (id, title, description, category, pdf_url) VALUES
(UUID(), 'OpenStax Chemistry 2e Textbook', 'Full-length introductory chemistry college textbook from OpenStax. Complete guide.', 'Textbook', 'https://openstax.org/details/books/chemistry-2e'),
(UUID(), 'Organic Chemistry Basics', 'Comprehensive study guide on organic chemical reactions, hybridization, and IUPAC nomenclature.', 'Organic Chemistry', 'https://chem.libretexts.org/@api/deki/pages/10041/pdf/Organic%2520Chemistry%2520Basics.pdf'),
(UUID(), 'Inorganic Coordination Compounds', 'Introduction to d-block chemistry, ligand field theory, and structural isomerism.', 'Inorganic Chemistry', 'https://chem.libretexts.org/@api/deki/pages/10103/pdf/Inorganic%2520Chemistry.pdf'),
(UUID(), 'Thermodynamics & Kinetics Note Sheet', 'Equations, state functions, laws of thermodynamics, and chemical kinetics formulas.', 'Physical Chemistry', 'https://chem.libretexts.org/@api/deki/pages/10200/pdf/Physical%2520Chemistry.pdf'),
(UUID(), 'General Chemistry I Lecture Notes', 'Complete introductory notes covering atomic structures, stoichiometry, gas laws, and bonding.', 'High School & Intro', 'https://chem.libretexts.org/@api/deki/pages/9850/pdf/General%2520Chemistry.pdf');
