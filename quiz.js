/* =========================================================
   QUIZ ENGINE
   ========================================================= */

let currentQuestionIndex = 0;

let activeProfileFile = null;
let activeProfile = null;

window.quizData = [];
window.userAnswers = [];

let quizFinished = false;


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  initializeUI();
  await initializeProfiles();
});


function initializeUI() {
  const fileInput = document.getElementById("fileInput");
  const finishBtn = document.getElementById("finishQuizBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const restartBtn = document.getElementById("restart");
  const loadQuizBtn = document.getElementById("loadQuizFileBtn");
  const loadProfileBtn = document.getElementById("loadProfileBtn");

  if (fileInput) {
    fileInput.addEventListener("change", handleFile);
  }

  if (finishBtn) {
    finishBtn.addEventListener("click", finishQuiz);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (!window.quizData.length) return;

      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion(currentQuestionIndex);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!window.quizData.length) return;

      if (currentQuestionIndex < window.quizData.length - 1) {
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex);
      }
    });
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

  const voiceToggle = document.getElementById("voiceToggle");

  if (voiceToggle) {
    voiceToggle.addEventListener("change", () => {
      const voiceOutput = document.getElementById("voiceOutput");

      if (!voiceToggle.checked && voiceOutput) {
        voiceOutput.textContent = "";
      }
    });
  }
}


/* =========================================================
   PROFILE MANAGEMENT
   ========================================================= */

async function initializeProfiles() {
  const profileSelect = document.getElementById("profileSelect");
  const profileStatus = document.getElementById("profileStatus");

  if (!profileSelect) {
    return;
  }

  try {
    profileSelect.innerHTML =
      '<option value="">Loading profiles...</option>';

    if (profileStatus) {
      profileStatus.textContent = "Loading profiles...";
    }

    const files = await getAvailableProfiles();

    profileSelect.innerHTML = "";

    if (!files.length) {
      profileSelect.innerHTML =
        '<option value="">No profiles found</option>';

      if (profileStatus) {
        profileStatus.textContent =
          "No JSON profile files were found in profiles/.";
      }

      return;
    }

    const rememberedProfile =
      localStorage.getItem("quizEngineProfile");

    files.forEach(file => {
      const option = document.createElement("option");

      option.value = file.name;

      /*
       * Display the filename without .json.
       *
       * The filename is the profile identifier.
       */
      option.textContent =
        file.name.replace(/\.json$/i, "");

      profileSelect.appendChild(option);
    });

    if (
      rememberedProfile &&
      files.some(file => file.name === rememberedProfile)
    ) {
      profileSelect.value = rememberedProfile;
    }

    if (profileStatus) {
      profileStatus.textContent =
        `${files.length} profile${files.length === 1 ? "" : "s"} available.`;
    }

  } catch (error) {
    console.error("Could not load profiles:", error);

    profileSelect.innerHTML =
      '<option value="">Unable to load profiles</option>';

    if (profileStatus) {
      profileStatus.textContent =
        "Could not load profiles from GitHub.";
    }
  }
}


async function handleProfileSelection() {
  const profileSelect = document.getElementById("profileSelect");
  const profileStatus = document.getElementById("profileStatus");
  const quizSetupBlock = document.getElementById("quizSetupBlock");

  if (!profileSelect) {
    return;
  }

  const profileFile = profileSelect.value;

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

    const profile = await loadProfile(profileFile);

    activeProfileFile = profileFile;
    activeProfile = profile;

    localStorage.setItem(
      "quizEngineProfile",
      profileFile
    );

    const displayName =
      profile.name ||
      profile.id ||
      profileFile.replace(/\.json$/i, "");

    if (profileStatus) {
      profileStatus.textContent =
        `Active profile: ${displayName}`;
    }

    if (quizSetupBlock) {
      quizSetupBlock.style.display = "block";
    }

  } catch (error) {
    console.error("Could not load profile:", error);

    activeProfileFile = null;
    activeProfile = null;

    if (quizSetupBlock) {
      quizSetupBlock.style.display = "none";
    }

    if (profileStatus) {
      profileStatus.textContent =
        "Could not load the selected profile.";
    }
  }
}


/* =========================================================
   QUIZ LOADING
   ========================================================= */

