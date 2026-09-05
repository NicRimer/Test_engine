let currentQuestionIndex = 0;
let activeProfileFile = null;

window.quizData = [];
window.userAnswers = {};
window.selectedAnswers = [];
window.quizFinished = false;

const GOOGLE_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbyd1m2-u0ihmE0hXBbNZIYkyd0ItdEe39UDwNL1MUTcBr8DNrWSDmSH0p29GNSES1Es2w/exec";

// --------------------------------------------------
// DOM ELEMENTS
// --------------------------------------------------

const profileBlock = document.getElementById("profileBlock");
const profileSelect = document.getElementById("profileSelect");
const loadProfileBtn = document.getElementById("loadProfileBtn");
const profileStatus = document.getElementById("profileStatus");

const quizSetupBlock = document.getElementById("quizSetupBlock");
const quizFileSelect = document.getElementById("quizFileSelect");
const loadQuizFileBtn = document.getElementById("loadQuizFileBtn");
const fileInput = document.getElementById("fileInput");

const shuffleToggle = document.getElementById("shuffleToggle");
const shuffleAnswersToggle =
  document.getElementById("shuffleAnswersToggle");

const autoReadToggle = document.getElementById("autoReadToggle");
const voiceToggle = document.getElementById("voiceToggle");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const finishQuizBtn = document.getElementById("finishQuizBtn");
const restartBtn = document.getElementById("restart");

const quizContainer = document.getElementById("quizContainer");
const finalScore = document.getElementById("finalScore");

const quizSummary = document.getElementById("quizSummary");
const summaryList = document.getElementById("summaryList");

const voiceOutput = document.getElementById("voiceOutput");

// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  quizSetupBlock.style.display = "none";

  finishQuizBtn.style.display = "none";

  prevBtn.disabled = true;
  nextBtn.disabled = true;

  loadProfileBtn.addEventListener(
    "click",
    handleProfileSelection
  );

  loadQuizFileBtn.addEventListener(
    "click",
    loadSelectedQuiz
  );

  fileInput.addEventListener(
    "change",
    handleFileInput
  );

  prevBtn.addEventListener(
    "click",
    () => {
      if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
      }
    }
  );

  nextBtn.addEventListener(
    "click",
    () => {
      if (
        currentQuestionIndex <
        window.quizData.length - 1
      ) {
        showQuestion(currentQuestionIndex + 1);
      }
    }
  );

  finishQuizBtn.addEventListener(
    "click",
    finishQuiz
  );

  restartBtn.addEventListener(
    "click",
    resetQuiz
  );

  await initializeProfiles();
});

// --------------------------------------------------
// PROFILE HANDLING
// --------------------------------------------------

async function initializeProfiles() {
  try {
    const profiles = await getAvailableProfiles();

    profileSelect.innerHTML = "";

    if (!profiles || profiles.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No profiles found";
      profileSelect.appendChild(option);

      return;
    }

    profiles.forEach(profileFile => {
      const option = document.createElement("option");

      option.value = profileFile;
      option.textContent = profileFile;

      profileSelect.appendChild(option);
    });

    // default.json is the default profile.
    const defaultProfile = profiles.find(
      profile => profile === "default.json"
    );

    if (defaultProfile) {
      profileSelect.value = defaultProfile;
    }

  } catch (error) {
    console.error(error);

    profileSelect.innerHTML = "";

    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Unable to load profiles";

    profileSelect.appendChild(option);

    profileStatus.textContent =
      `Error loading profiles: ${error.message}`;
  }
}

async function handleProfileSelection() {
  const profileFile = profileSelect.value;

  if (!profileFile) {
    profileStatus.textContent =
      "Please select a profile.";

    return;
  }

  try {
    const profile = await loadProfile(profileFile);

    activeProfileFile = profileFile;

    localStorage.setItem(
      "activeProfileFile",
      profileFile
    );

    profileStatus.textContent =
      `Profile loaded: ${profileFile}`;

    /*
     * Hide profile selection after
     * the profile has been loaded.
     */
    profileBlock.style.display = "none";

    /*
     * Show quiz setup.
     */
    quizSetupBlock.style.display = "block";

    resetQuizStateOnly();

  } catch (error) {
    console.error(error);

    profileStatus.textContent =
      `Error loading profile: ${error.message}`;
  }
}

