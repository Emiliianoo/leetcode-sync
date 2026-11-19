const tokenInput = document.getElementById("token");
const ownerInput = document.getElementById("owner");
const repoInput = document.getElementById("repo");
const statusText = document.getElementById("status");

// On load: fill the inputs with the saved values
chrome.storage.local.get(["token", "owner", "repo"]).then((data) => {
  tokenInput.value = data.token ?? "";
  ownerInput.value = data.owner ?? "";
  repoInput.value = data.repo ?? "";
});

// On save: write the values to storage
document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    token: tokenInput.value.trim(),
    owner: ownerInput.value.trim(),
    repo: repoInput.value.trim(),
  });
  statusText.textContent = "Saved ✓";
});
