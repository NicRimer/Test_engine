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