// --------------------------------------------------
// QUIZ LOADING
// --------------------------------------------------

async function loadSelectedQuiz() {
  const selectedFile = quizFileSelect.value;

  if (!selectedFile) {
    return;
  }

  try {
    resetQuizStateOnly();

    const response = await fetch(selectedFile);

    if (!response.ok) {
      throw new Error(
        `Unable to load quiz: ${response.status}`
      );
    }

    const content = await response.text();

    loadQuizFromText(
      content,
      selectedFile
    );

  } catch (error) {
    console.error(error);

    finalScore.textContent =
      `Error loading quiz: ${error.message}`;
  }
}

async function handleFileInput(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  try {
    resetQuizStateOnly();

    const content = await file.text();

    loadQuizFromText(
      content,
      file.name
    );

  } catch (error) {
    console.error(error);

    finalScore.textContent =
      `Error loading quiz: ${error.message}`;
  }
}

// --------------------------------------------------
// QUIZ PARSER
// --------------------------------------------------

function loadQuizFromText(
  content,
  sourceFile = ""
) {
  const questions = parseQuizText(content);

  if (!questions.length) {
    throw new Error(
      "No questions found in the quiz file."
    );
  }

  if (shuffleToggle.checked) {
    shuffleArray(questions);
  }

  window.shuffleAnswersEnabled =
    shuffleAnswersToggle.checked;

  window.quizData = questions;

  window.userAnswers = {};

  window.selectedAnswers =
    new Array(questions.length).fill(null);

  window.quizFinished = false;

  window.totalQuestions =
    questions.length;

  window.currentQuizId =
    sourceFile
      ? sourceFile
          .split("/")
          .pop()
          .replace(/\.[^/.]+$/, "")
      : "quiz";

  /*
   * Hide quiz setup after the quiz
   * has been loaded.
   */
  quizSetupBlock.style.display = "none";

  renderQuiz(questions);

  showQuestion(0);
}

// --------------------------------------------------
// QUIZ TEXT PARSER
// --------------------------------------------------

function parseQuizText(content) {
  const blocks = content
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);

  const questions = [];

  blocks.forEach((block, index) => {
    const lines = block
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return;
    }

    let questionText = "";
    const answers = [];
    let correctAnswer = null;
    let explanation = "";

    lines.forEach(line => {
      if (
        /^question\s*:/i.test(line)
      ) {
        questionText =
          line.replace(
            /^question\s*:/i,
            ""
          ).trim();

        return;
      }

      const answerMatch =
        line.match(
          /^([A-E])[\.\):]\s*(.*)$/i
        );

      if (answerMatch) {
        answers.push({
          id: answerMatch[1].toUpperCase(),
          text: answerMatch[2].trim()
        });

        return;
      }

      if (
        /^answer\s*:/i.test(line)
      ) {
        correctAnswer =
          line
            .replace(
              /^answer\s*:/i,
              ""
            )
            .trim();

        return;
      }

      if (
        /^correct\s*:/i.test(line)
      ) {
        correctAnswer =
          line
            .replace(
              /^correct\s*:/i,
              ""
            )
            .trim();

        return;
      }

      if (
        /^explanation\s*:/i.test(line)
      ) {
        explanation =
          line
            .replace(
              /^explanation\s*:/i,
              ""
            )
            .trim();

        return;
      }

      if (!questionText) {
        questionText = line;
      }
    });

    if (
      questionText &&
      answers.length
    ) {
      const normalizedCorrect =
        normalizeCorrectAnswer(
          correctAnswer,
          answers
        );

      questions.push({
        id: `q${index + 1}`,
        question: questionText,
        choices: answers,
        correctAnswer:
          normalizedCorrect,
        explanation
      });
    }
  });

  return questions;
}

