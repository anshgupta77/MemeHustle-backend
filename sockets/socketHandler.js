



const userSessions = new Map();


module.exports = (io) => {

  
io.on('connection', (socket) => {
  socket.on('register_user', ({ user_id }) => {
    userSessions.set(socket.id, user_id);
    console.log(`User connected: ${user_id} with socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    userSessions.delete(socket.id);
  });
});
};



