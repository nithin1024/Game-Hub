/**
 * ==========================================================================
 * MULTIPLAYER GAME HUB - CORE CLIENT CONTROLLER
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const backendUrl = window.location.origin.includes('http') && !window.location.origin.includes('5500') && !window.location.origin.includes('5501')
    ? window.location.origin
    : 'http://localhost:3000';

  console.log(`🔌 Game Hub connecting to backend: ${backendUrl}`);
  const socket = io(backendUrl, { transports: ['websocket', 'polling'] });

  // Core State
  let currentRoomId = null;
  let mySymbol = null;
  let myUsername = '';
  let isHost = false;
  let currentGameType = null;
  let gameState = {};
  let currentTurn = null;
  let isGameActive = false;

  // DOM Elements
  const lobbyScreen = document.getElementById('lobby-screen');
  const waitingModal = document.getElementById('waiting-modal');
  const selectionScreen = document.getElementById('selection-screen');
  const gameScreen = document.getElementById('game-screen');

  const usernameInput = document.getElementById('username-input');
  const roomIdInput = document.getElementById('room-id-input');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinRoom = document.getElementById('btn-join-room');
  const btnCancelWaiting = document.getElementById('btn-cancel-waiting');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnCopyGameCode = document.getElementById('btn-copy-game-code');
  const btnLeaveRoom = document.getElementById('btn-leave-room');
  const btnChangeGame = document.getElementById('btn-change-game');
  const btnRestart = document.getElementById('btn-restart');

  const waitingRoomId = document.getElementById('waiting-room-id');
  const displayRoomId = document.getElementById('display-room-id');
  const currentGameTitle = document.getElementById('current-game-title');
  const turnBanner = document.getElementById('turn-banner');
  const turnText = document.getElementById('turn-text');

  const player1Name = document.getElementById('player-1-name');
  const player1Badge = document.getElementById('player-1-badge');
  const player1Symbol = document.getElementById('player-1-symbol');
  const player1Score = document.getElementById('player-1-score');
  const player1Card = document.getElementById('player-1-card');

  const player2Name = document.getElementById('player-2-name');
  const player2Badge = document.getElementById('player-2-badge');
  const player2Symbol = document.getElementById('player-2-symbol');
  const player2Score = document.getElementById('player-2-score');
  const player2Card = document.getElementById('player-2-card');

  const drawScore = document.getElementById('draw-score');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const toastContainer = document.getElementById('toast-container');

  // Web Audio Synthesizer
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playTone(freq, type = 'sine', duration = 0.15) {
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playMoveSound() { playTone(587.33, 'sine', 0.12); }
  function playWinSound() {
    playTone(523.25, 'triangle', 0.15);
    setTimeout(() => playTone(659.25, 'triangle', 0.15), 120);
    setTimeout(() => playTone(783.99, 'triangle', 0.3), 240);
  }
  function playDrawSound() { playTone(300, 'sawtooth', 0.25); }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-check-circle'}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Navigation & Actions
  btnCreateRoom.addEventListener('click', () => {
    myUsername = usernameInput.value.trim() || 'Player 1';
    socket.emit('joinRoom', { roomId: null, username: myUsername });
  });

  btnJoinRoom.addEventListener('click', () => {
    const code = roomIdInput.value.trim().toUpperCase();
    if (!code) return showToast('Please enter a Room Code to join.', 'error');
    myUsername = usernameInput.value.trim() || 'Player 2';
    socket.emit('joinRoom', { roomId: code, username: myUsername });
  });

  roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnJoinRoom.click();
  });

  btnCopyCode.addEventListener('click', () => copyToClipboard(waitingRoomId.textContent));
  btnCopyGameCode.addEventListener('click', () => copyToClipboard(displayRoomId.textContent));

  function copyToClipboard(text) {
    if (!text || text === '------') return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Room ID copied: ${text}`, 'success');
    });
  }

  btnCancelWaiting.addEventListener('click', leaveRoom);
  btnLeaveRoom.addEventListener('click', leaveRoom);

  function leaveRoom() {
    if (currentRoomId) socket.emit('leaveRoom', { roomId: currentRoomId });
    resetToLobby();
  }

  function resetToLobby() {
    currentRoomId = null;
    mySymbol = null;
    isHost = false;
    currentGameType = null;
    gameState = {};
    currentTurn = null;
    isGameActive = false;

    waitingModal.classList.add('hidden');
    selectionScreen.classList.add('hidden');
    selectionScreen.classList.remove('active');
    gameScreen.classList.add('hidden');
    gameScreen.classList.remove('active');

    lobbyScreen.classList.remove('hidden');
    lobbyScreen.classList.add('active');

    waitingRoomId.textContent = '------';
    displayRoomId.textContent = '------';
    chatMessages.innerHTML = '';
  }

  // Game Selection Cards Handler
  document.querySelectorAll('.btn-select-game').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const gameType = e.currentTarget.getAttribute('data-game');
      if (currentRoomId && isHost) {
        socket.emit('selectGame', { roomId: currentRoomId, gameType });
      } else {
        showToast('Only the room host can select the game.', 'error');
      }
    });
  });

  btnChangeGame.addEventListener('click', () => {
    if (currentRoomId) socket.emit('changeGame', { roomId: currentRoomId });
  });

  btnRestart.addEventListener('click', () => {
    if (currentRoomId) socket.emit('restartGame', { roomId: currentRoomId });
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg && currentRoomId) {
      socket.emit('sendMessage', { roomId: currentRoomId, message: msg });
      chatInput.value = '';
    }
  });

  // Socket Events
  socket.on('roomJoined', (data) => {
    currentRoomId = data.roomId;
    isHost = data.isHost;

    waitingRoomId.textContent = data.roomId;
    displayRoomId.textContent = data.roomId;

    if (data.players.length === 1) {
      lobbyScreen.classList.remove('active');
      lobbyScreen.classList.add('hidden');
      waitingModal.classList.remove('hidden');
      showToast(`Room Created! Code: ${data.roomId}`, 'success');
    }
  });

  socket.on('roomReadyForGameSelection', (data) => {
    waitingModal.classList.add('hidden');
    lobbyScreen.classList.remove('active');
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameScreen.classList.remove('active');

    selectionScreen.classList.remove('hidden');
    selectionScreen.classList.add('active');

    const subtitle = document.getElementById('selection-subtitle');
    if (socket.id === data.hostId) {
      isHost = true;
      subtitle.textContent = 'You are the host! Pick a game to start playing:';
    } else {
      isHost = false;
      subtitle.textContent = `Waiting for host (${data.hostName}) to select a game...`;
    }
  });

  socket.on('gameStart', (data) => {
    waitingModal.classList.add('hidden');
    lobbyScreen.classList.remove('active');
    lobbyScreen.classList.add('hidden');
    selectionScreen.classList.remove('active');
    selectionScreen.classList.add('hidden');

    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('active');

    currentGameType = data.gameType;
    currentGameTitle.textContent = data.gameName;
    gameState = data.state;
    currentTurn = data.turn;
    isGameActive = true;

    // Find my symbol
    const me = data.players.find(p => p.id === socket.id);
    if (me) mySymbol = me.symbol;

    updateScoreboard(data.players, data.scores);
    updateTurnDisplay();
    renderActiveGame();

    showToast(`Started ${data.gameName}! Good luck!`, 'success');
  });

  socket.on('stateUpdate', (data) => {
    gameState = data.state;
    renderActiveGame(null, data.state.revealedMoves || null);
    playMoveSound();
  });

  socket.on('turnUpdate', (data) => {
    currentTurn = data.turn;
    updateTurnDisplay(data.nextPlayerName);
  });

  socket.on('gameOver', (data) => {
    isGameActive = false;
    updateScoreboard(null, data.scores);

    if (data.winner) {
      if (data.winner === mySymbol) {
        turnText.textContent = '🎉 You Won!';
        turnBanner.className = 'turn-banner win-banner';
        playWinSound();
        showToast('Victory!', 'success');
      } else {
        turnText.textContent = `💀 ${data.winnerName} Won!`;
        turnBanner.className = 'turn-banner opp-turn';
        playDrawSound();
        showToast(`${data.winnerName} won this game.`, 'info');
      }
    } else if (data.draw) {
      turnText.textContent = '🤝 Game Draw!';
      turnBanner.className = 'turn-banner';
      playDrawSound();
      showToast("It's a draw!", 'info');
    }

    renderActiveGame(data.winningCombination, data.revealedChoices);
  });

  socket.on('chatMessage', (data) => {
    appendChatMessage(data);
  });

  socket.on('playerDisconnected', (data) => {
    isGameActive = false;
    showToast(data.message, 'error');
    turnText.textContent = '⚠️ Player Disconnected';
    turnBanner.className = 'turn-banner opp-turn';
  });

  socket.on('errorMessage', (msg) => showToast(msg, 'error'));

  // Game Engine Dispatcher
  function renderActiveGame(winningCombo = null, revealedChoices = null) {
    const container = document.getElementById('game-board-container');
    const isMyTurn = (currentTurn === mySymbol);

    if (currentGameType === 'tic_tac_toe') {
      window.TicTacToeClient.render(container, gameState, handleMove, isMyTurn && isGameActive, winningCombo);
    } else if (currentGameType === 'connect4') {
      window.Connect4Client.render(container, gameState, handleMove, isMyTurn && isGameActive, winningCombo);
    } else if (currentGameType === 'rps') {
      window.RPSClient.render(container, gameState, handleMove, mySymbol, revealedChoices);
    }
  }

  function handleMove(moveData) {
    if (!currentRoomId) return;
    socket.emit('makeMove', { roomId: currentRoomId, moveData });
  }

  function updateScoreboard(players, scores) {
    if (players && players.length >= 1) {
      player1Name.textContent = players[0].name;
      player1Symbol.textContent = players[0].symbol || 'P1';
      player1Badge.textContent = players[0].id === socket.id ? '(YOU)' : '(OPPONENT)';
    }

    if (players && players.length >= 2) {
      player2Name.textContent = players[1].name;
      player2Symbol.textContent = players[1].symbol || 'P2';
      player2Badge.textContent = players[1].id === socket.id ? '(YOU)' : '(OPPONENT)';
    }

    if (scores) {
      const keys = Object.keys(scores).filter(k => k !== 'draws');
      if (keys[0]) player1Score.textContent = scores[keys[0]] || 0;
      if (keys[1]) player2Score.textContent = scores[keys[1]] || 0;
      drawScore.textContent = scores.draws || 0;
    }
  }

  function updateTurnDisplay(nextPlayerName) {
    if (!isGameActive) return;

    if (currentGameType === 'rps') {
      turnText.textContent = '⚡ Make Your Secret Choice!';
      turnBanner.className = 'turn-banner my-turn';
      return;
    }

    if (currentTurn === mySymbol) {
      turnText.textContent = `⚡ Your Turn (${mySymbol})`;
      turnBanner.className = 'turn-banner my-turn';
    } else {
      const name = nextPlayerName || 'Opponent';
      turnText.textContent = `⏳ ${name}'s Turn (${currentTurn})`;
      turnBanner.className = 'turn-banner opp-turn';
    }
  }

  function appendChatMessage(data) {
    const bubble = document.createElement('div');
    if (data.isSystem) {
      bubble.className = 'msg-bubble system';
      bubble.innerHTML = `<div class="msg-text">${data.message}</div>`;
    } else {
      const isSelf = data.username === myUsername;
      bubble.className = `msg-bubble ${isSelf ? 'self' : 'opponent'}`;
      bubble.innerHTML = `
        <div class="msg-info">
          <span class="msg-author">${data.username} ${data.symbol ? `(${data.symbol})` : ''}</span>
          <span class="msg-time">${data.time}</span>
        </div>
        <div class="msg-text">${escapeHTML(data.message)}</div>
      `;
    }
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
  }
});
