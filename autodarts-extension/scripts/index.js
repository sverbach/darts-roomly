// In your content script
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
    console.log("match");
    setTimeout(async () => {
      removeProfileImages();
      await insertUserProfileImages();
      replaceImagesOnPlayerChange();
    }, 1750);
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
  const DARTS_API_SERVER = 'https://darts.nvier.ch';
  const response = await fetch(`${DARTS_API_SERVER}/users/${username}`);
  console.log(response);

  if (response.ok) {
    return await response.json();
  }

  return null;
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
