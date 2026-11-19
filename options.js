const tokenInput = document.getElementById("token");
const ownerInput = document.getElementById("owner");
const repoInput = document.getElementById("repo");
const toggleButton = document.getElementById("toggle-token");
const statusText = document.getElementById("status");

// On load: fill the inputs with the saved values
chrome.storage.local.get(["token", "owner", "repo"]).then((data) => {
  tokenInput.value = data.token ?? "";
  ownerInput.value = data.owner ?? "";
  repoInput.value = data.repo ?? "";
});

// Show / hide the token
toggleButton.addEventListener("click", () => {
  const hidden = tokenInput.type === "password";
  tokenInput.type = hidden ? "text" : "password";
  toggleButton.textContent = hidden ? "Hide" : "Show";
});

// On save (button click or Enter): write the values to storage
let hideStatusTimer;
document.getElementById("form").addEventListener("submit", async (event) => {
  event.preventDefault();

  await chrome.storage.local.set({
    token: tokenInput.value.trim(),
    owner: ownerInput.value.trim(),
    repo: repoInput.value.trim(),
  });

  statusText.classList.add("visible");
  clearTimeout(hideStatusTimer);
  hideStatusTimer = setTimeout(() => statusText.classList.remove("visible"), 2000);
});
