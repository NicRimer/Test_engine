/* ---------------------------------------------------------
   QUIZ ENGINE CORE - REFACTORED
--------------------------------------------------------- */

// ---------------------- Helpers ----------------------
const $ = id => document.getElementById(id);

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function isAnswerCorrect(selected, correct) {
  const selectedSet = new Set(selected);
  const correctSet = new Set(correct);
  return selectedSet.size === correctSet.size &&
         [...correctSet].every(a => selectedSet.has(a));
}

// ---------------------- Quiz Question ----------------------
class QuizQuestion {
  constructor({ questionText, choices, answers, explanation }) {
    this.text = questionText;
    this.choices = choices;
    this.answers = answers;
    this.explanation = explanation;
    this.choiceMap = {};
  }

  shuffleChoices() {
    const entries = Object.entries(this.choices);
    shuffleArray(entries);
    const labels = ['A', 'B', 'C', 'D', 'E'];
    entries.forEach(([origKey], i) => this.choiceMap[labels[i]] = origKey);
    this.shuffledChoices = entries.map(([_, val], i) => [labels[i], val]);
  }

  check(selected) {
    const mapped = selected.map(v => this.choiceMap[v]);
    return isAnswerCorrect(mapped, this.answers);
  }
}

// ---------------------- Voice Manager ----------------------
const VoiceManager = {
  recognition: null,
  enabled: false,
  autoRead: true,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported.");
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = false;

    this.recognition.addEventListener('result', (event) => {
      const text = event.results[0][0].transcript.trim();
      $('voiceOutput').innerHTML = `🗣️ You said: <b>${text}</b>`;
      if (this.onResult) this.onResult(text);
    });

    this.recognition.addEventListener('end', () => {
      if (this.enabled && this.autoRead) {
        // can restart if needed
      }
    });
  },

  speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
  },

  listenOnce(callback) {
    if (!this.recognition) return;
    this.onResult = callback;
    this.recognition.start();
  },

function speakQuestion(index) {
  const autoReadEnabled = document.getElementById('autoReadToggle').checked;
  if (!autoReadEnabled) return; // Do nothing if auto-reading is off

  const q = quizData[index];
  let txt = `${q.questionText}. Options: `;
  for (const [label, choice] of Object.entries(q.choiceMap)) {
    const orig = q.choices[choice];
    txt += `${label}: ${orig}. `;
  }

  speak(txt);

  // Start listening 1.5–3 seconds after speech
  setTimeout(() => listenForVoiceAnswer(index), 2200);
},

  listenForAnswer(questionIndex) {
    const question = window.quizData[questionIndex];
    this.listenOnce(spoken => {
      spoken = spoken.toLowerCase();
      let chosenLabel = null;
      for (const [newLabel, origLabel] of Object.entries(question.choiceMap)) {
        const choiceText = question.choices[origLabel].toLowerCase();
        if (spoken === newLabel.toLowerCase() || spoken.includes(choiceText)) {
          chosenLabel = newLabel;
          break;
        }
      }

      if (!chosenLabel) {
        this.speak("I did not recognize that. Please try again.");
        return;
      }

      // Mark answer
      const input = document.querySelector(`input[name="q${questionIndex}"][value="${chosenLabel}"]`);
      if (input) input.checked = true;

      // Submit
      const isCorrect = QuizEngine.checkAnswer(questionIndex);
      this.speak(isCorrect ? "Correct." : "Submitted.");
    });
  }
};

