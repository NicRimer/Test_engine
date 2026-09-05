/* =========================================================
   QUIZ ENGINE
   ========================================================= */

let quizData = [];
let currentQuestion = 0;
let userAnswers = {};
let currentQuizFile = "";
let currentQuizId = "";

window.quizData = quizData;
window.userAnswers = userAnswers;
window.totalQuestions = 0;


/* =========================================================
   GOOGLE SHEETS
   ========================================================= */

const GOOGLE_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbyd1m2-u0ihmE0hXBbNZIYkyd0ItdEe39UDwNL1MUTcBr8DNrWSDmSH0p29GNSES1Es2w/exec";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const quizContainer =
  document.getElementById("quizContainer");

const prevBtn =
  document.getElementById("prevBtn");

const nextBtn =
  document.getElementById("nextBtn");

const finishQuizBtn =
  document.getElementById("finishQuizBtn");

const restartBtn =
  document.getElementById("restart");

const finalScore =
  document.getElementById("finalScore");

const quizSummary =
  document.getElementById("quizSummary");

const summaryList =
  document.getElementById("summaryList");

const voiceOutput =
  document.getElementById("voiceOutput");

const profileSelect =
  document.getElementById("profileSelect");

const loadProfileBtn =
  document.getElementById("loadProfileBtn");

const profileStatus =
  document.getElementById("profileStatus");

const quizSetupBlock =
  document.getElementById("quizSetupBlock");

const quizFileSelect =
  document.getElementById("quizFileSelect");

const loadQuizFileBtn =
  document.getElementById("loadQuizFileBtn");

const fileInput =
  document.getElementById("fileInput");

const shuffleToggle =
  document.getElementById("shuffleToggle");

const shuffleAnswersToggle =
  document.getElementById("shuffleAnswersToggle");

const autoReadToggle =
  document.getElementById("autoReadToggle");

const voiceToggle =
  document.getElementById("voiceToggle");


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeProfileSelection();
});


/* =========================================================
   PROFILE SELECTION
   ========================================================= */

async function initializeProfileSelection() {
  try {
    const profiles =
      await getAvailableProfiles();

    profileSelect.innerHTML = "";

    if (!profiles.length) {
      profileSelect.innerHTML =
        `<option value="">No profiles found</option>`;

      profileStatus.textContent =
        "No profile JSON files were found.";

      return;
    }

    profiles.forEach(profile => {
      const option =
        document.createElement("option");

      option.value = profile.name;
      option.textContent = profile.name;

      profileSelect.appendChild(option);
    });

    /*
     * default.json is always preferred
     * when it exists.
     */
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
      `${profiles.length} profile(s) available.`;

  } catch (error) {
    console.error(
      "Could not load profiles:",
      error
    );

    profileSelect.innerHTML =
      `<option value="">Error loading profiles</option>`;

    profileStatus.textContent =
      error.message;
  }
}


/* =========================================================
   LOAD PROFILE BUTTON
   ========================================================= */

if (loadProfileBtn) {
  loadProfileBtn.addEventListener(
    "click",
    async () => {

      const profileFile =
        profileSelect.value;

      if (!profileFile) {
        profileStatus.textContent =
          "Please select a profile.";

        return;
      }

      try {
        loadProfileBtn.disabled = true;

        profileStatus.textContent =
          `Loading ${profileFile}...`;

        const profile =
          await loadProfile(profileFile);

        const profileId =
          profile.id || profileFile;

        profileStatus.textContent =
          `Active profile: ${profileId}`;

        quizSetupBlock.style.display =
          "block";

      } catch (error) {
        console.error(
          "Could not load profile:",
          error
        );

        profileStatus.textContent =
          `Could not load profile: ${error.message}`;

      } finally {
        loadProfileBtn.disabled = false;
      }
    }
  );
}


/* =========================================================
   QUIZ FILE LOADING
   ========================================================= */

