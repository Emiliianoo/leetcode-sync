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

button.addEventListener("click", () => {
  const match = location.pathname.match(/submissions\/(?:detail\/)?(\d+)/);
  if (!match) {
    showToast("❌ Open a submission first");
    return;
  }
  uploadSubmission(match[1]);
});

// ─── Shared logic ───
async function uploadSubmission(submissionId) {
  if (uploadedIds.has(submissionId)) return;
  uploadedIds.add(submissionId);

  showToast("⏳ Uploading to GitHub...");

  try {
    const submission = await fetchSubmission(submissionId);

    const number = submission.question.questionFrontendId.padStart(4, "0");
    const extension = EXTENSIONS[submission.lang.name] ?? "txt";
    const path = `${number}-${submission.question.titleSlug}/solution.${extension}`;

    const message = {
      type: "upload",
      path,
      content: submission.code,
      commitMessage: `${submission.question.title} (${submission.runtimeDisplay}, ${submission.memoryDisplay})`,
    };

    chrome.runtime.sendMessage(message, (response) => {
      if (response.ok) {
        showToast(`✅ ${submission.question.title} uploaded`);
      } else {
        uploadedIds.delete(submissionId); // allow retrying
        showToast("❌ GitHub error (see console)");
        console.error(response.error);
      }
    });
  } catch (error) {
    uploadedIds.delete(submissionId); // allow retrying
    showToast("❌ LeetCode error (see console)");
    console.error(error);
  }
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
