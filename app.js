const express = require('express');
const path = require('path');
const process = require('process');
const { google } = require('googleapis');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');
const app = express();
const port = 3000;
app.use(express.json());

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const KEYFILEPATH = path.join(__dirname, 'fredy-dev-291705-eb57c5981f38.json');

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

async function accessSpreadsheet() {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '1w8JKb4kko-PIX0y8kBsMr7Kor9KGNFsYKkR6-iNQ3xc'; // Replace with your Google Sheet ID
        const range = 'Sheet1!A1:D'; // Replace with your sheet name and range

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return response.data.values;
    } catch (err) {
        console.error('The API returned an error:', err);
    }
}
async function markWordAsLearned(word) {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '1w8JKb4kko-PIX0y8kBsMr7Kor9KGNFsYKkR6-iNQ3xc'; // Replace with your Google Sheet ID
        const range = 'Sheet1!A1:C'; // Replace with your sheet name and range

        // Get the current values of the spreadsheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const values = response.data.values;
        const treatedWord = word.trim();
        const rowIndex = values.findIndex(row => {
            if (row[0] !== undefined) {
                const treatedRow = row[0].trim();
                return treatedRow === treatedWord
            } 
        });
        // const rowIndex = values.findIndex(row => row[0].trim().toLowerCase() === word.trim().toLowerCase());

        if (rowIndex !== -1) {
            if (values[rowIndex].length < 3) {
                values[rowIndex].push('1');
            } else {
                values[rowIndex][2] = '1';
            }

            // Update the sheet with the new values
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Sheet1!A${rowIndex + 1}:C${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [values[rowIndex]],
                },
            });
        }
    } catch (err) {
        console.error('The API returned an error while marking the word as learned:', err);
    }
}
function filterData(data) {
    // Find the index of the last empty array
    const lastEmptyIndex = data.map(JSON.stringify).lastIndexOf(JSON.stringify([]));

    // Slice the data from the position after the last empty array
    let filteredData = data;
    if (lastEmptyIndex !== -1) {
        filteredData = data.slice(lastEmptyIndex + 1);
    }

    // Filter out words that have a "1" in the third column
    filteredData = filteredData.filter(row => row[2] !== '1');

    return filteredData;
}

// Environment setup
const env = process.env.NODE_ENV || 'development';

// Create a livereload server
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, 'views'));
liveReloadServer.watch(path.join(__dirname, 'public'));


// Attach connect-livereload middleware in development environment
if (env === 'development') {
    app.use(connectLivereload());
}

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define a route to render the index.ejs template
app.get('/', async (req, res) => {
    try {
        // Authorize and fetch data from Google Sheets

        const rawData = await accessSpreadsheet();
        const data = filterData(rawData);
        console.log(data);
        

        // console.log(data);
        // Render the index.ejs template with fetched data
        res.render('index', { title: 'Flash Cards', message: 'Welcome to Flash Cards App!', data });
    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        res.status(500).send('Error fetching data from Google Sheets');
    }
});

// Define a route to mark a word as learned
app.post('/mark-learned', async (req, res) => {
    const { word } = req.body;
    try {
        await markWordAsLearned(word);
        res.status(200).send('Word marked as learned');
    } catch (error) {
        console.error('Error marking word as learned:', error);
        res.status(500).send('Error marking word as learned');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// Notify livereload server about the changes
liveReloadServer.server.once('connection', () => {
    setTimeout(() => {
        liveReloadServer.refresh('/');
    }, 100);
});
