const express = require('express');
const multer = require('multer');
const path = require('path');
const { google } = require('googleapis'); // Import googleapis

const app = express();
const port = 3000;

// --- GOOGLE SHEETS SETUP ---
const SPREADSHEET_ID = '1H1ZLiE4oPClc7vPlybuZZJFd-c6mKB9cL1IyA2GiqrU'; // <-- PASTE YOUR ID HERE

// Authenticate with Google Sheets
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json', // The path to your credentials file
    scopes: 'https://www.googleapis.com/auth/spreadsheets', // The scope for Google Sheets
});
const sheets = google.sheets({ version: 'v4', auth: auth });

// --- Multer Storage Configuration (No Changes) ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        const studentId = req.body.studentId || 'unknown';
        const studentName = req.body.name || 'unknown';
        const timestamp = Date.now();
        cb(null, `${studentId}-${studentName}-${timestamp}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

app.use(express.static('public'));

// --- UPDATED /submit Route ---
app.post('/submit', upload.single('photo'), async (req, res) => {
    try {
        const { name, studentId } = req.body;
        const photoFilename = req.file.filename; // We still get the filename
        const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

        // Prepare the row to be appended
        const newRow = [[timestamp, studentId, name, photoFilename]];

        // Append the row to the Google Sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:D', // The sheet and columns to append to
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: newRow,
            },
        });

        console.log(`Attendance logged for: ${name} (${studentId})`);
        res.send('<h1>Điểm danh thành công.</h1>');

    } catch (error) {
        console.error('Error writing to Google Sheet:', error);
        res.status(500).send('<h1>Error: Could not save attendance data.</h1>');
    }
});

// --- Start Server (No Changes) ---
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});
