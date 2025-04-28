const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotnv = require('dotenv');
dotnv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});