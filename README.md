# Leetcode-Sync

A Chrome extension that pushes your accepted LeetCode solutions to a GitHub repository automatically.

Submit a solution on LeetCode, and as soon as it's **Accepted** the code is committed to your repo. No copy-pasting needed.

## Features

- **Automatic sync**: every accepted submission is uploaded right after LeetCode judges it.
- **Manual upload**: when you open a past submission, a button lets you upload it by hand.
- **One folder per problem**, with one file per language, so solving a problem in Python and C++ keeps both.
- **No duplicate commits**: if the code is identical to what's already in the repo, the upload is skipped.
- **Useful commit messages**: each commit includes the problem title, runtime and memory.

## Installation

The extension isn't on the Chrome Web Store, so you load it unpacked:

1. Clone this repository:
   ```sh
   git clone https://github.com/Emiliianoo/leetcode-sync.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `leetcode-sync` folder.

## Setup

1. Create (or pick) the GitHub repository where your solutions will go, for example `leetcode-solutions`. It must have at least one commit, so initialize it with a README.
2. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new):
   - **Repository access**: *Only select repositories* → your solutions repo.
   - **Permissions**: *Contents* → **Read and write**.
3. Open the extension's options: right-click its icon → **Options**, or go to **Details → Extension options** in `chrome://extensions`.
4. Enter the token, your GitHub username and the repository name, then click **Save**.

The token is stored only in your browser (`chrome.storage.local`) and is sent only to `api.github.com`.

## Usage

Solve problems on [leetcode.com](https://leetcode.com) as usual. When a submission is accepted, a notification appears in the bottom-right corner:

| Message | Meaning |
|---|---|
| ⏳ Uploading to GitHub... | The upload is in progress |
| ✅ *Title* uploaded | Committed to your repo |
| ✔️ *Title* already up to date | Same code was already there, so nothing was committed |
| ❌ GitHub error | Check the token, username and repo in the options. Details are in the DevTools console |
| ❌ Extension was reloaded, refresh the page | The extension was updated while the tab was open |

To upload an older solution, open the submission on LeetCode and click **⬆️ Upload this submission**.

## Repository layout

Solutions are saved as:

```
0001-two-sum/
  solution.py
  solution.cpp
0020-valid-parentheses/
  solution.java
```

Uploading the same problem again in the same language overwrites its file, and the earlier versions stay in the git history.

## How it works

| File | Role |
|---|---|
| `inject.js` | Runs inside LeetCode's page and watches its `fetch` calls for the submission check that comes back **Accepted** |
| `content.js` | Gets that signal, fetches the submission details (code, language, runtime) from LeetCode's GraphQL API and shows the notifications |
| `background.js` | Service worker that commits the file through the GitHub Contents API |
| `options.html` / `options.js` | Settings page for the token, username and repository |

`inject.js` has to run in the page's own JavaScript context to see LeetCode's network requests, but from there it can't use `chrome.*` APIs. It passes the submission ID to `content.js` with `window.postMessage`.

## Limitations

- Only `leetcode.com` is supported (not `leetcode.cn`).
- Languages that aren't mapped yet (SQL, Bash, PHP and others) are saved as `.txt`.