async function loadSelectedQuiz() {
  const select = document.getElementById("quizFileSelect");

  if (!select || !select.value) {
    return;
  }

  try {
    const response = await fetch(select.value);

    if (!response.ok) {
      throw new Error(
        `Could not load quiz: ${response.status}`
      );
    }

    const text = await response.text();

    const quizId = getQuizIdFromPath(select.value);

    handleQuizText(text, quizId);

  } catch (error) {
    console.error(error);

    alert(
      "Could not load the selected quiz."
    );
  }
}


async function handleFile(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();

    const quizId = getQuizIdFromPath(file.name);

    handleQuizText(text, quizId);

  } catch (error) {
    console.error(error);

    alert(
      "Could not read the quiz file."
    );
  }
}


function handleQuizText(text, quizId) {
  const questions = parseQuestions(
    text,
    quizId
  );

  if (!questions.length) {
    alert(
      "No questions were found in the quiz file."
    );

    return;
  }

  window.quizData = questions;
  window.userAnswers = [];

  currentQuestionIndex = 0;
  quizFinished = false;

  /*
   * Shuffle questions only if enabled.
   *
   * The question IDs remain attached to their
   * original questions, so saved results are stable.
   */
  const shuffleQuestions =
    document.getElementById("shuffleToggle")?.checked;

  if (shuffleQuestions) {
    shuffleArray(window.quizData);
  }

  renderQuiz(window.quizData);

  document.getElementById("quizSummary").style.display =
    "none";

  document.getElementById("finalScore").textContent =
    "";

  document.getElementById("finishQuizBtn").style.display =
    "inline-block";

  showQuestion(0);
}


/* =========================================================
   RESET
   ========================================================= */

function resetQuiz() {
  window.quizData = [];
  window.userAnswers = [];

  currentQuestionIndex = 0;
  quizFinished = false;

  const quizContainer =
    document.getElementById("quizContainer");

  const finalScore =
    document.getElementById("finalScore");

  const quizSummary =
    document.getElementById("quizSummary");

  const finishBtn =
    document.getElementById("finishQuizBtn");

  const voiceOutput =
    document.getElementById("voiceOutput");

  if (quizContainer) {
    quizContainer.innerHTML = "";
  }

  if (finalScore) {
    finalScore.textContent = "";
  }

  if (quizSummary) {
    quizSummary.style.display = "none";
  }

  if (finishBtn) {
    finishBtn.style.display = "none";
  }

  if (voiceOutput) {
    voiceOutput.textContent = "";
  }

  const fileInput =
    document.getElementById("fileInput");

  if (fileInput) {
    fileInput.value = "";
  }
}


/* =========================================================
   HELPERS
   ========================================================= */

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [array[i], array[j]] =
      [array[j], array[i]];
  }

  return array;
}


function getQuizIdFromPath(path) {
  const filename =
    path.split("/").pop();

  return filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase();
}


function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}


/*
 * Stable question ID.
 *
 * We use the quiz ID plus the original question number.
 *
 * Example:
 * pega... + question 12 -> q12
 *
 * The ID stays attached to the question even when
 * questions are shuffled.
 */
