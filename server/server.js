const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import modular game engines
const ticTacToeEngine = require('./games/tictactoe');
const connect4Engine = require('./games/connect4');
const rpsEngine = require('./games/rps');

const gameEngines = {
  tic_tac_toe: ticTacToeEngine,
  connect4: connect4Engine,
  rps: rpsEngine
};

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.static(path.join(__dirname, '../client')));

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Rooms database
const rooms = {};

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Event: joinRoom
  socket.on('joinRoom', ({ roomId, username }) => {
    let targetRoomId = roomId ? roomId.trim().toUpperCase() : null;
    let isCreating = false;

    if (!targetRoomId) {
      targetRoomId = generateRoomId();
      while (rooms[targetRoomId]) {
        targetRoomId = generateRoomId();
      }
      isCreating = true;
    }

    if (!isCreating && !rooms[targetRoomId]) {
      return socket.emit('errorMessage', 'Room not found. Please check the Room ID.');
    }

    const room = rooms[targetRoomId] || {
      roomId: targetRoomId,
      hostId: socket.id,
      gameType: null,
      gameEngine: null,
      players: [],
      state: {},
      turn: null,
      status: 'waiting',
      scores: {}
    };

    if (room.players.length >= 2) {
      return socket.emit('errorMessage', 'Room is full! Maximum 2 players allowed.');
    }

    const player = {
      id: socket.id,
      name: username || (room.players.length === 0 ? 'Player 1' : 'Player 2'),
      symbol: null
    };

    room.players.push(player);
    rooms[targetRoomId] = room;

    socket.join(targetRoomId);

    console.log(`👤 ${player.name} joined room ${targetRoomId}`);

    // Notify joining player
    socket.emit('roomJoined', {
      roomId: targetRoomId,
      isHost: socket.id === room.hostId,
      players: room.players,
      status: room.status,
      gameType: room.gameType,
      state: room.state,
      turn: room.turn,
      scores: room.scores
    });

    // Notify room of player join
    io.to(targetRoomId).emit('chatMessage', {
      username: 'System',
      message: `${player.name} joined the room.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });

    // When 2 players present in room:
    if (room.players.length === 2) {
      if (!room.gameType) {
        room.status = 'selecting';
        io.to(targetRoomId).emit('roomReadyForGameSelection', {
          roomId: targetRoomId,
          hostId: room.hostId,
          hostName: room.players.find(p => p.id === room.hostId).name,
          players: room.players
        });
      }
    }
  });

  // Event: selectGame
  socket.on('selectGame', ({ roomId, gameType }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('errorMessage', 'Room not found.');

    const engine = gameEngines[gameType];
    if (!engine) return socket.emit('errorMessage', 'Invalid game selected.');

    room.gameType = gameType;
    room.gameEngine = engine;
    room.state = engine.initGame();
    room.status = 'playing';

    // Assign symbols based on game engine
    const symbols = engine.playerSymbols;
    room.players.forEach((p, idx) => {
      p.symbol = symbols[idx] || `P${idx + 1}`;
    });

    // Initialize scores if not set
    if (!room.scores[symbols[0]]) {
      room.scores = { [symbols[0]]: 0, [symbols[1]]: 0, draws: 0 };
    }

    room.turn = symbols[0];

    console.log(`🎮 Game selected: ${engine.name} in room ${roomId}`);

    io.to(roomId).emit('gameStart', {
      gameType: room.gameType,
      gameName: engine.name,
      isSimultaneous: Boolean(engine.isSimultaneous),
      players: room.players,
      state: room.state,
      turn: room.turn,
      scores: room.scores
    });

    io.to(roomId).emit('chatMessage', {
      username: 'System',
      message: `Game selected: ${engine.name}! Let the game begin!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });
  });

  // Event: makeMove
  socket.on('makeMove', ({ roomId, moveData }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing' || !room.gameEngine) {
      return socket.emit('errorMessage', 'Game is not active.');
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return socket.emit('errorMessage', 'Player not found in room.');

    // Turn validation for non-simultaneous games
    if (!room.gameEngine.isSimultaneous && room.turn !== player.symbol) {
      return socket.emit('errorMessage', "It's not your turn!");
    }

    // Process move through modular game engine
    const result = room.gameEngine.processMove(room.state, moveData, player.symbol, socket.id);

    if (!result.valid) {
      return socket.emit('errorMessage', result.message || 'Invalid move.');
    }

    // Broadcast state update
    io.to(roomId).emit('stateUpdate', {
      state: result.state,
      lastPlayerSymbol: player.symbol,
      lastMoveData: moveData,
      waitingForSecretMove: Boolean(result.waitingForSecretMove)
    });

    if (result.gameOver) {
      room.status = 'ended';

      if (result.winner) {
        room.scores[result.winner] = (room.scores[result.winner] || 0) + 1;
        const winnerPlayer = room.players.find(p => p.symbol === result.winner);

        io.to(roomId).emit('gameOver', {
          winner: result.winner,
          winnerName: winnerPlayer ? winnerPlayer.name : result.winner,
          winningCombination: result.winningCombination || result.winningCells || null,
          revealedChoices: result.revealedChoices || null,
          scores: room.scores
        });
      } else if (result.draw) {
        room.scores.draws = (room.scores.draws || 0) + 1;

        io.to(roomId).emit('gameOver', {
          draw: true,
          revealedChoices: result.revealedChoices || null,
          scores: room.scores
        });
      }
    } else if (!room.gameEngine.isSimultaneous) {
      // Toggle turn
      const symbols = room.gameEngine.playerSymbols;
      room.turn = room.turn === symbols[0] ? symbols[1] : symbols[0];
      const nextPlayer = room.players.find(p => p.symbol === room.turn);

      io.to(roomId).emit('turnUpdate', {
        turn: room.turn,
        nextPlayerName: nextPlayer ? nextPlayer.name : room.turn
      });
    }
  });

  // Event: restartGame
  socket.on('restartGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.gameEngine) return socket.emit('errorMessage', 'Room not found.');

    room.state = room.gameEngine.initGame();
    room.status = 'playing';

    // Reset turn to first player
    const symbols = room.gameEngine.playerSymbols;
    room.turn = symbols[0];

    io.to(roomId).emit('gameStart', {
      gameType: room.gameType,
      gameName: room.gameEngine.name,
      isSimultaneous: Boolean(room.gameEngine.isSimultaneous),
      players: room.players,
      state: room.state,
      turn: room.turn,
      scores: room.scores
    });

    io.to(roomId).emit('chatMessage', {
      username: 'System',
      message: 'Game restarted!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });
  });

  // Event: changeGame (Return to Selector)
  socket.on('changeGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.status = 'selecting';
    room.gameType = null;
    room.gameEngine = null;

    io.to(roomId).emit('roomReadyForGameSelection', {
      roomId,
      hostId: room.hostId,
      hostName: room.players.find(p => p.id === room.hostId)?.name || 'Host',
      players: room.players
    });
  });

  // Event: sendMessage
  socket.on('sendMessage', ({ roomId, message }) => {
    const room = rooms[roomId];
    if (!room || !message || message.trim() === '') return;

    const player = room.players.find(p => p.id === socket.id);
    io.to(roomId).emit('chatMessage', {
      username: player ? player.name : 'Anonymous',
      symbol: player ? player.symbol : null,
      message: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Helper: Handle Player Exit
  function handlePlayerExit(socket, targetRoomId = null) {
    for (const roomId in rooms) {
      if (targetRoomId && roomId !== targetRoomId) continue;

      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        socket.leave(roomId);

        // Notify remaining player
        io.to(roomId).emit('playerDisconnected', {
          message: `${player.name} left the room.`
        });

        io.to(roomId).emit('chatMessage', {
          username: 'System',
          message: `${player.name} left the room.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: true
        });

        room.status = 'waiting';

        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`🧹 Room ${roomId} deleted (empty)`);
        } else {
          // Reassign host if host left
          room.hostId = room.players[0].id;
        }
        break;
      }
    }
  }

  socket.on('leaveRoom', ({ roomId }) => handlePlayerExit(socket, roomId));
  socket.on('disconnect', () => handlePlayerExit(socket));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Game Hub Server running on http://localhost:${PORT}`));
