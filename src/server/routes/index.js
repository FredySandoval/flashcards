const express = require('express');
const router = express.Router();


const getAllFlashcards = require('./getAllFlashcards.js');
const markCell = require('./markCell.js');

router.use('/getAllFlashcards', getAllFlashcards);
router.use('/markCell', markCell);

module.exports = router;