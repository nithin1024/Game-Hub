/**
 * Rock Paper Scissors Client Module
 */

window.RPSClient = {
  render(container, state, onChoiceClick, mySymbol, revealedChoices = null) {
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'rps-wrapper glass-panel';

    const choicesInfo = [
      { id: 'rock', icon: 'fa-hand-back-fist', label: 'Rock', emoji: '🪨' },
      { id: 'paper', icon: 'fa-hand', label: 'Paper', emoji: '📄' },
      { id: 'scissors', icon: 'fa-hand-scissors', label: 'Scissors', emoji: '✂️' }
    ];

    if (revealedChoices) {
      // Reveal Screen (Both Choices Submitted)
      const revealContainer = document.createElement('div');
      revealContainer.className = 'rps-reveal-box';

      const symbols = Object.keys(revealedChoices);
      const p1Sym = symbols[0];
      const p2Sym = symbols[1];

      const p1Choice = choicesInfo.find(c => c.id === revealedChoices[p1Sym]);
      const p2Choice = choicesInfo.find(c => c.id === revealedChoices[p2Sym]);

      revealContainer.innerHTML = `
        <div class="rps-versus-container">
          <div class="rps-card revealed">
            <span class="rps-player-label">${p1Sym === mySymbol ? 'YOU' : 'OPPONENT'} (${p1Sym})</span>
            <div class="rps-emoji">${p1Choice ? p1Choice.emoji : '❓'}</div>
            <span class="rps-choice-name">${p1Choice ? p1Choice.label : ''}</span>
          </div>

          <div class="rps-vs-badge">VS</div>

          <div class="rps-card revealed">
            <span class="rps-player-label">${p2Sym === mySymbol ? 'YOU' : 'OPPONENT'} (${p2Sym})</span>
            <div class="rps-emoji">${p2Choice ? p2Choice.emoji : '❓'}</div>
            <span class="rps-choice-name">${p2Choice ? p2Choice.label : ''}</span>
          </div>
        </div>
      `;

      wrapper.appendChild(revealContainer);
    } else {
      // Choice Selection View
      const title = document.createElement('h3');
      title.className = 'rps-title';
      title.textContent = state.waitingForSecretMove ? 'Choice Locked In! Waiting for Opponent...' : 'Choose Your Move Secretly:';
      wrapper.appendChild(title);

      const cardsGrid = document.createElement('div');
      cardsGrid.className = 'rps-cards-grid';

      choicesInfo.forEach(choice => {
        const card = document.createElement('button');
        card.className = 'rps-card-btn';
        
        if (state.playerChoice === choice.id) {
          card.classList.add('selected');
        }

        card.innerHTML = `
          <div class="rps-card-emoji">${choice.emoji}</div>
          <span class="rps-card-title">${choice.label}</span>
        `;

        if (state.waitingForSecretMove) {
          card.disabled = true;
        } else {
          card.addEventListener('click', () => onChoiceClick({ choice: choice.id }));
        }

        cardsGrid.appendChild(card);
      });

      wrapper.appendChild(cardsGrid);
    }

    container.appendChild(wrapper);
  }
};