function normalizeCorrectAnswer(
  correctAnswer,
  answers
) {
  if (!correctAnswer) {
    return null;
  }

  const value =
    String(correctAnswer)
      .trim();

  const letterMatch =
    value.match(
      /^[A-E](?:\s*,\s*[A-E])*$/i
    );

  if (letterMatch) {
    return value
      .toUpperCase()
      .split(",")
      .map(item => item.trim());
  }

  const matched =
    answers.find(
      answer =>
        answer.text.toLowerCase() ===
        value.toLowerCase()
    );

  if (matched) {
    return [matched.id];
  }

  return [value];
}

// --------------------------------------------------
// RENDER QUIZ
// --------------------------------------------------

function renderQuiz(questions) {
  quizContainer.innerHTML = "";

  questions.forEach(
    (question, index) => {
      const questionBlock =
        document.createElement("div");

      questionBlock.className =
        "question-block";

      questionBlock.id =
        `question-${index}`;

      const questionTitle =
        document.createElement("div");

      questionTitle.className =
        "question-title";

      questionTitle.innerHTML =
        `<strong>${index + 1}.</strong> ${escapeHtml(
          question.question
        )}`;

      questionBlock.appendChild(
        questionTitle
      );

      const choices =
        document.createElement("div");

      choices.className = "choices";

      let answerChoices =
        [...question.choices];

      if (
        window.shuffleAnswersEnabled
      ) {
        shuffleArray(answerChoices);
      }

      const correctAnswers =
        Array.isArray(
          question.correctAnswer
        )
          ? question.correctAnswer
          : [question.correctAnswer];

      const isMultiple =
        correctAnswers.length > 1;

      answerChoices.forEach(
        (choice, choiceIndex) => {
          const label =
            document.createElement("label");

          const input =
            document.createElement("input");

          input.type =
            isMultiple
              ? "checkbox"
              : "radio";

          input.name =
            `question-${index}`;

          input.value =
            choice.id;

          input.dataset.answerId =
            choice.id;

          const letter =
            String.fromCharCode(
              65 + choiceIndex
            );

          const answerText =
            document.createElement("span");

          answerText.innerHTML =
            `<strong>${letter}.</strong> ${escapeHtml(
              choice.text
            )}`;

          label.appendChild(input);
          label.appendChild(answerText);

          choices.appendChild(label);

          input.addEventListener(
            "change",
            () => {
              updateSelectedAnswer(
                index,
                isMultiple
              );
            }
          );
        }
      );

      questionBlock.appendChild(
        choices
      );

      const submitButton =
        document.createElement("button");

      submitButton.type = "button";
      submitButton.textContent =
        "Submit";

      submitButton.className =
        "submit-answer";

      submitButton.addEventListener(
        "click",
        () => {
          checkAnswer(
            index,
            true
          );
        }
      );

      questionBlock.appendChild(
        submitButton
      );

      const result =
        document.createElement("div");

      result.id =
        `result${index}`;

      result.className =
        "result";

      questionBlock.appendChild(
        result
      );

      const explanation =
        document.createElement("div");

      explanation.id =
        `explanation${index}`;

      explanation.className =
        "explanation";

      questionBlock.appendChild(
        explanation
      );

      quizContainer.appendChild(
        questionBlock
      );
    }
  );

  finishQuizBtn.style.display =
    questions.length
      ? "inline-block"
      : "none";
}

// --------------------------------------------------
// ANSWER SELECTION
// --------------------------------------------------

function updateSelectedAnswer(
  questionIndex,
  isMultiple
) {
  const questionBlock =
    document.getElementById(
      `question-${questionIndex}`
    );

  if (!questionBlock) {
    return;
  }

  const inputs =
    questionBlock.querySelectorAll(
      "input"
    );

  const selected =
    Array.from(inputs)
      .filter(input => input.checked)
      .map(input => input.dataset.answerId);

  if (isMultiple) {
    window.selectedAnswers[
      questionIndex
    ] = selected;
  } else {
    window.selectedAnswers[
      questionIndex
    ] =
      selected.length
        ? selected[0]
        : null;
  }
}