// ---------------------- Quiz Engine ----------------------
const QuizEngine = {
  currentIndex: 0,
  quizData: [],
  userAnswers: {},

  init() {
    // Event listeners
    $('fileInput').addEventListener('change', e => {
      this.reset();
      FileManager.handleFile(e);
      $('quizSetupBlock').style.display = 'none';
    });

    $('loadQuizFileBtn').addEventListener('click', () => {
      this.reset();
      FileManager.loadSelectedFile();
      $('quizSetupBlock').style.display = 'none';
    });

    $('finishQuizBtn').addEventListener('click', () => this.finish());
    $('prevBtn').addEventListener('click', () => this.showQuestion(this.currentIndex - 1));
    $('nextBtn').addEventListener('click', () => this.showQuestion(this.currentIndex + 1));
    $('restart').addEventListener('click', () => this.reset());

    $('quizSetupBlock').style.display = '';
    VoiceManager.init();
  },

  reset() {
    this.quizData = [];
    this.userAnswers = {};
    $('quizContainer').innerHTML = '';
    $('finalScore').textContent = '';
    $('summaryList').innerHTML = '';
    $('quizSummary').style.display = 'none';
    $('finishQuizBtn').style.display = 'none';
    $('quizSetupBlock').style.display = '';
  },

  parseQuestions(text) {
    const blocks = text.split(/\n(?=\d+\.\s)/);
    const questions = [];
    const seen = new Set();

    blocks.forEach(block => {
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

      questions.push(new QuizQuestion({ questionText, choices, answers, explanation }));
    });

    return questions;
  },

  render() {
    const container = $('quizContainer');
    container.innerHTML = '';

    this.quizData.forEach((q, index) => {
      q.shuffleChoices();

      const qDiv = document.createElement('div');
      qDiv.className = 'question-block';
      qDiv.id = `question-${index}`;

      const qText = document.createElement('p');
      qText.innerHTML = `<strong>${index + 1}. ${q.text}</strong>`;
      qDiv.appendChild(qText);

      const choiceDiv = document.createElement('div');
      choiceDiv.className = 'choices';

      const inputType = q.answers.length > 1 ? 'checkbox' : 'radio';

      q.shuffledChoices.forEach(([label, txt]) => {
        const labelEl = document.createElement('label');
        labelEl.innerHTML = `<input type="${inputType}" name="q${index}" value="${label}"> ${label}. ${txt}`;
        choiceDiv.appendChild(labelEl);
      });

      qDiv.appendChild(choiceDiv);

      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Submit';
      submitBtn.onclick = () => this.checkAnswer(index);
      qDiv.appendChild(submitBtn);

      qDiv.appendChild(Object.assign(document.createElement('div'), { className: 'result', id: `result${index}` }));
      qDiv.appendChild(Object.assign(document.createElement('div'), { className: 'explanation', id: `explanation${index}` }));

      container.appendChild(qDiv);
    });

    $('finishQuizBtn').style.display = 'block';
    $('quizSummary').style.display = 'block';
  },

  checkAnswer(index) {
    const question = this.quizData[index];
    const inputs = document.getElementsByName(`q${index}`);
    const selected = Array.from(inputs).filter(i => i.checked).map(i => i.value);

    const resultDiv = $(`result${index}`);
    const expDiv = $(`explanation${index}`);
    const block = $(`question-${index}`);

    if (!selected.length) {
      resultDiv.textContent = "Please select at least one answer.";
      resultDiv.className = 'result incorrect';
      expDiv.textContent = '';
      block.classList.add('highlight-missed');
      return false;
    }

    const isCorrect = question.check(selected);

    resultDiv.textContent = isCorrect
      ? "✅ Correct!"
      : `❌ Incorrect. Correct answer${question.answers.length > 1 ? 's' : ''}: ${question.answers.join(', ')}`;
    resultDiv.className = 'result ' + (isCorrect ? 'correct' : 'incorrect');

    if (!isCorrect) block.classList.add('highlight-missed');
    else block.classList.remove('highlight-missed');

    expDiv.textContent = question.explanation;

    this.userAnswers[index] = isCorrect;
    return isCorrect;
  },

  showQuestion(index) {
    if (index < 0 || index >= this.quizData.length) return;
    document.querySelectorAll('.question-block').forEach(q => q.classList.remove('active'));

    const block = $(`question-${index}`);
    block.classList.add('active');
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });

    this.currentIndex = index;
    $('prevBtn').disabled = index === 0;
    $('nextBtn').disabled = index === this.quizData.length - 1;

    if (VoiceManager.autoRead && VoiceManager.enabled) VoiceManager.speakQuestion(this.quizData[index]);
  },

  finish() {
    const total = this.quizData.length;
    let correct = 0;
    const summary = $('summaryList');
    summary.innerHTML = '';

    this.quizData.forEach((q, i) => {
      const isCorrect = this.userAnswers[i] !== undefined
        ? this.userAnswers[i]
        : this.checkAnswer(i);

      if (isCorrect) correct++;

      const li = document.createElement('li');
      li.textContent = `Question ${i + 1} – ${isCorrect ? "✅ Correct" : "❌ Incorrect"}`;
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        this.showQuestion(i);
        const block = $(`question-${i}`);
        block.classList.add('flash-highlight');
        setTimeout(() => block.classList.remove('flash-highlight'), 1000);
      });

      summary.appendChild(li);
    });

    $('finalScore').textContent = `Final Score: ${Math.round((correct / total) * 100)}% (${correct}/${total})`;
  }
};

// ---------------------- File Manager ----------------------
const FileManager = {
  handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target.result;
      QuizEngine.quizData = QuizEngine.parseQuestions(content);
      if ($('shuffleToggle').checked) QuizEngine.quizData.forEach(q => q.shuffleChoices());
      QuizEngine.render();
      QuizEngine.showQuestion(0);
    };
    reader.readAsText(file);
  },

  loadSelectedFile() {
    const selectedFile = $('quizFileSelect').value;
    fetch(selectedFile)
      .then(res => res.ok ? res.text() : Promise.reject('File not found'))
      .then(content => {
        QuizEngine.quizData = QuizEngine.parseQuestions(content);
        if ($('shuffleToggle').checked) QuizEngine.quizData.forEach(q => q.shuffleChoices());
        QuizEngine.render();
        QuizEngine.showQuestion(0);
      })
      .catch(err => alert('Could not load file: ' + err));
  }
};

// ---------------------- Voice Toggles ----------------------
$('voiceToggle').addEventListener('change', () => {
  VoiceManager.enabled = $('voiceToggle').checked;
  $('voiceBtn').disabled = !VoiceManager.enabled;
  $('voiceOutput').innerHTML = VoiceManager.enabled ? "🎤 Voice enabled" : "🔇 Voice disabled";
});

$('autoReadToggle').addEventListener('change', () => {
  VoiceManager.autoRead = $('autoReadToggle').checked;
  $('voiceOutput').innerHTML = VoiceManager.autoRead ? "📝 Auto-read enabled" : "📝 Auto-read disabled";
});

$('voiceBtn').addEventListener('click', () => {
  if (!VoiceManager.enabled) return $('voiceOutput').innerHTML = "⚠️ Voice recognition is off";
  if (!VoiceManager.recognition) return $('voiceOutput').innerHTML = "❌ Not supported";
  $('voiceOutput').innerHTML = "🎙️ Listening...";
  VoiceManager.recognition.start();
});

// ---------------------- Initialize ----------------------
QuizEngine.init();
