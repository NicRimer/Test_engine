/* ---------------------------------------------------------
   QUIZ ENGINE + PROFILES
--------------------------------------------------------- */

let currentQuestionIndex = 0;

window.quizData = [];
window.userAnswers = {};
window.currentProfile = null;
window.currentAttempt = null;
window.totalQuestions = 0;
window.currentQuizId = null;
window.shuffleAnswersEnabled = false;


/* ---------------------------------------------------------
   DOM HELPERS
--------------------------------------------------------- */

const $ = id => document.getElementById(id);


/* ---------------------------------------------------------
   INITIALIZATION
--------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

  $('createProfileBtn')
    .addEventListener('click', createProfile);

  $('loadProfileBtn')
    .addEventListener('click', loadExistingProfile);

  $('saveGithubTokenBtn')
    .addEventListener('click', saveGithubToken);

  $('refreshProfileBtn')
    .addEventListener('click', refreshProfile);

  $('fileInput')
    .addEventListener('change', event => {
      resetQuiz();
      handleFile(event);
    });

  $('loadQuizFileBtn')
    .addEventListener('click', loadSelectedQuiz);

  $('finishQuizBtn')
    .addEventListener('click', finishQuiz);

  $('prevBtn')
    .addEventListener('click', () =>
      showQuestion(currentQuestionIndex - 1)
    );

  $('nextBtn')
    .addEventListener('click', () =>
      showQuestion(currentQuestionIndex + 1)
    );

  $('restart')
    .addEventListener('click', resetQuiz);

  $('errorsOnlyToggle')
    .addEventListener('change', renderReview);

  $('voiceToggle')
    .addEventListener('change', () => {

      $('voiceOutput').textContent =
        $('voiceToggle').checked
          ? '🎤 Voice recognition enabled.'
          : '🔇 Voice recognition disabled.';

    });

  $('autoReadToggle')
    .addEventListener('change', () => {

    $('voiceOutput').textContent =
      $('autoReadToggle').checked
        ? '🗣️ Auto reading enabled.'
        : '🔇 Auto reading disabled.';

  });


  const savedToken =
    sessionStorage.getItem('githubToken');

  if (savedToken) {
    $('githubToken').value = savedToken;
  }

  autoLoadProfile();

});


/* ---------------------------------------------------------
   PROFILE MANAGEMENT
--------------------------------------------------------- */

function generateId() {

  if (window.crypto?.randomUUID) {

    return crypto
      .randomUUID()
      .replaceAll('-', '')
      .slice(0, 8);

  }

  return Math.random()
    .toString(36)
    .slice(2, 10);

}


async function createProfile() {

  const name =
    $('profileName').value.trim();

  const profile = {

    id: generateId(),

    name,

    createdAt:
      new Date().toISOString(),

    results: []

  };


  try {

    await GitHubProfiles.create(profile);

    setActiveProfile(profile);

    alert(
      `Profile created.\n\nProfile ID: ${profile.id}`
    );

  } catch (err) {

    alert(
      `Could not create profile: ${err.message}`
    );

  }

}


async function loadExistingProfile() {

  const id =
    $('profileIdInput').value.trim();

  if (!id) {

    alert('Enter a Profile ID.');

    return;

  }


  try {

    const profile =
      await GitHubProfiles.load(id);

    setActiveProfile(profile);

  } catch (err) {

    alert(
      `Could not load profile: ${err.message}`
    );

  }

}


async function refreshProfile() {

  if (!window.currentProfile) {
    return;
  }

  try {

    const profile =
      await GitHubProfiles.load(
        window.currentProfile.id
      );

    setActiveProfile(profile);

  } catch (err) {

    alert(
      `Could not refresh profile: ${err.message}`
    );

  }

}


function setActiveProfile(profile) {

  window.currentProfile = profile;

  localStorage.setItem(
    'quizCurrentProfileId',
    profile.id
  );


  $('activeProfile').hidden = false;

  $('activeProfile').innerHTML = `
    <strong>Active Profile:</strong>
    ${escapeHtml(profile.name || 'Unnamed')}

    <span class="profile-id">
      ID: ${escapeHtml(profile.id)}
    </span>
  `;


  $('profileIdInput').value =
    profile.id;


  $('quizSetupBlock').hidden = false;

  $('profileHistory').hidden = false;

  renderProfileHistory();

}


