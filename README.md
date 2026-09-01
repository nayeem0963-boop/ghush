# Ghush — Anonymous Experience-Sharing Platform

A simple, secure anonymous feedback website built with Node.js and Express. Collect user experiences, moderate them, and display approved submissions publicly.

**Perfect for learning:** This project demonstrates key Node.js/Express concepts without using frameworks like React.

---

## 🎯 Features

- **Anonymous Submissions** — No data collection (no names, emails, or IP tracking)
- **Moderation System** — New submissions start as "pending" and require approval before appearing publicly
- **Admin Panel** — Simple interface to review, approve, and reject submissions
- **Responsive Design** — Works perfectly on desktop, tablet, and mobile devices
- **Security** — Input validation, XSS protection, file corruption prevention, DoS attack mitigation
- **Real-time Character Counter** — Users see how many characters they've typed (max 5000)
- **Double-Submit Protection** — Prevents accidental duplicate submissions
- **Graceful Error Handling** — Server won't crash even if submissions.json is missing or corrupted

---

## 📁 Project Structure

```
ghush/
├── index.html              Main website - submission form & public feed
├── admin.html              Admin panel - moderation queue
├── style.css               Shared CSS styles
├── server.js               Express backend with all API endpoints
├── package.json            Node.js dependencies
├── submissions.json        Database (auto-created, stores all submissions)
├── README.md               This file
└── .gitignore              Excludes node_modules from git
```

### Key Files Explained

| File | Purpose |
|------|---------|
| **server.js** | Express server with 5 API endpoints |
| **index.html** | Public website (form + approved submissions list) |
| **admin.html** | Admin moderation panel |
| **style.css** | Styles for both public and admin pages |
| **submissions.json** | Stores all submissions (pending, approved, rejected) |

---

## ⚙️ Installation

### Prerequisites

