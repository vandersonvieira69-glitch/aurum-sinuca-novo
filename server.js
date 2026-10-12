const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;
const rooms = new Map();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ok:true, app:'Aurum Sinuca'}));
io.on('connection', socket => {
  socket.on('join-room', raw => {
    const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,8);
    if (!code) return socket.emit('room-message', 'Digite um código de sala.');
    const old = socket.data.room;
    if (old && rooms.has(old)) {
      const left = rooms.get(old).filter(id => id !== socket.id);
      if (left.length) rooms.set(old,left); else rooms.delete(old);
      socket.leave(old);
    }
    socket.join(code); socket.data.room = code;
    const members = rooms.get(code) || [];
    if (!members.includes(socket.id)) members.push(socket.id);
    rooms.set(code,members);
    io.to(code).emit('room-players', members.length);
    socket.emit('room-joined',{code,players:members.length});
  });
  socket.on('shot', data => { if (socket.data.room) socket.to(socket.data.room).emit('opponent-shot',data); });
  socket.on('disconnect', () => {
    const code=socket.data.room; if (!code || !rooms.has(code)) return;
    const left=rooms.get(code).filter(id=>id!==socket.id);
    if(left.length) rooms.set(code,left); else rooms.delete(code);
    io.to(code).emit('room-players',left.length);
  });
});
server.listen(PORT,'0.0.0.0',()=>console.log('Aurum Sinuca ativo na porta '+PORT));
