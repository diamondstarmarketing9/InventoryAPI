const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

let io;

const init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: '*', // Adjust as needed for production
            methods: ['GET', 'POST']
        }
    });

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new Error('Authentication error: Invalid token'));
            }
            socket.user = decoded; // Attach user info to socket
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.id} (${socket.user.username})`);

        // Join a specific store or warehouse room
        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`User ${socket.user.username} joined room: ${room}`);
        });

        // Leave a room
        socket.on('leave_room', (room) => {
            socket.leave(room);
            console.log(`User ${socket.user.username} left room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.username}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { init, getIO };
