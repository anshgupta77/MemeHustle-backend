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

// async function voteMeme(req, res) {
//  try {
//     const { id } = req.params;
//     const { type, user_id } = req.body;
//     console.log(user_id, 'user_id in voteMeme');
//     if (!['up', 'down'].includes(type)) return res.status(400).json({ error: 'Invalid vote type' });

//     const { data: currentMeme, error: fetchError } = await supabase
//       .from('memes')
//       .select('upvotes')
//       .eq('id', id)
//       .single();

//     if (fetchError) throw fetchError;

//     const newUpvotes = Math.max(currentMeme.upvotes + (type === 'up' ? 1 : -1), 0);

//     const { data: meme, error: updateError } = await supabase
//       .from('memes')
//       .update({ upvotes: newUpvotes })
//       .eq('id', id)
//       .select()
//       .single();

//     if (updateError) throw updateError;

//     res.io.emit('vote_update', { meme_id: id, upvotes: meme.upvotes });
//     res.json(meme);
//   } catch (err) {
//     console.error('Error voting meme:', err);
//     res.status(500).json({ error: 'Failed to vote on meme' });
//   }

// }









async function voteMeme(req, res) {
  try {
    const { id } = req.params;
    const { type, user_id } = req.body;
    console.log(user_id, 'user_id in voteMeme');
    
    if (!['up', 'down'].includes(type)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // Check if user has already voted on this meme
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('meme_id', id)
      .eq('user_id', user_id)
      .single();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if no vote exists
      throw voteCheckError;
    }

    let voteChange = 0;
    
    if (existingVote) {
      // User has already voted
      if (existingVote.vote_type === type) {
        // Same vote type - remove the vote (toggle off)
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('meme_id', id)
          .eq('user_id', user_id);

        if (deleteError) throw deleteError;
        
        res.json({
      ...meme,
      user_vote: userVote?.vote_type || null, errorMessage: "You already voted on this meme"
    });
      } else {
        // Different vote type - update the vote
        const { error: updateError } = await supabase
          .from('votes')
          .update({ vote_type: type })
          .eq('meme_id', id)
          .eq('user_id', user_id);

        if (updateError) throw updateError;
        
        // Change is +2 or -2 because we're switching from opposite vote
        voteChange = type === 'up' ? 1 : -1;
      }
    } else {
      // User hasn't voted - create new vote
      const { error: insertError } = await supabase
        .from('votes')
        .insert({
          meme_id: id,
          user_id: user_id,
          vote_type: type
        });

      if (insertError) throw insertError;
      
      voteChange = type === 'up' ? 1 : -1;
    }

    // Get current meme upvotes
    const { data: currentMeme, error: fetchError } = await supabase
      .from('memes')
      .select('upvotes')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update meme upvotes
    const newUpvotes = Math.max(currentMeme.upvotes + voteChange, 0);

    const { data: meme, error: updateError } = await supabase
      .from('memes')
      .update({ upvotes: newUpvotes })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Get user's current vote status for response
    const { data: userVote } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('meme_id', id)
      .eq('user_id', user_id)
      .single();

    res.io.emit('vote_update', { 
      meme_id: id, 
      upvotes: meme.upvotes,
      user_vote: userVote?.vote_type || null
    });

    res.json({
      ...meme,
      user_vote: userVote?.vote_type || null, errorMessage: null
    });

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









 








  // try {
  //   const { id: meme_id } = req.params;
  //   const { type, user_id } = req.body;

  //   if (!['up', 'down'].includes(type)) {
  //     return res.status(400).json({ error: 'Invalid vote type' });
  //   }

  //   // Check if user has already voted
  //   const { data: existingVote, error: voteFetchError } = await supabase
  //     .from('votes')
  //     .select('*')
  //     .eq('meme_id', meme_id)
  //     .eq('user_id', user_id)
  //     .single();

  //   if (voteFetchError && voteFetchError.code !== 'PGRST116') throw voteFetchError;

  //   if (existingVote && existingVote.vote_type === type) {
  //     return res.status(400).json({ error: 'You have already voted on this meme' });
  //   }

  //   // Update upvote count
  //   const { data: currentMeme, error: fetchError } = await supabase
  //     .from('memes')
  //     .select('upvotes')
  //     .eq('id', meme_id)
  //     .single();

  //   if (fetchError) throw fetchError;

  //   const newUpvotes = Math.max(currentMeme.upvotes + (type === 'up' ? 1 : -1), 0);

  //   const { data: meme, error: updateError } = await supabase
  //     .from('memes')
  //     .update({ upvotes: newUpvotes })
  //     .eq('id', meme_id)
  //     .select()
  //     .single();

  

  //   if (updateError) throw updateError;

  //   const {data: existingVoteCheck, error: checkError} = await supabase
  //     .from('votes')
  //     .select("vote_type")
  //     .eq('meme_id', meme_id)
  //     .eq('user_id', user_id)
  //     .single();

  //   if (checkError && checkError.code !== 'PGRST116') throw checkError;

  //   // If user has an existing vote, update it
  //   const newVoteType = existingVoteCheck ? type : null;


  //   const { error: updateVoteError } = await supabase
  //       .from('votes')
  //       .update({ vote_type: newVoteType })
  //       .eq('meme_id', meme_id) 
  //       .eq('user_id', user_id);

  //   // If no existing vote, insert a new one
  //   if (updateVoteError) throw updateVoteError;


  //   // Save vote
  //   const { error: insertVoteError } = await supabase
  //     .from('votes')
  //     .insert({ meme_id, user_id, vote_type: type });

  //   if (insertVoteError) throw insertVoteError;

  //   res.io.emit('vote_update', { meme_id, upvotes: meme.upvotes });
  //   res.json(meme);
  // } catch (err) {
  //   console.error('Error voting meme:', err);
  //   res.status(500).json({ error: 'Failed to vote on meme' });
  // }
