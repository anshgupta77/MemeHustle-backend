const { supabase } = require('../supabase/client');
const mockUsers = require('../utils/mockUsers');
const { generateMemeCaption, generateVibeAnalysis } = require('../utils/ai');

async function getMemes(req, res) {
  try {
    const { data, error } = await supabase
      .from('memes')
      .select(`*, bids (credits, user_id, created_at)`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const memes = data.map(meme => ({
      ...meme,
      highest_bid: meme.bids.length ? Math.max(...meme.bids.map(b => b.credits)) : 0,
      highest_bidder: meme.bids.length
        ? meme.bids.find(b => b.credits === Math.max(...meme.bids.map(x => x.credits)))?.user_id
        : null
    }));

    res.json(memes);
  } catch (err) {
    console.error('Error fetching memes:', err);
    res.status(500).json({ error: 'Failed to fetch memes' });
  }
}




async function createMeme(req, res) {
  try {
    const { title, image_url, tags } = req.body;
    const owner_id = mockUsers[Math.floor(Math.random() * mockUsers.length)];
    const finalImageUrl = image_url || `https://picsum.photos/400/400?random=${Date.now()}`;
    const caption = await generateMemeCaption(tags);
    const vibe = await generateVibeAnalysis(tags, title);

    const { data, error } = await supabase
      .from('memes')
      .insert([{ title, image_url: finalImageUrl, tags, upvotes: 0, owner_id, caption, vibe }])
      .select()
      .single();

    if (error) throw error;

    res.io.emit('meme_created', data);
    res.json(data);
  } catch (err) {
    console.error('Error creating meme:', err);
    res.status(500).json({ error: 'Failed to create meme' });
  }
}

async function voteMeme(req, res) {
  try {
    const { id } = req.params;
    const { type } = req.body;
    if (!['up', 'down'].includes(type)) return res.status(400).json({ error: 'Invalid vote type' });

    const { data: currentMeme, error: fetchError } = await supabase
      .from('memes')
      .select('upvotes')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const newUpvotes = Math.max(currentMeme.upvotes + (type === 'up' ? 1 : -1), 0);

    const { data: meme, error: updateError } = await supabase
      .from('memes')
      .update({ upvotes: newUpvotes })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.io.emit('vote_update', { meme_id: id, upvotes: meme.upvotes });
    res.json(meme);
  } catch (err) {
    console.error('Error voting meme:', err);
    res.status(500).json({ error: 'Failed to vote on meme' });
  }
}

const captionMeme = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get meme details
    const { data: meme, error: fetchError } = await supabase
      .from('memes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const caption = await generateMemeCaption(meme.tags);
    console.log('Generated caption:', caption);
    
    const { data, error } = await supabase
      .from('memes')
      .update({ caption })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error generating caption:', error);
    res.status(500).json({ error: 'Failed to generate caption' });
  }
}



module.exports = { getMemes, createMeme, voteMeme, captionMeme };
