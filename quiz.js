let currentQuestionIndex = 0;

let activeProfileFile = null;

window.quizData = [];
window.userAnswers = [];
window.quizFinished = false;


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeUI();
  initializeProfiles();
});


function initializeUI() {
  const fileInput = document.getElementById("fileInput");
  const finishBtn = document.getElementById("finishQuizBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const restartBtn = document.getElementById("restart");
  const loadQuizBtn = document.getElementById("loadQuizFileBtn");
  const loadProfileBtn = document.getElementById("loadProfileBtn");
  const voiceToggle = document.getElementById("voiceToggle");

  if (fileInput) {
    fileInput.addEventListener("change", handleFileUpload);
  }

  if (finishBtn) {
    finishBtn.addEventListener("click", finishQuiz);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", previousQuestion);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", nextQuestion);
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", resetQuiz);
  }

  if (loadQuizBtn) {
    loadQuizBtn.addEventListener("click", loadSelectedQuiz);
  }

  if (loadProfileBtn) {
    loadProfileBtn.addEventListener("click", handleProfileSelection);
  }

  if (voiceToggle) {
    voiceToggle.addEventListener("change", handleVoiceToggle);
  }

  updateNavigationButtons();
}


/* =========================================================
   PROFILE MANAGEMENT
   ========================================================= */

async function initializeProfiles() {
  const profileSelect =
    document.getElementById("profileSelect");

  const profileStatus =
    document.getElementById("profileStatus");

  if (!profileSelect) {
    console.error(
      "profileSelect element was not found."
    );
    return;
  }

  try {
    profileSelect.innerHTML =
      '<option value="">Loading profiles...</option>';

    if (profileStatus) {
      profileStatus.textContent =
        "Connecting to GitHub...";
    }

    const profiles =
      await getAvailableProfiles();

    console.log(
      "Profiles received:",
      profiles
    );

    profileSelect.innerHTML = "";

    if (!profiles || profiles.length === 0) {
      profileSelect.innerHTML =
        '<option value="">No profiles found</option>';

      if (profileStatus) {
        profileStatus.textContent =
          "No .json files found in profiles/.";
      }

      return;
    }

    /*
     * Add all existing JSON profile files.
     */
    profiles.forEach(file => {
      const option =
        document.createElement("option");

      option.value = file.name;

      option.textContent =
        file.name.replace(
          /\.json$/i,
          ""
        );

      profileSelect.appendChild(option);
    });

    /*
     * default.json is the default selection.
     *
     * We deliberately do NOT restore a previous
     * localStorage profile here. This means
     * default.json is always the initial selection.
     */
    const defaultProfile =
      profiles.find(
        file =>
          file.name.toLowerCase() ===
          "default.json"
      );

    if (defaultProfile) {
      profileSelect.value =
        defaultProfile.name;

      console.log(
        "Default profile selected:",
        defaultProfile.name
      );
    } else {
      /*
       * Fallback if default.json does not exist.
       */
      profileSelect.value =
        profiles[0].name;
    }

    if (profileStatus) {
      profileStatus.textContent =
        `${profiles.length} profile(s) available.`;
    }

  } catch (error) {
    console.error(
      "Failed to load profiles:",
      error
    );

    profileSelect.innerHTML =
      '<option value="">Error loading profiles</option>';

    if (profileStatus) {
      profileStatus.textContent =
        "Error: " + error.message;
    }
  }
}


async function handleProfileSelection() {
  const profileSelect =
    document.getElementById("profileSelect");

  const profileStatus =
    document.getElementById("profileStatus");

  const quizSetupBlock =
    document.getElementById("quizSetupBlock");

  if (!profileSelect) {
    return;
  }

  const profileFile =
    profileSelect.value;

  if (!profileFile) {
    if (profileStatus) {
      profileStatus.textContent =
        "Please select a profile.";
    }

    return;
  }

  try {
    if (profileStatus) {
      profileStatus.textContent =
        "Loading profile...";
    }

    /*
     * loadProfile() is supplied by github.js.
     *
     * github.js owns activeProfile.
     */
    const profile =
      await loadProfile(profileFile);

    /*
     * quiz.js only needs to remember which
     * profile file is currently selected.
     */
    activeProfileFile =
      profileFile;

    /*
     * Remember only the filename locally.
     *
     * The actual profile data remains in GitHub.
     */
    localStorage.setItem(
      "quizEngineProfile",
      profileFile
    );

    if (profileStatus) {
      const profileName =
        profile?.name ||
        profile?.id ||
        profileFile.replace(
          /\.json$/i,
          ""
        );

      profileStatus.textContent =
        `Profile loaded: ${profileName}`;
    }

    if (quizSetupBlock) {
      quizSetupBlock.style.display =
        "block";
    }

    resetQuizStateOnly();

  } catch (error) {
    console.error(
      "Failed to load profile:",
      error
    );

    activeProfileFile =
      null;

    if (profileStatus) {
      profileStatus.textContent =
        "Failed to load profile: " +
        error.message;
    }
  }
}


