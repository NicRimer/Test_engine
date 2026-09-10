/* =========================================================
   PROFILE INITIALIZATION
   ========================================================= */

async function initializeProfiles() {

  profileStatus.textContent =
    "Loading profiles...";

  try {

    const profiles =
      await getAvailableProfiles();

    profileSelect.innerHTML =
      "";

    if (profiles.length === 0) {
      throw new Error(
        "No profile files were found."
      );
    }

    profiles.forEach(
      profile => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          profile.name;

        option.textContent =
          profile.name;

        profileSelect.appendChild(
          option
        );
      }
    );

    const defaultProfile =
      profiles.find(
        profile =>
          profile.name.toLowerCase() ===
          "default.json"
      );

    if (defaultProfile) {

      profileSelect.value =
        defaultProfile.name;
    }

    profileStatus.textContent =
      "Select a profile and click Load Profile.";

  } catch (error) {

    console.error(
      "Could not load profiles:",
      error
    );

    profileSelect.innerHTML =
      '<option value="">Unable to load profiles</option>';

    profileStatus.textContent =
      `Could not load profiles: ${error.message}`;
  }
}


/* =========================================================
   PROFILE SELECTION
   ========================================================= */

async function handleProfileSelection() {

  const profileFile =
    profileSelect.value;

  if (!profileFile) {

    profileStatus.textContent =
      "Please select a profile.";

    return;
  }

  loadProfileBtn.disabled =
    true;

  profileStatus.textContent =
    `Loading ${profileFile}...`;

  try {

    const profile =
      await loadProfile(
        profileFile
      );

    activeProfileFile =
      profileFile;

    localStorage.setItem(
      "selectedProfileFile",
      profileFile
    );

    profileStatus.textContent =
      `Profile loaded: ${profile.id || profileFile}`;

    quizSetupBlock.style.display =
      "block";

    resetQuizStateOnly();

    console.log(
      "Active profile:",
      profile
    );

  } catch (error) {

    console.error(
      "Profile loading failed:",
      error
    );

    profileStatus.textContent =
      `Could not load profile: ${error.message}`;

  } finally {

    loadProfileBtn.disabled =
      false;
  }
}


/* =========================================================
   GET SELECTED PROFILE FILE
   ========================================================= */

function getSelectedProfileFile() {
  return activeProfileFile;
}

window.getSelectedProfileFile =
  getSelectedProfileFile;
