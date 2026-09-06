/* ---------------------------------------------------------
   QUIZ ENGINE CORE
--------------------------------------------------------- */

let currentQuestionIndex = 0;
let activeProfileFile = null;

window.quizData = [];
window.userAnswers = {};
window.selectedAnswers = [];
window.quizFinished = false;


/* =========================================================
   GOOGLE SHEETS
   ========================================================= */

const GOOGLE_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbxXr8kxE7zCngXiro3QCFth0GHqcHHFnSyjgB0WB3FMJO0ciJJzNf6SlnVpsI97bniJwA/exec";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const fileInput =
  document.getElementById("fileInput");

const finishQuizBtn =
  document.getElementById("finishQuizBtn");

const prevBtn =
  document.getElementById("prevBtn");

const nextBtn =
  document.getElementById("nextBtn");

const restartBtn =
  document.getElementById("restart");

const loadQuizFileBtn =
  document.getElementById("loadQuizFileBtn");

const quizFileSelect =
  document.getElementById("quizFileSelect");

const quizSetupBlock =
  document.getElementById("quizSetupBlock");

const quizContainer =
  document.getElementById("quizContainer");

const finalScore =
  document.getElementById("finalScore");

const summaryList =
  document.getElementById("summaryList");

const quizSummary =
  document.getElementById("quizSummary");

const shuffleToggle =
  document.getElementById("shuffleToggle");

const shuffleAnswersToggle =
  document.getElementById(
    "shuffleAnswersToggle"
  );

const autoReadToggle =
  document.getElementById(
    "autoReadToggle"
  );

const voiceToggle =
  document.getElementById(
    "voiceToggle"
  );

const voiceOutput =
  document.getElementById(
    "voiceOutput"
  );


/* =========================================================
   PROFILE ELEMENTS
   ========================================================= */

const profileBlock =
  document.getElementById(
    "profileBlock"
  );

const profileSelect =
  document.getElementById(
    "profileSelect"
  );

const loadProfileBtn =
  document.getElementById(
    "loadProfileBtn"
  );

const profileStatus =
  document.getElementById(
    "profileStatus"
  );


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeProfiles();

    finishQuizBtn.addEventListener(
      "click",
      finishQuiz
    );

    prevBtn.addEventListener(
      "click",
      () =>
        showQuestion(
          currentQuestionIndex - 1
        )
    );

    nextBtn.addEventListener(
      "click",
      () =>
        showQuestion(
          currentQuestionIndex + 1
        )
    );

    restartBtn.addEventListener(
      "click",
      () =>
        resetQuiz()
    );

    loadQuizFileBtn.addEventListener(
      "click",
      loadSelectedQuiz
    );

    fileInput.addEventListener(
      "change",
      handleFileInput
    );

    loadProfileBtn.addEventListener(
      "click",
      handleProfileSelection
    );

    voiceToggle.addEventListener(
      "change",
      handleVoiceToggle
    );

    autoReadToggle.addEventListener(
      "change",
      handleAutoReadToggle
    );

    quizSetupBlock.style.display =
      "none";

    finishQuizBtn.style.display =
      "none";

    prevBtn.disabled =
      true;

    nextBtn.disabled =
      true;
  }
);


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


/* =========================================================
   LOAD SELECTED QUIZ
   ========================================================= */

async function loadSelectedQuiz() {

  const selectedFile =
    quizFileSelect.value;

  if (!selectedFile) {

    alert(
      "Please select a quiz."
    );

    return;
  }

  resetQuizStateOnly();

  try {

    const response =
      await fetch(
        selectedFile
      );

    if (!response.ok) {

      throw new Error(
        "File not found"
      );
    }

    const content =
      await response.text();

    loadQuizFromText(
      content,
      selectedFile
    );

  } catch (error) {

    console.error(
      "Could not load quiz:",
      error
    );

    alert(
      "Could not load file: " +
      error.message
    );
  }
}


/* =========================================================
   LOAD QUIZ FROM UPLOADED FILE
   ========================================================= */

