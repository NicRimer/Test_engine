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
