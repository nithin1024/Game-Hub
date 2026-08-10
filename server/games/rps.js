/**
 * Rock Paper Scissors Game Logic Module (Backend)
 * Simultaneous secret move game
 */

function initGame() {
  return {
    moves: {},         // { socketId: 'rock'|'paper'|'scissors' }
    playerSymbols: {}, // { socketId: 'P1'|'P2' }
    revealed: false
  };
}

function processMove(state, moveData, playerSymbol, socketId) {
  const { choice } = moveData;
  const validChoices = ['rock', 'paper', 'scissors'];

  if (!validChoices.includes(choice)) {
    return { valid: false, message: 'Invalid choice. Must be rock, paper, or scissors.' };
  }

  // Store player choice
  state.moves[socketId] = choice;
  state.playerSymbols[socketId] = playerSymbol;

  const totalMoves = Object.keys(state.moves).length;

  // If only 1 player has submitted move, keep choice secret
  if (totalMoves < 2) {
    return {
      valid: true,
      state: {
        submittedCount: totalMoves,
        playerChoice: choice,
        waitingForOpponent: true
      },
      gameOver: false,
      waitingForSecretMove: true
    };
  }

  // Both players have submitted! Evaluate winner
  const socketIds = Object.keys(state.moves);
  const p1SocketId = socketIds[0];
  const p2SocketId = socketIds[1];

  const move1 = state.moves[p1SocketId];
  const symbol1 = state.playerSymbols[p1SocketId];

  const move2 = state.moves[p2SocketId];
  const symbol2 = state.playerSymbols[p2SocketId];

  let winnerSymbol = null;
  let isDraw = false;

  if (move1 === move2) {
    isDraw = true;
  } else if (
    (move1 === 'rock' && move2 === 'scissors') ||
    (move1 === 'scissors' && move2 === 'paper') ||
    (move1 === 'paper' && move2 === 'rock')
  ) {
    winnerSymbol = symbol1;
  } else {
    winnerSymbol = symbol2;
  }

  state.revealed = true;

  return {
    valid: true,
    state: {
      submittedCount: 2,
      revealedMoves: {
        [symbol1]: move1,
        [symbol2]: move2
      }
    },
    gameOver: true,
    winner: winnerSymbol,
    draw: isDraw,
    revealedChoices: {
      [symbol1]: move1,
      [symbol2]: move2
    }
  };
}

module.exports = {
  id: 'rps',
  name: 'Rock Paper Scissors',
  playerSymbols: ['P1', 'P2'],
  isSimultaneous: true,
  initGame,
  processMove
};
