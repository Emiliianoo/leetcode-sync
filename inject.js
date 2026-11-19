// Runs inside LeetCode's own page (MAIN world).
// It can see the page's fetch calls, but it CANNOT use chrome.* APIs.

const originalFetch = window.fetch;

window.fetch = async (...args) => {
  // Let LeetCode's request go through normally
  const response = await originalFetch(...args);

  // args[0] can be a string, a URL object or a Request object
  const url = String(args[0]?.url ?? args[0]);
  const match = url.match(/\/submissions\/detail\/(\d+)\/(?:v\d+\/)?check/);

  if (match) {
    // A Response body can only be read once, and LeetCode needs to read it too,
    // so we read a copy
    response
      .clone()
      .json()
      .then((data) => {
        if (data.state === "SUCCESS" && data.status_msg === "Accepted") {
          window.postMessage(
            { type: "LC_ACCEPTED", submissionId: match[1] },
            location.origin, // only deliver to this same page
          );
        }
      })
      .catch(() => {}); // never break LeetCode if something goes wrong here
  }

  // Give LeetCode its response as if nothing happened
  return response;
};