async function saveGithubToken() {

  const token =
    $('githubToken').value.trim();

  if (!token) {

    sessionStorage.removeItem(
      'githubToken'
    );

    $('githubStatus').textContent =
      'Token cleared.';

    return;

  }


  sessionStorage.setItem(
    'githubToken',
    token
  );


  $('githubStatus').textContent =
    'Token saved for this browser session.';

}


async function autoLoadProfile() {

  const id =
    localStorage.getItem(
      'quizCurrentProfileId'
    );

  if (!id) {
    return;
  }


  try {

    const profile =
      await GitHubProfiles.load(id);

    setActiveProfile(profile);

  } catch {

    localStorage.removeItem(
      'quizCurrentProfileId'
    );

  }

}


/* ---------------------------------------------------------
   QUIZ RESET / LOADING
--------------------------------------------------------- */

function resetQuiz() {

  window.quizData = [];

  window.userAnswers = {};

  window.currentAttempt = null;

  window.totalQuestions = 0;

  window.currentQuizId = null;

  currentQuestionIndex = 0;


  $('quizContainer').innerHTML = '';

  $('finalScore').textContent = '';

  $('summaryList').innerHTML = '';

  $('reviewList').innerHTML = '';


  $('quizSummary').hidden = true;

  $('attemptReview').hidden = true;

  $('quizArea').hidden = true;


  $('finishQuizBtn').style.display =
    'none';


  $('quizSetupBlock').hidden =
    !window.currentProfile;

}


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

    [array[i], array[j]] =
      [array[j], array[i]];

  }

}


function quizIdFromSource(source) {

  const name =
    source
      .split('/')
      .pop()
      .replace(/\.[^.]+$/, '');

  return name || 'uploaded-quiz';

}


function loadSelectedQuiz() {

  const selectedFile =
    $('quizFileSelect').value;

  resetQuiz();


  fetch(selectedFile)

    .then(res => {

      if (!res.ok) {
        throw new Error(
          'File not found'
        );
      }

      return res.text();

    })

    .then(content => {

      startQuiz(
        content,
        quizIdFromSource(selectedFile)
      );

    })

    .catch(err => {

      alert(
        'Could not load file: ' +
        err.message
      );

    });

}


function handleFile(event) {

  const file =
    event.target.files[0];

  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload = function(event) {

    startQuiz(
      event.target.result,
      quizIdFromSource(file.name)
    );

  };


  reader.readAsText(file);

}


function startQuiz(content, quizId) {

  let questions =
    parseQuestions(content);


  if ($('shuffleToggle').checked) {
    shuffleArray(questions);
  }


  window.shuffleAnswersEnabled =
    $('shuffleAnswersToggle').checked;


  window.quizData =
    questions;

  window.userAnswers = {};

  window.currentQuizId =
    quizId;


  renderQuiz(questions);

  showQuestion(0);


  $('quizSetupBlock').hidden = true;

  $('quizArea').hidden = false;

}


/* ---------------------------------------------------------
   QUIZ PARSER
--------------------------------------------------------- */

function parseQuestions(text) {

  const questionBlocks =
    text.split(
      /\n(?=\d+\.\s)/
    );


  const questions = [];

  const seen = new Set();


  questionBlocks.forEach(block => {

    const lines =
      block
        .trim()
        .split(/\r?\n/)
        .map(line => line.trim())
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
        ? numberMatch[1]
        : String(
            questions.length + 1
          );


    const questionText =
      lines[0]
        .replace(
          /^\d+\.\s*/,
          ''
        )
        .trim();


    const duplicateKey =
      questionText.toLowerCase();


    if (seen.has(duplicateKey)) {
      return;
    }

    seen.add(duplicateKey);


    const choices = {};

    let i = 1;


    while (
      i < lines.length &&
      /^[A-E]\.\s/.test(lines[i])
    ) {

      const match =
        lines[i].match(
          /^([A-E])\.\s*(.*)/
        );

      if (match) {

        choices[match[1]] =
          match[2];

      }

      i++;

    }


    const answerLine =
      lines.find(
        line =>
          /^Answer:/i.test(line)
      );


    const rawAnswer =
      answerLine
        ?.split(/Answer:/i)[1]
        ?.trim();


    const answers =
      rawAnswer
        ? rawAnswer
            .split(',')
            .map(
              answer =>
                answer.trim().toUpperCase()
            )
            .filter(Boolean)
        : [];


    const explanationStart =
      lines.findIndex(
        line =>
          /^Explanation:/i.test(line)
      );


    const explanation =
      explanationStart !== -1
        ? lines
            .slice(
              explanationStart + 1
            )
            .join(' ')
        : '';


    questions.push({

      questionId:
        `q-${originalNumber}`,

      originalNumber,

      questionText,

      choices,

      answers,

      explanation

    });

  });


  return questions;

}


