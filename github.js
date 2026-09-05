const GITHUB_OWNER = "NicRimer";
const GITHUB_REPO = "Test_engine";
const GITHUB_BRANCH = "main";
const PROFILES_PATH = "profiles";

let activeProfile = null;
let activeProfileFileSha = null;


/* =========================================================
   GITHUB API REQUEST
   ========================================================= */

async function githubRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let message = "";

    try {
      const errorData = await response.json();
      message =
        errorData.message ||
        JSON.stringify(errorData);
    } catch {
      message = await response.text();
    }

    throw new Error(
      `GitHub API ${response.status}: ${message}`
    );
  }

  return response.json();
}


/* =========================================================
   GET EXISTING PROFILE FILES
   ========================================================= */

async function getAvailableProfiles() {
  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${PROFILES_PATH}?ref=${GITHUB_BRANCH}`;

  console.log("Loading profiles from:", url);

  const files = await githubRequest(url);

  if (!Array.isArray(files)) {
    throw new Error(
      "GitHub did not return a profiles directory."
    );
  }

  const profiles = files
    .filter(file =>
      file.type === "file" &&
      file.name.toLowerCase().endsWith(".json")
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  console.log(
    "Available profile files:",
    profiles.map(file => file.name)
  );

  return profiles;
}


/* =========================================================
   LOAD ONE EXISTING PROFILE
   ========================================================= */

async function loadProfile(profileFile) {
  if (!profileFile) {
    throw new Error("No profile file was selected.");
  }

  /*
   * Encode each path segment safely.
   */
  const encodedPath = PROFILES_PATH +
    "/" +
    encodeURIComponent(profileFile);

  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${encodedPath}?ref=${GITHUB_BRANCH}`;

  console.log("Loading profile:", profileFile);

  const file = await githubRequest(url);

  if (!file.content) {
    throw new Error(
      `Profile file "${profileFile}" has no content.`
    );
  }

  const jsonText =
    decodeBase64(file.content);

  let profile;

  try {
    profile = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${profileFile}: ${error.message}`
    );
  }

  /*
   * Keep the current GitHub file SHA.
   * It is required when updating an existing file.
   */
  activeProfileFileSha = file.sha;

  activeProfile = profile;

  console.log(
    "Profile loaded:",
    profile
  );

  return profile;
}


/* =========================================================
   SAVE EXISTING PROFILE
   ========================================================= */

async function saveProfile(profileFile, profile) {
  if (!profileFile) {
    throw new Error(
      "No profile file was selected."
    );
  }

  if (!activeProfileFileSha) {
    throw new Error(
      "Profile file SHA is missing. Reload the profile before saving."
    );
  }

  if (!profile) {
    throw new Error(
      "Profile data is missing."
    );
  }

  const encodedPath =
    PROFILES_PATH +
    "/" +
    encodeURIComponent(profileFile);

  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${encodedPath}`;

  const jsonText =
    JSON.stringify(profile, null, 2);

  const content =
    encodeBase64(jsonText);

  const response =
    await githubRequest(url, {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        message:
          `Update profile ${profile.id || profileFile}`,

        content,

        /*
         * IMPORTANT:
         * Supplying SHA means GitHub updates
         * an existing file instead of creating one.
         */
        sha: activeProfileFileSha,

        branch: GITHUB_BRANCH
      })
    });

  if (response.content?.sha) {
    activeProfileFileSha =
      response.content.sha;
  }

  activeProfile = profile;

  return response;
}


/* =========================================================
   SAVE QUIZ RESULT
   ========================================================= */

async function saveQuizResult(
  profileFile,
  result
) {
  if (!profileFile) {
    throw new Error(
      "No profile selected."
    );
  }

  if (!result) {
    throw new Error(
      "Quiz result is missing."
    );
  }

  /*
   * Reload the latest version first.
   *
   * This gives us the current SHA and prevents
   * accidentally overwriting an older version.
   */
  const latestProfile =
    await loadProfile(profileFile);

  if (!Array.isArray(latestProfile.results)) {
    latestProfile.results = [];
  }

  latestProfile.results.push(result);

  await saveProfile(
    profileFile,
    latestProfile
  );

  activeProfile =
    latestProfile;

  return latestProfile;
}


/* =========================================================
   BASE64 DECODING
   ========================================================= */

function decodeBase64(base64) {
  const binary =
    atob(
      base64.replace(/\n/g, "")
    );

  const bytes =
    Uint8Array.from(
      binary,
      character =>
        character.charCodeAt(0)
    );

  return new TextDecoder(
    "utf-8"
  ).decode(bytes);
}


/* =========================================================
   BASE64 ENCODING
   ========================================================= */

function encodeBase64(text) {
  const bytes =
    new TextEncoder().encode(text);

  let binary = "";

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        i + chunkSize
      )
    );
  }

  return btoa(binary);
}


/* =========================================================
   PROFILE ACCESSORS
   ========================================================= */

function getActiveProfile() {
  return activeProfile;
}


function getActiveProfileFileSha() {
  return activeProfileFileSha;
}


window.getActiveProfile =
  getActiveProfile;

window.getActiveProfileFileSha =
  getActiveProfileFileSha;
