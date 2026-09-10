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