function restoreSelectedAnswers(
  questionIndex
) {
  const selected =
    window.selectedAnswers[
      questionIndex
    ];

  if (
    selected === null ||
    selected === undefined
  ) {
    return;
  }

  const selectedArray =
    Array.isArray(selected)
      ? selected
      : [selected];

  const questionBlock =
    document.getElementById(
      `question-${questionIndex}`
    );

  if (!questionBlock) {
    return;
  }

  const inputs =
    questionBlock.querySelectorAll(
      "input"
    );

  inputs.forEach(input => {
    input.checked =
      selectedArray.includes(
        input.dataset.answerId
      );
  });
}

// --------------------------------------------------
// ANSWER CHECKING
// --------------------------------------------------

function checkAnswer(
  index,
  markAsSubmitted = true
) {
  const question =
    window.quizData[index];

  if (!question) {
    return false;
  }

  const selected =
    window.selectedAnswers[index];

  if (
    selected === null ||
    selected === undefined ||
    (
      Array.isArray(selected) &&
      selected.length === 0
    )
  ) {
    const result =
      document.getElementById(
        `result${index}`
      );

    if (result) {
      result.textContent =
        "Please select an answer.";
    }

    return false;
  }

  const selectedArray =
    Array.isArray(selected)
      ? selected
      : [selected];

  const correctArray =
    Array.isArray(
      question.correctAnswer
    )
      ? question.correctAnswer
      : [question.correctAnswer];

  const normalizedSelected =
    selectedArray
      .map(String)
      .sort();

  const normalizedCorrect =
    correctArray
      .map(String)
      .sort();

  const isCorrect =
    normalizedSelected.length ===
      normalizedCorrect.length &&
    normalizedSelected.every(
      (value, i) =>
        value === normalizedCorrect[i]
    );

  if (markAsSubmitted) {
    window.userAnswers[index] = {
      answerId: selectedArray,
      correctAnswer: correctArray,
      isCorrect
    };
  }

  const result =
    document.getElementById(
      `result${index}`
    );

  const explanation =
    document.getElementById(
      `explanation${index}`
    );

  if (result) {
    result.textContent =
      isCorrect
        ? "Correct!"
        : "Incorrect.";
  }

  if (explanation) {
    explanation.textContent =
      question.explanation || "";
  }

  return isCorrect;
}

// --------------------------------------------------
// QUESTION NAVIGATION
// --------------------------------------------------

function showQuestion(index) {
  if (
    index < 0 ||
    index >= window.quizData.length
  ) {
    return;
  }

  currentQuestionIndex = index;

  const blocks =
    document.querySelectorAll(
      ".question-block"
    );

  blocks.forEach(
    (block, blockIndex) => {
      block.style.display =
        blockIndex === index
          ? "block"
          : "none";
    }
  );

  restoreSelectedAnswers(index);

  prevBtn.disabled =
    index === 0;

  nextBtn.disabled =
    index ===
    window.quizData.length - 1;

  if (autoReadToggle.checked) {
    speakQuestion(index);
  }
}

// --------------------------------------------------
// FINISH QUIZ
// --------------------------------------------------

async function finishQuiz() {
  if (!window.quizData.length) {
    return;
  }

  let unanswered = [];

  window.quizData.forEach(
    (question, index) => {
      const selected =
        window.selectedAnswers[index];

      if (
        selected === null ||
        selected === undefined ||
        (
          Array.isArray(selected) &&
          selected.length === 0
        )
      ) {
        unanswered.push(index + 1);
      }
    }
  );

  if (unanswered.length) {
    alert(
      `Please answer question(s): ${unanswered.join(
        ", "
      )}`
    );

    return;
  }

  let correct = 0;

  window.quizData.forEach(
    (question, index) => {
      if (
        checkAnswer(
          index,
          true
        )
      ) {
        correct++;
      }
    }
  );

  const total =
    window.quizData.length;

  const score =
    total > 0
      ? Math.round(
          (correct / total) * 100
        )
      : 0;

  window.quizFinished = true;

  finalScore.textContent =
    `Score: ${score}% (${correct}/${total})`;

  buildQuizSummary();

  const result = {
    id:
      `result-${Date.now()}`,
    quizId:
      window.currentQuizId || "quiz",
    completedAt:
      new Date().toISOString(),
    score,
    correct,
    total,
    answers:
      window.quizData.map(
        (question, index) => {
          const answer =
            window.userAnswers[index];

          return {
            questionId:
              question.id ||
              `q${index + 1}`,
            answerId:
              answer
                ? answer.answerId
                : [],
            correctAnswer:
              answer
                ? answer.correctAnswer
                : question.correctAnswer,
            isCorrect:
              answer
                ? answer.isCorrect
                : false
          };
        }
      )
  };

  try {
    await saveQuizResultToGoogleSheets(
      activeProfileFile,
      result
    );

    finalScore.textContent +=
      " — Result saved.";

  } catch (error) {
    console.error(error);

    finalScore.textContent +=
      ` — Could not save result: ${error.message}`;
  }
}