/* ---------------------------------------------------------
   RENDER QUIZ
--------------------------------------------------------- */

function renderQuiz(questions) {

  const container =
    $('quizContainer');

  container.innerHTML = '';


  questions.forEach((q, index) => {

    const qDiv =
      document.createElement('div');

    qDiv.className =
      'question-block';

    qDiv.id =
      `question-${index}`;


    const qText =
      document.createElement('p');

    qText.innerHTML =
      `<strong>
        ${index + 1}.
        ${escapeHtml(q.questionText)}
      </strong>`;


    qDiv.appendChild(qText);


    const choiceDiv =
      document.createElement('div');

    choiceDiv.className =
      'choices';


    const inputType =
      q.answers.length > 1
        ? 'checkbox'
        : 'radio';


    let choiceEntries =
      Object.entries(q.choices);


    if (window.shuffleAnswersEnabled) {
      shuffleArray(choiceEntries);
    }


    const newLabels =
      ['A', 'B', 'C', 'D', 'E'];


    const choiceMap = {};


    choiceEntries.forEach(
      ([originalKey], i) => {

        const newKey =
          newLabels[i];

        choiceMap[newKey] =
          originalKey;

      }
    );


    q.choiceMap =
      choiceMap;


    choiceEntries.forEach(
      ([originalKey, text], i) => {

        const newKey =
          newLabels[i];


        const label =
          document.createElement('label');


        label.innerHTML = `
          <input
            type="${inputType}"
            name="q${index}"
            value="${newKey}"
          >

          <span>
            ${newKey}.
            ${escapeHtml(text)}
          </span>
        `;


        choiceDiv.appendChild(label);

      }
    );


    qDiv.appendChild(choiceDiv);


    const submit =
      document.createElement('button');

    submit.type = 'button';

    submit.textContent =
      'Submit';


    submit.onclick = () =>
      checkAnswer(
        index,
        q.answers,
        inputType,
        q.explanation,
        true
      );


    qDiv.appendChild(submit);


    const result =
      document.createElement('div');

    result.className =
      'result';

    result.id =
      `result${index}`;


    qDiv.appendChild(result);


    const explanation =
      document.createElement('div');

    explanation.className =
      'explanation';

    explanation.id =
      `explanation${index}`;


    qDiv.appendChild(explanation);


    container.appendChild(qDiv);

  });


  $('finishQuizBtn').style.display =
    'block';

  $('quizSummary').hidden = false;

  window.totalQuestions =
    questions.length;

}


/* ---------------------------------------------------------
   ANSWER HANDLING
--------------------------------------------------------- */

function getSelectedOriginalAnswers(index) {

  const question =
    window.quizData[index];


  const inputs =
    document.getElementsByName(
      `q${index}`
    );


  const selectedDisplayLabels =
    [...inputs]
      .filter(input => input.checked)
      .map(input => input.value);


  return selectedDisplayLabels

    .map(
      displayLabel =>
        question.choiceMap[
          displayLabel
        ]
    )

    .filter(Boolean);

}


