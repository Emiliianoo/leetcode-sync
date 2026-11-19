const EXTENSIONS = {
  python3: "py",
  python: "py",
  cpp: "cpp",
  c: "c",
  java: "java",
  javascript: "js",
  typescript: "ts",
  csharp: "cs",
  golang: "go",
  rust: "rs",
  kotlin: "kt",
  swift: "swift",
  ruby: "rb",
};

const uploadedIds = new Set(); // avoid uploading the same submission twice

// ─── Automatic: listen for the message from inject.js ───
window.addEventListener("message", (event) => {
  // Only accept messages from this same window, with our type
  if (event.source !== window || event.data?.type !== "LC_ACCEPTED") return;

  uploadSubmission(event.data.submissionId);
});

// ─── Manual: the button, as a backup ───
const button = document.createElement("button");
button.textContent = "⬆️ Upload this submission";
button.style.cssText =
  "position:fixed;bottom:20px;right:20px;z-index:99999;padding:10px;background:black;color:white;border-radius:8px";
document.body.appendChild(button);

// The submission id in the URL, e.g. /problems/two-sum/submissions/123/ or /submissions/detail/123/
function currentSubmissionId() {
  return location.pathname.match(/submissions\/(?:detail\/)?(\d+)/)?.[1];
}

// Only show it while a submission is open. LeetCode is a single-page app, so the
// URL changes without a reload and we have to keep checking
function updateButtonVisibility() {
  button.style.display = currentSubmissionId() ? "" : "none";
}
updateButtonVisibility();
setInterval(updateButtonVisibility, 1000);

button.addEventListener("click", () => {
  const submissionId = currentSubmissionId();
  if (submissionId) uploadSubmission(submissionId);
});

// ─── Shared logic ───
async function uploadSubmission(submissionId) {
  if (uploadedIds.has(submissionId)) return;
  uploadedIds.add(submissionId);

  showToast("⏳ Uploading to GitHub...");

  // On any failure, forget the id so the user can retry
  const fail = (text, error) => {
    uploadedIds.delete(submissionId);
    showToast(text);
    console.error(error);
  };

  let submission;
  try {
    submission = await fetchSubmission(submissionId);
  } catch (error) {
    return fail("❌ LeetCode error (see console)", error);
  }

  const { title, titleSlug, questionFrontendId } = submission.question;
  const number = questionFrontendId.padStart(4, "0");
  const extension = EXTENSIONS[submission.lang.name] ?? "txt";

  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "upload",
      path: `${number}-${titleSlug}/solution.${extension}`,
      content: submission.code,
      commitMessage: `${title} (${submission.runtimeDisplay}, ${submission.memoryDisplay})`,
    });
  } catch (error) {
    // Happens when the extension is reloaded/updated while this tab stays open
    return fail("❌ Extension was reloaded, refresh the page", error);
  }

  if (!response?.ok) {
    return fail("❌ GitHub error (see console)", response?.error ?? "No response from the extension");
  }

  showToast(response.skipped ? `✔️ ${title} already up to date` : `✅ ${title} uploaded`);
}

async function fetchSubmission(submissionId) {
  const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "";

  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrftoken": csrfToken,
    },
    body: JSON.stringify({
      query: `
        query submissionDetails($submissionId: Int!) {
          submissionDetails(submissionId: $submissionId) {
            code
            runtimeDisplay
            memoryDisplay
            lang { name }
            question { questionFrontendId title titleSlug }
          }
        }
      `,
      variables: { submissionId: Number(submissionId) },
    }),
  });

  const json = await response.json();
  if (!json.data?.submissionDetails) {
    throw new Error(
      "LeetCode didn't return the submission: " +
        JSON.stringify(json.errors ?? json),
    );
  }
  return json.data.submissionDetails;
}

function showToast(text) {
  document.getElementById("lc-sync-toast")?.remove(); // only one at a time

  const toast = document.createElement("div");
  toast.id = "lc-sync-toast";
  toast.textContent = text;
  toast.style.cssText =
    "position:fixed;bottom:70px;right:20px;z-index:99999;padding:10px 16px;background:#222;color:#fff;border-radius:8px;font:14px sans-serif";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
