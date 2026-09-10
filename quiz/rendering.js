/* =========================================================
   RENDER QUIZ
   ========================================================= */

function renderQuiz(questions) {

  const container =
    document.getElementById(
      "quizContainer"
    );

  container.innerHTML =
    "";

  questions.forEach(
    (q, index) => {

      const qDiv =
        document.createElement(
          "div"
        );

      qDiv.className =
        "question-block";

      qDiv.id =
        `question-${index}`;

      /* -----------------------------------------------
         QUESTION TEXT
      ------------------------------------------------ */

      const qText =
        document.createElement(
          "p"
        );

      qText.innerHTML =
        `<strong>${index + 1}. ${q.questionText}</strong>`;

      qDiv.appendChild(
        qText
      );


      /* -----------------------------------------------
         ANSWER CHOICES
      ------------------------------------------------ */

      const choiceDiv =
        document.createElement(
          "div"
        );

      choiceDiv.className =
        "choices";

      const inputType =
        q.answers.length > 1
          ? "checkbox"
          : "radio";

      let choiceEntries =
        Object.entries(
          q.choices
        );

      if (
        window.shuffleAnswersEnabled
      ) {

        shuffleArray(
          choiceEntries
        );
      }

      const newLabels = [
        "A",
        "B",
        "C",
        "D",
        "E"
      ];

      const choiceMap = {};

      choiceEntries.forEach(
        ([origKey], i) => {

          const newKey =
            newLabels[i];

          choiceMap[newKey] =
            origKey;
        }
      );

      q.choiceMap =
        choiceMap;


      /* -----------------------------------------------
         CREATE ANSWER INPUTS
      ------------------------------------------------ */

      choiceEntries.forEach(
        ([origKey, txt], i) => {

          const newKey =
            newLabels[i];

          const label =
            document.createElement(
              "label"
            );

          const input =
            document.createElement(
              "input"
            );

          input.type =
            inputType;

          input.name =
            `q${index}`;

          input.value =
            newKey;

          input.addEventListener(
            "change",
            () => {

              const selected = [];

              document
                .getElementsByName(
                  `q${index}`
                )
                .forEach(
                  option => {

                    if (
                      option.checked
                    ) {

                      selected.push(
                        option.value
                      );
                    }
                  }
                );

              /*
               * IMPORTANT:
               * Selection is NOT submission.
               */
              window.selectedAnswers[
                index
              ] = selected;
            }
          );

          label.appendChild(
            input
          );

          label.appendChild(
            document.createTextNode(
              ` ${newKey}. ${txt}`
            )
          );

          choiceDiv.appendChild(
            label
          );
        }
      );

      qDiv.appendChild(
        choiceDiv
      );


      /* -----------------------------------------------
         SUBMIT BUTTON
      ------------------------------------------------ */

      const submit =
        document.createElement(
          "button"
        );

      submit.type =
        "button";

      submit.textContent =
        "Submit";

      submit.onclick =
        () =>
          checkAnswer(
            index,
            q.answers,
            inputType,
            q.explanation,
            true
          );

      qDiv.appendChild(
        submit
      );


      /* -----------------------------------------------
         RESULT
      ------------------------------------------------ */

      const result =
        document.createElement(
          "div"
        );

      result.className =
        "result";

      result.id =
        `result${index}`;

      qDiv.appendChild(
        result
      );


      /* -----------------------------------------------
         EXPLANATION
      ------------------------------------------------ */

      const explanation =
        document.createElement(
          "div"
        );

      explanation.className =
        "explanation";

      explanation.id =
        `explanation${index}`;

      qDiv.appendChild(
        explanation
      );

      container.appendChild(
        qDiv
      );
    }
  );


  /* -----------------------------------------------
     QUIZ CONTROLS
  ------------------------------------------------ */

  finishQuizBtn.style.display =
    "block";

  quizSummary.style.display =
    "block";

  window.totalQuestions =
    questions.length;
}


/* =========================================================
   RESTORE SELECTED ANSWERS
   ========================================================= */

function restoreSelectedAnswers(index) {

  const selected =
    window.selectedAnswers?.[index];

  if (!Array.isArray(selected)) {
    return;
  }

  const inputs =
    document.getElementsByName(
      `q${index}`
    );

  inputs.forEach(
    input => {

      input.checked =
        selected.includes(
          input.value
        );
    }
  );
}
