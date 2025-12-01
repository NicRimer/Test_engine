import { shuffleArray, isAnswerCorrect } from './helpers.js';

export class QuizQuestion {
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