function handleFileInput(event) {

  resetQuizStateOnly();

  const file =
    event.target.files[0];

  if (!file) {
    return;
  }

  const reader =
    new FileReader();

  reader.onload =
    function (e) {

      const content =
        e.target.result;

      try {

        loadQuizFromText(
          content,
          file.name
        );

      } catch (error) {

        alert(
          "Could not load quiz: " +
          error.message
        );
      }
    };

  reader.readAsText(file);
}


/* =========================================================
   LOAD QUIZ TEXT
   ========================================================= */

function loadQuizFromText(
  content,
  sourceFile = ""
) {

  let questions =
    parseQuestions(
      content
    );

  if (!questions.length) {

    throw new Error(
      "No valid questions were found."
    );
  }

  if (shuffleToggle.checked) {

    shuffleArray(
      questions
    );
  }

  window.shuffleAnswersEnabled =
    shuffleAnswersToggle.checked;

  window.quizData =
    questions;

  window.userAnswers =
    {};

  window.selectedAnswers =
    new Array(
      questions.length
    ).fill(null);

  window.quizFinished =
    false;

  window.totalQuestions =
    questions.length;

  window.currentQuizId =
    sourceFile
      ? sourceFile
          .split("/")
          .pop()
          .replace(
            /\.[^/.]+$/,
            ""
          )
      : "quiz";

  profileBlock.style.display =
    "none";

  quizSetupBlock.style.display =
    "none";

  renderQuiz(
    questions
  );

  showQuestion(0);
}


/* =========================================================
   RESET QUIZ
   ========================================================= */

function resetQuiz() {

  resetQuizStateOnly();

  profileBlock.style.display =
    "block";

  quizSetupBlock.style.display =
    "block";
}


/* =========================================================
   RESET QUIZ STATE ONLY
   ========================================================= */

function resetQuizStateOnly() {

  window.quizData =
    [];

  window.userAnswers =
    {};

  window.selectedAnswers =
    [];

  window.quizFinished =
    false;

  window.totalQuestions =
    0;

  currentQuestionIndex =
    0;

  quizContainer.innerHTML =
    "";

  finalScore.textContent =
    "";

  summaryList.innerHTML =
    "";

  quizSummary.style.display =
    "none";

  finishQuizBtn.style.display =
    "none";

  prevBtn.disabled =
    true;

  nextBtn.disabled =
    true;
}


/* =========================================================
   SHUFFLE
   ========================================================= */

function shuffleArray(array) {

  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      array[i],
      array[j]
    ] = [
      array[j],
      array[i]
    ];
  }
}


/* =========================================================
   PARSE QUESTIONS
   ========================================================= */

function parseQuestions(text) {

  const questionBlocks =
    text.split(
      /\n(?=\d+\.\s)/
    );

  const questions = [];
  const seen = new Set();

  questionBlocks.forEach(
    (block, blockIndex) => {

      const lines =
        block
          .trim()
          .split("\n")
          .filter(Boolean);

      if (lines.length < 6) {
        return;
      }

      const numberMatch =
        lines[0].match(
          /^(\d+)\.\s*/
        );

      const originalNumber =
        numberMatch
          ? Number(
              numberMatch[1]
            )
          : blockIndex + 1;

      const questionText =
        lines[0]
          .replace(
            /^\d+\.\s*/,
            ""
          )
          .trim();

      const duplicateKey =
        questionText.toLowerCase();

      if (
        seen.has(
          duplicateKey
        )
      ) {
        return;
      }

      seen.add(
        duplicateKey
      );

      const choices = {};

      let i = 1;

      while (
        i < lines.length &&
        /^[A-E]\.\s/.test(
          lines[i]
        )
      ) {

        const match =
          lines[i].match(
            /^([A-E])\.\s*(.*)/
          );

        if (match) {

          choices[
            match[1]
          ] = match[2];
        }

        i++;
      }

      const answerLine =
        lines.find(
          line =>
            line.startsWith(
              "Answer:"
            )
        );

      const rawAnswer =
        answerLine
          ?.split(
            "Answer:"
          )[1]
          ?.trim();

      const answers =
        rawAnswer
          ? rawAnswer
              .split(",")
              .map(
                answer =>
                  answer
                    .trim()
                    .toUpperCase()
              )
          : [];

      const expStart =
        lines.findIndex(
          line =>
            line.startsWith(
              "Explanation:"
            )
        );

      const explanation =
        expStart !== -1
          ? lines
              .slice(
                expStart + 1
              )
              .join(" ")
          : "";

      const questionId =
        `q-${originalNumber}`;

      questions.push({

        id:
          questionId,

        originalNumber,

        questionText,

        choices,

        answers,

        explanation,

        choiceMap: {}
      });
    }
  );

  return questions;
}


