let currentQuestionIndex = 0;

document.getElementById('fileInput').addEventListener('change', handleFile);
document.getElementById('finishQuizBtn').addEventListener('click', finishQuiz);
document.getElementById('prevBtn').addEventListener('click', () => showQuestion(currentQuestionIndex - 1));
document.getElementById('nextBtn').addEventListener('click', () => showQuestion(currentQuestionIndex + 1));

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

    const shuffleQuestions = document.getElementById('shuffleToggle').checked;
    if (shuffleQuestions) shuffleArray(questions);

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
  const seenQuestions = new Set();

  questionBlocks.forEach(block => {
    const lines = block.trim().split('\n').filter(Boolean);
    if (lines.length < 6) return;

    const questionLine = lines[0];
    const questionText = questionLine.replace(/^\d+\.\s*/, '').trim();

    if (seenQuestions.has(questionText.toLowerCase())) {
      console.warn(`Duplicate question skipped: "${questionText}"`);
      return;
    }
    seenQuestions.add(questionText.toLowerCase());

    const choices = {};
    let i = 1;
    while (i < lines.length && /^[A-E]\.\s/.test(lines[i])) {
      const match = lines[i].match(/^([A-E])\.\s*(.*)/);
      if (match) choices[match[1]] = match[2];
      i++;
    }

    const answerLine = lines.find(line => line.startsWith("Answer:"));
    const explanationStart = lines.findIndex(line => line.startsWith("Explanation:"));
    const explanationLines = lines.slice(explanationStart + 1).filter(line => !line.startsWith("[Reference"));

    const rawAnswer = answerLine?.split("Answer:")[1]?.trim();
    const answerArray = rawAnswer?.split(',').map(ans => ans.trim().toUpperCase()) || [];
    const explanation = explanationLines.join(' ');

    questions.push({
      questionText,
      choices,
      answers: answerArray,
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

    // ✅ Shuffle answers and relabel them A, B, C...
    let choiceEntries = Object.entries(q.choices);
    if (window.shuffleAnswersEnabled) shuffleArray(choiceEntries);

    const newLabels = ['A', 'B', 'C', 'D', 'E'];
    const choiceMap = {}; // new label → original label (for grading)
    choiceEntries.forEach(([origKey, value], i) => {
      const newKey = newLabels[i];
      choiceMap[newKey] = origKey;
    });

    q.choiceMap = choiceMap; // store mapping for answer checking

    choiceEntries.forEach(([origKey, value], i) => {
      const newKey = newLabels[i];
      const label = document.createElement('label');
      label.innerHTML = `<input type="${inputType}" name="q${index}" value="${newKey}"> ${newKey}. ${value}`;
      choiceDiv.appendChild(label);
    });

    qDiv.appendChild(choiceDiv);

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';
    submitBtn.onclick = () => checkAnswer(index, q.answers, inputType, q.explanation, true);
    qDiv.appendChild(submitBtn);

    const resultDiv = document.createElement('div');
    resultDiv.className = 'result';
    resultDiv.id = `result${index}`;
    qDiv.appendChild(resultDiv);

    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation';
    explanationDiv.id = `explanation${index}`;
    qDiv.appendChild(explanationDiv);

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

  // ✅ Translate shuffled letters back to original for grading
  const reverseMap = Object.fromEntries(
    Object.entries(question.choiceMap || {}).map(([newK, oldK]) => [newK, oldK])
  );
  const translated = selected.map(v => reverseMap[v]);

  const correctSet = new Set(correctAnswers);
  const selectedSet = new Set(translated);

  const isCorrect = selectedSet.size === correctSet.size &&
                    [...correctSet].every(a => selectedSet.has(a));

  if (isCorrect) {
    result.textContent = "✅ Correct!";
    result.className = 'result correct';
    block.classList.remove('highlight-missed');
  } else {
    result.textContent = `❌ Incorrect. Correct answer${correctAnswers.length > 1 ? 's are' : ' is'}: ${correctAnswers.join(', ')}`;
    result.className = 'result incorrect';
    block.classList.add('highlight-missed');
  }

  explanationDiv.textContent = explanation;
  if (markAsSubmitted) window.userAnswers[index] = isCorrect;

  return isCorrect;
}

function showQuestion(index) {
  if (!window.quizData) return;
  const total = quizData.length;
  if (index < 0 || index >= total) return;

  document.querySelectorAll('.question-block').forEach(q => q.classList.remove('active'));
  const block = document.getElementById(`question-${index}`);
  block.classList.add('active');
  block.scrollIntoView({ behavior: 'smooth', block: 'center' });

  currentQuestionIndex = index;
  document.getElementById('prevBtn').disabled = index === 0;
  document.getElementById('nextBtn').disabled = index === total - 1;
}

function finishQuiz() {
  const total = window.totalQuestions || 0;
  let correct = 0;

  const list = document.getElementById('summaryList');
  list.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const question = window.quizData[i];
    const inputType = question.answers.length > 1 ? 'checkbox' : 'radio';
    const wasAnswered = window.userAnswers[i] !== undefined;

    let isCorrect = false;

    if (!wasAnswered) {
      isCorrect = checkAnswer(i, question.answers, inputType, question.explanation, true);
    } else {
      isCorrect = window.userAnswers[i];
    }

    const li = document.createElement('li');
    const questionNum = i + 1;

    if (!wasAnswered) {
      li.textContent = `Question ${questionNum} – ⚠️ Missed`;
    } else if (isCorrect) {
      li.textContent = `Question ${questionNum} – ✅ Correct`;
      correct++;
    } else {
      li.textContent = `Question ${questionNum} – ❌ Incorrect`;
    }

    // ✅ Click summary → focus & flash
    li.style.cursor = 'pointer';
    li.title = "Click to view question";
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
    `✅ Final Score: ${percent}% (${correct} out of ${total})`;
}