/* =========================================================
   QUIZ LOADING
   ========================================================= */

async function loadSelectedQuiz() {
  const quizFileSelect =
    document.getElementById(
      "quizFileSelect"
    );

  if (!quizFileSelect) {
    return;
  }

  const filePath =
    quizFileSelect.value;

  if (!filePath) {
    return;
  }

  try {
    const response =
      await fetch(filePath);

    if (!response.ok) {
      throw new Error(
        `Unable to load quiz (${response.status})`
      );
    }

    const text =
      await response.text();

    loadQuizFromText(
      text,
      filePath
    );

  } catch (error) {
    console.error(
      "Failed to load quiz:",
      error
    );

    const finalScore =
      document.getElementById(
        "finalScore"
      );

    if (finalScore) {
      finalScore.textContent =
        "Failed to load quiz: " +
        error.message;
    }
  }
}


async function handleFileUpload(event) {
  const file =
    event.target.files[0];

  if (!file) {
    return;
  }

  try {
    const text =
      await file.text();

    loadQuizFromText(
      text,
      "uploaded-quiz"
    );

  } catch (error) {
    console.error(
      "Failed to read quiz file:",
      error
    );

    const finalScore =
      document.getElementById(
        "finalScore"
      );

    if (finalScore) {
      finalScore.textContent =
        "Failed to read quiz file: " +
        error.message;
    }
  }
}


function loadQuizFromText(
  text,
  quizSource
) {
  try {
    const questions =
      parseQuestions(text);

    if (!questions.length) {
      throw new Error(
        "No questions found in the quiz file."
      );
    }

    window.quizData =
      questions;

    /*
     * Store quiz ID as a property on the
     * question array.
     */
    window.quizData.quizId =
      getQuizIdFromSource(
        quizSource
      );

    window.userAnswers =
      new Array(
        questions.length
      ).fill(null);

    currentQuestionIndex = 0;

    window.quizFinished =
      false;

    clearQuizResults();

    /*
     * Render questions.
     */
    renderQuiz(
      window.quizData
    );

    /*
     * Apply question shuffle after
     * the quiz has been parsed.
     */
    const shuffleQuestionsToggle =
      document.getElementById(
        "shuffleToggle"
      );

    if (
      shuffleQuestionsToggle &&
      shuffleQuestionsToggle.checked
    ) {
      shuffleArray(
        window.quizData
      );

      currentQuestionIndex = 0;

      renderQuiz(
        window.quizData
      );
    }

    updateNavigationButtons();

  } catch (error) {
    console.error(
      "Failed to parse quiz:",
      error
    );

    const finalScore =
      document.getElementById(
        "finalScore"
      );

    if (finalScore) {
      finalScore.textContent =
        "Failed to load quiz: " +
        error.message;
    }
  }
}


function getQuizIdFromSource(
  source
) {
  if (!source) {
    return "unknown-quiz";
  }

  if (source === "uploaded-quiz") {
    return "uploaded-quiz";
  }

  const filename =
    source
      .split("/")
      .pop()
      .replace(
        /\.[^/.]+$/,
        ""
      );

  return filename ||
    "unknown-quiz";
}


/* =========================================================
   QUIZ PARSER
   ========================================================= */