/* =========================================================
   RENDER QUIZ
   ========================================================= */

function renderQuiz(questions) {

  const container =
    document.getElementById(
      "quizContainer"
    );

  container.innerHTML =
    "";

  questions.forEach(
    (q, index) => {

      const qDiv =
        document.createElement(
          "div"
        );

      qDiv.className =
        "question-block";

      qDiv.id =
        `question-${index}`;


      /* -----------------------------------------------
         QUESTION TEXT
      ------------------------------------------------ */

      const qText =
        document.createElement(
          "p"
        );

      qText.innerHTML =
        `<strong>${index + 1}. ${q.questionText}</strong>`;

      qDiv.appendChild(
        qText
      );


      /* -----------------------------------------------
         ANSWER CHOICES
      ------------------------------------------------ */

      const choiceDiv =
        document.createElement(
          "div"
        );

      choiceDiv.className =
        "choices";

      const inputType =
        q.answers.length > 1
          ? "checkbox"
          : "radio";

      let choiceEntries =
        Object.entries(
          q.choices
        );

      if (
        window.shuffleAnswersEnabled
      ) {

        shuffleArray(
          choiceEntries
        );
      }

      const newLabels = [
        "A",
        "B",
        "C",
        "D",
        "E"
      ];

      const choiceMap = {};

      choiceEntries.forEach(
        ([origKey], i) => {

          const newKey =
            newLabels[i];

          choiceMap[newKey] =
            origKey;
        }
      );

      q.choiceMap =
        choiceMap;


      /* -----------------------------------------------
         CREATE ANSWER INPUTS
      ------------------------------------------------ */

      choiceEntries.forEach(
        ([origKey, txt], i) => {

          const newKey =
            newLabels[i];

          const label =
            document.createElement(
              "label"
            );

          const input =
            document.createElement(
              "input"
            );

          input.type =
            inputType;

          input.name =
            `q${index}`;

          input.value =
            newKey;

          input.addEventListener(
            "change",
            () => {

              const selected = [];

              document
                .getElementsByName(
                  `q${index}`
                )
                .forEach(
                  option => {

                    if (
                      option.checked
                    ) {

                      selected.push(
                        option.value
                      );
                    }
                  }
                );

              /*
               * IMPORTANT:
               * Selection is NOT submission.
               */
              window.selectedAnswers[
                index
              ] = selected;
            }
          );

          label.appendChild(
            input
          );

          label.appendChild(
            document.createTextNode(
              ` ${newKey}. ${txt}`
            )
          );

          choiceDiv.appendChild(
            label
          );
        }
      );

      qDiv.appendChild(
        choiceDiv
      );


      /* -----------------------------------------------
         SUBMIT BUTTON
      ------------------------------------------------ */

      const submit =
        document.createElement(
          "button"
        );

      submit.type =
        "button";

      submit.textContent =
        "Submit";

      submit.onclick =
        () =>
          checkAnswer(
            index,
            q.answers,
            inputType,
            q.explanation,
            true
          );

      qDiv.appendChild(
        submit
      );


      /* -----------------------------------------------
         RESULT
      ------------------------------------------------ */

      const result =
        document.createElement(
          "div"
        );

      result.className =
        "result";

      result.id =
        `result${index}`;

      qDiv.appendChild(
        result
      );


      /* -----------------------------------------------
         EXPLANATION
      ------------------------------------------------ */

      const explanation =
        document.createElement(
          "div"
        );

      explanation.className =
        "explanation";

      explanation.id =
        `explanation${index}`;

      qDiv.appendChild(
        explanation
      );


      container.appendChild(
        qDiv
      );
    }
  );


  /* -----------------------------------------------
     QUIZ CONTROLS
  ------------------------------------------------ */

  finishQuizBtn.style.display =
    "block";

  quizSummary.style.display =
    "block";

  window.totalQuestions =
    questions.length;
}


