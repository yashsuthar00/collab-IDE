const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Language configuration for Piston API
const languageVersions = {
  javascript: '18.15.0',
  python: '3.10.0',
  java: '15.0.2',
  cpp: '10.2.0',
  c: '10.2.0',
  typescript: '5.0.3',
  go: '1.16.2',
  rust: '1.68.2',
  ruby: '3.0.1',
  php: '8.2.3'
};

// In-memory storage for rooms (in production, use a database)
const rooms = new Map();
const roomVersions = new Map(); // Track document versions for each room

// Access levels for collaboration
const ACCESS_LEVELS = {
  OWNER: 'owner',
  EDITOR: 'editor',
  RUNNER: 'runner',
  VIEWER: 'viewer',
};

app.use(cors());
app.use(express.json());

// API endpoint for code execution
app.post('/api/sessions/:sessionId/execute', async (req, res) => {
  const { code, language, input } = req.body;
  
  try {
    // Use language-specific version
    const version = languageVersions[language] || '0';
    
    // Use Piston API for code execution
    const response = await axios.post(process.env.PISTON_API_URL + '/execute', {
      language,
      version,
      files: [{
        name: getMainFileName(language),
        content: code
      }],
      stdin: input,
      args: []
    });

    return res.json({
      stdout: response.data.run.stdout,
      stderr: response.data.run.stderr,
      status: response.data.run.code,
      time: response.data.run.time
    });
  } catch (error) {
    console.error('Error executing code:', error.message);
    console.error('Request details:', { language, input: input.length > 100 ? input.slice(0, 100) + '...' : input });
    
    if (error.response) {
      console.error('API Error response:', error.response.data);
      return res.status(error.response.status).json({ 
        message: 'Execution error',
        details: error.response.data
      });
    }
    
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to get appropriate main file name based on language
function getMainFileName(language) {
  const fileExtensions = {
    javascript: 'main.js',
    python: 'main.py',
    java: 'Main.java',
    cpp: 'main.cpp',
    c: 'main.c',
    typescript: 'main.ts',
    go: 'main.go',
    rust: 'main.rs',
    ruby: 'main.rb',
    php: 'main.php'
  };
  
  return fileExtensions[language] || 'main';
}

// Get available runtimes from Piston API
app.get('/api/runtimes', async (req, res) => {
  try {
    const response = await axios.get(process.env.PISTON_API_URL + '/runtimes');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching runtimes:', error);
    res.status(500).json({ message: 'Failed to fetch available runtimes' });
  }
});

// Room management endpoints
app.post('/api/rooms', (req, res) => {
  try {
    const { id, createdAt, language, code, owner, users } = req.body;
    
    // Check if room already exists
    if (rooms.has(id)) {
      return res.status(409).json({ message: 'Room already exists' });
    }
    
    // Store room data
    rooms.set(id, {
      id,
      createdAt,
      language,
      code,
      owner,
      users: users || []
    });
    
    console.log(`Room created via API: ${id}`);
    console.log(`Active rooms: ${Array.from(rooms.keys()).join(', ')}`);
    
    res.status(201).json({ success: true, roomId: id });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Failed to create room' });
  }
});

// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  console.log(`Checking for room: ${roomId}`);
  console.log(`Available rooms: ${Array.from(rooms.keys()).join(', ')}`);
  
  if (!rooms.has(roomId)) {
    return res.status(404).json({ 
      roomExists: false,
      message: 'Room not found' 
    });
  }
  
  const room = rooms.get(roomId);
  
  // Don't send sensitive information
  const safeRoomData = {
    roomExists: true,
    id: room.id,
    createdAt: room.createdAt,
    language: room.language,
    owner: room.owner,
    userCount: room.users.length
  };
  
  res.json(safeRoomData);
});

// Socket.io setup for real-time collaboration
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  const userName = socket.handshake.query.userName || 'Anonymous';
  
  // Create a new room
  socket.on('create-room', ({ userName, roomName }) => {
    try {
      // Generate room ID
      const roomId = uuidv4().slice(0, 8);
      
      const room = {
        id: roomId,
        name: roomName || `Room ${roomId}`,
        createdAt: new Date().toISOString(),
        users: [{
          id: socket.id,
          name: userName,
          accessLevel: ACCESS_LEVELS.OWNER,
          isActive: true,
          joinedAt: new Date().toISOString()
        }],
        owner: socket.id,
        code: '' // Initialize with empty code
      };
      
      // Store room
      rooms.set(roomId, room);
      
      // Join socket room
      socket.join(roomId);
      
      // Notify client
      socket.emit('room-joined', {
        roomId,
        roomName: room.name,
        userId: socket.id,
        userName,
        users: room.users,
        accessLevel: ACCESS_LEVELS.OWNER
      });
      
      console.log(`Room created: ${roomId} by ${userName} (${socket.id})`);
      console.log(`Active rooms: ${Array.from(rooms.keys()).join(', ')}`);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('room-error', { message: 'Failed to create room' });
    }
  });
  
  // Join an existing room
  socket.on('join-room', ({ roomId, userName, accessLevel = ACCESS_LEVELS.VIEWER }) => {
    try {
      console.log(`User ${userName} trying to join room ${roomId}`);
      console.log(`Available rooms: ${Array.from(rooms.keys()).join(', ')}`);
      
      // Check if room exists
      if (!rooms.has(roomId)) {
        console.log(`Room ${roomId} not found`);
        return socket.emit('room-error', { message: 'Room not found' });
      }
      
      const room = rooms.get(roomId);
      console.log(`Found room ${roomId} with ${room.users.length} users`);
      
      // Check if user is already in room
      const existingUser = room.users.find(user => user.name === userName);
      
      if (existingUser) {
        // Update existing user
        existingUser.id = socket.id;
        existingUser.isActive = true;
        console.log(`User ${userName} reconnected to room ${roomId}`);
      } else {
        // Add new user
        room.users.push({
          id: socket.id,
          name: userName,
          accessLevel: accessLevel, // New users get viewer access by default
          isActive: true,
          joinedAt: new Date().toISOString()
        });
        console.log(`Added new user ${userName} to room ${roomId}`);
      }
      
      // Join socket room
      socket.join(roomId);
      
      // Get user with updated data
      const user = room.users.find(u => u.id === socket.id);
      
      // Notify client
      socket.emit('room-joined', {
        roomId,
        roomName: room.name,
        userId: socket.id,
        userName,
        users: room.users,
        accessLevel: user.accessLevel,
        code: room.code // Send current room code
      });
      
      // Notify other users in room
      socket.to(roomId).emit('users-updated', room.users);
      
      console.log(`User ${userName} (${socket.id}) joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('room-error', { message: 'Failed to join room' });
    }
  });
  
  // Rejoin a room after reconnection
  socket.on('rejoin-room', ({ roomId, userName }) => {
    try {
      // Check if room exists
      if (!rooms.has(roomId)) {
        return socket.emit('room-error', { message: 'Room not found' });
      }
      
      const room = rooms.get(roomId);
      
      // Find and update user
      const user = room.users.find(u => u.name === userName);
      
      if (!user) {
        return socket.emit('room-error', { message: 'User not found in room' });
      }
      
      // Update user data
      user.id = socket.id;
      user.isActive = true;
      
      // Join socket room
      socket.join(roomId);
      
      // Notify client
      socket.emit('room-joined', {
        roomId,
        roomName: room.name,
        userId: socket.id,
        userName,
        users: room.users,
        accessLevel: user.accessLevel
      });
      
      // Notify other users in room
      socket.to(roomId).emit('users-updated', room.users);
      
      console.log(`User ${userName} (${socket.id}) rejoined room ${roomId}`);
    } catch (error) {
      console.error('Error rejoining room:', error);
      socket.emit('room-error', { message: 'Failed to rejoin room' });
    }
  });
  
  // Handle code changes with OT
  socket.on('ot-operations', ({ roomId, userId, operations, version, clientId }) => {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Initialize room version tracking if needed
    if (!roomVersions.has(roomId)) {
      roomVersions.set(roomId, {
        version: 0,
        pendingOps: [],
        baseContent: ''
      });
    }
    
    const versionData = roomVersions.get(roomId);
    
    // Handle version conflicts
    if (version !== versionData.version) {
      // Client is out of sync - send current state to that client only
      socket.emit('ot-sync', {
        roomId,
        content: room.code,
        version: versionData.version
      });
      return;
    }
    
    // Store the base content if not already set
    if (!versionData.baseContent) {
      versionData.baseContent = room.code || '';
    }
    
    // Apply operations to room code
    try {
      let newCode = room.code;
      
      for (const op of operations) {
        // Apply transforms here if needed for pending ops
        // For simplicity, we're just applying sequentially
        
        // Apply the operation
        if (op.type === 'insert') {
          newCode = newCode.substring(0, op.position) + op.text + newCode.substring(op.position);
        } else if (op.type === 'delete') {
          newCode = newCode.substring(0, op.position) + newCode.substring(op.position + op.length);
        }
      }
      
      // Update room code
      room.code = newCode;
      
      // Increment version
      versionData.version++;
      roomVersions.set(roomId, versionData);
      
      // Broadcast operations to all other clients
      socket.to(roomId).emit('ot-operations', {
        roomId,
        userId,
        operations,
        version: versionData.version,
        clientId
      });
      
      // Acknowledge receipt to sender with new version
      socket.emit('ot-ack', {
        roomId,
        version: versionData.version,
        clientId
      });
      
    } catch (error) {
      console.error('Error applying OT operations:', error);
      socket.emit('ot-error', { 
        roomId, 
        message: 'Error applying operations',
        clientId
      });
    }
  });
  
  // Provide full sync for new clients or when conflicts occur
  socket.on('ot-request-sync', ({ roomId }) => {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    const versionData = roomVersions.get(roomId) || { version: 0 };
    
    socket.emit('ot-sync', {
      roomId,
      content: room.code || '',
      version: versionData.version
    });
  });
  
  // Handle code changes (backward compatibility)
  socket.on('code-change', ({ roomId, userId, code }) => {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Store the latest code in the room
    room.code = code;
    
    // Update version for OT
    if (roomVersions.has(roomId)) {
      const versionData = roomVersions.get(roomId);
      versionData.version++;
      versionData.baseContent = code;
      roomVersions.set(roomId, versionData);
    }
    
    // Broadcast to all other users in the room
    socket.to(roomId).emit('code-update', {
      roomId,
      userId,
      code
    });
  });
  
  // Handle cursor position updates
  socket.on('cursor-position', ({ roomId, userId, position, userName }) => {
    if (!rooms.has(roomId)) return;
    
    // Ensure position has all required properties
    if (position && position.lineNumber !== undefined && position.column !== undefined) {
      console.log(`Broadcasting cursor position for ${userName} in room ${roomId}`);
      
      // Broadcast the cursor position to all other users in the room
      socket.to(roomId).emit('cursor-update', {
        roomId,
        userId,
        position,
        userName
      });
    }
  });

  // Handle selection updates
  socket.on('selection-change', ({ roomId, userId, selection, userName }) => {
    if (!rooms.has(roomId)) return;
    
    // Ensure selection has all required properties
    if (selection && selection.startLineNumber !== undefined) {
      console.log(`Broadcasting selection for ${userName} in room ${roomId}`);
      
      // Broadcast the selection to all other users in the room
      socket.to(roomId).emit('selection-update', {
        roomId,
        userId,
        selection,
        userName
      });
    }
  });
  
  // Handle changes in language
  socket.on('language-change', ({ roomId, userId, languageId }) => {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Check if user is owner
    const user = room.users.find(u => u.id === userId);
    if (!user || user.accessLevel !== ACCESS_LEVELS.OWNER) return;
    
    // Update room language
    room.language = languageId;
    
    // Broadcast to all other users in the room
    socket.to(roomId).emit('language-change', {
      roomId,
      userId,
      languageId
    });
  });
  
  // Handle output updates
  socket.on('output-update', ({ roomId, userId, output, input }) => {
    socket.to(roomId).emit('output-update', { roomId, userId, output, input });
  });
  
  // Handle access level updates
  socket.on('update-access', ({ roomId, userId, accessLevel, updatedBy }) => {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Check if updater is room owner
    const updater = room.users.find(u => u.id === updatedBy);
    if (!updater || updater.accessLevel !== ACCESS_LEVELS.OWNER) return;
    
    // Find user to update
    const userToUpdate = room.users.find(u => u.id === userId);
    if (!userToUpdate) return;
    
    // Cannot change owner's role
    if (userToUpdate.accessLevel === ACCESS_LEVELS.OWNER) return;
    
    console.log(`Updating access level for ${userId} from ${userToUpdate.accessLevel} to ${accessLevel}`);
    
    // Update user access level in the room data
    userToUpdate.accessLevel = accessLevel;
    
    // Broadcast update to ALL users in room, ensuring everyone gets the update
    io.to(roomId).emit('access-updated', {
      userId,
      accessLevel,
      roomId 
    });
    
    console.log(`User ${userId} access updated to ${accessLevel} in room ${roomId}`);
  });
  
  // Handle user removal
  socket.on('remove-user', ({ roomId, userId, removedBy }) => {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Check if remover is room owner
    const remover = room.users.find(u => u.id === removedBy);
    if (!remover || remover.accessLevel !== ACCESS_LEVELS.OWNER) return;
    
    // Find user to remove
    const userToRemove = room.users.find(u => u.id === userId);
    if (!userToRemove) return;
    
    // Cannot remove owner
    if (userToRemove.accessLevel === ACCESS_LEVELS.OWNER) return;
    
    // Remove user
    room.users = room.users.filter(u => u.id !== userId);
    
    // Notify user they've been removed
    io.to(userId).emit('user-removed', { userId, roomId });
    
    // Notify remaining users
    io.to(roomId).emit('users-updated', room.users);
    
    console.log(`User ${userId} removed from room ${roomId}`);
  });
  
  // Handle leave room
  socket.on('leave-room', ({ roomId, userId }) => {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Find user
    const userIndex = room.users.findIndex(u => u.id === socket.id);
    
    if (userIndex !== -1) {
      const user = room.users[userIndex];
      
      // If user is owner, delete the room
      if (user.accessLevel === ACCESS_LEVELS.OWNER) {
        // Notify all users that room is being closed
        io.to(roomId).emit('room-closed', { 
          roomId, 
          message: 'Room has been closed by the owner' 
        });
        
        // Delete room
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted as owner left`);
      } else {
        // Remove user from room
        room.users.splice(userIndex, 1);
        
        // Notify remaining users
        io.to(roomId).emit('users-updated', room.users);
        console.log(`User ${user.name} (${socket.id}) left room ${roomId}`);
      }
      
      // Leave socket room
      socket.leave(roomId);
    }
  });
  
  // Handle chat messages
  socket.on('chat-message', (message) => {
    const { roomId } = message;
    if (!rooms.has(roomId)) return;
    
    // Add timestamp if not provided
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    
    // Broadcast message to all users in room
    io.to(roomId).emit('chat-message', message);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Mark user as inactive in all rooms they were part of
    rooms.forEach((room, roomId) => {
      const userIndex = room.users.findIndex(u => u.id === socket.id);
      
      if (userIndex !== -1) {
        // If user is owner, keep them in the room but mark as inactive
        // Otherwise remove them after a timeout (could be reconnecting)
        if (room.users[userIndex].accessLevel === ACCESS_LEVELS.OWNER) {
          room.users[userIndex].isActive = false;
          io.to(roomId).emit('users-updated', room.users);
        } else {
          // Set a timeout to remove the user if they don't reconnect
          setTimeout(() => {
            // Check if room still exists
            if (rooms.has(roomId)) {
              const currentRoom = rooms.get(roomId);
              // Check if user is still in the room and inactive
              const user = currentRoom.users.find(u => u.id === socket.id);
              if (user && !user.isActive) {
                // Remove user
                currentRoom.users = currentRoom.users.filter(u => u.id !== socket.id);
                // Notify remaining users
                io.to(roomId).emit('users-updated', currentRoom.users);
                console.log(`User ${socket.id} removed from room ${roomId} after disconnect timeout`);
              }
            }
          }, 60000); // 1 minute timeout
        }
      }
    });
  });
});

app.get('/ping', (req, res) => {
  res.status(200).send('Pong');
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});