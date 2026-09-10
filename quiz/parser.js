/* =========================================================
   PARSE QUESTIONS
   ========================================================= */

function parseQuestions(text) {

  const questionBlocks =
    text.split(
      /\n(?=\d+\.\s)/
    );

  const questions = [];
  const seen = new Set();

  questionBlocks.forEach(
    (block, blockIndex) => {

      const lines =
        block
          .trim()
          .split("\n")
          .filter(Boolean);

      if (lines.length < 6) {
        return;
      }

      const numberMatch =
        lines[0].match(
          /^(\d+)\.\s*/
        );

      const originalNumber =
        numberMatch
          ? Number(
              numberMatch[1]
            )
          : blockIndex + 1;

      const questionText =
        lines[0]
          .replace(
            /^\d+\.\s*/,
            ""
          )
          .trim();

      const duplicateKey =
        questionText.toLowerCase();

      if (
        seen.has(
          duplicateKey
        )
      ) {
        return;
      }

      seen.add(
        duplicateKey
      );

      const choices = {};

      let i = 1;

      while (
        i < lines.length &&
        /^[A-E]\.\s/.test(
          lines[i]
        )
      ) {

        const match =
          lines[i].match(
            /^([A-E])\.\s*(.*)/
          );

        if (match) {

          choices[
            match[1]
          ] = match[2];
        }

        i++;
      }

      const answerLine =
        lines.find(
          line =>
            line.startsWith(
              "Answer:"
            )
        );

      const rawAnswer =
        answerLine
          ?.split(
            "Answer:"
          )[1]
          ?.trim();

      const answers =
        rawAnswer
          ? rawAnswer
              .split(",")
              .map(
                answer =>
                  answer
                    .trim()
                    .toUpperCase()
              )
          : [];

      const expStart =
        lines.findIndex(
          line =>
            line.startsWith(
              "Explanation:"
            )
        );

      const explanation =
        expStart !== -1
          ? lines
              .slice(
                expStart + 1
              )
              .join(" ")
          : "";

      const questionId =
        `q-${originalNumber}`;

      questions.push({

        id:
          questionId,

        originalNumber,

        questionText,

        choices,

        answers,

        explanation,

        choiceMap: {}
      });
    }
  );

  return questions;
}