/* =========================================================
   RESTORE SELECTED ANSWERS
   ========================================================= */

function restoreSelectedAnswers(index) {

  const selected =
    window.selectedAnswers?.[index];

  if (!Array.isArray(selected)) {
    return;
  }

  const inputs =
    document.getElementsByName(
      `q${index}`
    );

  inputs.forEach(
    input => {

      input.checked =
        selected.includes(
          input.value
        );
    }
  );
}


/* =========================================================
   CHECK ANSWER
   ========================================================= */

function checkAnswer(
  index,
  correctAnswers,
  inputType,
  explanation,
  markAsSubmitted = false
) {

  const question =
    window.quizData[index];

  if (!question) {
    return false;
  }

  const inputs =
    document.getElementsByName(
      `q${index}`
    );

  const selected = [];

  inputs.forEach(
    input => {

      if (input.checked) {

        selected.push(
          input.value
        );
      }
    }
  );

  window.selectedAnswers[index] =
    selected;

  const result =
    document.getElementById(
      `result${index}`
    );

  const explanationDiv =
    document.getElementById(
      `explanation${index}`
    );

  const block =
    document.getElementById(
      `question-${index}`
    );


  /* -----------------------------------------------
     NOTHING SELECTED
  ------------------------------------------------ */

  if (
    selected.length === 0
  ) {

    result.textContent =
      "⚠️ Unanswered";

    result.className =
      "result missed";

    explanationDiv.textContent =
      "";

    block.classList.add(
      "highlight-missed"
    );

    if (markAsSubmitted) {

      window.userAnswers[index] = {

        selected: [],

        translated: [],

        isCorrect: false,

        unanswered: true,

        submitted: true
      };
    }

    return false;
  }


  /* -----------------------------------------------
     TRANSLATE DISPLAYED ANSWERS
     BACK TO ORIGINAL ANSWERS
  ------------------------------------------------ */

  const reverseMap =
    question.choiceMap;

  const translated =
    selected.map(
      value =>
        reverseMap[value]
    );


  /* -----------------------------------------------
     COMPARE ANSWERS
  ------------------------------------------------ */

  const correctSet =
    new Set(
      correctAnswers
    );

  const selectedSet =
    new Set(
      translated
    );

  const isCorrect =
    selectedSet.size ===
      correctSet.size &&
    [
      ...correctSet
    ].every(
      answer =>
        selectedSet.has(
          answer
        )
    );


  /* -----------------------------------------------
     DISPLAY RESULT
  ------------------------------------------------ */

  result.textContent =
    isCorrect
      ? "✅ Correct!"
      : `❌ Incorrect. Correct answer${
          correctAnswers.length > 1
            ? "s"
            : ""
        }: ${correctAnswers.join(", ")}`;

  result.className =
    "result " +
    (
      isCorrect
        ? "correct"
        : "incorrect"
    );


  /* -----------------------------------------------
     HIGHLIGHT MISSED QUESTIONS
  ------------------------------------------------ */

  if (!isCorrect) {

    block.classList.add(
      "highlight-missed"
    );

  } else {

    block.classList.remove(
      "highlight-missed"
    );
  }


  /* -----------------------------------------------
     EXPLANATION
  ------------------------------------------------ */

  explanationDiv.textContent =
    explanation || "";


  /* -----------------------------------------------
     STORE ANSWER ONLY AFTER SUBMIT
  ------------------------------------------------ */

  if (markAsSubmitted) {

    window.userAnswers[index] = {

      selected,

      translated,

      isCorrect,

      unanswered: false,

      submitted: true
    };
  }

  return isCorrect;
}


/* =========================================================
   SHOW QUESTION
   ========================================================= */