if (loadQuizFileBtn) {
  loadQuizFileBtn.addEventListener(
    "click",
    async () => {

      const file =
        quizFileSelect.value;

      if (!file) {
        alert("Please select a quiz.");
        return;
      }

      try {
        await loadQuizFromUrl(file);
      } catch (error) {
        console.error(
          "Could not load quiz:",
          error
        );

        alert(
          "Could not load quiz.\n\n" +
          error.message
        );
      }
    }
  );
}


/* =========================================================
   LOCAL QUIZ FILE UPLOAD
   ========================================================= */

if (fileInput) {
  fileInput.addEventListener(
    "change",
    async event => {

      const file =
        event.target.files[0];

      if (!file) {
        return;
      }

      try {
        const text =
          await file.text();

        currentQuizFile =
          file.name;

        currentQuizId =
          file.name.replace(
            /\.[^/.]+$/,
            ""
          );

        parseQuiz(text);

      } catch (error) {
        console.error(
          "Could not read quiz file:",
          error
        );

        alert(
          "Could not read quiz file.\n\n" +
          error.message
        );
      }
    }
  );
}


/* =========================================================
   LOAD QUIZ FROM URL
   ========================================================= */

async function loadQuizFromUrl(url) {
  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Could not load quiz file: ${response.status}`
    );
  }

  const text =
    await response.text();

  currentQuizFile =
    url;

  currentQuizId =
    url
      .split("/")
      .pop()
      .replace(/\.[^/.]+$/, "");

  parseQuiz(text);
}


/* =========================================================
   QUIZ PARSER
   =========================================================
   Supports the existing text-based quiz format.

   Expected general structure:

   Question text
   A. answer
   B. answer
   C. answer
   D. answer

   The parser also preserves the original
   question/answer data when JSON-like
   quiz definitions are used.
   ========================================================= */

function parseQuiz(text) {
  const trimmed =
    text.trim();

  if (!trimmed) {
    throw new Error(
      "Quiz file is empty."
    );
  }

  /*
   * Try JSON first.
   */
  try {
    const json =
      JSON.parse(trimmed);

    if (Array.isArray(json)) {
      quizData = normalizeQuizData(json);

    } else if (Array.isArray(json.questions)) {
      quizData =
        normalizeQuizData(json.questions);

    } else {
      throw new Error(
        "JSON does not contain a questions array."
      );
    }

  } catch {
    /*
     * Fall back to text parser.
     */
    quizData =
      parseTextQuiz(trimmed);
  }

  if (!quizData.length) {
    throw new Error(
      "No questions were found in the quiz."
    );
  }

  window.quizData =
    quizData;

  window.totalQuestions =
    quizData.length;

  currentQuestion = 0;
  userAnswers = {};

  window.userAnswers =
    userAnswers;

  finalScore.textContent = "";

  quizSummary.style.display =
    "none";

  summaryList.innerHTML = "";

  renderQuiz();
  showQuestion(0);

  updateNavigation();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   NORMALIZE JSON QUIZ
   ========================================================= */

function normalizeQuizData(questions) {
  return questions.map(
    (q, index) => {

      const question =
        {
          id:
            q.id ||
            `q${index + 1}`,

          question:
            q.question ||
            q.text ||
            `Question ${index + 1}`,

          answers:
            normalizeAnswers(
              q.answers ||
              q.options ||
              []
            ),

          explanation:
            q.explanation ||
            "",

          hint:
            q.hint ||
            ""
        };

      return question;
    }
  );
}


/* =========================================================
   NORMALIZE ANSWERS
   ========================================================= */

function normalizeAnswers(answers) {
  if (Array.isArray(answers)) {

    /*
     * Already in object format.
     */
    if (
      answers.length &&
      typeof answers[0] === "object"
    ) {
      return answers.map(
        (answer, index) => ({
          key:
            answer.key ||
            answer.id ||
            String.fromCharCode(
              65 + index
            ),

          text:
            answer.text ||
            answer.label ||
            answer.answer ||
            "",

          correct:
            answer.correct === true
        })
      );
    }

    /*
     * Simple array of strings.
     */
    return answers.map(
      (answer, index) => ({
        key:
          String.fromCharCode(
            65 + index
          ),

        text:
          String(answer),

        correct:
          false
      })
    );
  }

  return [];
}


/* =========================================================
   TEXT QUIZ PARSER
   ========================================================= */

function parseTextQuiz(text) {
  const blocks =
    text
      .split(/\n\s*\n/)
      .map(block => block.trim())
      .filter(Boolean);

  const questions = [];

  blocks.forEach(
    (block, blockIndex) => {

      const lines =
        block
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);

      if (!lines.length) {
        return;
      }

      const answerLines =
        lines.filter(line =>
          /^[A-Da-d][.)]\s+/.test(line)
        );

      if (!answerLines.length) {
        return;
      }

      const questionLines =
        lines.filter(line =>
          !/^[A-Da-d][.)]\s+/.test(line)
        );

      const questionText =
        questionLines.join(" ");

      const answers =
        answerLines.map(
          (line, index) => {

            const match =
              line.match(
                /^([A-Da-d])[.)]\s+(.+)$/
              );

            return {
              key:
                match
                  ? match[1].toUpperCase()
                  : String.fromCharCode(
                      65 + index
                    ),

              text:
                match
                  ? match[2]
                  : line,

              correct:
                false
            };
          }
        );

      questions.push({
        id:
          `q${blockIndex + 1}`,

        question:
          questionText,

        answers,

        explanation:
          "",

        hint:
          ""
      });
    }
  );

  return questions;
}


/* =========================================================
   SHUFFLE
   ========================================================= */

function shuffleArray(array) {
  const copy =
    [...array];

  for (
    let i = copy.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      copy[i],
      copy[j]
    ] =
    [
      copy[j],
      copy[i]
    ];
  }

  return copy;
}


/* =========================================================
   RENDER QUIZ
   ========================================================= */

function renderQuiz() {
  quizContainer.innerHTML = "";

  let questionsToRender =
    quizData.map(
      (question, index) => ({
        question,
        originalIndex: index
      })
    );

  /*
   * Shuffle question order.
   */
  if (
    shuffleToggle &&
    shuffleToggle.checked
  ) {
    questionsToRender =
      shuffleArray(
        questionsToRender
      );
  }

  questionsToRender.forEach(
    ({ question, originalIndex }) => {

      const qDiv =
        document.createElement("div");

      qDiv.id =
        `question-${originalIndex}`;

      qDiv.className =
        "question";

      /*
       * Question
       */
      const qTitle =
        document.createElement("h3");

      qTitle.textContent =
        `${originalIndex + 1}. ${question.question}`;

      qDiv.appendChild(qTitle);


      /*
       * Choices
       */
      const choiceDiv =
        document.createElement("div");

      choiceDiv.className =
        "choices";

      let answerEntries =
        question.answers.map(
          (answer, index) => ({
            ...answer,
            originalIndex: index
          })
        );

      /*
       * Shuffle answers while preserving
       * their original keys.
       */
      if (
        shuffleAnswersToggle &&
        shuffleAnswersToggle.checked
      ) {
        answerEntries =
          shuffleArray(
            answerEntries
          );
      }

      question.choiceMap = {};

      /*
       * Determine input type.
       *
       * More than one correct answer
       * means checkbox.
       */
      const correctCount =
        question.answers.filter(
          answer =>
            answer.correct === true
        ).length;

      const inputType =
        correctCount > 1
          ? "checkbox"
          : "radio";


      answerEntries.forEach(
        (answer, answerIndex) => {

          const displayedKey =
            String.fromCharCode(
              65 + answerIndex
            );

          question.choiceMap[
            displayedKey
          ] =
            answer.key;

          const label =
            document.createElement("label");

          label.className =
            "answer-option";

          const input =
            document.createElement("input");

          input.type =
            inputType;

          input.name =
            `question-${originalIndex}`;

          input.value =
            answer.key;

          input.dataset.originalKey =
            answer.key;

          input.dataset.questionIndex =
            originalIndex;

          /*
           * Restore previously selected
           * answers when rendering again.
           */
          const previous =
            userAnswers[
              originalIndex
            ];

          if (
            previous &&
            Array.isArray(
              previous.translated
            ) &&
            previous.translated.includes(
              answer.key
            )
          ) {
            input.checked = true;
          }

          /*
           * IMPORTANT:
           *
           * There is intentionally NO
           * change listener here.
           *
           * The original Submit button
           * controls answer checking.
           */

          label.appendChild(input);

          const textNode =
            document.createTextNode(
              ` ${displayedKey}. ${answer.text}`
            );

          label.appendChild(
            textNode
          );

          choiceDiv.appendChild(
            label
          );
        }
      );

      qDiv.appendChild(
        choiceDiv
      );


      /*
       * Submit button
       */
      const submit =
        document.createElement("button");

      submit.type =
        "button";

      submit.textContent =
        "Submit";

      submit.className =
        "submit-answer";

      submit.onclick =
        () =>
          checkAnswer(
            originalIndex,
            question.answers,
            inputType,
            question.explanation,
            true
          );

      qDiv.appendChild(
        submit
      );


      /*
       * Result
       */
      const result =
        document.createElement("div");

      result.className =
        "result";

      result.id =
        `result-${originalIndex}`;

      qDiv.appendChild(
        result
      );


      /*
       * Explanation
       */
      const explanation =
        document.createElement("div");

      explanation.className =
        "explanation";

      explanation.id =
        `explanation-${originalIndex}`;

      qDiv.appendChild(
        explanation
      );


      /*
       * Hint
       */
      if (question.hint) {

        const details =
          document.createElement("details");

        details.className =
          "question-hint";

        const summary =
          document.createElement("summary");

        summary.textContent =
          "Hint";

        const hintText =
          document.createElement("div");

        hintText.textContent =
          question.hint;

        details.appendChild(
          summary
        );

        details.appendChild(
          hintText
        );

        qDiv.appendChild(
          details
        );
      }


      quizContainer.appendChild(
        qDiv
      );
    }
  );

  updateNavigation();
}


/* =========================================================
   GET SELECTED ANSWERS
   ========================================================= */

function getSelectedAnswers(index) {
  const questionDiv =
    document.getElementById(
      `question-${index}`
    );

  if (!questionDiv) {
    return [];
  }

  const inputs =
    questionDiv.querySelectorAll(
      'input[type="radio"], input[type="checkbox"]'
    );

  return Array.from(inputs)
    .filter(input => input.checked)
    .map(input => input.value);
}


/* =========================================================
   CHECK ANSWER
   ========================================================= */

function checkAnswer(
  index,
  answers,
  inputType,
  explanationText,
  markAsSubmitted = false
) {
  const selectedDisplayed =
    getSelectedAnswers(index);

  const resultElement =
    document.getElementById(
      `result-${index}`
    );

  const explanationElement =
    document.getElementById(
      `explanation-${index}`
    );

  const question =
    quizData[index];

  /*
   * No selection.
   */
  if (!selectedDisplayed.length) {

    resultElement.textContent =
      "Please select at least one answer.";

    resultElement.className =
      "result incorrect";

    explanationElement.textContent =
      "";

    const qDiv =
      document.getElementById(
        `question-${index}`
      );

    if (qDiv) {
      qDiv.classList.add(
        "highlight-missed"
      );
    }

    return false;
  }


  /*
   * Translate displayed answer letters
   * back to the original answer keys.
   */
  const translated =
    selectedDisplayed.map(
      displayedKey =>
        question.choiceMap
          ? question.choiceMap[
              displayedKey
            ] || displayedKey
          : displayedKey
    );


  /*
   * Correct answer keys.
   */
  const correctKeys =
    answers
      .filter(answer =>
        answer.correct === true
      )
      .map(answer =>
        answer.key
      );


  /*
   * Compare sets.
   */
  const selectedSet =
    new Set(translated);

  const correctSet =
    new Set(correctKeys);

  const isCorrect =
    selectedSet.size ===
      correctSet.size &&
    [...selectedSet].every(
      value =>
        correctSet.has(value)
    );


  /*
   * Store answer only when Submit
   * or Finish Quiz requested checking.
   */
  if (markAsSubmitted) {

    userAnswers[index] = {
      displayed:
        selectedDisplayed,

      translated,

      isCorrect,

      submitted:
        true
    };

    window.userAnswers =
      userAnswers;
  }


  /*
   * Result display.
   */
  if (isCorrect) {

    resultElement.textContent =
      "✅ Correct!";

    resultElement.className =
      "result correct";

  } else {

    const correctDisplayed =
      answers
        .filter(answer =>
          answer.correct === true
        )
        .map(answer => {

          const displayed =
            Object.keys(
              question.choiceMap || {}
            ).find(
              key =>
                question.choiceMap[key] ===
                answer.key
            );

          return displayed ||
            answer.key;
        });

    resultElement.textContent =
      `❌ Incorrect. Correct answer(s): ` +
      correctDisplayed.join(", ");

    resultElement.className =
      "result incorrect";
  }


  /*
   * Explanation.
   */
  explanationElement.textContent =
    explanationText || "";


  /*
   * Remove missed highlight.
   */
  const qDiv =
    document.getElementById(
      `question-${index}`
    );

  if (qDiv) {
    qDiv.classList.remove(
      "highlight-missed"
    );
  }


  return isCorrect;
}


/* =========================================================
   SHOW QUESTION
   ========================================================= */

function showQuestion(index) {
  const questions =
    document.querySelectorAll(
      ".question"
    );

  if (!questions.length) {
    return;
  }

  questions.forEach(
    question =>
      question.classList.remove(
        "active"
      )
  );

  const question =
    document.getElementById(
      `question-${index}`
    );

  if (!question) {
    return;
  }

  question.classList.add(
    "active"
  );

  currentQuestion =
    index;

  updateNavigation();

  /*
   * Auto Reading.
   */
  if (
    autoReadToggle &&
    autoReadToggle.checked
  ) {
    readQuestion(index);
  }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function updateNavigation() {
  if (!quizData.length) {
    return;
  }

  if (prevBtn) {
    prevBtn.disabled =
      currentQuestion <= 0;
  }

  if (nextBtn) {
    nextBtn.disabled =
      currentQuestion >=
      quizData.length - 1;
  }
}


if (prevBtn) {
  prevBtn.addEventListener(
    "click",
    () => {

      if (
        currentQuestion > 0
      ) {
        showQuestion(
          currentQuestion - 1
        );
      }
    }
  );
}


if (nextBtn) {
  nextBtn.addEventListener(
    "click",
    () => {

      if (
        currentQuestion <
        quizData.length - 1
      ) {
        showQuestion(
          currentQuestion + 1
        );
      }
    }
  );
}


/* =========================================================
   FINISH QUIZ
   ========================================================= */

if (finishQuizBtn) {
  finishQuizBtn.addEventListener(
    "click",
    finishQuiz
  );
}


async function finishQuiz() {
  if (!quizData.length) {
    alert(
      "Please load a quiz first."
    );

    return;
  }


  /*
   * Check every question.
   *
   * This preserves the original behavior:
   * Finish Quiz performs the answer checks.
   */
  for (
    let index = 0;
    index < quizData.length;
    index++
  ) {

    const question =
      quizData[index];

    const correctCount =
      question.answers.filter(
        answer =>
          answer.correct === true
      ).length;

    const inputType =
      correctCount > 1
        ? "checkbox"
        : "radio";

    checkAnswer(
      index,
      question.answers,
      inputType,
      question.explanation,
      true
    );
  }


  /*
   * Calculate score.
   */
  const total =
    quizData.length;

  const correct =
    Object.values(
      userAnswers
    ).filter(
      answer =>
        answer &&
        answer.isCorrect
    ).length;

  const percent =
    total > 0
      ? Math.round(
          (correct / total) * 100
        )
      : 0;


  /*
   * Display final score.
   */
  finalScore.textContent =
    `Score: ${percent}% ` +
    `(${correct}/${total})`;


  /*
   * Build summary.
   */
  buildQuizSummary();


  /*
   * Build result object for Google Sheets.
   */
  const result = {
    id:
      `result-${Date.now()}`,

    quizId:
      currentQuizId ||
      currentQuizFile ||
      "quiz",

    completedAt:
      new Date().toISOString(),

    score:
      percent,

    correct:
      correct,

    total:
      total,

    answers:
      quizData.map(
        (q, index) => {

          const answer =
            userAnswers[index];

          return {
            questionId:
              q.id,

            answerId:
              answer
                ? answer.translated
                : [],

            correctAnswer:
              q.answers
                .filter(
                  a =>
                    a.correct === true
                )
                .map(
                  a => a.key
                ),

            isCorrect:
              answer
                ? answer.isCorrect
                : false
          };
        }
      )
  };


  /*
   * Save to Google Sheets.
   */
  const profile =
    typeof getActiveProfile ===
      "function"
      ? getActiveProfile()
      : null;

  if (!profile) {

    alert(
      "Quiz finished, but no profile is loaded.\n\n" +
      "The result was not saved."
    );

    return;
  }

  const profileId =
    profile.id ||
    profile.profileId ||
    profile.name;

  try {

    finishQuizBtn.disabled =
      true;

    await saveQuizResultToGoogleSheets(
      profileId,
      result
    );

    console.log(
      "Quiz result saved to Google Sheets."
    );

    finalScore.textContent +=
      " — Result saved.";

  } catch (error) {

    console.error(
      "Could not save quiz result:",
      error
    );

    alert(
      "Quiz finished, but the result could not be saved.\n\n" +
      error.message
    );

  } finally {

    finishQuizBtn.disabled =
      false;
  }
}


/* =========================================================
   BUILD QUIZ SUMMARY
   ========================================================= */

function buildQuizSummary() {
  summaryList.innerHTML = "";

  quizData.forEach(
    (question, index) => {

      const li =
        document.createElement("li");

      const answer =
        userAnswers[index];

      const status =
        answer &&
        answer.isCorrect
          ? "✅"
          : "❌";

      li.textContent =
        `${status} Question ${index + 1}`;

      li.style.cursor =
        "pointer";

      li.addEventListener(
        "click",
        () => {

          showQuestion(index);

          const questionElement =
            document.getElementById(
              `question-${index}`
            );

          if (questionElement) {
            questionElement.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
        }
      );

      summaryList.appendChild(
        li
      );
    }
  );

  quizSummary.style.display =
    "block";
}


/* =========================================================
   GOOGLE SHEETS SAVE
   ========================================================= */

async function saveQuizResultToGoogleSheets(
  profileId,
  result
) {
  if (!GOOGLE_SHEETS_URL ||
      GOOGLE_SHEETS_URL.includes(
        "PASTE_YOUR"
      )) {
    throw new Error(
      "Google Sheets URL has not been configured in quiz.js."
    );
  }

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

            profileId:
              profileId,

            result:
              result
          })
      }
    );


  if (!response.ok) {
    throw new Error(
      `Google Sheets request failed: ${response.status}`
    );
  }


  const data =
    await response.json();


  if (!data.success) {
    throw new Error(
      data.error ||
      "Google Sheets rejected the result."
    );
  }


  return data;
}


/* =========================================================
   RESTART QUIZ
   ========================================================= */

if (restartBtn) {
  restartBtn.addEventListener(
    "click",
    restartQuiz
  );
}


function restartQuiz() {
  currentQuestion = 0;

  userAnswers = {};

  window.userAnswers =
    userAnswers;

  finalScore.textContent =
    "";

  summaryList.innerHTML =
    "";

  quizSummary.style.display =
    "none";

  renderQuiz();

  showQuestion(0);

  updateNavigation();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   AUTO READING / SPEECH
   ========================================================= */

function readQuestion(index) {
  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  const question =
    quizData[index];

  if (!question) {
    return;
  }

  const text =
    question.question +
    ". " +
    question.answers
      .map(
        (answer, i) =>
          `${String.fromCharCode(65 + i)}. ${answer.text}`
      )
      .join(". ");

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  utterance.rate =
    0.95;

  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================================================
   VOICE RECOGNITION
   ========================================================= */

let recognition = null;

function initializeVoiceRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn(
      "Speech recognition is not supported."
    );

    return;
  }

  recognition =
    new SpeechRecognition();

  recognition.continuous =
    false;

  recognition.interimResults =
    false;

  recognition.lang =
    "en-US";


  recognition.onresult =
    event => {

      const transcript =
        event.results[0][0]
          .transcript
          .trim()
          .toLowerCase();

      voiceOutput.textContent =
        `Heard: ${transcript}`;

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

      voiceOutput.textContent =
        `Voice recognition error: ${event.error}`;
    };
}


/* =========================================================
   HANDLE VOICE ANSWER
   ========================================================= */

function handleVoiceAnswer(
  transcript
) {
  const question =
    quizData[currentQuestion];

  if (!question) {
    return;
  }

  const letters =
    ["a", "b", "c", "d"];

  let selectedLetter =
    null;

  for (
    let i = 0;
    i < letters.length;
    i++
  ) {
    if (
      transcript === letters[i] ||
      transcript.includes(
        `option ${letters[i]}`
      ) ||
      transcript.includes(
        `answer ${letters[i]}`
      )
    ) {
      selectedLetter =
        letters[i].toUpperCase();

      break;
    }
  }

  if (!selectedLetter) {
    return;
  }

  const questionDiv =
    document.getElementById(
      `question-${currentQuestion}`
    );

  if (!questionDiv) {
    return;
  }

  const input =
    questionDiv.querySelector(
      `input[value="${selectedLetter}"]`
    );

  if (input) {
    input.checked = true;
  }
}


/* =========================================================
   VOICE TOGGLE
   ========================================================= */

if (voiceToggle) {
  voiceToggle.addEventListener(
    "change",
    () => {

      if (
        voiceToggle.checked
      ) {

        if (!recognition) {
          initializeVoiceRecognition();
        }

        if (recognition) {
          try {
            recognition.start();

            voiceOutput.textContent =
              "Listening...";
          } catch (error) {
            console.error(
              error
            );
          }
        }

      } else {

        if (recognition) {
          try {
            recognition.stop();
          } catch {
            // Already stopped.
          }
        }

        voiceOutput.textContent =
          "";
      }
    }
  );
}


/* =========================================================
   SHUFFLE SETTINGS
   ========================================================= */

if (shuffleToggle) {
  shuffleToggle.addEventListener(
    "change",
    () => {

      /*
       * Shuffle takes effect when
       * the quiz is loaded again.
       */
    }
  );
}


if (shuffleAnswersToggle) {
  shuffleAnswersToggle.addEventListener(
    "change",
    () => {

      /*
       * Shuffle takes effect when
       * the quiz is loaded again.
       */
    }
  );
}


/* =========================================================
   EXPOSE FUNCTIONS
   ========================================================= */

window.checkAnswer =
  checkAnswer;

window.finishQuiz =
  finishQuiz;

window.showQuestion =
  showQuestion;

window.loadQuizFromUrl =
  loadQuizFromUrl;

window.saveQuizResultToGoogleSheets =
  saveQuizResultToGoogleSheets;
