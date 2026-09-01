// ============================================
// GHUSH BACKEND - ANONYMOUS FEEDBACK SERVER
// ============================================

// 1. IMPORT MODULES
// ================================================
// Import the 'express' library (web framework)
const express = require('express');

// Import the 'fs' module (file system) to read/write JSON files
const fs = require('fs');

// Import the 'path' module to handle file paths safely
const path = require('path');

// Create an Express application instance
const app = express();

// Define the port where the server will listen
const PORT = 3000;

// Define where submissions will be stored
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');


// 2. MIDDLEWARE SETUP
// ================================================
// Middleware runs on every request before your route handlers

// Parse incoming JSON data from requests
// This allows us to read JSON from POST request bodies
app.use(express.json());

// Serve static files (HTML, CSS, images, etc.) from the current directory
// When someone visits /, it will serve index.html
// When someone visits /style.css, it will serve style.css
// This is how we serve our frontend
app.use(express.static(__dirname));


// 3. HELPER FUNCTIONS
// ================================================

/**
 * Load all submissions from submissions.json
 * Returns an empty array if the file doesn't exist yet
 */
function loadSubmissions() {
  try {
    // Check if the submissions.json file exists
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      // Read the file and parse it as JSON
      const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading submissions:', err);
  }
  // Return empty array if file doesn't exist or has errors
  return [];
}

/**
 * Save submissions to submissions.json
 * Takes an array of submissions and writes it to disk
 */
function saveSubmissions(submissions) {
  try {
    // Convert the array to JSON string with 2-space indentation (for readability)
    const json = JSON.stringify(submissions, null, 2);
    // Write it to the submissions.json file
    fs.writeFileSync(SUBMISSIONS_FILE, json, 'utf-8');
  } catch (err) {
    console.error('Error saving submissions:', err);
  }
}

/**
 * Generate a unique ID for each submission
 * Uses timestamp + random number for simplicity
 */
function generateId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}


// 4. ROUTES
// ================================================

/**
 * GET /
 * Serves the main HTML page
 */
app.get('/', (req, res) => {
  // Send the index.html file to the browser
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * GET /api/submissions
 * Returns all approved submissions as JSON
 */
app.get('/api/submissions', (req, res) => {
  // Load all submissions from the JSON file
  const submissions = loadSubmissions();
  
  // Send them back to the browser as JSON
  // This is what the frontend fetch request receives
  res.json(submissions);
});

/**
 * POST /api/submissions
 * Accepts a new submission and stores it
 * Body should contain: { message, location (optional) }
 */
app.post('/api/submissions', (req, res) => {
  // Extract message and location from the request body
  const { message, location } = req.body;
  
  // VALIDATION: Check if message is empty or missing
  if (!message || message.trim() === '') {
    // Return a 400 (Bad Request) error to the client
    return res.status(400).json({
      error: 'Message is required and cannot be empty.'
    });
  }
  
  // Create a new submission object with:
  // - id: unique identifier
  // - message: the user's message (trimmed to remove extra whitespace)
  // - location: optional location (or empty string if not provided)
  // - createdAt: current timestamp in ISO format (e.g., 2024-01-15T10:30:00.000Z)
  const newSubmission = {
    id: generateId(),
    message: message.trim(),
    location: location ? location.trim() : '',
    createdAt: new Date().toISOString()
  };
  
  // Load existing submissions from the JSON file
  const submissions = loadSubmissions();
  
  // Add the new submission to the array
  submissions.push(newSubmission);
  
  // Save all submissions (old + new) back to the JSON file
  saveSubmissions(submissions);
  
  // Send a success response back to the browser
  // Status 201 means "Created" (a new resource was made)
  res.status(201).json({
    success: true,
    message: 'Submission received and stored.'
  });
});


// 5. ERROR HANDLING
// ================================================

/**
 * Handle 404 errors (route not found)
 * This runs if none of the routes above matched
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});


// 6. START THE SERVER
// ================================================

// Tell Express to start listening on the specified port
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   GHUSH SERVER STARTED                 ║
║   Listening on http://localhost:${PORT}   ║
║                                        ║
║   Visit http://localhost:3000 in your  ║
║   browser to see the site.             ║
╚════════════════════════════════════════╝
  `);
});
