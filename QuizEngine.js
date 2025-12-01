// QuizEngine.js
import { QuizQuestion } from 'QuizQuestion.js';
import { shuffleArray, isAnswerCorrect } from 'helpers.js';
import { VoiceManager } from 'VoiceManager.js';
import { FileManager } from 'FileManager.js';

export const QuizEngine = {
  currentIndex: 0,
  quizData: [],
  userAnswers: {},

  init() {
    document.getElementById('fileInput').addEventListener('change', e => {
      this.reset();
      FileManager.handleFile(e);
      document.getElementById('quizSetupBlock').style.display = 'none';
    });

    document.getElementById('loadQuizFileBtn').addEventListener('click', () => {
      this.reset();
      FileManager.loadSelectedFile();
      document.getElementById('quizSetupBlock').style.display = 'none';
    });

    document.getElementById('finishQuizBtn').addEventListener('click', () => this.finish());
    document.getElementById('prevBtn').addEventListener('click', () => this.showQuestion(this.currentIndex - 1));
    document.getElementById('nextBtn').addEventListener('click', () => this.showQuestion(this.currentIndex + 1));
    document.getElementById('restart').addEventListener('click', () => this.reset());

    VoiceManager.init();
    VoiceManager.autoRead = document.getElementById('autoReadToggle').checked;
  },

  reset() {
    this.quizData = [];
    this.userAnswers = {};
    document.getElementById('quizContainer').innerHTML = '';
    document.getElementById('finalScore').textContent = '';
    document.getElementById('summaryList').innerHTML = '';
    document.getElementById('quizSummary').style.display = 'none';
    document.getElementById('finishQuizBtn').style.display = 'none';
    document.getElementById('quizSetupBlock').style.display = '';
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
      const explanation = expStart !== -1 ? lines.slice(expStart + 1).join(' ') : "";

      questions.push(new QuizQuestion({ questionText, choices, answers, explanation }));
    });

    return questions;
  },

  render() {
    const container = document.getElementById('quizContainer');
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

    document.getElementById('finishQuizBtn').style.display = 'block';
    document.getElementById('quizSummary').style.display = 'block';
  },

  checkAnswer(index) {
    const question = this.quizData[index];
    const inputs = document.getElementsByName(`q${index}`);
    const selected = Array.from(inputs).filter(i => i.checked).map(i => i.value);

    const resultDiv = document.getElementById(`result${index}`);
    const expDiv = document.getElementById(`explanation${index}`);
    const block = document.getElementById(`question-${index}`);

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

    const block = document.getElementById(`question-${index}`);
    block.classList.add('active');
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });

    this.currentIndex = index;
    document.getElementById('prevBtn').disabled = index === 0;
    document.getElementById('nextBtn').disabled = index === this.quizData.length - 1;

    const autoReadEnabled = document.getElementById('autoReadToggle').checked;
    if (VoiceManager.enabled && autoReadEnabled) {
      let txt = `${this.quizData[index].text}. Options: `;
      for (const [label, orig] of Object.entries(this.quizData[index].choiceMap)) {
        txt += `${label}: ${this.quizData[index].choices[orig]}. `;
      }
      VoiceManager.speak(txt);
    }
  },

  finish() {
    const total = this.quizData.length;
    let correct = 0;
    const summary = document.getElementById('summaryList');
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
        const block = document.getElementById(`question-${i}`);
        block.classList.add('flash-highlight');
        setTimeout(() => block.classList.remove('flash-highlight'), 1000);
      });

      summary.appendChild(li);
    });

    document.getElementById('finalScore').textContent = `Final Score: ${Math.round((correct / total) * 100)}% (${correct}/${total})`;
  }
};
