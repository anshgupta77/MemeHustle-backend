require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase } = require('./SupabaseClient');

const app = express();
app.use(cors());
app.use(express.json());


const http = require('http');
const { Server } = require('socket.io');

// Replace this line:
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // or your frontend URL
    methods: ['GET', 'POST']
  }
});

app.get('/', (req, res) => res.send('🚀 MemeHustle Backend Running'));

// Get all memes
app.get('/memes', async (req, res) => {
  const { data, error } = await supabase.from('memes').select('*');
  if (error) return res.status(500).json({ error });
  res.json(data);
});

// Add a new meme
app.post('/memes', async (req, res) => {
  const { title, image_url, owner_id } = req.body;
  const { data, error } = await supabase
    .from('memes')
    .insert([{ title, image_url, owner_id }]);
  if (error) return res.status(500).json({ error });
  res.status(201).json(data[0]);
});

// Leaderboard (top 10 by upvotes)
app.get('/leaderboard', async (req, res) => {
  const { data, error } = await supabase
    .from('memes')
    .select('*')
    .order('upvotes', { ascending: false })
    .limit(10);
  if (error) return res.status(500).json({ error });
  res.json(data);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