function checkAnswer(
  index,
  correctAnswers,
  inputType,
  explanation,
  markAsSubmitted = false
) {

  const question =
    window.quizData[index];


  const selected =
    getSelectedOriginalAnswers(index);


  const result =
    $(`result${index}`);


  const explanationDiv =
    $(`explanation${index}`);


  const block =
    $(`question-${index}`);


  if (selected.length === 0) {

    result.textContent =
      'Please select at least one answer.';

    result.className =
      'result incorrect';

    explanationDiv.textContent =
      '';

    block.classList.add(
      'highlight-missed'
    );


    if (markAsSubmitted) {

      window.userAnswers[index] = {

        answerIds: [],

        isCorrect: false,

        answered: false

      };

    }


    return false;

  }


  const correctSet =
    new Set(correctAnswers);


  const selectedSet =
    new Set(selected);


  const isCorrect =
    selectedSet.size ===
      correctSet.size &&

    [...correctSet]
      .every(
        answer =>
          selectedSet.has(answer)
      );


  result.textContent =
    isCorrect

      ? '✅ Correct!'

      : `❌ Incorrect. Correct answer${
          correctAnswers.length > 1
            ? 's'
            : ''
        }: ${
          correctAnswers.join(', ')
        }`;


  result.className =
    'result ' +
    (isCorrect
      ? 'correct'
      : 'incorrect');


  if (!isCorrect) {

    block.classList.add(
      'highlight-missed'
    );

  } else {

    block.classList.remove(
      'highlight-missed'
    );

  }


  explanationDiv.textContent =
    explanation || '';


  if (markAsSubmitted) {

    window.userAnswers[index] = {

      answerIds: selected,

      isCorrect,

      answered: true

    };

  }


  return isCorrect;

}


/* ---------------------------------------------------------
   NAVIGATION
--------------------------------------------------------- */

function showQuestion(index) {

  if (!window.quizData?.length) {
    return;
  }


  if (
    index < 0 ||
    index >= window.quizData.length
  ) {
    return;
  }


  document
    .querySelectorAll('.question-block')
    .forEach(
      block =>
        block.classList.remove(
          'active'
        )
    );


  const block =
    $(`question-${index}`);


  block.classList.add('active');


  block.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });


  currentQuestionIndex =
    index;


  $('prevBtn').disabled =
    index === 0;


  $('nextBtn').disabled =
    index ===
    window.quizData.length - 1;


  speakQuestion(index);

}


/* ---------------------------------------------------------
   FINISH QUIZ
--------------------------------------------------------- */

async function finishQuiz() {

  const total =
    window.totalQuestions || 0;


  if (!total) {
    return;
  }


  let correct = 0;


  for (
    let i = 0;
    i < total;
    i++
  ) {

    const q =
      window.quizData[i];


    const existing =
      window.userAnswers[i];


    let isCorrect;


    if (existing) {

      isCorrect =
        existing.isCorrect;

    } else {

      isCorrect =
        checkAnswer(
          i,
          q.answers,
          q.answers.length > 1
            ? 'checkbox'
            : 'radio',
          q.explanation,
          true
        );

    }


    if (isCorrect) {
      correct++;
    }

  }


  const percent =
    Math.round(
      (correct / total) * 100
    );


  $('finalScore').textContent =
    `Final Score: ${percent}% (${correct}/${total})`;


  $('quizSummary').hidden =
    false;

  $('attemptReview').hidden =
    false;


  window.currentAttempt =
    buildAttempt(
      correct,
      total
    );


  renderSummary();

  renderReview();


  try {

    await saveAttemptToProfile(
      window.currentAttempt
    );

    $('finalScore').textContent +=
      ' — saved to profile';

  } catch (err) {

    $('finalScore').textContent +=
      ` — NOT saved: ${err.message}`;

  }

}


/* ---------------------------------------------------------
   ATTEMPT STORAGE MODEL
--------------------------------------------------------- */

function buildAttempt(
  correct,
  total
) {

  const answers =
    window.quizData.map(
      (q, index) => {

        const state =
          window.userAnswers[index] ||
          {
            answerIds: [],
            answered: false,
            isCorrect: false
          };


        return {

          questionId:
            q.questionId,

          answerIds:
            state.answerIds || []

        };

      }
    );


  return {

    id: makeAttemptId(),

    quizId:
      window.currentQuizId ||
      'unknown',

    completedAt:
      new Date().toISOString(),

    score:
      correct,

    total,

    answers

  };

}