function parseQuestions(text) {
  const questions = [];

  const blocks =
    text
      .replace(/\r\n/g, "\n")
      .split(
        /\n(?=\s*\d+\.\s+)/
      )
      .map(
        block => block.trim()
      )
      .filter(Boolean);

  for (const block of blocks) {
    const lines =
      block
        .split("\n")
        .map(
          line => line.trim()
        )
        .filter(
          line => line.length > 0
        );

    if (!lines.length) {
      continue;
    }

    const questionMatch =
      lines[0].match(
        /^(\d+)\.\s*(.*)$/
      );

    if (!questionMatch) {
      continue;
    }

    const originalNumber =
      questionMatch[1];

    let questionText =
      questionMatch[2].trim();

    const choices = [];

    let answers = [];

    let explanation = "";

    let currentChoice =
      null;

    let explanationStarted =
      false;

    let answerStarted =
      false;

    for (
      let i = 1;
      i < lines.length;
      i++
    ) {
      const line =
        lines[i];

      /*
       * Answer:
       * Answer: A
       * Answer: A, C
       * Answer: A,C
       */
      const answerMatch =
        line.match(
          /^Answer\s*:\s*(.*)$/i
        );

      if (answerMatch) {
        answerStarted =
          true;

        explanationStarted =
          false;

        answers =
          answerMatch[1]
            .split(/[,\s]+/)
            .map(
              value =>
                value
                  .trim()
                  .toUpperCase()
            )
            .filter(
              value =>
                /^[A-E]$/.test(
                  value
                )
            );

        currentChoice =
          null;

        continue;
      }

      /*
       * Explanation:
       */
      const explanationMatch =
        line.match(
          /^Explanation\s*:\s*(.*)$/i
        );

      if (explanationMatch) {
        explanationStarted =
          true;

        answerStarted =
          false;

        explanation =
          explanationMatch[1].trim();

        currentChoice =
          null;

        continue;
      }

      /*
       * Explanation continuation.
       */
      if (explanationStarted) {
        explanation +=
          (explanation
            ? " "
            : "") +
          line;

        continue;
      }

      /*
       * Ignore lines after Answer
       * until Explanation.
       */
      if (answerStarted) {
        continue;
      }

      /*
       * Answer choice A-E.
       */
      const choiceMatch =
        line.match(
          /^([A-E])[\.\):\-]\s*(.*)$/i
        );

      if (choiceMatch) {
        const label =
          choiceMatch[1]
            .toUpperCase();

        const textValue =
          choiceMatch[2].trim();

        currentChoice = {
          label,
          text: textValue
        };

        choices.push(
          currentChoice
        );

        continue;
      }

      /*
       * Question continuation.
       */
      if (choices.length === 0) {
        questionText +=
          " " + line;
      } else if (currentChoice) {
        /*
         * Multi-line answer choice.
         */
        currentChoice.text +=
          " " + line;
      }
    }

    if (!choices.length) {
      continue;
    }

    if (!answers.length) {
      console.warn(
        `Question ${originalNumber} has no answer key.`
      );
    }

    const questionId =
      createQuestionId(
        originalNumber,
        questionText
      );

    questions.push({
      id: questionId,

      originalNumber,

      questionText,

      choices,

      answers,

      explanation,

      /*
       * Maps displayed A-E to original
       * answer A-E.
       */
      choiceMap: {}
    });
  }

  return questions;
}


function createQuestionId(
  originalNumber,
  questionText
) {
  /*
   * Stable ID based on original question number.
   */
  if (originalNumber) {
    return `q-${originalNumber}`;
  }

  return (
    "q-" +
    simpleHash(
      questionText
    )
  );
}


