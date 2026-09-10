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
