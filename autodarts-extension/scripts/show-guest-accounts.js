function replaceLocalPlayers(clearButton, input, addPlayerButton) {
  const players = [
    "DOMI", "JAN", "STEFANO", "LUCAS", "CELINE",
    "JOEP", "CHRIS", "ALBU", "PHILIPPE", "PERI",
    "2SANDY", "SCHWENDI", "SHIMI", "VOLKI", "SCHWEMBINI"
  ].sort();

  const parent = clearButton.parentNode;

  // Take care of overflow
  parent.style.flexWrap = 'wrap';

  // Get the class of the existing player buttons dynamically
  const sampleButton = parent.querySelector('button:not([aria-label])');
  const buttonClass = sampleButton ? sampleButton.className : '';

  // Remove existing player buttons
  const existingButtons = parent.querySelectorAll('button:not([aria-label])');
  existingButtons.forEach(btn => btn.style.display = 'none');

  // Insert a new button for each player before the "Clear local players" button
  players.forEach(player => {
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
    }
    parent.insertBefore(newButton, clearButton);
  });
}

const observer = new MutationObserver((mutations, obs) => {
  const clearButton = document.querySelector('button[aria-label="Clear local players"]');
  const input = document.querySelector('input[placeholder="Enter name for local player"]');
  const addPlayerButton = document.querySelector('button[aria-label="add-player"]');
  if (clearButton && input && addPlayerButton) {
    replaceLocalPlayers(clearButton, input, addPlayerButton);
    obs.disconnect();
    setTimeout(() => { obs.observe(document.body, { childList: true, subtree: true }) }, 2000);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

