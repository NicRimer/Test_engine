/* ---------------------------------------------------------
   QUIZ ENGINE CORE
--------------------------------------------------------- */

let currentQuestionIndex = 0;

document.getElementById('fileInput').addEventListener('change', function(event) {
  resetQuiz();
  handleFile(event);
  document.getElementById("quizSetupBlock").style.display = "none";
});
document.getElementById('finishQuizBtn').addEventListener('click', finishQuiz);
document.getElementById('prevBtn').addEventListener('click', () => showQuestion(currentQuestionIndex - 1));
document.getElementById('nextBtn').addEventListener('click', () => showQuestion(currentQuestionIndex + 1));
document.getElementById('restart').addEventListener('click', () => resetQuiz());
document.getElementById("quizSetupBlock").style.display = "";
document.getElementById('loadQuizFileBtn').addEventListener('click', function() {
  resetQuiz();
  const selectedFile = document.getElementById('quizFileSelect').value;

  fetch(selectedFile)
    .then(res => {
      if (!res.ok) throw new Error('File not found');
      return res.text();
    })
    .then(content => {
      let questions = parseQuestions(content);

      if (document.getElementById('shuffleToggle').checked)
        shuffleArray(questions);

      window.shuffleAnswersEnabled = document.getElementById('shuffleAnswersToggle').checked;

      window.quizData = questions;
      window.userAnswers = {};
      renderQuiz(questions);
      showQuestion(0);
    })
    .catch(err => alert('Could not load file: ' + err.message));

  document.getElementById("quizSetupBlock").style.display = "none";
});

function resetQuiz() {
  window.quizData = [];
  window.userAnswers = {};
  document.getElementById('quizContainer').innerHTML = '';
  document.getElementById('finalScore').textContent = '';
  document.getElementById('summaryList').innerHTML = '';
  document.getElementById('quizSummary').style.display = 'none';
  document.getElementById('finishQuizBtn').style.display = 'none';
  document.getElementById("quizSetupBlock").style.display = "";
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    let questions = parseQuestions(content);

    if (document.getElementById('shuffleToggle').checked)
      shuffleArray(questions);

    window.shuffleAnswersEnabled = document.getElementById('shuffleAnswersToggle').checked;

    window.quizData = questions;
    window.userAnswers = {};
    renderQuiz(questions);
    showQuestion(0);
  };
  reader.readAsText(file);
}

function parseQuestions(text) {
  const questionBlocks = text.split(/\n(?=\d+\.\s)/);
  const questions = [];
  const seen = new Set();

  questionBlocks.forEach(block => {
    const lines = block.trim().split('\n').filter(Boolean);
    if (lines.length < 6) return;

    const questionText = lines[0].replace(/^\d+\.\s*/, '').trim();

    if (seen.has(questionText.toLowerCase())) return;
    seen.add(questionText.toLowerCase());

    const choices = {};
    let i = 1;
    while (i < lines.length && /^[A-E]\.\s/.test(lines[i])) {
      const match = lines[i].match(/^([A-E])\.\s*(.*)/);
      if (match) choices[match[1]] = match[2];
      i++;
    }

    const answerLine = lines.find(l => l.startsWith("Answer:"));
    const rawAnswer = answerLine?.split("Answer:")[1]?.trim();
    const answers = rawAnswer?.split(',').map(a => a.trim().toUpperCase()) || [];

    const expStart = lines.findIndex(l => l.startsWith("Explanation:"));
    const explanation = expStart !== -1
      ? lines.slice(expStart + 1).join(' ')
      : "";

    questions.push({
      questionText,
      choices,
      answers,
      explanation
    });
  });

  return questions;
}

function renderQuiz(questions) {
  const container = document.getElementById('quizContainer');
  container.innerHTML = '';

  questions.forEach((q, index) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'question-block';
    qDiv.id = `question-${index}`;

    const qText = document.createElement('p');
    qText.innerHTML = `<strong>${index + 1}. ${q.questionText}</strong>`;
    qDiv.appendChild(qText);

    const choiceDiv = document.createElement('div');
    choiceDiv.className = 'choices';

    const inputType = q.answers.length > 1 ? 'checkbox' : 'radio';

    let choiceEntries = Object.entries(q.choices);
    if (window.shuffleAnswersEnabled) shuffleArray(choiceEntries);

    const newLabels = ['A', 'B', 'C', 'D', 'E'];
    const choiceMap = {}; // new → original

    choiceEntries.forEach(([origKey, txt], i) => {
      const newKey = newLabels[i];
      choiceMap[newKey] = origKey;
    });

    q.choiceMap = choiceMap;

    choiceEntries.forEach(([origKey, txt], i) => {
      const newKey = newLabels[i];
      const label = document.createElement('label');
      label.innerHTML = `<input type="${inputType}" name="q${index}" value="${newKey}"> ${newKey}. ${txt}`;
      choiceDiv.appendChild(label);
    });

    qDiv.appendChild(choiceDiv);

    const submit = document.createElement('button');
    submit.textContent = 'Submit';
    submit.onclick = () =>
      checkAnswer(index, q.answers, inputType, q.explanation, true);

    qDiv.appendChild(submit);

    qDiv.appendChild(Object.assign(
      document.createElement('div'),
      { className: 'result', id: `result${index}` }
    ));

    qDiv.appendChild(Object.assign(
      document.createElement('div'),
      { className: 'explanation', id: `explanation${index}` }
    ));

    container.appendChild(qDiv);
  });

  document.getElementById('finishQuizBtn').style.display = 'block';
  document.getElementById('quizSummary').style.display = 'block';
  window.totalQuestions = questions.length;
}

