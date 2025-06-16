const { supabase } = require('../supabase/client');
const mockUsers = require('../utils/mockUsers');

async function placeBid(req, res) {
  try {
    const { id } = req.params;
    const { credits } = req.body;
    const user_id = mockUsers[Math.floor(Math.random() * mockUsers.length)];

    const { data, error } = await supabase
      .from('bids')
      .insert([{ meme_id: id, user_id, credits }])
      .select()
      .single();

    if (error) throw error;

    res.io.emit('bid_update', { meme_id: id, credits, user_id });
    res.json(data);
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ error: 'Failed to place bid' });
  }
}

module.exports = { placeBid };
