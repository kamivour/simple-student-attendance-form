const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');

const app = express();
const port = 3000;

// --- CONFIGURATION ---
const SPREADSHEET_ID = '1H1ZLiE4oPClc7vPlybuZZJFd-c6mKB9cL1IyA2GiqrU';

// --- GOOGLE AUTH SETUP (Service Account) ---
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json', // Uses the key file from Render's Secret Files
    scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Only Sheets permission is needed now
});

const sheets = google.sheets({ version: 'v4', auth: auth });

// --- MULTER SETUP ---
const upload = multer({
    storage: multer.memoryStorage(),
});

// --- RETRY HELPER FUNCTION ---
async function retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i < maxRetries - 1 && error.code && error.code >= 500) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                console.log(`Attempt ${i + 1} failed. Retrying in ${Math.round(delay / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

app.use(express.static('public'));

// --- /submit Route with Photo Upload DISABLED ---
app.post('/submit', upload.single('photo'), async (req, res) => {
    // We still need the multer middleware to parse the student name and ID.
    // The photo file itself (req.file) will be ignored.
    try {
        const { name, studentId } = req.body;
        const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
        
        const photoLink = 'Photo upload disabled'; // Placeholder text for the sheet

        // Append record to Google Sheet
        await retryWithBackoff(() => sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:D',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[timestamp, studentId, name, photoLink]] },
        }));

        console.log(`Attendance logged for: ${name} (${studentId})`);
        res.send('<h1>Attendance Submitted!</h1><p>Note: The photo was not saved.</p>');

    } catch (error) {
        console.error('Error during submission process:', error);
        res.status(500).send('<h1>Error: Could not save attendance data.</h1>');
    }
});

// --- Start Server ---
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});
