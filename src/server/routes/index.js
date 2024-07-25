const express = require('express');
const router = express.Router();


const getAllFlashcards = require('./getAllFlashcards.js');
router.use('/', getAllFlashcards);// 


module.exports = router;