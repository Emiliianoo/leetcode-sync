chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "upload") {
    uploadFile(message.path, message.content, message.commitMessage)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true; // keep the channel open for the async response
  }
});

async function uploadFile(path, content, commitMessage) {
  const { token, owner, repo } = await chrome.storage.local.get([
    "token",
    "owner",
    "repo",
  ]);

  if (!token || !owner || !repo) {
    throw new Error("Extension not configured (missing token, owner or repo)");
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  // 1. If the file already exists, GitHub requires its sha to overwrite it
  const getResponse = await fetch(url, { headers });
  let sha;
  if (getResponse.ok) {
    const data = await getResponse.json();
    sha = data.sha;
  }

  // 2. Create or update the file
  const putResponse = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: commitMessage,
      content: toBase64(content),
      sha,
    }),
  });

  if (!putResponse.ok) {
    const error = await putResponse.json();
    throw new Error(`GitHub ${putResponse.status}: ${error.message}`);
  }
}

// btoa() only handles Latin-1, so encode as UTF-8 bytes first
function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
