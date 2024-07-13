const express = require('express');
const path = require('path');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

// Serve static files from the 'public' directory

if (process.env.NODE_ENV === "dev") {
    var livereload = require("livereload");
    var connectLiveReload = require("connect-livereload");
    const liveReloadServer = livereload.createServer();
    liveReloadServer.watch(path.join(__dirname, "public"));
    app.use(connectLiveReload());
}

app.use(express.static(path.join(__dirname, 'public')));

const SPREAD_SHEET_ID = '1w8JKb4kko-PIX0y8kBsMr7Kor9KGNFsYKkR6-iNQ3xc'; // Replace with your Google Sheet ID
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const KEYFILEPATH = path.join(__dirname, 'fredy-dev-291705-eb57c5981f38.json');

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const {
    notFound,
    errorHandler,
    get_local_IP_address
} = require('./middlewares.js');


const {
    cleanWord,
    extractAudioExamplesOfWord,
    accessSpreadsheet,
    insertValueInCell,
    checkAndAddAudioForAllRows,
} = require('./functions.js')


app.get('/getAllFlashCardsInRawData', async (req, res) => {
    try {
        const rawData = await accessSpreadsheet(SPREAD_SHEET_ID, auth, 'Sheet1!A1:D');
        checkAndAddAudioForAllRows(SPREAD_SHEET_ID, auth, rawData)
        res.json(rawData.data);
    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        res.status(500).send('Error fetching data from Google Sheets');
    }
});
app.post('/markcell', async (req, res) => {
    const { word, position, mark } = req.body;
    if (mark == undefined) mark = 'nothing';
    console.log(word, position);
    try {
        await insertValueInCell(SPREAD_SHEET_ID, auth, `Sheet1!C${position + 1}:D`, [[ mark ]] )
        // await insertValueInCell(SPREAD_SHEET_ID, auth, '', [['1']])
        res.json({data: 'success'})
    } catch (error) {
        res.status(500).send('error in path /markcell')
    }
});

app.use(notFound);
app.use(errorHandler);

app.listen(3000, () => {
    if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'developer') {
        console.log(`Listening on http://${get_local_IP_address()}:3000`);
    }
})



if (process.env.NODE_ENV === "dev") {
    liveReloadServer.server.once("connection", () => {
        setTimeout(() => {
            liveReloadServer.refresh("/");
        }, 300);
    });
}

