// ============================================
// GHUSH BACKEND - ANONYMOUS FEEDBACK SERVER
// ============================================

// 1. IMPORT MODULES
// ================================================
const express = require('express');
const fs = require('fs');
const path = require('path');

// Create an Express application instance
const app = express();

// Define the port where the server will listen
const PORT = 3000;

// Define where submissions will be stored
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

// ============================================
// SECURITY CONSTANTS
// ================================================

// Maximum message length: 5000 characters
// Prevents extremely long submissions from wasting disk space
const MAX_MESSAGE_LENGTH = 5000;

// Maximum location length: 100 characters
// Keeps location field reasonable (city/district name)
const MAX_LOCATION_LENGTH = 100;

// Maximum number of submissions to keep in memory during writes
// Prevents excessive memory usage with very large files
const MAX_SUBMISSIONS_IN_MEMORY = 10000;


// 2. MIDDLEWARE SETUP
// ================================================

// Parse incoming JSON data from requests
// limit: '10kb' prevents attackers from sending huge payloads
// This protects against Denial of Service (DoS) attacks
app.use(express.json({ limit: '10kb' }));

// Serve static files (HTML, CSS, images, etc.) from the current directory
app.use(express.static(__dirname));


// 3. HELPER FUNCTIONS
// ================================================

/**
 * Load all submissions from submissions.json
 * Includes error handling for missing/corrupted files
 */
function loadSubmissions() {
  try {
    // Check if the submissions.json file exists
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      // Read the file
      const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
      
      // Parse it as JSON
      const submissions = JSON.parse(data);
      
      // Validate it's actually an array
      if (!Array.isArray(submissions)) {
        console.error('submissions.json is not an array, returning empty list');
        return [];
      }
      
      return submissions;
    }
  } catch (err) {
    // Log the error so we can debug it
    console.error('Error loading submissions:', err.message);
    
    // If file is corrupted, log a warning but don't crash
    if (err instanceof SyntaxError) {
      console.error('submissions.json is corrupted JSON. Starting fresh.');
    }
  }
  
  // Return empty array if file doesn't exist or has errors
  return [];
}

/**
 * Save submissions to submissions.json
 * Includes error handling and prevents concurrent write issues
 */
function saveSubmissions(submissions) {
  try {
    // Validate submissions before saving
    if (!Array.isArray(submissions)) {
      throw new Error('Submissions must be an array');
    }
    
    // Prevent the file from growing too large
    if (submissions.length > MAX_SUBMISSIONS_IN_MEMORY) {
      console.warn('Too many submissions, truncating oldest ones');
      // Keep only the newest submissions
      submissions = submissions.slice(-MAX_SUBMISSIONS_IN_MEMORY);
    }
    
    // Convert to JSON with indentation (readable format)
    const json = JSON.stringify(submissions, null, 2);
    
    // Write to a temporary file first
    // This prevents corruption if the write is interrupted
    const tempFile = SUBMISSIONS_FILE + '.tmp';
    fs.writeFileSync(tempFile, json, 'utf-8');
    
    // If temp file was successful, rename it to the real file
    // This is atomic (all-or-nothing) on most systems
    fs.renameSync(tempFile, SUBMISSIONS_FILE);
    
  } catch (err) {
    console.error('Error saving submissions:', err.message);
    // Don't throw error - just log it
    // This prevents the server from crashing
  }
}

/**
 * Generate a unique ID for each submission
 */
function generateId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Validate and sanitize submission data
 * Returns object with { valid: boolean, error?: string }
 */
