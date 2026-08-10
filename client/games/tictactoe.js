/**
 * Tic-Tac-Toe Client Module
 */

window.TicTacToeClient = {
  render(container, state, onCellClick, isMyTurn, winningCombination = null) {
    container.innerHTML = '';
    
    const boardEl = document.createElement('div');
    boardEl.className = 'ttt-board glass-panel';

    const board = state.board || Array(9).fill('');

    board.forEach((symbol, index) => {
      const cell = document.createElement('button');
      cell.className = 'ttt-cell';
      cell.textContent = symbol;
      cell.setAttribute('data-symbol', symbol);

      if (winningCombination && winningCombination.includes(index)) {
        cell.classList.add('winning-cell');
      }

      if (symbol !== '' || !isMyTurn) {
        cell.disabled = true;
      } else {
        cell.disabled = false;
        cell.addEventListener('click', () => onCellClick({ index }));
      }

      boardEl.appendChild(cell);
    });

    container.appendChild(boardEl);
  }
};
