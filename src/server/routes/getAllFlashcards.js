const express = require('express');
const router = express.Router();
const Joi = require('joi');

const {
    getSpreadsheetMetadata,
    getSpreadsheetValues,
    handleError,
    checkAndAddAudioForAllRows,
} = require('./functions');
const { HTTP_STATUS, CONFIG, auth, logger } = require('./constants.js');

const schemaBody = Joi.object({
    SPREADSHEET_ID: Joi.string().required(),
    SHEET: Joi.number().integer().required()
});


const handleSuccess = (res, data, titles) => {
    logger.info('success sending')
    return res.status(HTTP_STATUS.OK).json({
        success: true,
        error: false,
        message: '',
        titles,
        data
    });
}
router.post('/', async (req, res) => {
    try {
        const { error, value } = schemaBody.validate(req.body);
        if (error) {
            return handleError(
                req,
                res,
                HTTP_STATUS.BAD_REQUEST,
                error.details[0].message,
                '01'
            );
        }

        const { SPREADSHEET_ID, SHEET } = value;
        const spreadSheetData = await getSpreadsheetMetadata(SPREADSHEET_ID, auth);
        if (spreadSheetData.status !== HTTP_STATUS.OK ) {
            return handleError(
                req,
                res,
                HTTP_STATUS.BAD_REQUEST,
                spreadSheetData.response.statusText,
                '02'
            )
        }

        const titles = spreadSheetData.data.sheets.map(sheet => sheet.properties.title);
        const selectedSheet = titles[SHEET] || titles[0]
        const range = `${selectedSheet}!${CONFIG.SHEET_RANGE}`; // Sheet1!A1:D

        let mainData = await getSpreadsheetValues(SPREADSHEET_ID, auth, range);
        const audioWordsProcessed = await checkAndAddAudioForAllRows(SPREADSHEET_ID, auth, mainData)
        if (audioWordsProcessed.length > 0) {
            mainData = await getSpreadsheetValues(SPREADSHEET_ID, auth, range);
            return handleSuccess(res, mainData.data.values, titles);
        } else {
            console.log(audioWordsProcessed);
            return handleSuccess(res, mainData.data.values, titles)
        }
    } catch (error) {
        console.log(error);
        return handleError(
            req,
            res,
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            'Internal server error',
            '03'
        )
    }
});

module.exports = router;