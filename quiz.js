/* ---------------------------------------------------------
   QUIZ ENGINE CORE - BOOTSTRAP / SHARED STATE
   --------------------------------------------------------- */

let currentQuestionIndex = 0;
let activeProfileFile = null;

window.quizData = [];
window.userAnswers = {};
window.selectedAnswers = [];
window.quizFinished = false;


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
