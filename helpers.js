export const $ = id => document.getElementById(id);

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function isAnswerCorrect(selected, correct) {
  const selectedSet = new Set(selected);
  const correctSet = new Set(correct);
  return selectedSet.size === correctSet.size &&
         [...correctSet].every(a => selectedSet.has(a));
}
