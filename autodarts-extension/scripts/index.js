let lastUrl = location.href;

// Create observer for URL changes
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    onUrlChange();
  }
}).observe(document, { subtree: true, childList: true });

// Intercept pushState and replaceState
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function () {
  originalPushState.apply(this, arguments);
  onUrlChange();
};

history.replaceState = function () {
  originalReplaceState.apply(this, arguments);
  onUrlChange();
};

function onUrlChange() {
  if (
    location.href.includes('/lobbies/') &&
    !location.href.includes('/lobbies/new')
  ) {
    setTimeout(() => {
      replaceLocalPlayers();
    }, 1750);
  }

  if (location.href.includes('/matches')) {
    setTimeout(async () => {
      removeProfileImages();
      await insertUserProfileImages();
      replaceImagesOnPlayerChange();
      await trackScoreIntoDatabase();
    }, 1750);
  }
}

async function trackScoreIntoDatabase() {
  // first, inserta new match, id from the url
  const paths = location.pathname.split("/");
  const matchId = paths[paths.length - 1];
  const players = [...document.querySelectorAll('.ad-ext-player-name p')].map(p => p.textContent.toLowerCase());
  const variant = document.querySelector('#ad-ext-game-variant').textContent;
  const baseScore = document.querySelector('#ad-ext-game-variant').nextSibling?.textContent;
  const mode = document.querySelector('#ad-ext-game-variant').nextSibling?.nextSibling?.textContent.toLowerCase();

  await createMatch(matchId, players, { variant, baseScore, mode });


  // then, on each change on the score component, capture and persist the score of the current player.
  const scoreComponent = document.querySelector('.ad-ext-turn-points');
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        const player = getActivePlayerName();
        const throws = [...document.querySelectorAll('.ad-ext-turn-throw p')].map(p => p.textContent.toLowerCase());
        const remainingPoints = getActivePlayerRemainingPoints();
        const totalThrowValue = scoreComponent.textContent.toLowerCase() === 'bust' ? -1 : Number(scoreComponent.textContent);
        const currentThrowNumber = Number([...document.querySelectorAll('.ad-ext-player-active p'), ...document.querySelectorAll('.ad-ext-player-winner p')]
          .find(p => p.textContent.includes('#'))
          .textContent
          .split('|')[0]
          .trim()
          .substring(1));

        if (throws.length === 0) {
          // just started the turn, don't need to persist that.
          break;
        }
        await addTurn(matchId, { player, throws, remainingPoints, totalThrowValue, currentThrowNumber });
        break; // Only run once per batch of mutations
      }
    }
  });

  observer.observe(scoreComponent, {
    characterData: true,  // Direct text node changes
    childList: true,      // Child nodes added/removed
    subtree: true        // Watch all descendants
  });
}

function getActivePlayerName() {
  return (document.querySelector('.ad-ext-player-active .ad-ext-player-name p')
    ?? document.querySelector('.ad-ext-player-winner .ad-ext-player-name p')).textContent.toLowerCase();
}

function getActivePlayerRemainingPoints() {
  return Number((document.querySelector('.ad-ext-player-active .ad-ext-player-score')
    ?? document.querySelector('.ad-ext-player-winner .ad-ext-player-score')).textContent.toLowerCase());
}

function getDartsApiUrl() {
  const isDevMode = !!new URL(location.href).searchParams.get("dev");

  return isDevMode
    ? 'http://localhost:8082'
    : 'https://darts.nvier.ch';
}

async function createMatch(matchId, players, options) {
  try {
    const response = await fetch(`${getDartsApiUrl()}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matchId,
        players,
        options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create match');
    }

    const match = await response.json();
    console.log('Match created:', match);
    return match;
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
}

// Add a turn to a match
async function addTurn(matchId, turn) {
  try {
    const response = await fetch(`${getDartsApiUrl()}/matches/${matchId}/turns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        turn
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add turn');
    }

    const updatedMatch = await response.json();
    console.log('Turn added:', updatedMatch);
    return updatedMatch;
  } catch (error) {
    console.error('Error adding turn:', error);
    throw error;
  }
}

