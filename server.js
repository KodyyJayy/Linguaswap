const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const availableUsers = new Map();
const queue = [];

// Serve static files (including index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Define route handler for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startChat(socket1, socket2) {
    const room = `${socket1.id}-${socket2.id}`;
    socket1.join(room);
    socket2.join(room);

    socket1.room = room;
    socket2.room = room;

    const nativeLanguage1 = availableUsers.get(socket1.id).nativeLanguage;
    const learnLanguage1 = availableUsers.get(socket1.id).learnLanguage;
    const nativeLanguage2 = availableUsers.get(socket2.id).nativeLanguage;
    const learnLanguage2 = availableUsers.get(socket2.id).learnLanguage;

    const message1 = `You are now in a chat room with someone who speaks <strong>${nativeLanguage2}</strong> and wants to learn <strong>${learnLanguage2}</strong>`;
    const message2 = `You are now in a chat room with someone who speaks <strong>${nativeLanguage1}</strong> and wants to learn <strong>${learnLanguage1}</strong>`;

    socket1.emit('message', { senderId: 'server', message: message1 });
    socket2.emit('message', { senderId: 'server', message: message2 });
}

function matchUsers(socket1, socket2) {
    const nativeLanguage1 = availableUsers.get(socket1.id).nativeLanguage;
    const learnLanguage1 = availableUsers.get(socket1.id).learnLanguage;
    const nativeLanguage2 = availableUsers.get(socket2.id).nativeLanguage;
    const learnLanguage2 = availableUsers.get(socket2.id).learnLanguage;

    if (nativeLanguage1 === learnLanguage2 && learnLanguage1 === nativeLanguage2) {
        startChat(socket1, socket2);
        io.to(socket1.id).emit('match found');
        io.to(socket2.id).emit('match found');
    } else {
        enterQueue(socket1);
        enterQueue(socket2);
    }
}

function enterQueue(socket) {
    const nativeLanguage = availableUsers.get(socket.id).nativeLanguage;
    const learnLanguage = availableUsers.get(socket.id).learnLanguage;
    socket.emit('enter queue', { nativeLanguage, learnLanguage });
    queue.push(socket);
}

function leaveQueue(socket) {
    const index = queue.indexOf(socket);
    if (index !== -1) {
        queue.splice(index, 1);
    }
}

// HTML Encode a string to prevent xss
function htmlEncode(str){
    return String(str).replace(/[^\w. ]/gi, function(c){
        return '&#'+c.charCodeAt(0)+';';
    });
}

io.on('connection', (socket) => {
    console.log(`User id ${socket.id} connected`);

    socket.on('join queue', ({ nativeLanguage, learnLanguage }) => {
        availableUsers.set(socket.id, { nativeLanguage, learnLanguage });
        enterQueue(socket);

        if (queue.length >= 2) {
            const user1 = queue.shift();
            const user2 = queue.shift();
            matchUsers(user1, user2);
        }
    });

    socket.on('message', (msg) => {
        const senderId = socket.id;
        io.to(socket.room).emit('message', { senderId, message: htmlEncode(msg) });
    });    
    

    socket.on('disconnect', () => {
        console.log(`User id ${socket.id} disconnected`);
        availableUsers.delete(socket.id);

        const index = queue.indexOf(socket);
        if (index !== -1) {
            leaveQueue(socket);
            if (queue.length > 0) {
                enterQueue(queue.shift());
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