function makeAttemptId() {

  const d =
    new Date();


  const pad =
    number =>
      String(number)
        .padStart(2, '0');


  return (

    `${d.getUTCFullYear()}` +

    `${pad(d.getUTCMonth() + 1)}` +

    `${pad(d.getUTCDate())}-` +

    `${pad(d.getUTCHours())}` +

    `${pad(d.getUTCMinutes())}` +

    `${pad(d.getUTCSeconds())}-` +

    `${generateId()}`

  );

}


/* ---------------------------------------------------------
   SAVE RESULT
--------------------------------------------------------- */

async function saveAttemptToProfile(
  attempt
) {

  if (!window.currentProfile) {

    throw new Error(
      'No active profile.'
    );

  }


  const latest =
    await GitHubProfiles.load(
      window.currentProfile.id
    );


  latest.results =
    Array.isArray(latest.results)
      ? latest.results
      : [];


  latest.results.push(attempt);


  await GitHubProfiles.update(
    latest
  );


  window.currentProfile =
    latest;


  renderProfileHistory();

}


/* ---------------------------------------------------------
   SUMMARY
--------------------------------------------------------- */

function renderSummary() {

  const list =
    $('summaryList');


  list.innerHTML = '';


  window.quizData.forEach(
    (q, index) => {

      const state =
        window.userAnswers[index];


      const li =
        document.createElement('li');


      li.textContent =
        `Question ${index + 1} – ` +

        (
          state?.answered

            ? (
                state.isCorrect
                  ? '✅ Correct'
                  : '❌ Incorrect'
              )

            : '⚠️ Missed'
        );


      li.addEventListener(
        'click',
        () => {

          showQuestion(index);


          const block =
            $(`question-${index}`);


          block.classList.add(
            'flash-highlight'
          );


          setTimeout(
            () =>
              block.classList.remove(
                'flash-highlight'
              ),
            1000
          );

        }
      );


      list.appendChild(li);

    }
  );

}


/* ---------------------------------------------------------
   DETAILED REVIEW
--------------------------------------------------------- */

function renderReview() {

  const list =
    $('reviewList');


  list.innerHTML = '';


  if (!window.currentAttempt) {
    return;
  }


  const errorsOnly =
    $('errorsOnlyToggle').checked;


  window.currentAttempt.answers
    .forEach(
      (savedAnswer, index) => {

        const question =
          window.quizData.find(
            q =>
              q.questionId ===
              savedAnswer.questionId
          );


        if (!question) {
          return;
        }


        const selected =
          savedAnswer.answerIds || [];


        const isCorrect =
          sameSet(
            selected,
            question.answers
          );


        if (
          errorsOnly &&
          isCorrect
        ) {
          return;
        }


        const card =
          document.createElement(
            'article'
          );


        card.className =
          `review-card ${
            isCorrect
              ? 'review-correct'
              : 'review-error'
          }`;


        const selectedText =
          selected.length

            ? selected
                .map(
                  id =>
                    `${id}. ${
                      question.choices[id] ||
                      '(unknown answer)'
                    }`
                )
                .join('; ')

            : 'No answer';


        const correctText =
          question.answers
            .map(
              id =>
                `${id}. ${
                  question.choices[id] ||
                  '(unknown answer)'
                }`
            )
            .join('; ');


        card.innerHTML = `

          <h4>
            Question ${index + 1}:
            ${escapeHtml(
              question.questionText
            )}
          </h4>

          <p>
            <strong>Your answer:</strong>
            ${escapeHtml(selectedText)}
          </p>

          <p>
            <strong>Correct answer:</strong>
            ${escapeHtml(correctText)}
          </p>

          ${
            question.explanation
              ? `
                <p>
                  <strong>Explanation:</strong>
                  ${escapeHtml(
                    question.explanation
                  )}
                </p>
              `
              : ''
          }

        `;


        list.appendChild(card);

      }
    );

}


/* ---------------------------------------------------------
   PROFILE HISTORY
--------------------------------------------------------- */

