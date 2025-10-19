const DARTS_API_SERVER = 'http://192.168.1.171:8082';

async function insertUserProifleImages() {
  const cards = [...document.querySelectorAll('div.ad-ext-player')];
  console.log(cards);

  cards.forEach(async card => {
    const playerNameParagraph = card.querySelector('span.ad-ext-player-name p:first-child');
    const username = playerNameParagraph.innerText.toLowerCase();
    const profile = await loadUserProfile(username);
    const image = createUserProfileImage(profile);

    const scoreParagraph = card.querySelector('p.ad-ext-player-score');
    scoreParagraph.insertAdjacentElement('afterend', image);
  });
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

  // Return the created element
  return img;
}

async function loadUserProfile(username) {
  const response = await fetch(`${DARTS_API_SERVER}/users/${username}`);
  console.log(response);

  if (response.ok) {
    return await response.json();
  }

  return null;
}

setTimeout(async () => {
  await insertUserProifleImages();
}, 2000);

