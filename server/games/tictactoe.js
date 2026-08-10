/**
 * Tic-Tac-Toe Game Logic Module (Backend)
 */

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

function initGame() {
  return {
    board: Array(9).fill(''),
    winningCombination: null
  };
}

function processMove(state, moveData, playerSymbol) {
  const { index } = moveData;

  // Validation
  if (index < 0 || index > 8 || state.board[index] !== '') {
    return { valid: false, message: 'Cell unavailable or invalid index.' };
  }

  // Update board
  state.board[index] = playerSymbol;

  // Check win or draw
  let winnerSymbol = null;
  let winningCombination = null;

  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
      winnerSymbol = state.board[a];
      winningCombination = combo;
      break;
    }
  }

  const isDraw = !winnerSymbol && state.board.every(cell => cell !== '');
  state.winningCombination = winningCombination;

  return {
    valid: true,
    state,
    gameOver: Boolean(winnerSymbol || isDraw),
    winner: winnerSymbol,
    draw: isDraw,
    winningCombination
  };
}

module.exports = {
  id: 'tic_tac_toe',
  name: 'Tic-Tac-Toe',
  playerSymbols: ['X', 'O'],
  initGame,
  processMove
};
