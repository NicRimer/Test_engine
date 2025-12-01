import { QuizEngine } from './QuizEngine.js';

export const FileManager = {
  handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target.result;
      QuizEngine.quizData = QuizEngine.parseQuestions(content);
      if (document.getElementById('shuffleToggle').checked)
        QuizEngine.quizData.forEach(q => q.shuffleChoices());
      QuizEngine.render();
      QuizEngine.showQuestion(0);
    };
    reader.readAsText(file);
  },

  loadSelectedFile() {
    const selectedFile = document.getElementById('quizFileSelect').value;
    fetch(selectedFile)
      .then(res => res.ok ? res.text() : Promise.reject('File not found'))
      .then(content => {
        QuizEngine.quizData = QuizEngine.parseQuestions(content);
        if (document.getElementById('shuffleToggle').checked)
          QuizEngine.quizData.forEach(q => q.shuffleChoices());
        QuizEngine.render();
        QuizEngine.showQuestion(0);
      })
      .catch(err => alert('Could not load file: ' + err));
  }
};