function simpleHash(value) {
  let hash = 0;

  for (
    let i = 0;
    i < value.length;
    i++
  ) {
    hash =
      ((hash << 5) - hash) +
      value.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(
    hash
  ).toString(16);
}


/* =========================================================
   QUIZ RENDERING
   ========================================================= */

function renderQuiz(
  questions
) {
  const container =
    document.getElementById(
      "quizContainer"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    "";

  questions.forEach(
    (question, index) => {
      const questionBlock =
        document.createElement(
          "div"
        );

      questionBlock.className =
        "question-block";

      questionBlock.dataset.questionIndex =
        index;

      const title =
        document.createElement(
          "h3"
        );

      title.textContent =
        `${index + 1}. ${question.questionText}`;

      questionBlock.appendChild(
        title
      );

      /*
       * Copy choices before shuffling.
       */
      const choices =
        [...question.choices];

      const shuffleAnswers =
        document.getElementById(
          "shuffleAnswersToggle"
        )?.checked;

      if (shuffleAnswers) {
        shuffleArray(
          choices
        );
      }

      /*
       * Create mapping between displayed
       * labels and original labels.
       *
       * Example:
       *
       * Display A -> original C
       * Display B -> original A
       * Display C -> original D
       */
      question.choiceMap =
        {};

      const isMultipleAnswer =
        question.answers.length >
        1;

      choices.forEach(
        (
          choice,
          displayIndex
        ) => {
          const displayLabel =
            String.fromCharCode(
              65 + displayIndex
            );

          question.choiceMap[
            displayLabel
          ] =
            choice.label;

          const label =
            document.createElement(
              "label"
            );

          label.className =
            "answer-option";

          const input =
            document.createElement(
              "input"
            );

          input.type =
            isMultipleAnswer
              ? "checkbox"
              : "radio";

          input.name =
            `question-${index}`;

          /*
           * Value is the displayed label.
           */
          input.value =
            displayLabel;

          input.addEventListener(
            "change",
            () => {
              if (
                window.quizFinished
              ) {
                return;
              }

              checkAnswer(
                index,
                question.answers,
                isMultipleAnswer
                  ? "checkbox"
                  : "radio",
                question.explanation,
                false
              );
            }
          );

          const text =
            document.createElement(
              "span"
            );

          text.textContent =
            `${displayLabel}. ${choice.text}`;

          label.appendChild(
            input
          );

          label.appendChild(
            text
          );

          questionBlock.appendChild(
            label
          );
        }
      );

      const feedback =
        document.createElement(
          "div"
        );

      feedback.id =
        `feedback-${index}`;

      feedback.className =
        "question-feedback";

      feedback.style.marginTop =
        "10px";

      questionBlock.appendChild(
        feedback
      );

      container.appendChild(
        questionBlock
      );
    }
  );

  showQuestion(
    currentQuestionIndex
  );
}


/* =========================================================
   QUESTION NAVIGATION
   ========================================================= */

function showQuestion(
  index
) {
  const questions =
    document.querySelectorAll(
      ".question-block"
    );

  if (!questions.length) {
    return;
  }

  if (index < 0) {
    index = 0;
  }

  if (
    index >=
    questions.length
  ) {
    index =
      questions.length - 1;
  }

  currentQuestionIndex =
    index;

  questions.forEach(
    (
      question,
      i
    ) => {
      question.style.display =
        i === currentQuestionIndex
          ? "block"
          : "none";
    }
  );

  updateNavigationButtons();

  restoreAnswerSelection(
    currentQuestionIndex
  );

  speakCurrentQuestionIfEnabled();
}


function nextQuestion() {
  if (!window.quizData.length) {
    return;
  }

  if (
    currentQuestionIndex <
    window.quizData.length - 1
  ) {
    currentQuestionIndex++;

    showQuestion(
      currentQuestionIndex
    );
  }
}


function previousQuestion() {
  if (!window.quizData.length) {
    return;
  }

  if (
    currentQuestionIndex > 0
  ) {
    currentQuestionIndex--;

    showQuestion(
      currentQuestionIndex
    );
  }
}


function updateNavigationButtons() {
  const prevBtn =
    document.getElementById(
      "prevBtn"
    );

  const nextBtn =
    document.getElementById(
      "nextBtn"
    );

  const finishBtn =
    document.getElementById(
      "finishQuizBtn"
    );

  const hasQuiz =
    window.quizData &&
    window.quizData.length >
      0;

  if (prevBtn) {
    prevBtn.disabled =
      !hasQuiz ||
      currentQuestionIndex === 0;
  }

  if (nextBtn) {
    nextBtn.disabled =
      !hasQuiz ||
      currentQuestionIndex >=
        window.quizData.length - 1;
  }

  if (finishBtn) {
    finishBtn.disabled =
      !hasQuiz ||
      window.quizFinished;
  }
}


/* =========================================================
   ANSWER HANDLING
   ========================================================= */

function checkAnswer(
  index,
  correctAnswers,
  inputType,
  explanation,
  markAsSubmitted = true
) {
  const question =
    window.quizData[index];

  if (!question) {
    return false;
  }

  const questionBlock =
    document.querySelector(
      `.question-block[data-question-index="${index}"]`
    );

  if (!questionBlock) {
    return false;
  }

  const inputs =
    questionBlock.querySelectorAll(
      "input"
    );

  const selectedDisplayAnswers =
    [];

  inputs.forEach(
    input => {
      if (input.checked) {
        selectedDisplayAnswers.push(
          input.value.toUpperCase()
        );
      }
    }
  );

  /*
   * Convert displayed answer IDs back
   * to original answer IDs.
   */
  const selectedOriginalAnswers =
    selectedDisplayAnswers
      .map(
        displayLabel =>
          question.choiceMap[
            displayLabel
          ]
      )
      .filter(Boolean)
      .map(
        value =>
          value.toUpperCase()
      );

  const normalizedCorrect =
    correctAnswers
      .map(
        value =>
          value.toUpperCase()
      )
      .sort();

  const normalizedSelected =
    [...selectedOriginalAnswers]
      .sort();

  const isCorrect =
    normalizedCorrect.length ===
      normalizedSelected.length &&
    normalizedCorrect.every(
      (
        value,
        i
      ) =>
        value ===
        normalizedSelected[i]
    );

  /*
   * Store the original answer IDs.
   */
  window.userAnswers[index] = {
    questionId:
      question.id,

    selectedAnswers:
      selectedOriginalAnswers,

    isCorrect,

    submitted:
      markAsSubmitted
  };

  const feedback =
    document.getElementById(
      `feedback-${index}`
    );

  if (feedback) {
    if (
      selectedOriginalAnswers.length ===
      0
    ) {
      feedback.textContent =
        "No answer selected.";
    } else if (isCorrect) {
      feedback.textContent =
        explanation ||
        "Correct.";
    } else {
      feedback.textContent =
        explanation
          ? `Incorrect. ${explanation}`
          : "Incorrect.";
    }
  }

  return isCorrect;
}


function restoreAnswerSelection(
  index
) {
  const answer =
    window.userAnswers[index];

  if (!answer) {
    return;
  }

  const question =
    window.quizData[index];

  if (!question) {
    return;
  }

  const questionBlock =
    document.querySelector(
      `.question-block[data-question-index="${index}"]`
    );

  if (!questionBlock) {
    return;
  }

  const inputs =
    questionBlock.querySelectorAll(
      "input"
    );

  inputs.forEach(
    input => {
      const originalAnswer =
        question.choiceMap[
          input.value
        ];

      input.checked =
        answer.selectedAnswers.includes(
          originalAnswer
        );
    }
  );
}


/* =========================================================
   FINISH QUIZ
   ========================================================= */

async function finishQuiz() {
  if (!window.quizData.length) {
    return;
  }

  /*
   * activeProfile is owned by github.js.
   */
  const profile =
    typeof getActiveProfile ===
      "function"
      ? getActiveProfile()
      : null;

  if (
    !activeProfileFile ||
    !profile
  ) {
    alert(
      "Please select and load a profile before finishing the quiz."
    );

    return;
  }

  let score = 0;

  /*
   * Check every question.
   */
  window.quizData.forEach(
    (
      question,
      index
    ) => {
      const isCorrect =
        checkAnswer(
          index,
          question.answers,
          question.answers.length >
            1
            ? "checkbox"
            : "radio",
          question.explanation,
          true
        );

      if (isCorrect) {
        score++;
      }
    }
  );

  const total =
    window.quizData.length;

  window.quizFinished =
    true;

  const result =
    buildResultObject(
      score,
      total
    );

  try {
    showSaveStatus(
      "Saving result to profile..."
    );

    await saveQuizResult(
      activeProfileFile,
      result
    );

    showSaveStatus(
      "Result saved successfully."
    );

  } catch (error) {
    console.error(
      "Failed to save quiz result:",
      error
    );

    showSaveStatus(
      "Quiz completed, but the result could not be saved: " +
      error.message
    );
  }

  displayFinalScore(
    score,
    total
  );

  displayQuizSummary();

  updateNavigationButtons();
}


/* =========================================================
   RESULT OBJECT
   ========================================================= */

function buildResultObject(
  score,
  total
) {
  const answers =
    window.userAnswers.map(
      answer => ({
        questionId:
          answer?.questionId ||
          null,

        /*
         * Store ORIGINAL answer IDs,
         * not shuffled display positions.
         */
        answerId:
          answer?.selectedAnswers ||
          [],

        isCorrect:
          Boolean(
            answer?.isCorrect
          )
      })
    );

  return {
    id:
      createResultId(),

    quizId:
      getCurrentQuizId(),

    completedAt:
      new Date().toISOString(),

    score,

    total,

    answers
  };
}


function createResultId() {
  const now =
    new Date();

  const pad =
    value =>
      String(value)
        .padStart(
          2,
          "0"
        );

  return (
    `${now.getFullYear()}` +
    `${pad(
      now.getMonth() + 1
    )}` +
    `${pad(
      now.getDate()
    )}-` +
    `${pad(
      now.getHours()
    )}` +
    `${pad(
      now.getMinutes()
    )}` +
    `${pad(
      now.getSeconds()
    )}`
  );
}


function getCurrentQuizId() {
  if (
    window.quizData?.quizId
  ) {
    return window.quizData.quizId;
  }

  const quizSelect =
    document.getElementById(
      "quizFileSelect"
    );

  if (quizSelect?.value) {
    return getQuizIdFromSource(
      quizSelect.value
    );
  }

  return "unknown-quiz";
}


/* =========================================================
   SCORE DISPLAY
   ========================================================= */

function displayFinalScore(
  score,
  total
) {
  const finalScore =
    document.getElementById(
      "finalScore"
    );

  if (!finalScore) {
    return;
  }

  const percentage =
    total > 0
      ? Math.round(
          (score / total) * 100
        )
      : 0;

  finalScore.innerHTML =
    `<strong>Score: ${score} / ${total} (${percentage}%)</strong>`;
}


/* =========================================================
   SUMMARY
   ========================================================= */

function displayQuizSummary() {
  const summaryBlock =
    document.getElementById(
      "quizSummary"
    );

  const summaryList =
    document.getElementById(
      "summaryList"
    );

  if (
    !summaryBlock ||
    !summaryList
  ) {
    return;
  }

  summaryList.innerHTML =
    "";

  window.quizData.forEach(
    (
      question,
      index
    ) => {
      const answer =
        window.userAnswers[index];

      const item =
        document.createElement(
          "li"
        );

      const status =
        answer?.isCorrect
          ? "✓"
          : "✗";

      item.textContent =
        `${status} Question ${index + 1}`;

      item.style.cursor =
        "pointer";

      item.addEventListener(
        "click",
        () => {
          showQuestion(
            index
          );
        }
      );

      summaryList.appendChild(
        item
      );
    }
  );

  summaryBlock.style.display =
    "block";
}


function showSaveStatus(
  message
) {
  const finalScore =
    document.getElementById(
      "finalScore"
    );

  if (!finalScore) {
    return;
  }

  const status =
    document.createElement(
      "div"
    );

  status.style.marginTop =
    "10px";

  status.textContent =
    message;

  finalScore.appendChild(
    status
  );
}


/* =========================================================
   RESET
   ========================================================= */

function resetQuiz() {
  resetQuizStateOnly();

  const quizContainer =
    document.getElementById(
      "quizContainer"
    );

  if (quizContainer) {
    quizContainer.innerHTML =
      "";
  }

  const quizSummary =
    document.getElementById(
      "quizSummary"
    );

  if (quizSummary) {
    quizSummary.style.display =
      "none";
  }

  const finalScore =
    document.getElementById(
      "finalScore"
    );

  if (finalScore) {
    finalScore.innerHTML =
      "";
  }

  updateNavigationButtons();
}


function resetQuizStateOnly() {
  currentQuestionIndex =
    0;

  window.quizData =
    [];

  window.userAnswers =
    [];

  window.quizFinished =
    false;

  const quizContainer =
    document.getElementById(
      "quizContainer"
    );

  if (quizContainer) {
    quizContainer.innerHTML =
      "";
  }

  const finalScore =
    document.getElementById(
      "finalScore"
    );

  if (finalScore) {
    finalScore.innerHTML =
      "";
  }

  const quizSummary =
    document.getElementById(
      "quizSummary"
    );

  if (quizSummary) {
    quizSummary.style.display =
      "none";
  }

  updateNavigationButtons();
}


function clearQuizResults() {
  const finalScore =
    document.getElementById(
      "finalScore"
    );

  if (finalScore) {
    finalScore.innerHTML =
      "";
  }

  const summaryBlock =
    document.getElementById(
      "quizSummary"
    );

  const summaryList =
    document.getElementById(
      "summaryList"
    );

  if (summaryBlock) {
    summaryBlock.style.display =
      "none";
  }

  if (summaryList) {
    summaryList.innerHTML =
      "";
  }
}


/* =========================================================
   SHUFFLE
   ========================================================= */

function shuffleArray(
  array
) {
  for (
    let i =
      array.length - 1;
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

  return array;
}


/* =========================================================
   QUESTION SHUFFLING
   ========================================================= */

function shuffleQuestions() {
  if (!window.quizData.length) {
    return;
  }

  const shuffleToggle =
    document.getElementById(
      "shuffleToggle"
    );

  if (
    !shuffleToggle?.checked
  ) {
    return;
  }

  shuffleArray(
    window.quizData
  );

  currentQuestionIndex =
    0;

  renderQuiz(
    window.quizData
  );
}


/* =========================================================
   VOICE RECOGNITION
   ========================================================= */

let recognition = null;


function handleVoiceToggle(
  event
) {
  if (event.target.checked) {
    startVoiceRecognition();
  } else {
    stopVoiceRecognition();
  }
}


function startVoiceRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert(
      "Voice recognition is not supported by this browser."
    );

    const voiceToggle =
      document.getElementById(
        "voiceToggle"
      );

    if (voiceToggle) {
      voiceToggle.checked =
        false;
    }

    return;
  }

  if (recognition) {
    return;
  }

  recognition =
    new SpeechRecognition();

  recognition.continuous =
    true;

  recognition.interimResults =
    false;

  recognition.lang =
    document.documentElement
      .lang ||
    "en-US";

  recognition.onresult =
    event => {
      const result =
        event.results[
          event.results.length - 1
        ];

      if (
        !result ||
        !result[0]
      ) {
        return;
      }

      const transcript =
        result[0].transcript
          .trim()
          .toUpperCase();

      handleVoiceAnswer(
        transcript
      );
    };

  recognition.onerror =
    event => {
      console.error(
        "Voice recognition error:",
        event.error
      );
    };

  recognition.onend =
    () => {
      const voiceToggle =
        document.getElementById(
          "voiceToggle"
        );

      if (
        voiceToggle?.checked &&
        recognition
      ) {
        try {
          recognition.start();
        } catch (error) {
          console.warn(
            "Could not restart voice recognition.",
            error
          );
        }
      }
    };

  try {
    recognition.start();
  } catch (error) {
    console.error(
      "Failed to start voice recognition:",
      error
    );
  }
}


function stopVoiceRecognition() {
  if (!recognition) {
    return;
  }

  try {
    recognition.stop();
  } catch (error) {
    console.warn(
      "Failed to stop voice recognition:",
      error
    );
  }

  recognition =
    null;
}


function handleVoiceAnswer(
  transcript
) {
  if (!window.quizData.length) {
    return;
  }

  const answerMap = {
    "A": "A",
    "AY": "A",
    "HEY": "A",

    "B": "B",
    "BE": "B",

    "C": "C",
    "SEE": "C",
    "SEA": "C",

    "D": "D",
    "DEE": "D",

    "E": "E",
    "EE": "E"
  };

  let answer =
    answerMap[transcript];

  if (!answer) {
    const match =
      transcript.match(
        /\b([A-E])\b/
      );

    if (match) {
      answer =
        match[1];
    }
  }

  if (!answer) {
    return;
  }

  selectVoiceAnswer(
    answer
  );
}


function selectVoiceAnswer(
  answer
) {
  const questionBlock =
    document.querySelector(
      `.question-block[data-question-index="${currentQuestionIndex}"]`
    );

  if (!questionBlock) {
    return;
  }

  const inputs =
    questionBlock.querySelectorAll(
      "input"
    );

  inputs.forEach(
    input => {
      if (
        input.value ===
        answer
      ) {
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
    }
  );
}


/* =========================================================
   TEXT TO SPEECH
   ========================================================= */

function speakCurrentQuestionIfEnabled() {
  const autoReadToggle =
    document.getElementById(
      "autoReadToggle"
    );

  if (
    !autoReadToggle?.checked
  ) {
    return;
  }

  const question =
    window.quizData[
      currentQuestionIndex
    ];

  if (!question) {
    return;
  }

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  const text =
    question.questionText +
    ". " +
    question.choices
      .map(
        choice =>
          `${choice.label}. ${choice.text}`
      )
      .join(". ");

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================================================
   PROFILE INFORMATION
   ========================================================= */

function getSelectedProfileFile() {
  return activeProfileFile;
}


window.getSelectedProfileFile =
  getSelectedProfileFile;
