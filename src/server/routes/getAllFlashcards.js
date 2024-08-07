const express = require('express');
const router = express.Router();
const Joi = require('joi');

const {
    getSpreadsheetMetadata,
    getSpreadsheetValues,
    checkAndAddAudioForAllRows,
} = require('../utils/functions.js');

const { CODE, CONFIG, auth } = require('../utils/constants.js');

const { logger } = require('../utils/logger.js');

const schemaBody = Joi.object({
    spreadsheet_id: Joi.string().required(),
    sheet: Joi.number().integer().required(),
});

const validateRequest = (req, res, next) => {
    const { error, value } = schemaBody.validate(req.body);
    if (error) {
        logger.error({ message: `01 ERROR ${req.originalUrl}`, stack: error });
        const errorMessage = error.details.map(detail => detail.message);
        console.log(error);
        return res.status(CODE.BAD_REQUEST).json({
            error: errorMessage
        })
    };
    req.validatedBody = value;
    next();
};
// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId;
  logger.error( { message:`03 ERROR ${req.originalUrl}` , correlationId,  stack: err });
  res.status(CODE.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
};

router.post('/', validateRequest,async (req, res, next) => {
    const correlationId = req.correlationId;
    const {
        spreadsheet_id,
        sheet,
    } = req.validatedBody;

    try {
        const spreadSheetData = await getSpreadsheetMetadata(spreadsheet_id, auth);
        if (spreadSheetData.status !== CODE.OK) {
            logger.warn({ message: `02 ERROR, Spreadsheet not found ${req.originalUrl} `, correlationId})
            return res.status(CODE.NOT_FOUND).json({
                error: 'spreadsheet not found'
            })
        }

        const titles = spreadSheetData.data.sheets.map(sheet => sheet.properties.title);
        const selectedSheet = titles[sheet] || titles[0]
        const range = `${selectedSheet}!${CONFIG.SHEET_RANGE}`; // Sheet1!A1:D

        let data = await getSpreadsheetValues(spreadsheet_id, auth, range);
        const audioWordsProcessed = await checkAndAddAudioForAllRows(spreadsheet_id, auth, data)
        if (audioWordsProcessed.length > 0) {
            data = await getSpreadsheetValues(spreadsheet_id, auth, range);
            logger.info( { message: `01 data processed and updated`, correlationId})
            return res.status(CODE.OK).json({
                error: false,
                titles,
                data: data.data.values
            });
        
        } else {
            logger.info( { message: `02 data processed`, correlationId})
            return res.status(CODE.OK).json({
                error: false,
                titles,
                data: data.data.values
            });
        }
    } catch (error) {
        next(error);
    }
});

router.use(errorHandler);

module.exports = router;