function createQuestionId(
  quizId,
  originalNumber,
  questionText
) {
  if (originalNumber) {
    return `q-${originalNumber}`;
  }

  /*
   * Fallback for question blocks without numbers.
   */
  const normalized =
    normalizeText(questionText);

  let hash = 0;

  for (let i = 0; i < normalized.length; i++) {
    hash =
      ((hash << 5) - hash) +
      normalized.charCodeAt(i);

    hash |= 0;
  }

  return `q-${Math.abs(hash)}`;
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   QUIZ PARSER
   ========================================================= */

function parseQuestions(text, quizId = "quiz") {
  const questions = [];

  /*
   * Split on numbered questions:
   *
   * 1. Question
   * 2. Question
   *
   * Also supports:
   *
   * 1) Question
   */
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(
      /(?=^\s*\d+\s*[\.\)]\s+)/m
    );

  blocks.forEach(block => {
    const cleanedBlock =
      block.trim();

    if (!cleanedBlock) {
      return;
    }

    const lines =
      cleanedBlock
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (!lines.length) {
      return;
    }

    /*
     * Read question number.
     */
    const numberMatch =
      lines[0].match(
        /^\s*(\d+)\s*[\.\)]\s*(.*)$/
      );

    let originalNumber = null;
    let questionText = "";

    let startIndex = 0;

    if (numberMatch) {
      originalNumber =
        numberMatch[1];

      questionText =
        numberMatch[2].trim();

      startIndex = 1;

    } else {
      questionText =
        lines[0].trim();

      startIndex = 1;
    }

    /*
     * Find answer choices.
     *
     * Supports:
     *
     * A. text
     * A) text
     * A - text
     */
    const choices = [];

    let currentChoice = null;

    let answerLabels = [];
    let explanationLines = [];

    let readingExplanation = false;

    for (
      let i = startIndex;
      i < lines.length;
      i++
    ) {
      const line = lines[i];

      /*
       * Answer line.
       */
      const answerMatch =
        line.match(
          /^Answer\s*:\s*(.+)$/i
        );

      if (answerMatch) {
        answerLabels =
          answerMatch[1]
            .split(/[,\s]+/)
            .map(value =>
              value
                .trim()
                .replace(/[.)]$/, "")
                .toUpperCase()
            )
            .filter(Boolean);

        continue;
      }

      /*
       * Explanation starts here.
       */
      const explanationMatch =
        line.match(
          /^Explanation\s*:\s*(.*)$/i
        );

      if (explanationMatch) {
        readingExplanation = true;

        if (explanationMatch[1].trim()) {
          explanationLines.push(
            explanationMatch[1].trim()
          );
        }

        continue;
      }

      if (readingExplanation) {
        explanationLines.push(line);
        continue;
      }

      /*
       * Choice line.
       */
      const choiceMatch =
        line.match(
          /^([A-Ea-e])\s*[\.\)\-:]\s*(.+)$/
        );

      if (choiceMatch) {
        currentChoice = {
          label:
            choiceMatch[1].toUpperCase(),

          text:
            choiceMatch[2].trim()
        };

        choices.push(currentChoice);

        continue;
      }

      /*
       * If a question or answer choice wraps onto
       * another line, append it to the previous
       * choice.
       */
      if (
        currentChoice &&
        !/^Question\s*:/i.test(line)
      ) {
        currentChoice.text +=
          " " + line;
      }
    }

    /*
     * Some quiz files may have "Question:" on
     * the first line.
     */
    questionText =
      questionText.replace(
        /^Question\s*:\s*/i,
        ""
      );

    if (
      !questionText ||
      !choices.length
    ) {
      return;
    }

    const questionId =
      createQuestionId(
        quizId,
        originalNumber,
        questionText
      );

    questions.push({
      questionId,
      originalNumber,
      questionText,
      choices,
      answers: answerLabels,
      explanation:
        explanationLines.join(" ").trim()
    });
  });

  return questions;
}


/* =========================================================
   RENDER QUIZ
   ========================================================= */