function checkAnswer(index, correctAnswers, inputType, explanation, markAsSubmitted = false) {
  const question = window.quizData[index];
  const inputs = document.getElementsByName(`q${index}`);
  const selected = [];

  inputs.forEach(input => {
    if (input.checked) selected.push(input.value);
  });

  const result = document.getElementById(`result${index}`);
  const explanationDiv = document.getElementById(`explanation${index}`);
  const block = document.getElementById(`question-${index}`);

  if (selected.length === 0) {
    result.textContent = "Please select at least one answer.";
    result.className = 'result incorrect';
    explanationDiv.textContent = '';
    block.classList.add('highlight-missed');
    return false;
  }

  const reverseMap = question.choiceMap;
  const translated = selected.map(v => reverseMap[v]);

  const correctSet = new Set(correctAnswers);
  const selectedSet = new Set(translated);

  const isCorrect =
    selectedSet.size === correctSet.size &&
    [...correctSet].every(a => selectedSet.has(a));

  result.textContent = isCorrect
    ? "✅ Correct!"
    : `❌ Incorrect. Correct answer${correctAnswers.length > 1 ? 's' : ''}: ${correctAnswers.join(', ')}`;

  result.className = 'result ' + (isCorrect ? 'correct' : 'incorrect');

  if (!isCorrect) block.classList.add('highlight-missed');
  else block.classList.remove('highlight-missed');

  explanationDiv.textContent = explanation;

  if (markAsSubmitted) window.userAnswers[index] = isCorrect;
  return isCorrect;
}

function showQuestion(index) {
  if (!window.quizData) return;
  if (index < 0 || index >= quizData.length) return;

  document.querySelectorAll('.question-block')
    .forEach(q => q.classList.remove('active'));

  const block = document.getElementById(`question-${index}`);
  block.classList.add('active');
  block.scrollIntoView({ behavior: 'smooth', block: 'center' });

  currentQuestionIndex = index;
  document.getElementById('prevBtn').disabled = index === 0;
  document.getElementById('nextBtn').disabled = index === quizData.length - 1;

  speakQuestion(index);    // <-- voice integration hook
}

function finishQuiz() {
  const total = window.totalQuestions || 0;
  let correct = 0;

  const list = document.getElementById('summaryList');
  list.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const q = window.quizData[i];
    const inputType = q.answers.length > 1 ? 'checkbox' : 'radio';
    const wasAnswered = window.userAnswers[i] !== undefined;

    let isCorrect = wasAnswered
      ? window.userAnswers[i]
      : checkAnswer(i, q.answers, inputType, q.explanation, true);

    if (isCorrect) correct++;

    const li = document.createElement('li');
    li.textContent =
      `Question ${i + 1} – ` +
      (wasAnswered ? (isCorrect ? "✅ Correct" : "❌ Incorrect") : "⚠️ Missed");

    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      showQuestion(i);
      const block = document.getElementById(`question-${i}`);
      block.classList.add('flash-highlight');
      setTimeout(() => block.classList.remove('flash-highlight'), 1000);
    });

    list.appendChild(li);
  }

  const percent = Math.round((correct / total) * 100);
  document.getElementById('finalScore').textContent =
    `Final Score: ${percent}% (${correct}/${total})`;
}

/* ---------------------------------------------------------
   VOICE RECOGNITION + SPEECH
--------------------------------------------------------- */

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utter);
}

function listenOnce(callback) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice recognition not supported");
    return;
  }

  const rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = evt => {
    const text = evt.results[0][0].transcript.trim();
    callback(text);
  };

  rec.onerror = e => console.error("Speech error:", e.error);
  rec.start();
}

const autoReadToggle = document.getElementById('autoReadToggle');

// When showing a question, only read if auto reading is enabled
function speakQuestion(index) {
  const q = quizData[index];

  if (!autoReadToggle.checked) return; // skip auto reading

  let txt = `${q.questionText}. Options: `;
  for (const [label, choice] of Object.entries(q.choiceMap)) {
    const orig = q.choices[q.choiceMap[label]];
    txt += `${label}: ${orig}. `;
  }

  speak(txt);

  // If voice recognition is also enabled, listen after speaking
  if (voiceToggle.checked) {
    setTimeout(() => listenForVoiceAnswer(index), 2200);
  }
}

// Optionally, start/stop voice button depending on toggle
voiceToggle.addEventListener('change', () => {
    voiceBtn.disabled = !voiceToggle.checked;
    voiceOutput.innerHTML = voiceToggle.checked ? "🎤 Voice recognition enabled." : "🔇 Voice recognition disabled.";
});

autoReadToggle.addEventListener('change', () => {
    voiceOutput.innerHTML = autoReadToggle.checked
      ? "🗣️ Auto reading enabled."
      : "🔇 Auto reading disabled.";
});

function listenForVoiceAnswer(index) {
  const q = quizData[index];
  listenOnce(spoken => {
    spoken = spoken.toLowerCase();

    let chosenLabel = null;

    for (const [newLabel, origLabel] of Object.entries(q.choiceMap)) {
      const choiceText = q.choices[origLabel].toLowerCase();

      if (
        spoken === newLabel.toLowerCase() ||
        spoken.includes(choiceText)
      ) {
        chosenLabel = newLabel;
        break;
      }
    }

    if (!chosenLabel) {
      speak("I did not recognize that. Please try again.");
      return;
    }

    // Mark answer in UI
    const input = document.querySelector(
      `input[name="q${index}"][value="${chosenLabel}"]`
    );
    if (input) input.checked = true;

    // Submit
    const isCorrect = checkAnswer(
      index,
      q.answers,
      q.answers.length > 1 ? "checkbox" : "radio",
      q.explanation,
      true
    );

    speak(isCorrect ? "Correct." : "Submitted.");
  });
}
