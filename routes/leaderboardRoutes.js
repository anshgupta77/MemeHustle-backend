const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboardController');

// Route: /api/leaderboard
router.get('/', getLeaderboard);

module.exports = router;