function renderQuiz(questions) {
  const container =
    document.getElementById("quizContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const shuffleAnswers =
    document.getElementById(
      "shuffleAnswersToggle"
    )?.checked;

  questions.forEach((question, index) => {

    const questionBlock =
      document.createElement("div");

    questionBlock.className =
      "question-block";

    questionBlock.dataset.index =
      index;

    questionBlock.dataset.questionId =
      question.questionId;

    const questionTitle =
      document.createElement("h3");

    questionTitle.textContent =
      `${index + 1}. ${question.questionText}`;

    questionBlock.appendChild(
      questionTitle
    );


    /*
     * Copy choices before shuffling.
     */
    let displayChoices =
      question.choices.map(choice => ({
        label: choice.label,
        text: choice.text
      }));

    if (shuffleAnswers) {
      shuffleArray(displayChoices);
    }


    /*
     * choiceMap maps the displayed answer value
     * back to the original answer label.
     *
     * Example:
     *
     * displayed "A" -> original "C"
     *
     * This is required because answer positions
     * can be shuffled.
     */
    question.choiceMap = {};

    displayChoices.forEach(
      (choice, displayIndex) => {
        const displayLabel =
          String.fromCharCode(
            65 + displayIndex
          );

        question.choiceMap[
          displayLabel
        ] = choice.label;
      }
    );


    const inputType =
      question.answers.length > 1
        ? "checkbox"
        : "radio";


    const choicesDiv =
      document.createElement("div");

    choicesDiv.className =
      "choices";


    displayChoices.forEach(
      (choice, displayIndex) => {

        const displayLabel =
          String.fromCharCode(
            65 + displayIndex
          );

        const label =
          document.createElement("label");

        const input =
          document.createElement("input");

        input.type =
          inputType;

        input.name =
          `question-${index}`;

        /*
         * IMPORTANT:
         *
         * The input value is the DISPLAY label.
         * checkAnswer() translates it back to the
         * original answer label using choiceMap.
         */
        input.value =
          displayLabel;

        input.dataset.originalAnswer =
          choice.label;

        input.addEventListener(
          "change",
          () => {
            if (!quizFinished) {
              clearQuestionResult(index);
            }
          }
        );

        label.appendChild(input);

        label.appendChild(
          document.createTextNode(
            ` ${displayLabel}. ${choice.text}`
          )
        );

        choicesDiv.appendChild(label);
      }
    );


    questionBlock.appendChild(
      choicesDiv
    );


    const resultDiv =
      document.createElement("div");

    resultDiv.className =
      "result";

    resultDiv.id =
      `result-${index}`;

    questionBlock.appendChild(
      resultDiv
    );


    const explanationDiv =
      document.createElement("div");

    explanationDiv.className =
      "explanation";

    explanationDiv.id =
      `explanation-${index}`;

    questionBlock.appendChild(
      explanationDiv
    );


    container.appendChild(
      questionBlock
    );
  });
}


/* =========================================================
   CLEAR QUESTION RESULT
   ========================================================= */

function clearQuestionResult(index) {
  const result =
    document.getElementById(
      `result-${index}`
    );

  const explanation =
    document.getElementById(
      `explanation-${index}`
    );

  if (result) {
    result.textContent = "";
    result.className = "result";
  }

  if (explanation) {
    explanation.textContent = "";
  }

  const block =
    document.querySelector(
      `.question-block[data-index="${index}"]`
    );

  if (block) {
    block.classList.remove(
      "highlight-missed"
    );
  }
}


/* =========================================================
   CHECK ANSWER
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

  const inputs =
    document.querySelectorAll(
      `input[name="question-${index}"]:checked`
    );

  /*
   * Display labels selected by the user.
   */
  const selectedDisplayAnswers =
    Array.from(inputs)
      .map(input => input.value);


  /*
   * Convert displayed labels back to the
   * ORIGINAL answer labels from the quiz.
   *
   * This makes answer shuffling transparent.
   */
  const selectedAnswers =
    selectedDisplayAnswers
      .map(displayLabel =>
        question.choiceMap?.[displayLabel]
          || displayLabel
      );


  /*
   * Sort copies before comparison so:
   *
   * ["A", "C"]
   *
   * equals:
   *
   * ["C", "A"]
   */
  const selectedSorted =
    [...selectedAnswers]
      .sort();

  const correctSorted =
    [...correctAnswers]
      .sort();


  const isCorrect =
    selectedSorted.length ===
      correctSorted.length &&
    selectedSorted.every(
      (value, i) =>
        value === correctSorted[i]
    );


  /*
   * Save actual selected answer IDs rather than
   * only a true/false value.
   */
  if (markAsSubmitted) {
    window.userAnswers[index] = {
      questionId:
        question.questionId,

      selectedAnswers:
        selectedAnswers,

      isCorrect:
        isCorrect,

      submitted:
        true
    };
  }


  const result =
    document.getElementById(
      `result-${index}`
    );

  const explanationElement =
    document.getElementById(
      `explanation-${index}`
    );


  if (result) {
    result.textContent =
      isCorrect
        ? "Correct"
        : "Incorrect";

    result.className =
      `result ${
        isCorrect
          ? "correct"
          : "incorrect"
      }`;
  }


  if (explanationElement) {
    explanationElement.textContent =
      explanation || "";
  }


  const block =
    document.querySelector(
      `.question-block[data-index="${index}"]`
    );

  if (block) {
    block.classList.toggle(
      "highlight-missed",
      !isCorrect
    );
  }


  return isCorrect;
}


/* =========================================================
   SHOW QUESTION
   ========================================================= */