function showQuestion(index) {

  if (
    !window.quizData ||
    !window.quizData.length
  ) {

    return;
  }

  if (
    index < 0 ||
    index >= window.quizData.length
  ) {

    return;
  }

  document
    .querySelectorAll(
      ".question-block"
    )
    .forEach(
      block =>
        block.classList.remove(
          "active"
        )
    );

  const block =
    document.getElementById(
      `question-${index}`
    );

  if (!block) {
    return;
  }

  block.classList.add(
    "active"
  );

  restoreSelectedAnswers(
    index
  );

  block.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  currentQuestionIndex =
    index;

  prevBtn.disabled =
    index === 0;

  nextBtn.disabled =
    index ===
    window.quizData.length - 1;

  speakQuestion(index);
}


/* =========================================================
   FINISH QUIZ
   ========================================================= */

async function finishQuiz() {

  const total =
    window.totalQuestions || 0;

  if (!total) {
    return;
  }

  let correct = 0;

  const list =
    document.getElementById(
      "summaryList"
    );

  list.innerHTML =
    "";


  /* -----------------------------------------------
     CHECK EVERY QUESTION
  ------------------------------------------------ */

  for (
    let i = 0;
    i < total;
    i++
  ) {

    const q =
      window.quizData[i];

    const inputType =
      q.answers.length > 1
        ? "checkbox"
        : "radio";

    const wasSubmitted =
      window.userAnswers[i] !==
      undefined;

    let isCorrect;

    if (wasSubmitted) {

      isCorrect =
        window.userAnswers[i]
          .isCorrect;

    } else {

      isCorrect =
        checkAnswer(
          i,
          q.answers,
          inputType,
          q.explanation,
          true
        );
    }

    if (isCorrect) {
      correct++;
    }


    /* ---------------------------------------------
       SUMMARY ENTRY
    --------------------------------------------- */

    const li =
      document.createElement(
        "li"
      );

    const answerRecord =
      window.userAnswers[i];

    const answered =
      answerRecord !==
      undefined;

    const unanswered =
      answerRecord?.unanswered === true;

    li.textContent =
      `Question ${i + 1} – ` +
      (
        unanswered
          ? "⚠️ Unanswered"
          : answered
            ? (
                isCorrect
                  ? "✅ Correct"
                  : "❌ Incorrect"
              )
            : "⚠️ Unanswered"
      );

    li.style.cursor =
      "pointer";

    li.addEventListener(
      "click",
      () => {

        showQuestion(i);

        const questionBlock =
          document.getElementById(
            `question-${i}`
          );

        if (questionBlock) {

          questionBlock.classList.add(
            "flash-highlight"
          );

          setTimeout(
            () =>
              questionBlock.classList.remove(
                "flash-highlight"
              ),
            1000
          );
        }
      }
    );

    list.appendChild(
      li
    );
  }


  /* -----------------------------------------------
     SCORE
  ------------------------------------------------ */

  const percent =
    total > 0
      ? Math.round(
          (correct / total) *
          100
        )
      : 0;

  finalScore.textContent =
    `Final Score: ${percent}% (${correct}/${total})`;

  window.quizFinished =
    true;


  /* -----------------------------------------------
     BUILD RESULT FOR GOOGLE SHEETS
  ------------------------------------------------ */

  const result = {

    id:
      `result-${Date.now()}`,

    quizId:
      window.currentQuizId ||
      "quiz",

    completedAt:
      new Date().toISOString(),

    score:
      percent,

    correct,

    total,

    /*
     * IMPORTANT:
     *
     * Every question is included here.
     *
     * Unanswered questions have:
     * answerId: []
     *
     * Google Apps Script will NEVER save
     * records where answerId is empty.
     */
    answers:
      window.quizData.map(
        (q, index) => {

          const answer =
            window.userAnswers[index];

          const selectedAnswers =
            answer &&
            Array.isArray(
              answer.translated
            )
              ? answer.translated
              : [];

          const unanswered =
            selectedAnswers.length === 0;

          return {

            questionId:
              q.id,

            answerId:
              selectedAnswers,

            correctAnswer:
              q.answers,

            isCorrect:
              unanswered
                ? false
                : Boolean(
                    answer.isCorrect
                  ),

            unanswered
          };
        }
      )
  };


  /* -----------------------------------------------
     SAVE RESULT TO GOOGLE SHEETS
  ------------------------------------------------ */

  if (!activeProfileFile) {

    console.warn(
      "No active profile. Quiz result was not saved."
    );

    return;
  }

  try {

    await saveQuizResultToGoogleSheets(
      activeProfileFile,
      result
    );

    console.log(
      "Quiz result saved to Google Sheets:",
      result
    );

  } catch (error) {

    console.error(
      "Could not save quiz result:",
      error
    );

    alert(
      "Quiz finished, but the result could not be saved to Google Sheets.\n\n" +
      error.message
    );
  }
}


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


