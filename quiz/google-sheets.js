/* =========================================================
   GOOGLE SHEETS
   ========================================================= */

const GOOGLE_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbxXr8kxE7zCngXiro3QCFth0GHqcHHFnSyjgB0WB3FMJO0ciJJzNf6SlnVpsI97bniJwA/exec";


/* =========================================================
   SAVE RESULT TO GOOGLE SHEETS
   ========================================================= */

async function saveQuizResultToGoogleSheets(
  profileId,
  result
) {

  if (!profileId) {

    throw new Error(
      "Profile ID is missing."
    );
  }

  if (!result) {

    throw new Error(
      "Quiz result is missing."
    );
  }

  if (
    !GOOGLE_SHEETS_URL ||
    GOOGLE_SHEETS_URL.includes(
      "PASTE_YOUR"
    )
  ) {

    throw new Error(
      "Google Sheets URL is not configured."
    );
  }

  const response =
    await fetch(
      GOOGLE_SHEETS_URL,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body:
          JSON.stringify({

            action:
              "saveResult",

            profileId,

            result
          })
      }
    );


  if (!response.ok) {
    throw new Error(
      `Google Sheets request failed: ${response.status}`
    );
  }


  let data;

  try {

    data =
      await response.json();

  } catch (error) {

    throw new Error(
      "Google Sheets returned an invalid response."
    );
  }


  if (!data.success) {

    throw new Error(
      data.error ||
      "Google Sheets rejected the result."
    );
  }

  return data;
}
