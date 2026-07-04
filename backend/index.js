const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

dotenv.config();

console.log("🧪 Environment variables loaded:");
console.log("  - PORT:", process.env.PORT);
console.log("  - TEACHER_SECRET_CODE:", process.env.TEACHER_SECRET_CODE);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Set up uploads directory
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

// Initialize SQLite database
const dbPath = path.join(__dirname, "molecule.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Helper to promisify database operations
const dbQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "supersecretkey",
    (err, payload) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = payload; // payload includes { userId, email, role }
      next();
    },
  );
};

// Editor authorization middleware
const authorizeTeacher = (req, res, next) => {
  if (req.user?.role !== "teacher") {
    return res.status(403).json({ error: "Forbidden: Teacher role required" });
  }
  next();
};

// --- Auth Endpoints ---

// Helper function to get random Pokémon avatar URL
const getRandomPokemonAvatar = () => {
  // Use a list of Pokemon that definitely have images available (validated common Pokemon)
  const validPokemonIds = [
    1, 4, 7, 25, 39, 54, 58, 60, 63, 66, 69, 72, 77, 81, 84, 86, 90, 92, 95, 98,
    100, 102, 104, 107, 109, 111, 113, 115, 116, 118, 120, 122, 123, 124, 125,
    126, 127, 128, 129, 131, 133, 137, 138, 140, 142, 143, 144, 145, 146, 147,
    149, 150, 151, 152, 155, 158, 161, 163, 165, 167, 170, 172, 173, 174, 175,
    177, 179, 183, 185, 187, 191, 193, 194, 206, 209, 213, 215, 218, 220, 222,
    223, 226, 227, 231, 234, 235, 238, 246, 248, 252, 255, 258, 261, 263, 265,
    270, 273, 276, 278, 280, 282, 283, 285, 287, 290, 293, 296, 299, 302, 304,
    307, 309, 311, 313, 315, 318, 320, 325, 327, 329, 331, 333, 335, 337, 338,
    341, 345, 347, 349, 350, 351, 353, 355, 356, 358, 359, 361, 363, 366, 369,
    371, 374, 376, 378, 387, 390, 393, 396, 399, 403, 406, 408, 410, 412, 415,
    417, 418, 420, 422, 427, 436, 438, 440, 442, 443, 449, 452, 453, 454, 456,
    458, 459, 461, 462, 463, 464, 465, 466, 467, 469, 470, 471, 472, 473, 474,
    475, 476, 477, 478,
  ];
  const randomId =
    validPokemonIds[Math.floor(Math.random() * validPokemonIds.length)];
  // Use the correct sprites path that actually has all Pokemon
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${randomId}.png`;
};

// Signup - Just create the account, don't auto-login
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // Check if email already exists
    const existingUser = await dbGet("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Check if username already exists
    if (username) {
      const existingUsername = await dbGet(
        "SELECT * FROM profiles WHERE username = ?",
        [username],
      );
      if (existingUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = require("crypto").randomUUID();

    await dbRun(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      [userId, email, hashedPassword],
    );

    // Create a profile for the new user with random Pokémon avatar
    const finalUsername = username || `chemist_${userId.slice(0, 8)}`;
    const avatarUrl = getRandomPokemonAvatar();
    await dbRun(
      "INSERT INTO profiles (id, username, avatar_url, points) VALUES (?, ?, ?, ?)",
      [userId, finalUsername, avatarUrl, 0],
    );

    // Return success - frontend should redirect to login
    res.status(201).json({
      success: true,
      message: "Account created successfully. Please login.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Signup for Teachers (with secret code)
app.post("/api/auth/signup-teacher", async (req, res) => {
  const { email, password, username, teacherSecretCode } = req.body;

  // 1. Validate the secret code
  if (teacherSecretCode !== process.env.TEACHER_SECRET_CODE) {
    return res.status(403).json({ error: "Invalid teacher secret code" });
  }

  try {
    // 2. Check if user already exists
    const existingUser = await dbGet("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const existingUsername = await dbGet(
      "SELECT * FROM profiles WHERE username = ?",
      [username],
    );
    if (existingUsername) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // 3. Create the user and profile with the 'teacher' role
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = require("crypto").randomUUID();

    await dbRun(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      [userId, email, hashedPassword],
    );

    const avatarUrl = getRandomPokemonAvatar();
    await dbRun(
      "INSERT INTO profiles (id, username, avatar_url, points, role) VALUES (?, ?, ?, ?, ?)",
      [userId, username, avatarUrl, 0, "teacher"], // Assign 'teacher' role
    );

    res.status(201).json({
      success: true,
      message: "Teacher account created successfully. Please login.",
    });
  } catch (error) {
    console.error("Teacher signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const profile = await dbGet("SELECT * FROM profiles WHERE id = ?", [
      user.id,
    ]);

    if (!profile) {
      return res.status(500).json({ error: "Profile not found" });
    }

    console.log("✅ Login successful for:", email);
    console.log("   Profile data:", {
      username: profile.username,
      avatar_url: profile.avatar_url,
      points: profile.points,
    });

    const token = jwt.sign(
      { userId: user.id, email, role: profile.role },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email,
        username: profile.username,
        role: profile.role,
        avatar_url: profile.avatar_url,
        points: profile.points,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user profile
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await dbGet("SELECT * FROM users WHERE id = ?", [
      req.user.userId,
    ]);
    const profile = await dbGet("SELECT * FROM profiles WHERE id = ?", [
      req.user.userId,
    ]);

    if (!user || !profile) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: profile.username,
      role: profile.role,
      avatar_url: profile.avatar_url,
      points: profile.points,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Groups Endpoints ---

app.get("/api/groups", async (req, res) => {
  try {
    const groups = await dbQuery("SELECT * FROM groups");
    res.json(groups);
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/groups", authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  const groupId = require("crypto").randomUUID();

  try {
    await dbRun(
      "INSERT INTO groups (id, name, description, created_by) VALUES (?, ?, ?, ?)",
      [groupId, name, description, req.user.userId],
    );
    res
      .status(201)
      .json({ id: groupId, name, description, created_by: req.user.userId });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Questions Endpoints ---

app.get("/api/questions", async (req, res) => {
  try {
    const questions = await dbQuery(`
      SELECT q.*, p.username, p.avatar_url, g.name as group_name,
             (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answers_count
      FROM questions q
      JOIN profiles p ON q.author_id = p.id
      LEFT JOIN groups g ON q.group_id = g.id
      ORDER BY q.created_at DESC
    `);
    res.json(questions);
  } catch (error) {
    console.error("Get questions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/questions", authenticateToken, async (req, res) => {
  const { title, content, group_id } = req.body;
  const questionId = require("crypto").randomUUID();

  try {
    await dbRun(
      "INSERT INTO questions (id, title, content, group_id, author_id) VALUES (?, ?, ?, ?, ?)",
      [questionId, title, content, group_id || null, req.user.userId],
    );
    res.status(201).json({
      id: questionId,
      title,
      content,
      group_id,
      author_id: req.user.userId,
    });
  } catch (error) {
    console.error("Create question error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/questions/:id", authenticateToken, async (req, res) => {
  try {
    const question = await dbGet("SELECT * FROM questions WHERE id = ?", [
      req.params.id,
    ]);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    if (question.author_id !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await dbRun("DELETE FROM questions WHERE id = ?", [req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    console.error("Delete question error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Answers Endpoints ---

app.get("/api/questions/:questionId/answers", async (req, res) => {
  try {
    const answers = await dbQuery(
      `
      SELECT a.*, p.username, p.avatar_url,
             (SELECT COUNT(*) FROM upvotes WHERE answer_id = a.id) as upvotes_count
      FROM answers a
      JOIN profiles p ON a.author_id = p.id
      WHERE a.question_id = ?
      ORDER BY a.is_accepted DESC, a.created_at DESC
    `,
      [req.params.questionId],
    );

    // Check if user has upvoted each answer
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "supersecretkey",
        );
        userId = decoded.userId;
      } catch (e) {
        // Ignore invalid tokens
      }
    }

    if (userId) {
      const answersWithUpvotes = await Promise.all(
        answers.map(async (answer) => {
          const upvote = await dbGet(
            "SELECT * FROM upvotes WHERE answer_id = ? AND user_id = ?",
            [answer.id, userId],
          );
          return { ...answer, has_upvoted: !!upvote };
        }),
      );
      res.json(answersWithUpvotes);
    } else {
      res.json(answers.map((a) => ({ ...a, has_upvoted: false })));
    }
  } catch (error) {
    console.error("Get answers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post(
  "/api/questions/:questionId/answers",
  authenticateToken,
  async (req, res) => {
    const { content } = req.body;
    const answerId = require("crypto").randomUUID();

    try {
      await dbRun(
        "INSERT INTO answers (id, question_id, content, author_id) VALUES (?, ?, ?, ?)",
        [answerId, req.params.questionId, content, req.user.userId],
      );
      res.status(201).json({
        id: answerId,
        question_id: req.params.questionId,
        content,
        author_id: req.user.userId,
      });
    } catch (error) {
      console.error("Create answer error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Accept Answer
app.post("/api/answers/:id/accept", authenticateToken, async (req, res) => {
  try {
    const answer = await dbGet("SELECT * FROM answers WHERE id = ?", [
      req.params.id,
    ]);
    if (!answer) {
      return res.status(404).json({ error: "Answer not found" });
    }

    const question = await dbGet("SELECT * FROM questions WHERE id = ?", [
      answer.question_id,
    ]);
    if (question.author_id !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Toggle the is_accepted status
    const newAcceptedState = answer.is_accepted === 1 ? 0 : 1;

    // If we are accepting this answer, first un-accept any others for this question.
    if (newAcceptedState === 1) {
      await dbRun("UPDATE answers SET is_accepted = 0 WHERE question_id = ?", [
        answer.question_id,
      ]);
    }

    // Set the new state for the target answer. The trigger will handle points.
    await dbRun("UPDATE answers SET is_accepted = ? WHERE id = ?", [
      newAcceptedState,
      req.params.id,
    ]);

    res.sendStatus(204);
  } catch (error) {
    console.error("Accept answer error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Upvotes Endpoints ---

app.post(
  "/api/answers/:answerId/upvotes",
  authenticateToken,
  async (req, res) => {
    try {
      // Check if user is the author of this answer
      const answer = await dbGet("SELECT * FROM answers WHERE id = ?", [
        req.params.answerId,
      ]);
      if (!answer) {
        return res.status(404).json({ error: "Answer not found" });
      }
      if (answer.author_id === req.user.userId) {
        return res
          .status(400)
          .json({ error: "You cannot upvote your own answer" });
      }

      const upvoteId = require("crypto").randomUUID();
      await dbRun(
        "INSERT INTO upvotes (id, answer_id, user_id) VALUES (?, ?, ?)",
        [upvoteId, req.params.answerId, req.user.userId],
      );
      res.status(201).json({
        id: upvoteId,
        answer_id: req.params.answerId,
        user_id: req.user.userId,
      });
    } catch (error) {
      console.error("Upvote answer error:", error);
      if (error.message?.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Already upvoted" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  },
);

app.delete(
  "/api/answers/:answerId/upvotes",
  authenticateToken,
  async (req, res) => {
    try {
      await dbRun("DELETE FROM upvotes WHERE answer_id = ? AND user_id = ?", [
        req.params.answerId,
        req.user.userId,
      ]);
      res.sendStatus(204);
    } catch (error) {
      console.error("Remove upvote error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// --- Profiles Endpoints ---

app.get("/api/profiles/:id", async (req, res) => {
  try {
    const profile = await dbGet("SELECT * FROM profiles WHERE id = ?", [
      req.params.id,
    ]);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/profiles/:id", authenticateToken, async (req, res) => {
  if (req.user.userId !== req.params.id) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { username, avatar_url } = req.body;
  try {
    const updates = [];
    const values = [];

    if (username) {
      updates.push("username = ?");
      values.push(username);
    }
    if (avatar_url) {
      updates.push("avatar_url = ?");
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.params.id);
    await dbRun(
      `UPDATE profiles SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    const updatedProfile = await dbGet("SELECT * FROM profiles WHERE id = ?", [
      req.params.id,
    ]);
    res.json(updatedProfile);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Helpful Marks Endpoints ---

// Mark answer as helpful
app.post(
  "/api/answers/:answerId/helpful",
  authenticateToken,
  async (req, res) => {
    try {
      // Check if user is the author of this answer
      const answer = await dbGet("SELECT * FROM answers WHERE id = ?", [
        req.params.answerId,
      ]);
      if (!answer) {
        return res.status(404).json({ error: "Answer not found" });
      }
      if (answer.author_id === req.user.userId) {
        return res
          .status(400)
          .json({ error: "You cannot mark your own answer as helpful" });
      }

      // Check if already marked helpful
      const existing = await dbGet(
        "SELECT * FROM helpful_marks WHERE answer_id = ? AND user_id = ?",
        [req.params.answerId, req.user.userId],
      );
      if (existing) {
        return res.status(400).json({ error: "Already marked as helpful" });
      }

      const helpfulId = require("crypto").randomUUID();
      await dbRun(
        "INSERT INTO helpful_marks (id, answer_id, user_id) VALUES (?, ?, ?)",
        [helpfulId, req.params.answerId, req.user.userId],
      );
      // Add 5 points to the answer author
      await dbRun("UPDATE profiles SET points = points + 5 WHERE id = ?", [
        answer.author_id,
      ]);
      res.status(201).json({
        id: helpfulId,
        answer_id: req.params.answerId,
        user_id: req.user.userId,
      });
    } catch (error) {
      console.error("Mark helpful error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Unmark answer as helpful
app.delete(
  "/api/answers/:answerId/helpful",
  authenticateToken,
  async (req, res) => {
    try {
      const answer = await dbGet("SELECT * FROM answers WHERE id = ?", [
        req.params.answerId,
      ]);
      if (!answer) {
        return res.status(404).json({ error: "Answer not found" });
      }

      await dbRun(
        "DELETE FROM helpful_marks WHERE answer_id = ? AND user_id = ?",
        [req.params.answerId, req.user.userId],
      );
      // Remove 5 points from the answer author
      await dbRun("UPDATE profiles SET points = points - 5 WHERE id = ?", [
        answer.author_id,
      ]);
      res.sendStatus(204);
    } catch (error) {
      console.error("Remove helpful error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Get helpful count for an answer
app.get("/api/answers/:answerId/helpful-count", async (req, res) => {
  try {
    const result = await dbGet(
      "SELECT COUNT(*) as count FROM helpful_marks WHERE answer_id = ?",
      [req.params.answerId],
    );
    res.json({ helpful_count: result.count });
  } catch (error) {
    console.error("Get helpful count error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post(
  "/api/knowledge-base",
  authenticateToken,
  authorizeTeacher,
  upload.single("file"),
  async (req, res) => {
    const { title, description, category, pdf_url } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Title & category required, file or URL is optional (text only)
    if (!title || !category) {
      return res
        .status(400)
        .json({ error: "Title and category are required" });
    }

    try {
      const kbId = require("crypto").randomUUID();
      await dbRun(
        "INSERT INTO knowledge_base (id, title, description, category, pdf_url) VALUES (?, ?, ?, ?, ?)",
        [kbId, title, description, category, pdf_url || fileUrl],
      );
      const newEntry = await dbGet(
        "SELECT * FROM knowledge_base WHERE id = ?",
        [kbId],
      );
      res.status(201).json(newEntry);
    } catch (error) {
      console.error("Create knowledge base error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.put(
  "/api/knowledge-base/:id",
  authenticateToken,
  authorizeTeacher,
  async (req, res) => {
    const { title, description, category, pdf_url } = req.body;
    try {
      await dbRun(
        "UPDATE knowledge_base SET title = ?, description = ?, category = ?, pdf_url = ? WHERE id = ?",
        [title, description, category, pdf_url, req.params.id],
      );
      const updatedEntry = await dbGet(
        "SELECT * FROM knowledge_base WHERE id = ?",
        [req.params.id],
      );
      res.json(updatedEntry);
    } catch (error) {
      console.error("Update knowledge base error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.delete(
  "/api/knowledge-base/:id",
  authenticateToken,
  authorizeTeacher,
  async (req, res) => {
    try {
      await dbRun("DELETE FROM knowledge_base WHERE id = ?", [req.params.id]);
      res.sendStatus(204);
    } catch (error) {
      console.error("Delete knowledge base error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// --- Knowledge Base Endpoints ---

app.get("/api/knowledge-base", async (req, res) => {
  try {
    const knowledge = await dbQuery("SELECT * FROM knowledge_base");
    res.json(knowledge);
  } catch (error) {
    console.error("Get knowledge base error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Notices Endpoints
app.get("/api/notices", async (req, res) => {
  console.log("GET /api/notices called");
  try {
    const notices = await dbQuery(`
      SELECT n.*, p.username, p.avatar_url
      FROM notices n
      JOIN profiles p ON n.author_id = p.id
      ORDER BY n.created_at DESC
    `);
    console.log("Notices found:", notices);
    res.json(notices);
  } catch (error) {
    console.error("Get notices error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post(
  "/api/notices",
  authenticateToken,
  authorizeTeacher,
  upload.single("file"),
  async (req, res) => {
    const { title, content } = req.body;
    const noticeId = require("crypto").randomUUID();
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      await dbRun(
        "INSERT INTO notices (id, title, content, file_url, author_id) VALUES (?, ?, ?, ?, ?)",
        [noticeId, title, content, fileUrl, req.user.userId]
      );
      const newNotice = await dbGet(
        `SELECT n.*, p.username, p.avatar_url
         FROM notices n
         JOIN profiles p ON n.author_id = p.id
         WHERE n.id = ?`,
        [noticeId]
      );
      res.status(201).json(newNotice);
    } catch (error) {
      console.error("Create notice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.delete(
  "/api/notices/:id",
  authenticateToken,
  authorizeTeacher,
  async (req, res) => {
    try {
      const notice = await dbGet("SELECT * FROM notices WHERE id = ?", [
        req.params.id,
      ]);
      if (!notice) {
        return res.status(404).json({ error: "Notice not found" });
      }

      // Delete the file if it exists
      if (notice.file_url) {
        const filePath = path.join(__dirname, notice.file_url);
        try {
          await fs.promises.unlink(filePath);
        } catch (fileError) {
          console.error("Error deleting file:", fileError);
          // Continue even if file deletion fails
        }
      }

      await dbRun("DELETE FROM notices WHERE id = ?", [req.params.id]);
      res.sendStatus(204);
    } catch (error) {
      console.error("Delete notice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database file: ${dbPath}`);
  console.log(`Accessible at http://localhost:${PORT}`);
  console.log(`For Android emulators, use http://10.0.2.2:${PORT}`);
  console.log(`For physical devices, use your computer's local IP`);
});