function renderProfileHistory() {

  if (!window.currentProfile) {
    return;
  }


  const list =
    $('historyList');


  list.innerHTML = '';


  const results =
    [
      ...(window.currentProfile.results || [])
    ].reverse();


  if (!results.length) {

    list.innerHTML =
      '<p class="muted">No completed quizzes yet.</p>';

    return;

  }


  results.forEach(attempt => {

    const percent =
      attempt.total
        ? Math.round(
            (attempt.score /
              attempt.total) *
            100
          )
        : 0;


    const row =
      document.createElement('button');


    row.type = 'button';

    row.className =
      'history-row';


    row.innerHTML = `

      <span>
        <strong>
          ${escapeHtml(
            attempt.quizId
          )}
        </strong>
      </span>

      <span>
        ${formatDate(
          attempt.completedAt
        )}
      </span>

      <span>
        ${attempt.score}/${attempt.total}
        (${percent}%)
      </span>

    `;


    row.addEventListener(
      'click',
      () =>
        loadAttemptForReview(
          attempt
        )
    );


    list.appendChild(row);

  });

}


/* ---------------------------------------------------------
   LOAD OLD ATTEMPT
--------------------------------------------------------- */

function loadAttemptForReview(
  attempt
) {

  if (
    !window.quizData.length ||
    window.currentQuizId !==
      attempt.quizId
  ) {

    alert(
      'Load the same quiz first to review this attempt.'
    );

    return;

  }


  window.currentAttempt =
    attempt;


  $('attemptReview').hidden =
    false;


  renderReview();


  $('attemptReview')
    .scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

}


/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function sameSet(a, b) {

  const aa =
    new Set(a || []);

  const bb =
    new Set(b || []);


  return (

    aa.size === bb.size &&

    [...aa].every(
      value =>
        bb.has(value)
    )

  );

}


function formatDate(value) {

  try {

    return new Date(
      value
    ).toLocaleString();

  } catch {

    return value;

  }

}


function escapeHtml(value) {

  return String(
    value ?? ''
  )

    .replaceAll(
      '&',
      '&amp;'
    )

    .replaceAll(
      '<',
      '&lt;'
    )

    .replaceAll(
      '>',
      '&gt;'
    )

    .replaceAll(
      '"',
      '&quot;'
    )

    .replaceAll(
      "'",
      '&#039;'
    );

}


/* ---------------------------------------------------------
   VOICE RECOGNITION + SPEECH
--------------------------------------------------------- */

function speak(text) {

  if (!window.speechSynthesis) {
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


function listenOnce(callback) {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!SpeechRecognition) {

    alert(
      'Voice recognition not supported'
    );

    return;

  }


  const rec =
    new SpeechRecognition();


  rec.lang =
    'en-US';

  rec.interimResults =
    false;

  rec.maxAlternatives =
    1;


  rec.onresult =
    event => {

      callback(
        event
          .results[0][0]
          .transcript
          .trim()
      );

    };


  rec.onerror =
    event =>
      console.error(
        'Speech error:',
        event.error
      );


  rec.start();

}


function speakQuestion(index) {

  const q =
    window.quizData[index];


  if (
    !$('autoReadToggle').checked
  ) {
    return;
  }


  let text =
    `${q.questionText}. Options: `;


  for (
    const [
      label,
      originalLabel
    ]
    of Object.entries(
      q.choiceMap
    )
  ) {

    text +=
      `${label}: ${
        q.choices[
          originalLabel
        ]
      }. `;

  }


  speak(text);


  if (
    $('voiceToggle').checked
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


function listenForVoiceAnswer(index) {

  const q =
    window.quizData[index];


  listenOnce(spoken => {

    spoken =
      spoken.toLowerCase();


    let chosenLabel =
      null;


    for (
      const [
        newLabel,
        originalLabel
      ]
      of Object.entries(
        q.choiceMap
      )
    ) {

      const choiceText =
        q.choices[
          originalLabel
        ].toLowerCase();


      if (

        spoken ===
          newLabel.toLowerCase()

        ||

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
        'I did not recognize that. Please try again.'
      );

      return;

    }


    const input =
      document.querySelector(
        `input[name="q${index}"][value="${chosenLabel}"]`
      );


    if (input) {
      input.checked = true;
    }


    const isCorrect =
      checkAnswer(
        index,
        q.answers,
        q.answers.length > 1
          ? 'checkbox'
          : 'radio',
        q.explanation,
        true
      );


    speak(
      isCorrect
        ? 'Correct.'
        : 'Submitted.'
    );

  });

}
