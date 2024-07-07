const express = require('express');
const path = require('path');
const process = require('process');
const { google } = require('googleapis');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = 3000;
app.use(express.json());

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const KEYFILEPATH = path.join(__dirname, 'fredy-dev-291705-eb57c5981f38.json');

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

function cleanWord(word) {
    if (typeof word !== 'string' || word.trim() === '') {
        return ''; // Return empty string for invalid input
    }
    // Trim spaces first and then remove leading articles (der, die, das)
    return word.trim().replace(/^(der|die|das)\s+/i, '').trim();
}


async function extractAudioExamples(word) {
    if (typeof word !== 'string' || word.trim() === '') {
        console.log('Invalid input: word must be a non-empty string');
        return []; // Return empty array instead of throwing an error
    }

    const cleanedWord = cleanWord(word);
    const url = `https://de.wiktionary.org/wiki/${encodeURIComponent(cleanedWord)}`;
    
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        const audioExamples = [];
        
        $('dd').each((index, element) => {
            const ddText = $(element).text();
            if (ddText.includes('Hörbeispiele:')) {
                $(element).find('a.internal').each((i, audioLink) => {
                    const audioUrl = $(audioLink).attr('href');
                    const audioText = $(audioLink).text();
                    if (audioUrl && audioUrl.includes('.ogg')) {
                        audioExamples.push({
                            url: audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl,
                            text: audioText
                        });
                    }
                });
            }
        });
        
        return audioExamples;
    } catch (error) {
        console.error(`Error processing '${cleanedWord}':`, error.message);
        return []; // Return empty array instead of throwing an error
    }
}

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

async function updateAudioUrls(word, audioUrls) {
    if (!word || typeof word !== 'string' || word.trim() === '') {
        console.log('Invalid word, skipping update');
        return;
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '1w8JKb4kko-PIX0y8kBsMr7Kor9KGNFsYKkR6-iNQ3xc';
        const range = 'Sheet1!A1:D';

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const values = response.data.values;
        const rowIndex = values.findIndex(row => row[0] && cleanWord(row[0]) === cleanWord(word));

        if (rowIndex !== -1) {
            const audioUrlString = audioUrls.join(', ');
            
            // Ensure the row has at least 4 columns
            while (values[rowIndex].length < 4) {
                values[rowIndex].push('');
            }
            
            // Always update column D (index 3)
            values[rowIndex][3] = audioUrlString;

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Sheet1!A${rowIndex + 1}:D${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [values[rowIndex]],
                },
            });
            console.log(`Updated audio URLs for word: ${word}`);
        } else {
            console.log(`Word not found in spreadsheet: ${word}`);
        }
    } catch (err) {
        console.error(`Error updating audio URLs for word "${word}":`, err);
    }
}

async function processWordWithoutAudio() {
    const data = await accessSpreadsheet();
    for (const row of data) {
        const word = row[0];
        if (!word || typeof word !== 'string' || word.trim() === '') {
            console.log('Skipping empty or invalid word');
            continue;
        }
        try {
            const audioExamples = await extractAudioExamples(word);
            if (audioExamples.length > 0) {
                const audioUrls = audioExamples.map(example => example.url);
                await updateAudioUrls(word, audioUrls);
            } else {
                console.log(`No audio examples found for word: ${word}`);
                // Optionally, you can still update the spreadsheet with an empty string
                // await updateAudioUrls(word, []);
            }
        } catch (error) {
            console.error(`Error processing word "${word}":`, error.message);
        }
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
        const cleanedWord = cleanWord(word);
        const rowIndex = values.findIndex(row => {
            if (row[0] !== undefined) {
                return cleanWord(row[0]) === cleanedWord;
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
    // const lastEmptyIndex = data.map(JSON.stringify).lastIndexOf(JSON.stringify([]));

    // Slice the data from the position after the last empty array
    // let filteredData = data;
    // if (lastEmptyIndex !== -1) {
    //     filteredData = data.slice(lastEmptyIndex + 1);
    // }

    // Filter out words that have a "1" in the third column
    // filteredData = filteredData.filter(row => row[2] !== '1');

    // return filteredData;
    return data;
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
        // console.log(data);


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
    console.log('test word', word);
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
    // processWordWithoutAudio();

});

// Notify livereload server about the changes
liveReloadServer.server.once('connection', () => {
    setTimeout(() => {
        liveReloadServer.refresh('/');
    }, 100);
});
