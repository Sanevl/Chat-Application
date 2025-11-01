const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process'); // Add this for auto-opening browser
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Store active users and rooms
const activeUsers = new Map();
const chatRooms = new Map([
  ['general', { name: 'General', users: new Set(), created: new Date() }],
  ['random', { name: 'Random', users: new Set(), created: new Date() }],
  ['tech', { name: 'Tech Talk', users: new Set(), created: new Date() }],
  ['gaming', { name: 'Gaming', users: new Set(), created: new Date() }],
  ['music', { name: 'Music Lovers', users: new Set(), created: new Date() }]
]);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('user_join', (data) => {
    const { username, room } = data;
    
    // Check if username is already taken
    const existingUser = Array.from(activeUsers.values()).find(user => user.username === username);
    if (existingUser) {
      socket.emit('username_taken', { message: 'Username is already taken' });
      return;
    }

    // Store user info
    activeUsers.set(socket.id, { username, room });
    
    // Add user to room
    if (chatRooms.has(room)) {
      chatRooms.get(room).users.add(username);
    }

    // Join the socket room
    socket.join(room);

    // Notify room about new user
    socket.to(room).emit('user_joined', {
      username,
      message: `${username} joined the room`,
      timestamp: new Date(),
      roomUsers: Array.from(chatRooms.get(room).users)
    });

    // Send room info to the user
    socket.emit('room_info', {
      room,
      roomName: chatRooms.get(room)?.name || room,
      users: Array.from(chatRooms.get(room).users),
      rooms: Array.from(chatRooms.entries()).map(([id, roomData]) => ({
        id,
        name: roomData.name,
        userCount: roomData.users.size
      }))
    });

    console.log(`${username} joined room: ${room}`);
  });

  // Handle new message
  socket.on('send_message', (data) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    const messageData = {
      id: Date.now().toString(),
      username: user.username,
      message: data.message,
      room: user.room,
      timestamp: new Date(),
      type: 'message'
    };

    // Broadcast to room
    io.to(user.room).emit('receive_message', messageData);
    console.log(`Message from ${user.username} in ${user.room}: ${data.message}`);
  });

  // Handle room creation
  socket.on('create_room', (data) => {
    const { roomName } = data;
    const roomId = roomName.toLowerCase().replace(/\s+/g, '-');
    
    if (!chatRooms.has(roomId)) {
      chatRooms.set(roomId, {
        name: roomName,
        users: new Set(),
        created: new Date()
      });
      
      // Notify all users about new room
      io.emit('room_created', {
        id: roomId,
        name: roomName,
        userCount: 0
      });
    }
  });

  // Handle room change
  socket.on('change_room', (data) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    const { newRoom } = data;
    const oldRoom = user.room;

    // Leave old room
    socket.leave(oldRoom);
    if (chatRooms.has(oldRoom)) {
      chatRooms.get(oldRoom).users.delete(user.username);
    }

    // Notify old room about user leaving
    socket.to(oldRoom).emit('user_left', {
      username: user.username,
      message: `${user.username} left the room`,
      timestamp: new Date(),
      roomUsers: chatRooms.has(oldRoom) ? Array.from(chatRooms.get(oldRoom).users) : []
    });

    // Join new room
    user.room = newRoom;
    if (chatRooms.has(newRoom)) {
      chatRooms.get(newRoom).users.add(user.username);
    }
    socket.join(newRoom);

    // Notify new room about user joining
    socket.to(newRoom).emit('user_joined', {
      username: user.username,
      message: `${user.username} joined the room`,
      timestamp: new Date(),
      roomUsers: chatRooms.has(newRoom) ? Array.from(chatRooms.get(newRoom).users) : []
    });

    // Send new room info to user
    socket.emit('room_info', {
      room: newRoom,
      roomName: chatRooms.get(newRoom)?.name || newRoom,
      users: chatRooms.has(newRoom) ? Array.from(chatRooms.get(newRoom).users) : [],
      rooms: Array.from(chatRooms.entries()).map(([id, roomData]) => ({
        id,
        name: roomData.name,
        userCount: roomData.users.size
      }))
    });

    console.log(`${user.username} moved from ${oldRoom} to ${newRoom}`);
  });

  // Handle typing indicator
  socket.on('typing_start', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(user.room).emit('user_typing', {
        username: user.username,
        isTyping: true
      });
    }
  });

  socket.on('typing_stop', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(user.room).emit('user_typing', {
        username: user.username,
        isTyping: false
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      const { username, room } = user;
      
      // Remove user from room
      if (chatRooms.has(room)) {
        chatRooms.get(room).users.delete(username);
      }

      // Remove user from active users
      activeUsers.delete(socket.id);

      // Notify room about user leaving
      socket.to(room).emit('user_left', {
        username,
        message: `${username} left the room`,
        timestamp: new Date(),
        roomUsers: chatRooms.has(room) ? Array.from(chatRooms.get(room).users) : []
      });

      console.log(`User disconnected: ${username}`);
    }
  });
});

// API routes
app.get('/api/rooms', (req, res) => {
  const rooms = Array.from(chatRooms.entries()).map(([id, roomData]) => ({
    id,
    name: roomData.name,
    userCount: roomData.users.size,
    created: roomData.created
  }));
  res.json(rooms);
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    users: activeUsers.size,
    rooms: chatRooms.size
  });
});

// Function to open browser automatically
function openBrowser() {
  const url = `http://localhost:${PORT}`;
  
  console.log(`🔄 Attempting to open browser automatically...`);
  
  switch (process.platform) {
    case 'win32': // Windows
      exec(`start ${url}`, (error) => {
        if (error) {
          console.log('❌ Could not auto-open browser on Windows');
          manualInstructions();
        } else {
          console.log('✅ Browser opened automatically!');
        }
      });
      break;
      
    case 'darwin': // macOS
      exec(`open ${url}`, (error) => {
        if (error) {
          console.log('❌ Could not auto-open browser on macOS');
          manualInstructions();
        } else {
          console.log('✅ Browser opened automatically!');
        }
      });
      break;
      
    case 'linux': // Linux
      exec(`xdg-open ${url}`, (error) => {
        if (error) {
          console.log('❌ Could not auto-open browser on Linux');
          manualInstructions();
        } else {
          console.log('✅ Browser opened automatically!');
        }
      });
      break;
      
    default:
      console.log('❌ Unsupported platform for auto-opening browser');
      manualInstructions();
      break;
  }
}

function manualInstructions() {
  console.log(`📝 Please manually open your browser and go to: http://localhost:${PORT}`);
  console.log(`💡 Press Ctrl + Click on this link: http://localhost:${PORT}`);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💬 Chat application backend is ready!`);
  console.log('');
  
  // Auto-open browser after a short delay
  setTimeout(() => {
    openBrowser();
  }, 2000);
});