/* =========================================================
   VOICE / SPEECH
   ========================================================= */

function speak(text) {

  if (
    !window.speechSynthesis
  ) {

    return;
  }

  window.speechSynthesis.cancel();

  const utter =
    new SpeechSynthesisUtterance(
      text
    );

  window.speechSynthesis.speak(
    utter
  );
}


/* =========================================================
   LISTEN ONCE
   ========================================================= */

function listenOnce(callback) {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    alert(
      "Voice recognition not supported"
    );

    return;
  }

  const rec =
    new SpeechRecognition();

  rec.lang =
    "en-US";

  rec.interimResults =
    false;

  rec.maxAlternatives =
    1;

  rec.onresult =
    evt => {

      const text =
        evt.results[0][0]
          .transcript
          .trim();

      callback(text);
    };

  rec.onerror =
    e =>
      console.error(
        "Speech error:",
        e.error
      );

  rec.start();
}


/* =========================================================
   SPEAK CURRENT QUESTION
   ========================================================= */

function speakQuestion(index) {

  const q =
    window.quizData[index];

  if (!q) {
    return;
  }

  if (
    !autoReadToggle.checked
  ) {

    return;
  }

  let txt =
    `${q.questionText}. Options: `;

  for (
    const [
      label,
      originalLabel
    ] of Object.entries(
      q.choiceMap
    )
  ) {

    const choiceText =
      q.choices[
        originalLabel
      ];

    txt +=
      `${label}: ${choiceText}. `;
  }

  speak(txt);

  if (
    voiceToggle.checked
  ) {

    setTimeout(
      () =>
        listenForVoiceAnswer(
          index
        ),
      2200
    );
  }
}


/* =========================================================
   VOICE TOGGLE
   ========================================================= */

function handleVoiceToggle() {

  voiceOutput.innerHTML =
    voiceToggle.checked
      ? "🎤 Voice recognition enabled."
      : "🔇 Voice recognition disabled.";
}


/* =========================================================
   AUTO READ TOGGLE
   ========================================================= */

function handleAutoReadToggle() {

  voiceOutput.innerHTML =
    autoReadToggle.checked
      ? "🗣️ Auto reading enabled."
      : "🔇 Auto reading disabled.";
}


/* =========================================================
   VOICE ANSWER
   ========================================================= */

function listenForVoiceAnswer(index) {

  const q =
    window.quizData[index];

  if (!q) {
    return;
  }

  listenOnce(
    spoken => {

      spoken =
        spoken.toLowerCase();

      let chosenLabel =
        null;

      for (
        const [
          newLabel,
          origLabel
        ] of Object.entries(
          q.choiceMap
        )
      ) {

        const choiceText =
          q.choices[
            origLabel
          ].toLowerCase();

        if (
          spoken ===
            newLabel.toLowerCase() ||
          spoken.includes(
            choiceText
          )
        ) {

          chosenLabel =
            newLabel;

          break;
        }
      }

      if (!chosenLabel) {

        speak(
          "I did not recognize that. Please try again."
        );

        return;
      }

      const input =
        document.querySelector(
          `input[name="q${index}"][value="${chosenLabel}"]`
        );

      if (input) {

        input.checked =
          true;

        input.dispatchEvent(
          new Event(
            "change",
            {
              bubbles: true
            }
          )
        );
      }

      speak(
        "Answer selected."
      );
    }
  );
}
