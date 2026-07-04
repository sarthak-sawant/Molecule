# Molecule Backend

This is the Express.js backend for the Molecule chemistry Q&A app, using MySQL as the database.

## Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update the values:
```
PORT=3000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=molecule_db
JWT_SECRET=your_secure_jwt_secret_here
```

### 3. Set Up MySQL Database
1. Create a MySQL database named `molecule_db`
2. Run the schema file from the project root:
   ```bash
   mysql -u your_mysql_user -p molecule_db < ../mysql_schema.sql
   ```

### 4. Start the Server
```bash
npm run dev
# or for production
npm start
```

The backend will be available at `http://localhost:3000`

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Authenticate a user

### Groups
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create a new group (requires auth)

### Questions
- `GET /api/questions` - Get all questions
- `GET /api/questions/:id` - Get a specific question
- `POST /api/questions` - Create a question (requires auth)
- `DELETE /api/questions/:id` - Delete a question (requires auth, only owner)

### Answers
- `GET /api/questions/:questionId/answers` - Get answers for a question
- `POST /api/questions/:questionId/answers` - Create an answer (requires auth)
- `PUT /api/answers/:id` - Update an answer (requires auth, only owner)
- `DELETE /api/answers/:id` - Delete an answer (requires auth, only owner)
- `POST /api/answers/:id/accept` - Mark an answer as accepted (requires auth, only question owner)

### Upvotes
- `GET /api/answers/:answerId/upvotes` - Get upvotes for an answer
- `POST /api/answers/:answerId/upvotes` - Upvote an answer (requires auth)
- `DELETE /api/answers/:answerId/upvotes` - Remove upvote (requires auth)

### Profiles
- `GET /api/profiles/:id` - Get a user profile
- `PUT /api/profiles/:id` - Update a profile (requires auth, only owner)

### Knowledge Base
- `GET /api/knowledge-base` - Get all knowledge base entries
