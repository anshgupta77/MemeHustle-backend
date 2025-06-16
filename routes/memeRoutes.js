const express = require('express');
const router = express.Router();
const { getMemes, createMeme, voteMeme, captionMeme } = require('../controllers/memeController');

router.get('/', getMemes);
router.post('/', createMeme);
router.post('/:id/vote', voteMeme);
router.post('/:id/caption', captionMeme);

module.exports = router;
