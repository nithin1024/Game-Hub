/**
 * Connect 4 Game Logic Module (Backend)
 * Board: 6 Rows (0..5), 7 Columns (0..6)
 */

const ROWS = 6;
const COLS = 7;

function initGame() {
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    board.push(Array(COLS).fill(''));
  }
  return {
    board,
    lastMove: null
  };
}

function processMove(state, moveData, playerSymbol) {
  const { colIndex } = moveData;

  if (colIndex < 0 || colIndex >= COLS) {
    return { valid: false, message: 'Invalid column.' };
  }

  // Find lowest available row in column (gravity drop)
  let targetRow = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r][colIndex] === '') {
      targetRow = r;
      break;
    }
  }

  if (targetRow === -1) {
    return { valid: false, message: 'Column is full!' };
  }

  // Place piece
  state.board[targetRow][colIndex] = playerSymbol;
  state.lastMove = { row: targetRow, col: colIndex };

  // Check win or draw
  const winResult = checkWinner(state.board, targetRow, colIndex, playerSymbol);
  const isDraw = !winResult && isBoardFull(state.board);

  return {
    valid: true,
    state,
    gameOver: Boolean(winResult || isDraw),
    winner: winResult ? playerSymbol : null,
    draw: isDraw,
    winningCells: winResult ? winResult.cells : null
  };
}

function checkWinner(board, lastRow, lastCol, symbol) {
  // Directions: [rowDelta, colDelta]
  const directions = [
    [ [0, 1], [0, -1] ],   // Horizontal
    [ [1, 0], [-1, 0] ],   // Vertical
    [ [1, 1], [-1, -1] ],  // Diagonal Down-Right (\)
    [ [1, -1], [-1, 1] ]   // Diagonal Up-Right (/)
  ];

  for (const [dir1, dir2] of directions) {
    const matchingCells = [[lastRow, lastCol]];

    // Scan direction 1
    let r = lastRow + dir1[0];
    let c = lastCol + dir1[1];
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === symbol) {
      matchingCells.push([r, c]);
      r += dir1[0];
      c += dir1[1];
    }

    // Scan direction 2
    r = lastRow + dir2[0];
    c = lastCol + dir2[1];
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === symbol) {
      matchingCells.push([r, c]);
      r += dir2[0];
      c += dir2[1];
    }

    if (matchingCells.length >= 4) {
      return { cells: matchingCells };
    }
  }

  return null;
}

function isBoardFull(board) {
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === '') return false;
  }
  return true;
}

module.exports = {
  id: 'connect4',
  name: 'Connect 4',
  playerSymbols: ['Red', 'Yellow'],
  initGame,
  processMove
};
