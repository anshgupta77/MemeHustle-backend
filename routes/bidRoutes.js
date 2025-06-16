const express = require('express');
const router = express.Router();
const { placeBid } = require('../controllers/bidController');

router.post('/:id/bid', placeBid);

module.exports = router;
