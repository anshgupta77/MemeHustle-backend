const { supabase } = require('../supabase/client');

let leaderboardCache = null;
let cacheExpiry = 0;

const getLeaderboard = async (req, res) => {
  try {
    const { top = 10 } = req.query;

    if (leaderboardCache && Date.now() < cacheExpiry) {
      return res.json(leaderboardCache.slice(0, parseInt(top)));
    }

    const { data, error } = await supabase
      .from('memes')
      .select('*')
      .order('upvotes', { ascending: false })
      .limit(50);

    if (error) throw error;

    leaderboardCache = data;
    cacheExpiry = Date.now() + 30000;

    res.json(data.slice(0, parseInt(top)));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

module.exports = {
  getLeaderboard,
};