function replaceImagesOnPlayerChange() {
  const playerName = document.querySelector('.ad-ext-player-name p');
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        console.log('Player name changed:', playerName.textContent);

        removeProfileImages();
        await insertUserProfileImages();

        break; // Only run once per batch of mutations
      }
    }
  });

  observer.observe(playerName, {
    characterData: true,  // Direct text node changes
    childList: true,      // Child nodes added/removed
    subtree: true         // Watch all descendants
  });
}

function removeProfileImages() {
  const images = [...document.querySelectorAll('.roomly-player-image')];
  images.forEach(img => img.remove());
}

async function insertUserProfileImages() {
  const cards = [...document.querySelectorAll('div.ad-ext-player')];

  await Promise.all(
    cards.map(async (card) => {
      const playerNameParagraph = card.querySelector(
        'span.ad-ext-player-name p:first-child'
      );
      const username = playerNameParagraph.innerText.toLowerCase();
      const profile = await loadUserProfile(username);
      const image = createUserProfileImage(profile);

      const scoreParagraph = card.querySelector('p.ad-ext-player-score');
      scoreParagraph.insertAdjacentElement('afterend', image);
    })
  );
}

function createUserProfileImage(userProfile) {
  // Create the img element
  const img = document.createElement('img');

  if (userProfile) {
    // Set the source to the base64 encoded picture
    img.src = userProfile.picture;

    // Set the alt attribute for accessibility
    img.alt = userProfile.name;
  } else {
    // Set the source to the base64 encoded placeholder picture
    img.src = chrome.runtime.getURL('assets/dart-placeholder.webp');

    // Set the alt attribute for accessibility
    img.alt = 'Placeholder image';
  }

  // Apply inline styling: 100x100px and rounded
  img.style.width = '150px';
  img.style.height = '150px';
  img.style.borderRadius = '50%';
  img.style.objectFit = 'cover';
  img.style.marginBottom = '16px';
  img.style.border = '3px solid rgba(255,255,255,0.2)';
  img.style.padding = '8px';
  img.style.background = 'rgba(255, 255, 255, 0.2)';

  // Apply identifier for removal
  img.classList.add('roomly-player-image');

  // Return the created element
  return img;
}

async function loadUserProfile(username) {
  try {
    const response = await fetch(`${getDartsApiUrl()}/users/${username}`);

    if (response.ok) {
      return await response.json();
    }

    return null;
  } catch (ex) {
    console.error('error fetching profiles:', ex);
  }
}

function replaceLocalPlayers() {
  const clearButton = document.querySelector(
    'button[aria-label="Clear local players"]'
  );
  const input = document.querySelector(
    'input[placeholder="Enter name for local player"]'
  );
  const addPlayerButton = document.querySelector(
    'button[aria-label="add-player"]'
  );
  const players = [
    'DOMI',
    'JAN',
    'STEFANO',
    'LUCAS',
    'CELINE',
    'JOEP',
    'CHRIS',
    'ALBU',
    'PHILIPPE',
    'PERI',
    '2SANDY',
    'SCHWENDI',
    'SHIMI',
    'VOLKI',
    'SCHWEMBINI',
    'TIM'
  ].sort();

  const parent = clearButton.parentNode;

  // Take care of overflow
  parent.style.flexWrap = 'wrap';

  // Get the class of the existing player buttons dynamically
  const sampleButton = parent.querySelector('button:not([aria-label])');
  const buttonClass = sampleButton ? sampleButton.className : '';

  // Remove existing player buttons
  const existingButtons = parent.querySelectorAll('button:not([aria-label])');
  existingButtons.forEach((btn) => (btn.style.display = 'none'));

  // Insert a new button for each player before the "Clear local players" button
  players.forEach((player) => {
    const newButton = document.createElement('button');
    newButton.type = 'button';
    newButton.className = buttonClass;
    newButton.textContent = player;
    newButton.id = player;
    newButton.onclick = () => {
      input.value = player.toLowerCase();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      newButton.remove();
      addPlayerButton.click();
    };
    parent.insertBefore(newButton, clearButton);
  });
}

(() => onUrlChange())();

// In your content script
const style = document.createElement('style');
style.textContent = `
   .ad-ext-player img {
     opacity: 0.3;
     transition: opacity 0.3s ease;
   }

  .ad-ext-player.ad-ext-player-active img,
  .ad-ext-player.ad-ext-player-winner img {
    opacity: 1;
  }
`;
document.head.appendChild(style);