function showQuestion(index) {
  if (
    index < 0 ||
    index >= window.quizData.length
  ) {
    return;
  }

  currentQuestionIndex =
    index;

  const blocks =
    document.querySelectorAll(
      ".question-block"
    );

  blocks.forEach(
    (block, blockIndex) => {
      block.classList.toggle(
        "active",
        blockIndex === index
      );
    }
  );


  const prevBtn =
    document.getElementById(
      "prevBtn"
    );

  const nextBtn =
    document.getElementById(
      "nextBtn"
    );


  if (prevBtn) {
    prevBtn.disabled =
      index === 0;
  }

  if (nextBtn) {
    nextBtn.disabled =
      index ===
      window.quizData.length - 1;
  }


  /*
   * Auto-reading.
   */
  const autoRead =
    document.getElementById(
      "autoReadToggle"
    )?.checked;

  if (autoRead) {
    speakQuestion(index);
  }
}


/* =========================================================
   FINISH QUIZ
   ========================================================= */

async function finishQuiz() {
  if (!window.quizData.length) {
    return;
  }

  if (!activeProfileFile || !activeProfile) {
    alert(
      "Please select a profile before finishing the quiz."
    );

    return;
  }


  let correctCount = 0;


  /*
   * Check every question.
   *
   * This also handles questions that the user
   * left unanswered.
   */
  window.quizData.forEach(
    (question, index) => {

      const alreadySubmitted =
        window.userAnswers[index];

      let isCorrect;

      if (
        alreadySubmitted &&
        alreadySubmitted.submitted
      ) {
        isCorrect =
          alreadySubmitted.isCorrect;
      } else {
        isCorrect =
          checkAnswer(
            index,
            question.answers,
            question.answers.length > 1
              ? "checkbox"
              : "radio",
            question.explanation,
            true
          );
      }

      if (isCorrect) {
        correctCount++;
      }
    }
  );


  quizFinished = true;


  const total =
    window.quizData.length;

  const percentage =
    total > 0
      ? Math.round(
          (correctCount / total) * 100
        )
      : 0;


  const finalScore =
    document.getElementById(
      "finalScore"
    );

  if (finalScore) {
    finalScore.textContent =
      `Score: ${correctCount}/${total} (${percentage}%)`;
  }


  buildSummary();


  /*
   * Save result to the selected profile.
   */
  const result =
    buildResultObject(
      correctCount,
      total
    );


  try {
    const savedProfile =
      await saveQuizResult(
        activeProfileFile,
        result
      );

    activeProfile =
      savedProfile;

    showSaveStatus(
      "Result saved to profile."
    );

  } catch (error) {
    console.error(
      "Could not save quiz result:",
      error
    );

    showSaveStatus(
      "Quiz completed, but the result could not be saved."
    );
  }
}


/* =========================================================
   RESULT OBJECT
   ========================================================= */

function buildResultObject(
  correctCount,
  total
) {
  const quizId =
    getCurrentQuizId();

  return {
    id:
      createAttemptId(),

    quizId:

      quizId,

    completedAt:
      new Date().toISOString(),

    score:
      correctCount,

    total:
      total,

    answers:
      window.quizData.map(
        (question, index) => {

          const answer =
            window.userAnswers[index];

          return {
            questionId:
              question.questionId,

            answerId:
              answer?.selectedAnswers || []
          };
        }
      )
  };
}


function createAttemptId() {
  const now =
    new Date();

  const pad =
    value =>
      String(value).padStart(2, "0");

  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate())
  ].join("") +
  "-" +
  [
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds())
  ].join("");
}


function getCurrentQuizId() {
  const select =
    document.getElementById(
      "quizFileSelect"
    );

  if (
    select &&
    select.value
  ) {
    return getQuizIdFromPath(
      select.value
    );
  }

  return "uploaded-quiz";
}


/* =========================================================
   SUMMARY
   ========================================================= */

