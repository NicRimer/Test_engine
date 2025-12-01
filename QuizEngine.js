import { QuizQuestion } from './QuizQuestion.js';
import { VoiceManager } from './VoiceManager.js';
import { FileManager } from './FileManager.js';

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

    // ... other button listeners ...

    VoiceManager.init();
    VoiceManager.autoRead = document.getElementById('autoReadToggle').checked;
  },

  // parseQuestions, render, checkAnswer, showQuestion, finish methods ...
};