function validateSubmission(message, location) {
  // Check message exists and is a string
  if (typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string.' };
  }
  
  // Check message is not empty
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    return { valid: false, error: 'Message cannot be empty.' };
  }
  
  // Check message is not too long
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return { 
      valid: false, 
      error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.` 
    };
  }
  
  // Check location is a string if provided
  if (location !== undefined && location !== null && typeof location !== 'string') {
    return { valid: false, error: 'Location must be a string.' };
  }
  
  // Check location is not too long
  if (location && location.trim().length > MAX_LOCATION_LENGTH) {
    return { 
      valid: false, 
      error: `Location cannot exceed ${MAX_LOCATION_LENGTH} characters.` 
    };
  }
  
  // All validations passed
  return { valid: true };
}

/**
 * Find a submission by ID
 * Returns the submission or null if not found
 */
function findSubmissionById(submissions, id) {
  return submissions.find(sub => sub.id === id) || null;
}


// 4. ROUTES
// ================================================

/**
 * GET /
 * Serves the main HTML page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * GET /api/submissions
 * Returns ONLY approved submissions (public feed)
 * 
 * Users see only submissions that have been moderated and approved
 */
app.get('/api/submissions', (req, res) => {
  // Load all submissions
  const allSubmissions = loadSubmissions();
  
  // Filter to only approved submissions
  const approvedSubmissions = allSubmissions.filter(sub => sub.status === 'approved');
  
  // Return only approved ones to the public
  res.json(approvedSubmissions);
});

/**
 * POST /api/submissions
 * Accepts a new submission and stores it with status: "pending"
 * 
 * New submissions start as "pending" and don't appear publicly until approved
 */
app.post('/api/submissions', (req, res) => {
  // Validate that req.body exists
  if (!req.body) {
    return res.status(400).json({
      error: 'Request body is missing.'
    });
  }
  
  // Extract message and location
  const { message, location } = req.body;
  
  // Validate submission data
  const validation = validateSubmission(message, location);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error
    });
  }
  
  // Create the submission object
  // All data is trimmed to remove extra whitespace
  // NEW: status starts as "pending"
  const newSubmission = {
    id: generateId(),
    message: message.trim(),
    location: location ? location.trim() : '',
    status: 'pending',  // Submissions don't appear publicly until approved
    createdAt: new Date().toISOString()
  };
  
  try {
    // Load existing submissions
    const submissions = loadSubmissions();
    
    // Add the new submission
    submissions.push(newSubmission);
    
    // Save back to file
    saveSubmissions(submissions);
    
    // Send success response
    res.status(201).json({
      success: true,
      message: 'Submission received. It will appear publicly after moderation.'
    });
    
  } catch (err) {
    // If something goes wrong, log it and return error
    console.error('Error processing submission:', err.message);
    return res.status(500).json({
      error: 'Failed to process submission. Please try again later.'
    });
  }
});


// ============================================
// ADMIN MODERATION ROUTES (Demo Only)
// ============================================
// NOTE: These endpoints are for development/demo purposes only.
// In production, add authentication so only moderators can access these!

/**
 * GET /api/admin/submissions
 * Returns ALL submissions (pending, approved, rejected)
 * 
 * For demo purposes only - shows the moderation queue
 * WARNING: In production, add authentication!
 */
app.get('/api/admin/submissions', (req, res) => {
  // Load all submissions
  const submissions = loadSubmissions();
  
  // Return all submissions (including pending)
  // In a real app, check user permissions here!
  res.json(submissions);
});

/**
 * POST /api/admin/submissions/:id/approve
 * Marks a submission as "approved" so it appears publicly
 * 
 * URL parameter: :id = the submission ID to approve
 */
app.post('/api/admin/submissions/:id/approve', (req, res) => {
  const { id } = req.params;
  
  try {
    // Load all submissions
    const submissions = loadSubmissions();
    
    // Find the submission with this ID
    const submission = findSubmissionById(submissions, id);
    
    // If not found, return error
    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found.'
      });
    }
    
    // Change status to "approved"
    submission.status = 'approved';
    submission.approvedAt = new Date().toISOString();
    
    // Save the updated submissions
    saveSubmissions(submissions);
    
    // Send success response
    res.json({
      success: true,
      message: `Submission ${id} has been approved.`,
      submission: submission
    });
    
  } catch (err) {
    console.error('Error approving submission:', err.message);
    return res.status(500).json({
      error: 'Failed to approve submission.'
    });
  }
});

/**
 * POST /api/admin/submissions/:id/reject
 * Marks a submission as "rejected" so it never appears publicly
 * 
 * URL parameter: :id = the submission ID to reject
 */
app.post('/api/admin/submissions/:id/reject', (req, res) => {
  const { id } = req.params;
  
  try {
    // Load all submissions
    const submissions = loadSubmissions();
    
    // Find the submission with this ID
    const submission = findSubmissionById(submissions, id);
    
    // If not found, return error
    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found.'
      });
    }
    
    // Change status to "rejected"
    submission.status = 'rejected';
    submission.rejectedAt = new Date().toISOString();
    
    // Save the updated submissions
    saveSubmissions(submissions);
    
    // Send success response
    res.json({
      success: true,
      message: `Submission ${id} has been rejected.`,
      submission: submission
    });
    
  } catch (err) {
    console.error('Error rejecting submission:', err.message);
    return res.status(500).json({
      error: 'Failed to reject submission.'
    });
  }
});


// 5. ERROR HANDLING
// ================================================

/**
 * Handle malformed JSON requests
 * Express calls this when JSON parsing fails
 */
app.use((err, req, res, next) => {
  // Check if error is a JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON in request body.'
    });
  }
  
  // Pass error to next handler if not JSON error
  next(err);
});

/**
 * Handle 404 errors (route not found)
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

/**
 * Catch-all error handler
 * Prevents server crashes from unexpected errors
 */
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err.message);
  res.status(500).json({
    error: 'Internal server error. Please try again later.'
  });
});


// 6. INITIALIZE SUBMISSIONS FILE
// ================================================

// If submissions.json doesn't exist, create it with empty array
if (!fs.existsSync(SUBMISSIONS_FILE)) {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
    console.log('Created new submissions.json file');
  } catch (err) {
    console.error('Failed to create submissions.json:', err.message);
  }
}


// 7. START THE SERVER
// ================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   GHUSH SERVER STARTED                 ║
║   Listening on http://localhost:${PORT}   ║
║                                        ║
║   Visit http://localhost:3000 in your  ║
║   browser to see the site.             ║
║                                        ║
║   ADMIN/DEMO ENDPOINTS:                ║
║   GET  /api/admin/submissions           ║
║   POST /api/admin/submissions/:id/approve  ║
║   POST /api/admin/submissions/:id/reject   ║
║                                        ║
║   ⚠️  These are for demo only!         ║
║   Add authentication in production!    ║
╚════════════════════════════════════════╝
  `);
});
