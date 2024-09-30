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

// Serve static files
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

// Write visitors data to file and push to GitHub
async function writeVisitorsData(visitors) {
    try {
        await fs.writeFile(dataFile, JSON.stringify(visitors, null, 2));
        console.log('Visitor data saved successfully!');
        await gitCommitAndPush('Updated visitor data');
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

// Write feedback data to file and push to GitHub
async function writeFeedbackData(feedbacks) {
    try {
        await fs.writeFile(feedbackFile, JSON.stringify(feedbacks, null, 2));
        console.log('Feedback data saved successfully!');
        await gitCommitAndPush('Updated feedback data');
    } catch (error) {
        console.error('Error writing feedback:', error);
        throw error;
    }
}

// Git commit and push function
async function gitCommitAndPush(commitMessage) {
    try {
        await execPromise('git add .');
        const commitOutput = await execPromise(`git commit -m "${commitMessage}"`);
        console.log('Git commit output:', commitOutput); // Log commit output

        const pushOutput = await execPromise(`git push https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/mat-tp/helloIwasHere.git`);
        console.log('Git push output:', pushOutput); // Log push output
        
        console.log('Changes committed and pushed to GitHub.');
    } catch (error) {
        console.error('Error during Git operations:', error); // Log errors during Git operations
        throw error; // Ensure error propagation
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
app.post('/save-visitor', async (req, res) => {
    const visitor = req.body;

    // Validate the visitor object
    if (!visitor.name) {
        return res.status(400).send('Visitor name is required.');
    }

    try {
        const existingVisitors = await readVisitorsData();
        existingVisitors.push(visitor);
        await writeVisitorsData(existingVisitors);
        res.send('Visitor data saved successfully!');
    } catch (error) {
        console.error('Error saving visitor data:', error);
        res.status(500).send(`Error saving visitor data: ${error.message}`);
    }
});

// Endpoint to save feedback
app.post('/submit-feedback', async (req, res) => {
    const feedback = req.body.feedback;

    try {
        const existingFeedback = await readFeedbackData();
        existingFeedback.push({ feedback, timestamp: new Date().toISOString() }); // Add timestamp
        await writeFeedbackData(existingFeedback);
        res.send('Feedback submitted successfully!');
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).send('Error saving feedback. Please try again.');
    }
});

// Endpoint to retrieve feedback
app.get('/get-feedback', async (req, res) => {
    try {
        const feedbacks = await readFeedbackData();
        res.send(feedbacks);
    } catch (error) {
        console.error('Error retrieving feedback:', error);
        res.status(500).send('Error retrieving feedback.');
    }
});

// Endpoint to retrieve visitor data
app.get('/get-visitors', async (req, res) => {
    try {
        const visitors = await readVisitorsData();
        res.send(visitors);
    } catch (error) {
        console.error('Error retrieving visitor data:', error);
        res.status(500).send('Error retrieving visitor data.');
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}/`);
});
