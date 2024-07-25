const { createLogger, format, transports } = require('winston');
const { google } = require('googleapis');
const path = require('path');

const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    INTERNAL_SERVER_ERROR: 500
};

const CONFIG = {
    SHEET_RANGE: 'A1:D',
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DEVELOPER: process.env.NODE_ENV === 'developer'
}

const ERROR_MESSAGE = (errorAt, message) => {
    return `error at ${errorAt}, ${message} `
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const KEY_FILE_PATH = path.join(__dirname, '/../../../', process.env.KEY_FILE_NAME);

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
});

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple(),
            )
        }),
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' })
    ]
});


module.exports = {
    auth,
    HTTP_STATUS,
    ERROR_MESSAGE,
    CONFIG,
    logger,
}
