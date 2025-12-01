export const VoiceManager = {
  recognition: null,
  enabled: false,
  autoRead: false,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return console.warn("Speech recognition not supported.");

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = false;

    this.recognition.addEventListener('result', (event) => {
      const text = event.results[0][0].transcript.trim();
      document.getElementById('voiceOutput').innerHTML = `🗣️ You said: <b>${text}</b>`;
      if (this.onResult) this.onResult(text);
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
  }
};