// --------------------------------------------------
// SUMMARY
// --------------------------------------------------

function buildQuizSummary() {
  summaryList.innerHTML = "";

  window.quizData.forEach(
    (question, index) => {
      const li =
        document.createElement("li");

      const answer =
        window.userAnswers[index];

      const isCorrect =
        answer &&
        answer.isCorrect;

      li.textContent =
        `Question ${index + 1}: ${
          isCorrect
            ? "Correct"
            : "Incorrect"
        }`;

      if (!isCorrect) {
        li.classList.add(
          "highlight-missed"
        );
      }

      li.addEventListener(
        "click",
        () => {
          showQuestion(index);

          li.classList.add(
            "flash-highlight"
          );

          setTimeout(() => {
            li.classList.remove(
              "flash-highlight"
            );
          }, 1000);
        }
      );

      summaryList.appendChild(li);
    }
  );

  quizSummary.style.display =
    "block";
}

// --------------------------------------------------
// GOOGLE SHEETS
// --------------------------------------------------

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

  const response =
    await fetch(
      GOOGLE_SHEETS_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action: "saveResult",
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

// --------------------------------------------------
// RESET
// --------------------------------------------------

function resetQuiz() {
  resetQuizStateOnly();

  /*
   * Show profile selection again
   * so another profile can be selected.
   */
  profileBlock.style.display =
    "block";

  /*
   * Show quiz setup again.
   */
  quizSetupBlock.style.display =
    "block";
}

function resetQuizStateOnly() {
  currentQuestionIndex = 0;

  window.quizData = [];

  window.userAnswers = {};

  window.selectedAnswers = [];

  window.quizFinished = false;

  window.totalQuestions = 0;

  window.currentQuizId = null;

  quizContainer.innerHTML = "";

  finalScore.textContent = "";

  summaryList.innerHTML = "";

  quizSummary.style.display =
    "none";

  finishQuizBtn.style.display =
    "none";

  prevBtn.disabled = true;

  nextBtn.disabled = true;
}

// --------------------------------------------------
// VOICE / SPEECH
// --------------------------------------------------

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
    `${question.question}. `;

  question.choices.forEach(
    (choice, choiceIndex) => {
      const letter =
        String.fromCharCode(
          65 + choiceIndex
        );

      text +=
        `${letter}. ${choice.text}. `;
    }
  );

  speak(text);
}

// Voice recognition remains select-only.
// It does NOT automatically submit/check the answer.
function selectAnswerFromVoice(
  answerId
) {
  const questionBlock =
    document.getElementById(
      `question-${currentQuestionIndex}`
    );

  if (!questionBlock) {
    return;
  }

  const inputs =
    questionBlock.querySelectorAll(
      "input"
    );

  const input =
    Array.from(inputs).find(
      item =>
        item.dataset.answerId
          .toUpperCase() ===
        answerId.toUpperCase()
    );

  if (input) {
    input.checked = true;

    input.dispatchEvent(
      new Event(
        "change",
        {
          bubbles: true
        }
      )
    );

    speak(
      "Answer selected."
    );
  }
}

// --------------------------------------------------
// UTILITIES
// --------------------------------------------------

function shuffleArray(array) {
  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
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

function escapeHtml(value) {
  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
