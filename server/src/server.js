const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const axios = require('axios');
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
  go: '1.19.2',
  rust: '1.68.2',
  ruby: '3.2.1',
  php: '8.2.3'
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

// Socket.io setup for real-time collaboration
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });
  
  socket.on('code-change', ({ sessionId, code, language }) => {
    socket.to(sessionId).emit('code-update', { code, language });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});