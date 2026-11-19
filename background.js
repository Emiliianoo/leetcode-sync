chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "upload") {
    uploadFile(message.path, message.content, message.commitMessage)
      .then(({ skipped }) => sendResponse({ ok: true, skipped }))
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

  // 1. If the file already exists, GitHub requires its sha to overwrite it.
  //    no-store: GitHub allows caching this for 60s, and a stale sha makes the PUT fail with 409
  const getResponse = await fetch(url, { headers, cache: "no-store" });
  let sha;
  if (getResponse.ok) {
    const data = await getResponse.json();
    sha = data.sha;
  } else if (getResponse.status !== 404) {
    // 404 just means "new file"; anything else (bad token, rate limit...) is a real error
    const error = await getResponse.json().catch(() => ({}));
    throw new Error(`GitHub ${getResponse.status}: ${error.message ?? "request failed"}`);
  }

  // 2. Same code already in the repo: skip, so we don't create empty commits
  if (sha && sha === (await gitBlobSha(content))) {
    return { skipped: true };
  }

  // 3. Create or update the file
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
    const error = await putResponse.json().catch(() => ({}));
    throw new Error(`GitHub ${putResponse.status}: ${error.message ?? "request failed"}`);
  }

  return { skipped: false };
}

// Git identifies a file by sha1("blob <byte length>\0<bytes>"), the same sha GitHub returns
async function gitBlobSha(text) {
  const body = new TextEncoder().encode(text);
  const header = new TextEncoder().encode(`blob ${body.length}\0`);
  const bytes = new Uint8Array(header.length + body.length);
  bytes.set(header);
  bytes.set(body, header.length);

  const hash = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// btoa() only handles Latin-1, so encode as UTF-8 bytes first
function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
