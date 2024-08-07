const express = require('express');
const router = express.Router();
const Joi = require('joi');

const {
        getSpreadsheetMetadata,
        insertValueInCell,
} = require('../utils/functions.js');

const { CODE, CONFIG, auth } = require('../utils/constants.js');

const { logger } = require('../utils/logger.js');

const schemaMarkCell = Joi.object({
        spreadsheet_id: Joi.string().required(),
        sheet: Joi.number().integer().required(),
        frontside_marking: Joi.string().required(),
        position: Joi.number().integer().required(),
});
const validateRequest2 = (req, res, next) => {
        const { error, value } = schemaMarkCell.validate(req.body);
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
        logger.error({ message: `03 ERROR ${req.originalUrl}`, correlationId, stack: err });
        res.status(CODE.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
};

router.post('/', validateRequest2, async (req, res, next) => {
        const correlationId = req.correlationId;
        const {
                spreadsheet_id,
                sheet,
                frontside_marking,
                position,
        } = req.validatedBody;

        if (frontside_marking === undefined) frontside_marking = 'YES';

        try {

                const spreadSheetData = await getSpreadsheetMetadata(spreadsheet_id, auth);
                if (spreadSheetData.status !== CODE.OK) {
                        logger.warn({ message: `02 ERROR, Spreadsheet not found ${req.originalUrl} `, correlationId })
                        return res.status(CODE.NOT_FOUND).json({
                                error: 'spreadsheet not found'
                        })
                }

                const titles = spreadSheetData.data.sheets.map(sheet => sheet.properties.title);
                const selectedSheet = titles[sheet] || titles[0]
                const START_COL = 'C';
                const END_COL = 'D';
                const range = `${ selectedSheet }!${START_COL}${ position}:${END_COL}`; // `Sheet1!C1:D

                const response = await insertValueInCell(spreadsheet_id, auth, range, [[ frontside_marking ]]);
                res.status(CODE.OK).json({ data: response.data });
        } catch (error) {
                next(error)
        }

});

router.use(errorHandler);
module.exports = router;