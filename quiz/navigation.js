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
