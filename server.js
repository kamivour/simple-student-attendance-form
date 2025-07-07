const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const stream = require('stream');

const app = express();
const port = 3000;

// --- CONFIGURATION ---
const SPREADSHEET_ID = '1H1ZLiE4oPClc7vPlybuZZJFd-c6mKB9cL1IyA2GiqrU'; // <-- PASTE YOUR SPREADSHEET ID
const DRIVE_FOLDER_ID = '1Vxb-0304aOENsjZ0XCJOZpj_2uQFX16D'; // <-- PASTE YOUR FOLDER ID

// --- GOOGLE AUTH SETUP ---
// Add the 'drive' scope to give permission for Google Drive
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ],
});

// Create clients for both Sheets and Drive
const sheets = google.sheets({ version: 'v4', auth: auth });
const drive = google.drive({ version: 'v3', auth: auth });

// --- MULTER SETUP ---
// Change storage to hold files in memory as a buffer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

app.use(express.static('public'));

// --- UPDATED /submit Route ---
app.post('/submit', upload.single('photo'), async (req, res) => {
    // Check if a photo was submitted
    if (!req.file) {
        return res.status(400).send('<h1>Error: No photo was submitted.</h1>');
    }

    try {
        const { name, studentId } = req.body;
        const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
        
        // Create a buffer and a readable stream for the upload
        const buffer = req.file.buffer;
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        // 1. UPLOAD PHOTO TO GOOGLE DRIVE
        const { data: file } = await drive.files.create({
            media: {
                mimeType: req.file.mimetype,
                body: bufferStream,
            },
            requestBody: {
                name: `${studentId}-${name}-${Date.now()}.jpg`,
                parents: [DRIVE_FOLDER_ID], // Specify the folder
            },
            fields: 'id, webViewLink', // Get the file ID and web link
        });

        // Make the file publicly readable
        await drive.permissions.create({
            fileId: file.id,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        const photoLink = file.webViewLink; // The direct link to the photo

        // 2. APPEND RECORD TO GOOGLE SHEET
        const newRow = [[timestamp, studentId, name, photoLink]];
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:D',
            valueInputOption: 'USER_ENTERED',
            resource: { values: newRow },
        });

        console.log(`Attendance logged for: ${name} (${studentId})`);
        res.send('<h1>Attendance Submitted Successfully!</h1><p>You can now close this window.</p>');

    } catch (error) {
        console.error('Error during submission process:', error);
        res.status(500).send('<h1>Error: Could not save attendance data.</h1>');
    }
});


// --- Start Server (No Changes) ---
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});
