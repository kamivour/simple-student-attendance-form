const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// --- Multer Storage Configuration (No Changes Here) ---
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


// --- NEW: CSV Logging Setup ---
const csvFilePath = path.join(__dirname, 'attendance.csv');
const csvHeader = 'Timestamp,StudentID,Name,PhotoFilename\n';

// Create the CSV file with a header if it doesn't exist
if (!fs.existsSync(csvFilePath)) {
    fs.writeFileSync(csvFilePath, csvHeader, 'utf8');
}


// --- Serve Frontend (No Changes Here) ---
app.use(express.static('public'));


// --- UPDATED: Form Submission Handling ---
app.post('/submit', upload.single('photo'), (req, res) => {
    // Get form data
    const { name, studentId } = req.body;
    const photoFilename = req.file.filename;

    // Format the data as a new row for the CSV
    const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
    const csvRow = `${timestamp},${studentId},"${name}","${photoFilename}"\n`;

    // Append the new row to your CSV file
    fs.appendFile(csvFilePath, csvRow, 'utf8', (err) => {
        if (err) {
            console.error('Error writing to CSV file:', err);
            // Send an error response to the user
            return res.status(500).send('<h1>Error: Could not save attendance data.</h1>');
        }

        console.log(`Attendance logged for: ${name} (${studentId})`);
        // Send a success response to the user
        res.send('<h1>Attendance Submitted!</h1><p>You can now close this window.</p>');
    });
});


// --- Start Server (No Changes Here) ---
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Access from other devices on the same network via your IP or domain.`);
});
