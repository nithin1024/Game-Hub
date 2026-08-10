/**
 * Connect 4 Client Module
 * Grid: 6 Rows (0..5), 7 Columns (0..6)
 */

window.Connect4Client = {
  render(container, state, onColumnClick, isMyTurn, winningCells = null) {
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'c4-wrapper glass-panel';

    // Column Drop Buttons (Top Row)
    const dropRow = document.createElement('div');
    dropRow.className = 'c4-drop-row';

    for (let col = 0; col < 7; col++) {
      const dropBtn = document.createElement('button');
      dropBtn.className = 'c4-drop-btn';
      dropBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      
      // Disable if not turn or column full
      const isColFull = state.board && state.board[0] && state.board[0][col] !== '';
      if (!isMyTurn || isColFull) {
        dropBtn.disabled = true;
      } else {
        dropBtn.addEventListener('click', () => onColumnClick({ colIndex: col }));
      }
      dropRow.appendChild(dropBtn);
    }
    wrapper.appendChild(dropRow);

    // 6x7 Grid Board
    const grid = document.createElement('div');
    grid.className = 'c4-grid';

    const board = state.board || Array(6).fill(null).map(() => Array(7).fill(''));

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        const slot = document.createElement('div');
        slot.className = 'c4-slot';

        const symbol = board[r][c];
        if (symbol) {
          const piece = document.createElement('div');
          piece.className = `c4-piece ${symbol.toLowerCase()}`;
          piece.setAttribute('data-symbol', symbol);

          // Check if this slot is part of winning cells
          if (winningCells && winningCells.some(([wr, wc]) => wr === r && wc === c)) {
            piece.classList.add('winning-piece');
          }

          slot.appendChild(piece);
        }

        grid.appendChild(slot);
      }
    }

    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  }
};