function buildSummary() {
  const summary =
    document.getElementById(
      "quizSummary"
    );

  const list =
    document.getElementById(
      "summaryList"
    );

  if (!summary || !list) {
    return;
  }

  list.innerHTML = "";

  window.quizData.forEach(
    (question, index) => {

      const answer =
        window.userAnswers[index];

      const li =
        document.createElement("li");

      const status =
        answer?.isCorrect
          ? "✓"
          : "✗";

      li.textContent =
        `${status} Question ${index + 1}`;

      if (!answer?.isCorrect) {
        li.classList.add(
          "highlight-missed"
        );
      }

      li.addEventListener(
        "click",
        () => {
          showQuestion(index);

          const block =
            document.querySelector(
              `.question-block[data-index="${index}"]`
            );

          if (block) {
            block.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

            block.classList.add(
              "flash-highlight"
            );

            setTimeout(() => {
              block.classList.remove(
                "flash-highlight"
              );
            }, 1000);
          }
        }
      );

      list.appendChild(li);
    }
  );

  summary.style.display =
    "block";
}


/* =========================================================
   SAVE STATUS
   ========================================================= */

function showSaveStatus(message) {
  const finalScore =
    document.getElementById(
      "finalScore"
    );

  if (!finalScore) {
    return;
  }

  const status =
    document.createElement("div");

  status.style.marginTop =
    "8px";

  status.style.fontSize =
    "0.9em";

  status.textContent =
    message;

  finalScore.appendChild(
    status
  );
}


/* =========================================================
   VOICE FUNCTIONS
   ========================================================= */

function speak(text) {
  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  window.speechSynthesis.speak(
    utterance
  );
}


function speakQuestion(index) {
  const question =
    window.quizData[index];

  if (!question) {
    return;
  }

  let text =
    question.questionText;

  question.choices.forEach(
    (choice, choiceIndex) => {
      const label =
        String.fromCharCode(
          65 + choiceIndex
        );

      text +=
        `. ${label}. ${choice.text}`;
    }
  );

  speak(text);
}


function listenOnce() {
  return new Promise(
    (resolve, reject) => {

      if (
        !(
          "SpeechRecognition" in window ||
          "webkitSpeechRecognition" in window
        )
      ) {
        reject(
          new Error(
            "Speech recognition is not supported."
          )
        );

        return;
      }


      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


      const recognition =
        new SpeechRecognition();

      recognition.lang =
        "en-US";

      recognition.interimResults =
        false;

      recognition.maxAlternatives =
        1;


      recognition.onresult =
        event => {

          const transcript =
            event.results[0][0]
              .transcript
              .trim();

          resolve(
            transcript
          );
        };


      recognition.onerror =
        event => {
          reject(
            new Error(
              event.error ||
              "Speech recognition failed."
            )
          );
        };


      recognition.start();
    }
  );
}


async function listenForVoiceAnswer() {
  const voiceOutput =
    document.getElementById(
      "voiceOutput"
    );

  const question =
    window.quizData[
      currentQuestionIndex
    ];

  if (!question) {
    return;
  }

  try {
    if (voiceOutput) {
      voiceOutput.textContent =
        "Listening...";
    }

    const spoken =
      await listenOnce();

    if (voiceOutput) {
      voiceOutput.textContent =
        `Heard: ${spoken}`;
    }

    const answer =
      spoken
        .toUpperCase()
        .trim()
        .match(/[A-E]/);

    if (!answer) {
      if (voiceOutput) {
        voiceOutput.textContent +=
          " — Could not identify an answer.";
      }

      return;
    }

    const selectedLabel =
      answer[0];

    const input =
      document.querySelector(
        `input[name="question-${currentQuestionIndex}"][value="${selectedLabel}"]`
      );

    if (input) {
      input.checked = true;

      input.dispatchEvent(
        new Event("change", {
          bubbles: true
        })
      );
    }

  } catch (error) {
    console.error(error);

    if (voiceOutput) {
      voiceOutput.textContent =
        "Voice recognition is unavailable.";
    }
  }
}


/* =========================================================
   OPTIONAL VOICE BUTTON SUPPORT
   ========================================================= */

/*
 * If voice recognition is enabled, allow a spoken
 * answer when the user presses a keyboard shortcut.
 *
 * Space is intentionally not used because it is commonly
 * used for page scrolling.
 */
document.addEventListener(
  "keydown",
  event => {

    const voiceToggle =
      document.getElementById(
        "voiceToggle"
      );

    if (
      !voiceToggle ||
      !voiceToggle.checked
    ) {
      return;
    }

    if (
      event.key.toLowerCase() ===
      "v"
    ) {
      listenForVoiceAnswer();
    }
  }
);
