const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const sanitizeHtml = require('sanitize-html');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const dataFile = 'visitors.json';
const feedbackFile = 'feedback.json';

// Load environment variables
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIT_EMAIL = process.env.GIT_EMAIL;
const GIT_NAME = process.env.GIT_NAME;

// Configure Git user identity from environment variables
if (GIT_EMAIL && GIT_NAME) {
    exec(`git config --global user.email "${GIT_EMAIL}"`);
    exec(`git config --global user.name "${GIT_NAME}"`);
}

// Security middleware
app.use(helmet()); // Adds various HTTP headers for security
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Constants
const MAX_NAME_LENGTH = 50;
const MAX_VISITORS = 1000;
const MAX_FEEDBACK_LENGTH = 500;

// Validation middleware
const validateVisitor = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Valid name is required' });
    }
    
    const sanitizedName = sanitizeHtml(name.trim(), {
        allowedTags: [],
        allowedAttributes: {}
    });
    
    if (sanitizedName.length === 0 || sanitizedName.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ 
            error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters` 
        });
    }
    
    req.body.name = sanitizedName;
    next();
};

// Enhanced data handling functions
async function readVisitorsData() {
    try {
        const data = await fs.readFile(dataFile, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(dataFile, '[]');
            return [];
        }
        throw error;
    }
}

async function writeVisitorsData(visitors) {
    // Keep only the latest MAX_VISITORS entries
    const limitedVisitors = visitors.slice(-MAX_VISITORS);
    await fs.writeFile(dataFile, JSON.stringify(limitedVisitors, null, 2));
    await gitCommitAndPush('Updated visitor data');
    return limitedVisitors;
}

async function gitCommitAndPush(commitMessage) {
    try {
        await execPromise('git add .');
        await execPromise(`git commit -m "${commitMessage}"`);
        const remote = `https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/helloIwasHere.git`;
        await execPromise(`git push ${remote}`);
        console.log('Changes pushed to GitHub successfully');
    } catch (error) {
        console.error('Git operation failed:', error);
        // Continue execution even if Git fails
    }
}

// Promisified exec
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

// Enhanced routes
app.post('/save-visitor', validateVisitor, async (req, res) => {
    try {
        const visitor = {
            name: req.body.name,
            timestamp: new Date().toISOString(),
            ip: req.ip // Be careful with storing IP addresses (GDPR considerations)
        };

        const visitors = await readVisitorsData();
        
        // Check for duplicate names in the last hour
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);
        const recentDuplicate = visitors.find(v => 
            v.name === visitor.name && 
            new Date(v.timestamp) > lastHour
        );

        if (recentDuplicate) {
            return res.status(429).json({ 
                error: 'Please wait an hour before signing again with the same name' 
            });
        }

        const updatedVisitors = await writeVisitorsData([...visitors, visitor]);
        
        res.json({ 
            message: 'Visitor recorded successfully',
            totalVisitors: updatedVisitors.length
        });
    } catch (error) {
        console.error('Error saving visitor:', error);
        res.status(500).json({ error: 'Failed to save visitor' });
    }
});

app.get('/get-visitors', async (req, res) => {
    try {
        const visitors = await readVisitorsData();
        // Return only safe fields
        const safeVisitors = visitors.map(({ name, timestamp }) => ({ 
            name, 
            timestamp 
        }));
        res.json(safeVisitors);
    } catch (error) {
        console.error('Error retrieving visitors:', error);
        res.status(500).json({ error: 'Failed to retrieve visitors' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}/`);
});
