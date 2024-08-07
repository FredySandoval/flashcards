const { google } = require('googleapis');
const path = require('path');

const CODE = {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
};

const CONFIG = {
    SHEET_RANGE: 'A2:F', // skip titles
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DEVELOPER: process.env.NODE_ENV === 'developer'
}


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const KEY_FILE_PATH = path.join(__dirname, '/../../../', process.env.KEY_FILE_NAME);

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
});



module.exports = {
    auth,
    CODE,
    CONFIG,
}
