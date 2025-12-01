// main.js
import { QuizEngine } from './QuizEngine.js';
import { VoiceManager } from './VoiceManager.js';

QuizEngine.init();

// Voice toggles
document.getElementById('voiceToggle').addEventListener('change', () => {
  VoiceManager.enabled = document.getElementById('voiceToggle').checked;
  document.getElementById('voiceBtn').disabled = !VoiceManager.enabled;
  document.getElementById('voiceOutput').innerHTML = VoiceManager.enabled ? "🎤 Voice enabled" : "🔇 Voice disabled";
});

document.getElementById('autoReadToggle').addEventListener('change', () => {
  VoiceManager.autoRead = document.getElementById('autoReadToggle').checked;
  document.getElementById('voiceOutput').innerHTML = VoiceManager.autoRead ? "📝 Auto-read enabled" : "📝 Auto-read disabled";
});

document.getElementById('voiceBtn').addEventListener('click', () => {
  if (!VoiceManager.enabled) return document.getElementById('voiceOutput').innerHTML = "⚠️ Voice recognition is off";
  if (!VoiceManager.recognition) return document.getElementById('voiceOutput').innerHTML = "❌ Not supported";
  document.getElementById('voiceOutput').innerHTML = "🎙️ Listening...";
  VoiceManager.recognition.start();
});
