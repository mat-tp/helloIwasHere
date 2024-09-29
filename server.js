const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const { exec } = require('child_process');
require('dotenv').config(); // Load environment variables

const app = express();
const port = 8080;
const dataFile = 'visitors.json';
const feedbackFile = 'feedback.json';

// Load GitHub credentials from environment variables
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the HelloIWasHere directory
app.use(express.static(path.join(__dirname, 'HelloIWasHere')));

// Define a route for the root URL to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Read visitors data from file
async function readVisitorsData() {
    try {
        const data = await fs.readFile(dataFile, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(dataFile, '[]');
            return [];
        } else {
            console.error('Error reading visitor data:', error);
            throw error;
        }
    }
}

// Write visitors data to file
async function writeVisitorsData(visitors) {
    try {
        await fs.writeFile(dataFile, JSON.stringify(visitors, null, 2));
        console.log('Visitor data saved successfully!');
    } catch (error) {
        console.error('Error writing visitor data:', error);
        throw error;
    }
}

// Read feedback data from file
async function readFeedbackData() {
    try {
        const data = await fs.readFile(feedbackFile, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(feedbackFile, '[]');
            return [];
        } else {
            console.error('Error reading feedback data:', error);
            throw error;
        }
    }
}

// Write feedback data to file
async function writeFeedbackData(feedbacks) {
    try {
        await fs.writeFile(feedbackFile, JSON.stringify(feedbacks, null, 2));
        console.log('Feedback data saved successfully!');
    } catch (error) {
        console.error('Error writing feedback:', error);
        throw error;
    }
}

// Function to commit changes to GitHub (without pushing)
async function commitChanges() {
    const commitMessage = 'Update visitor/feedback data';

    try {
        // Check for uncommitted changes
        const status = await execPromise('git status --porcelain');
        if (!status) {
            console.log('No changes to commit.');
            return;
        }

        // Add modified files to the staging area
        await execPromise(`git add ${dataFile} ${feedbackFile}`);

        // Commit changes with the specified message
        await execPromise(`git commit -m "${commitMessage}"`);

        // Push changes to GitHub
        await execPromise(`git push https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/mat-tp/helloIwasHere.git`);

        console.log('Changes committed and pushed to GitHub.');
    } catch (error) {
        console.error('Error during Git operations:', error.stderr || error.message);
    }
}

// Helper function to promisify exec
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
                return;
            }
            resolve(stdout);
        });
    });
}

// Endpoint to save visitor data
app.post('/save-visitor', (req, res) => {
    const visitor = req.body;

    readVisitorsData()
        .then(existingVisitors => {
            existingVisitors.push(visitor);
            return writeVisitorsData(existingVisitors);
        })
        .then(() => {
            commitChanges(); // Call commitChanges after saving data
            res.send('Visitor data saved successfully!');
        })
        .catch(error => {
            console.error('Error saving visitor data:', error);
            res.status(500).send('Error saving visitor data');
        });
});

// Endpoint to save feedback
app.post('/submit-feedback', (req, res) => {
    const feedback = req.body.feedback;

    readFeedbackData()
        .then(existingFeedback => {
            existingFeedback.push({ feedback, timestamp: new Date().toISOString() }); // Add timestamp
            return writeFeedbackData(existingFeedback);
        })
        .then(() => {
            commitChanges(); // Call commitChanges after saving data
            res.send('Feedback submitted successfully!');
        })
        .catch(error => {
            console.error('Error saving feedback:', error);
            res.status(500).send('Error saving feedback');
        });
});

// Endpoint to retrieve feedback
app.get('/get-feedback', (req, res) => {
    readFeedbackData()
        .then(feedbacks => {
            res.send(feedbacks);
        })
        .catch(error => {
            console.error('Error retrieving feedback:', error);
            res.status(500).send('Error retrieving feedback');
        });
});

// Endpoint to retrieve visitor data
app.get('/get-visitors', (req, res) => {
    readVisitorsData()
        .then(visitors => {
            res.send(visitors);
        })
        .catch(error => {
            console.error('Error retrieving visitor data:', error);
            res.status(500).send('Error retrieving visitor data');
        });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}/`);
});
