const GITHUB_OWNER = "NicRimer";
const GITHUB_REPO = "Test_engine";
const GITHUB_BRANCH = "main";
const PROFILES_PATH = "profiles";

let activeProfile = null;
let activeProfileFileSha = null;


// --------------------------------------------------
// GitHub API helper
// --------------------------------------------------

async function githubRequest(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `GitHub API error ${response.status}: ${text || response.statusText}`
    );
  }

  return response.json();
}


// --------------------------------------------------
// Load available profile files
// --------------------------------------------------

async function getAvailableProfiles() {
  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${PROFILES_PATH}?ref=${GITHUB_BRANCH}`;

  const files = await githubRequest(url);

  return files
    .filter(file =>
      file.type === "file" &&
      file.name.toLowerCase().endsWith(".json")
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}


// --------------------------------------------------
// Load one existing profile
// --------------------------------------------------

async function loadProfile(profileFile) {
  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${PROFILES_PATH}/${encodeURIComponent(profileFile)}` +
    `?ref=${GITHUB_BRANCH}`;

  const file = await githubRequest(url);

  const jsonText = decodeBase64(file.content);

  activeProfile = JSON.parse(jsonText);
  activeProfileFileSha = file.sha;

  return activeProfile;
}


// --------------------------------------------------
// Save an existing profile
// --------------------------------------------------

async function saveProfile(profileFile, profile) {
  if (!activeProfileFileSha) {
    throw new Error("Profile file SHA is missing.");
  }

  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${PROFILES_PATH}/${encodeURIComponent(profileFile)}`;

  const content = btoa(
    unescape(
      encodeURIComponent(
        JSON.stringify(profile, null, 2)
      )
    )
  );

  const result = await githubRequest(url, {
    method: "PUT",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      message: `Update profile ${profile.id}`,
      content,
      sha: activeProfileFileSha,
      branch: GITHUB_BRANCH
    })
  });

  activeProfileFileSha = result.content.sha;

  return result;
}


// --------------------------------------------------
// Base64 decoder
// --------------------------------------------------

function decodeBase64(base64) {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

  return new TextDecoder("utf-8").decode(bytes);
}


// --------------------------------------------------
// Add quiz result to existing profile
// --------------------------------------------------

async function saveQuizResult(profileFile, result) {
  if (!activeProfile) {
    throw new Error("No profile selected.");
  }

  /*
   * Reload the profile immediately before saving.
   *
   * This means we use the latest version of the profile
   * rather than relying on an old copy from when the user
   * first selected it.
   */
  const latest = await loadProfile(profileFile);

  if (!Array.isArray(latest.results)) {
    latest.results = [];
  }

  latest.results.push(result);

  await saveProfile(profileFile, latest);

  activeProfile = latest;

  return latest;
}
