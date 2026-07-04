const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create or open the database file
const dbPath = path.join(__dirname, "molecule.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Initialize database schema
db.serialize(async () => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Profiles table
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id) REFERENCES users(id)
    )
  `);

  // Groups table
  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Questions table
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      group_id TEXT,
      author_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Answers table
  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id TEXT NOT NULL,
      is_accepted BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Upvotes table
  db.run(`
    CREATE TABLE IF NOT EXISTS upvotes (
      id TEXT PRIMARY KEY,
      answer_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (answer_id) REFERENCES answers(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(answer_id, user_id)
    )
  `);

  // Helpful Marks table
  db.run(`
    CREATE TABLE IF NOT EXISTS helpful_marks (
      id TEXT PRIMARY KEY,
      answer_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (answer_id) REFERENCES answers(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(answer_id, user_id)
    )
  `);

  // Knowledge Base table
  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      pdf_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notices/Advisories table
  db.run(`
    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      file_url TEXT,
      author_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Create a trigger to add points when an answer is upvoted (only for non-teachers)
  db.run(`
    CREATE TRIGGER IF NOT EXISTS upvote_points
    AFTER INSERT ON upvotes
    BEGIN
      -- Add 10 points for an upvote only if the author is not a teacher
      UPDATE profiles
      SET points = points + 10
      WHERE id = (SELECT author_id FROM answers WHERE id = NEW.answer_id)
        AND role != 'teacher';
    END;
  `);

  // Create a trigger to add points when an answer is accepted (only for non-teachers)
  db.run(`
    CREATE TRIGGER IF NOT EXISTS accept_answer_points
    AFTER UPDATE OF is_accepted ON answers
    WHEN NEW.is_accepted = 1 AND OLD.is_accepted = 0
    BEGIN
      -- Add 50 points for an accepted answer only if the author is not a teacher
      UPDATE profiles
      SET points = points + 50
      WHERE id = NEW.author_id
        AND role != 'teacher';
    END;
  `);

  // Insert initial groups data
  const groupsData = [
    {
      id: "group-1",
      name: "GeneralChem",
      description: "For general chemistry questions and discussions",
    },
    {
      id: "group-2",
      name: "OrganicChem",
      description:
        "All things organic chemistry: reactions, mechanisms, and synthesis",
    },
    {
      id: "group-3",
      name: "InorganicChem",
      description: "Inorganic chemistry, coordination compounds, and more",
    },
  ];

  const groupsStmt = db.prepare(
    "INSERT OR IGNORE INTO groups (id, name, description) VALUES (?, ?, ?)",
  );
  for (const group of groupsData) {
    groupsStmt.run(group.id, group.name, group.description);
  }
  groupsStmt.finalize();

  console.log("Database initialized successfully!");
  console.log("Database file:", dbPath);
});

db.close();
