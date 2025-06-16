

// MEMEHUSTLE - CYBERPUNK AI MEME MARKETPLACE
// Complete MERN Stack Application

// ==================== BACKEND (server.js) ====================
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL ;
const supabaseKey = process.env.SUPABASE_KEY ;
const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini AI setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// In-memory cache for AI responses and leaderboard
const aiCache = new Map();
let leaderboardCache = null;
let cacheExpiry = 0;

// Mock users for quick auth
const mockUsers = ['cyberpunk420', 'neonhacker', 'matrixdoge', 'synthwave99'];

// ==================== AI FUNCTIONS ====================
async function generateMemeCaption(tags) {
  const cacheKey = `caption_${tags.join('_')}`;
  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }

  try {
    const prompt = `Generate a funny, cyberpunk-style caption for a meme with tags: ${tags.join(', ')}. Make it short, witty, and internet culture savvy. Examples: "Doge hacks the matrix", "HODL to the neon moon", "Stonks go brrr in cyberspace"`;
    const result = await model.generateContent(prompt);
    const caption = result.response.text().trim();
    aiCache.set(cacheKey, caption);
    return caption;
  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback captions
    const fallbacks = [
      "YOLO to the moon! 🚀",
      "Much wow, very cyber",
      "Stonks go brrr in the matrix",
      "HODL the neon vibes!",
      "This is the way... to meme",
      "Number go up, brain go brrr"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

async function generateVibeAnalysis(tags, title) {
  const cacheKey = `vibe_${tags.join('_')}_${title}`;
  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey);
  }

  try {
    const prompt = `Describe the vibe of a meme titled "${title}" with tags: ${tags.join(', ')}. Use cyberpunk, neon, futuristic language. Keep it 2-4 words. Examples: "Neon Crypto Chaos", "Retro Stonks Vibes", "Digital Doge Energy"`;
    const result = await model.generateContent(prompt);
    const vibe = result.response.text().trim();
    aiCache.set(cacheKey, vibe);
    return vibe;
  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback vibes
    const fallbacks = [
      "Neon Crypto Chaos",
      "Retro Stonks Vibes",
      "Digital Doge Energy",
      "Synthwave Meme Magic",
      "Cyberpunk HODL Mood",
      "Matrix Meme Vibes"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

// ==================== API ROUTES ====================

// Get all memes
app.get('/api/memes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('memes')
      .select(`
        *,
        bids (
          credits,
          user_id,
          created_at
        )
      `)
      .order('created_at', { ascending: false});

    if (error) throw error;

    // Add highest bid to each meme
    const memesWithBids = data.map(meme => ({
      ...meme,
      highest_bid: meme.bids.length > 0 
        ? Math.max(...meme.bids.map(bid => bid.credits))
        : 0,
      highest_bidder: meme.bids.length > 0
        ? meme.bids.find(bid => bid.credits === Math.max(...meme.bids.map(b => b.credits)))?.user_id
        : null
    }));

    res.json(memesWithBids);
  } catch (error) {
    console.error('Error fetching memes:', error);
    res.status(500).json({ error: 'Failed to fetch memes' });
  }
});

// Create new meme
app.post('/api/memes', async (req, res) => {
  try {
    const { title, image_url, tags } = req.body;
    console.log('Creating meme:', { title, image_url, tags });
    const owner_id = mockUsers[Math.floor(Math.random() * mockUsers.length)];
    
    // Use default image if none provided
    const finalImageUrl = image_url || `https://picsum.photos/400/400?random=${Date.now()}`;
    
    // Generate AI caption and vibe
    const caption = await generateMemeCaption(tags);
    const vibe = await generateVibeAnalysis(tags, title);

    const { data, error } = await supabase
      .from('memes')
      .insert([{
        title,
        image_url: finalImageUrl,
        tags,
        upvotes: 0,
        owner_id,
        caption,
        vibe
      }])
      .select()
      .single();

    if (error) throw error;

    // Emit real-time update
    io.emit('meme_created', data);
    
    res.json(data);
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(500).json({ error: 'Failed to create meme' });
  }
});






app.post('/api/memes/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (!['up', 'down'].includes(type)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // First, get current upvotes
    const { data: currentMeme, error: fetchError } = await supabase
      .from('memes')
      .select('upvotes')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new upvotes
    const increment = type === 'up' ? 1 : -1;
    const newUpvotes = Math.max(currentMeme.upvotes + increment, 0);

    // Update with new value
    const { data: meme, error: updateError } = await supabase
      .from('memes')
      .update({ upvotes: newUpvotes })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    io.emit('vote_update', { meme_id: id, upvotes: meme.upvotes });
    res.json(meme);
  } catch (error) {
    console.error('Error voting on meme:', error);
    res.status(500).json({ error: 'Failed to vote on meme' });
  }
});

// Bid on meme
app.post('/api/memes/:id/bid', async (req, res) => {
  try {
    const { id } = req.params;
    const { credits } = req.body;
    const user_id = mockUsers[Math.floor(Math.random() * mockUsers.length)];

    const { data, error } = await supabase
      .from('bids')
      .insert([{
        meme_id: id,
        user_id,
        credits
      }])
      .select()
      .single();

    if (error) throw error;

    // Emit real-time update
    io.emit('bid_update', { meme_id: id, credits, user_id });
    
    res.json(data);
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { top = 10 } = req.query;
    
    // Check cache
    if (leaderboardCache && Date.now() < cacheExpiry) {
      return res.json(leaderboardCache.slice(0, parseInt(top)));
    }

    const { data, error } = await supabase
      .from('memes')
      .select('*')
      .order('upvotes', { ascending: false })
      .limit(50); // Cache more than requested

    if (error) throw error;

    leaderboardCache = data;
    cacheExpiry = Date.now() + 30000; // 30 second cache
    
    res.json(data.slice(0, parseInt(top)));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Generate caption for existing meme
app.post('/api/memes/:id/caption', async (req, res) => {
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
});

// ==================== WEBSOCKET EVENTS ====================
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 MemeHustle server running on port ${PORT}`);
  console.log('💎 Cyberpunk meme chaos is LIVE!');
});