- **Node.js 12+** (Download from https://nodejs.org)
- **npm** (comes with Node.js)

### Steps

1. **Clone or download this project:**
   ```bash
   git clone https://github.com/yourusername/ghush.git
   cd ghush
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
   This downloads Express (the only dependency) into a `node_modules` folder.

3. **Start the server:**
   ```bash
   npm start
   ```
   
   You should see:
   ```
   ╔════════════════════════════════════════╗
   ║   GHUSH SERVER STARTED                 ║
   ║   Listening on http://localhost:3000   ║
   ╚════════════════════════════════════════╝
   ```

4. **Open in browser:**
   - Public website: http://localhost:3000
   - Admin panel: http://localhost:3000/admin.html

---

## 🚀 How to Run

### Start the server:
```bash
npm start
```

The server listens on `http://localhost:3000`.

### Stop the server:
Press `Ctrl + C` in your terminal.

### To test after stopping:
```bash
npm start
```

---

## 📝 How to Submit an Experience

### For Regular Users:

1. Visit **http://localhost:3000**
2. Fill in the form:
   - **Message** (required): Describe your experience (up to 5000 characters)
   - **Location** (optional): Your city or district
3. Click **"Submit anonymously"**
4. You'll see: *"Thanks — your message was submitted anonymously. It will appear after moderation."*

### What happens next:

- Your submission is stored with `status: "pending"`
- It does **NOT** appear on the public page yet
- An admin must review and approve it
- Once approved, it appears publicly (newest first)

### Your privacy:

- ✅ No name collected
- ✅ No email collected
- ✅ No IP address logged
- ✅ No user tracking
- ✅ Completely anonymous

---

## 🔍 How Moderation Works

### The Moderation Flow:

```
1. User submits feedback
         ↓
2. Submission stored with status: "pending" (NOT public yet)
         ↓
3. Admin visits /admin.html
         ↓
4. Admin sees pending submissions
         ↓
5. Admin clicks Approve or Reject
         ↓
6. Status changes to "approved" or "rejected"
         ↓
7. If APPROVED: Appears publicly (GET /api/submissions)
   If REJECTED: Never appears publicly (hidden forever)
```

### Submission Statuses:

| Status | Visible to Public? | Visible to Admin? |
|--------|-------------------|-------------------|
| `pending` | ❌ No | ✅ Yes |
| `approved` | ✅ Yes | ✅ Yes |
| `rejected` | ❌ No | ✅ Yes |

---

## 👨‍💼 How to Open the Admin Panel

### Access the moderation interface:

1. Open **http://localhost:3000/admin.html** in your browser
2. You'll see:
   - **Stats** showing pending/approved/rejected counts
   - **Pending Submissions** list with all submissions awaiting review

### Moderate a submission:

For each pending submission:
- Read the message and location
- Click **[✓ Approve]** to make it public
- Click **[✗ Reject]** to hide it permanently

After each action:
- The submission disappears from the pending list
- Stats update automatically
- Page refreshes to show new state

### Demo Mode Warning:

```
⚠️ Demo Mode: This moderation panel is for demonstration only.
In production, add authentication to restrict access to authorized moderators only.
```

Currently, **anyone** can access `/admin.html` and moderate submissions. This is fine for learning, but **not secure for production**.

---

## 🔒 Security Features

### Input Validation
- ✅ Message cannot be empty
- ✅ Message max 5000 characters
- ✅ Location max 100 characters
- ✅ Type checking (must be strings)

### Attack Prevention
- ✅ **XSS Protection** — User messages displayed as plain text, not HTML
- ✅ **JSON Payload Limit** — Requests larger than 10KB rejected
- ✅ **File Corruption Prevention** — Atomic writes using temp files
- ✅ **DoS Prevention** — Max 10,000 submissions kept in memory

### Graceful Error Handling
- ✅ Missing submissions.json? Auto-created on startup
- ✅ Corrupted JSON? Logged and ignored, starts fresh
- ✅ Server error during submit? User sees friendly error message
- ✅ Network error? User retains their message for retry

---

## 🌐 API Endpoints

### Public Endpoints

```
GET /api/submissions
```
Returns only approved submissions (public feed).

**Response:**
```json
[
  {
    "id": "1693481234567-abc123xyz",
    "message": "I lost money on a bad transaction",
    "location": "Dhaka",
    "status": "approved",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

```
POST /api/submissions
```
Submit a new experience (initially `pending`).

**Request Body:**
```json
{
  "message": "My experience here",
  "location": "Dhaka"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Submission received. It will appear publicly after moderation."
}
```

---

### Admin Endpoints (Demo Only - No Authentication)

```
GET /api/admin/submissions
```
Returns ALL submissions (pending, approved, rejected).

---

```
POST /api/admin/submissions/:id/approve
```
Approve a submission (makes it public).

**Response:**
```json
{
  "success": true,
  "message": "Submission 1693481234567-abc123xyz has been approved.",
  "submission": { ... }
}
```

---

```
POST /api/admin/submissions/:id/reject
```
Reject a submission (hides it forever).

**Response:**
```json
{
  "success": true,
  "message": "Submission 1693481234567-abc123xyz has been rejected.",
  "submission": { ... }
}
```

---

## 📊 Database Format (submissions.json)

Submissions are stored as JSON array:

```json
[
  {
    "id": "1693481234567-abc123xyz",
    "message": "I lost money on a bad transaction",
    "location": "Dhaka",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "1693481234568-def456uvw",
    "message": "Great experience overall",
    "location": "Chattogram",
    "status": "approved",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "approvedAt": "2024-01-15T11:05:00.000Z"
  },
  {
    "id": "1693481234569-ghi789stu",
    "message": "SPAM",
    "location": "",
    "status": "rejected",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "rejectedAt": "2024-01-15T12:01:00.000Z"
  }
]
```

---

## ⚠️ Important Limitations

### This is a Learning Project

- **No Authentication** — Anyone can access the admin panel
- **No User Accounts** — No admin login/password
- **Single File Database** — Uses JSON file, not a real database
- **No Concurrent Write Handling** — May have issues if multiple admins act simultaneously
- **No Backup System** — Deleted submissions.json = lost data
- **No Deployment Ready** — Designed for local learning/demo only

### Not Suitable for Production Because:

- ❌ Admin endpoints are completely open (no login required)
- ❌ No audit trail of who approved what
- ❌ No rate limiting on submissions
- ❌ No email notifications when approved
- ❌ No bulk export/import
- ❌ No search functionality
- ❌ Single-server only (no scaling)

### For Production, You'd Add:

- ✅ User authentication (passwords, sessions, JWT tokens)
- ✅ Database (PostgreSQL, MongoDB, etc. instead of JSON)
- ✅ Role-based access control (admin/moderator/user roles)
- ✅ Audit logging (track who did what and when)
- ✅ Email notifications
- ✅ Rate limiting (prevent spam)
- ✅ Search/filtering
- ✅ Multi-server deployment

---

## 🧪 Testing the Project

### Quick Test Checklist:

```bash
# 1. Start server
npm start

# 2. Visit in browser
# Open http://localhost:3000

# 3. Submit feedback
# Fill form and click Submit

# 4. Check submissions.json created
# File should exist in project folder

# 5. Verify submission is pending
# Open http://localhost:3000/admin.html
# You should see it in the list

# 6. Approve the submission
# Click [✓ Approve] button
# It should disappear from pending list

# 7. Check public site
# Go back to http://localhost:3000
# Your approved submission should appear

# 8. Try rejecting one
# Submit another feedback
# Go to admin panel
# Click [✗ Reject]
# It should never appear on public site
```

---

## 🛠️ Development

### Project Stack:
- **Backend:** Node.js + Express 4.18.2
- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Database:** JSON file (submissions.json)
- **Total Dependencies:** 1 (just Express)

### Key Design Decisions:

1. **No Framework** — Learning Express fundamentals
2. **No Database** — File-based for simplicity
3. **No Authentication** — Demo purposes
4. **Plain JavaScript** — No React/Vue/etc.
5. **Single Port** — All endpoints on port 3000

### Learning Resources:

- [Express.js Official Guide](https://expressjs.com)
- [Node.js File System API](https://nodejs.org/api/fs.html)
- [Fetch API (JavaScript)](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

## 📄 License

MIT License — Use freely for learning and projects.

---

## 🤝 Contributing

This is a learning project. Feel free to:
- Fork and modify for your own projects
- Add features (database integration, authentication, etc.)
- Use as template for your own anonymous feedback system

---

## ❓ FAQ

**Q: Is my submission really anonymous?**
A: Yes. The server collects only the message and location. No IP addresses, cookies, or user tracking.

**Q: Can I download my submissions?**
A: Yes. Check `submissions.json` in the project folder. It's a plain text JSON file.

**Q: Can I add authentication?**
A: Yes! Add a login system to `/api/admin/` routes (tutorial in comments).

**Q: Can I change the server port?**
A: Yes. Edit line 15 in server.js: `const PORT = 3000;`

**Q: What if submissions.json gets deleted?**
A: The server auto-creates an empty one on next startup.

**Q: Can I deploy this online?**
A: Yes, but add authentication first. This demo is not secure for production.

---

## 📞 Support

For learning questions about Node.js/Express, refer to:
- Official [Express documentation](https://expressjs.com)
- [Node.js documentation](https://nodejs.org/docs)
- Comments in `server.js` explain each feature

---

**Built with ❤️ for learning Node.js and Express**
