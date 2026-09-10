/* =========================================================
   VOICE / SPEECH
   ========================================================= */

function speak(text) {

  if (
    !window.speechSynthesis
  ) {

    return;
  }

  window.speechSynthesis.cancel();

  const utter =
    new SpeechSynthesisUtterance(
      text
    );

  window.speechSynthesis.speak(
    utter
  );
}


/* =========================================================
   LISTEN ONCE
   ========================================================= */

function listenOnce(callback) {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    alert(
      "Voice recognition not supported"
    );

    return;
  }

  const rec =
    new SpeechRecognition();

  rec.lang =
    "en-US";

  rec.interimResults =
    false;

  rec.maxAlternatives =
    1;

  rec.onresult =
    evt => {

      const text =
        evt.results[0][0]
          .transcript
          .trim();

      callback(text);
    };

  rec.onerror =
    e =>
      console.error(
        "Speech error:",
        e.error
      );

  rec.start();
}


/* =========================================================
   SPEAK CURRENT QUESTION
   ========================================================= */

function speakQuestion(index) {
  const q =
    window.quizData[index];

  if (!q) {
    return;
  }

  if (
    !autoReadToggle.checked
  ) {

    return;
  }

  let txt =
    `${q.questionText}. Options: `;

  for (
    const [
      label,
      originalLabel
    ] of Object.entries(
      q.choiceMap
    )
  ) {

    const choiceText =
      q.choices[
        originalLabel
      ];

    txt +=
      `${label}: ${choiceText}. `;
  }

  speak(txt);

  if (
    voiceToggle.checked
  ) {

    setTimeout(
      () =>
        listenForVoiceAnswer(
          index
        ),
      2200
    );
  }
}


/* =========================================================
   VOICE TOGGLE
   ========================================================= */

function handleVoiceToggle() {

  voiceOutput.innerHTML =
    voiceToggle.checked
      ? "🎤 Voice recognition enabled."
      : "🔇 Voice recognition disabled.";
}


/* =========================================================
   AUTO READ TOGGLE
   ========================================================= */

function handleAutoReadToggle() {

  voiceOutput.innerHTML =
    autoReadToggle.checked
      ? "🗣️ Auto reading enabled."
      : "🔇 Auto reading disabled.";
}


/* =========================================================
   VOICE ANSWER
   ========================================================= */

function listenForVoiceAnswer(index) {
  const q =
    window.quizData[index];

  if (!q) {
    return;
  }

  listenOnce(
    spoken => {

      spoken =
        spoken.toLowerCase();

      let chosenLabel =
        null;

      for (
        const [
          newLabel,
          origLabel
        ] of Object.entries(
          q.choiceMap
        )
      ) {

        const choiceText =
          q.choices[
            origLabel
          ].toLowerCase();

        if (
          spoken ===
            newLabel.toLowerCase() ||
          spoken.includes(
            choiceText
          )
        ) {

          chosenLabel =
            newLabel;

          break;
        }
      }

      if (!chosenLabel) {

        speak(
          "I did not recognize that. Please try again."
        );

        return;
      }

      const input =
        document.querySelector(
          `input[name="q${index}"][value="${chosenLabel}"]`
        );

      if (input) {

        input.checked =
          true;

        input.dispatchEvent(
          new Event(
            "change",
            {
              bubbles: true
            }
          )
        );
      }

      speak(
        "Answer selected."
      );
    }
  );
}
