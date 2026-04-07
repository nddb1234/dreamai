const chatBox = document.getElementById("chatBox");
const welcomeScreen = document.getElementById("welcomeScreen");
const chatStage = document.getElementById("chatStage");
const chatInput = document.getElementById("chatInput");
const statusLabel = document.getElementById("statusLabel");

let chatMessages = [];
let lastBotMessage = "";
let hasStartedConversation = false;

// --- HISTORIQUE ---
function loadChatHistory() {
  const history = localStorage.getItem("dreamChatHistory");
  if (history) {
    chatMessages = JSON.parse(history);
    chatMessages.forEach(msg => {
      addChatMessage(msg.role, msg.content, false); // false = pas de double sauvegarde
    });
  }
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function parseMarkdown(text) {
  // Échapper le HTML
  let safeText = escapeHtml(text);

  // Gras
  safeText = safeText.replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>");

  // Italique
  safeText = safeText.replace(/\*(.+?)\*/gs, "<em>$1</em>");

  // Listes commençant par + 
  safeText = safeText.replace(/^\s*\+ (.+)$/gm, "<li>$1</li>");

  // Transformer les <li> consécutifs en <ul>
  safeText = safeText.replace(/(<li>.+<\/li>)/gs, "<ul>$1</ul>");

  // Sauts de ligne
  safeText = safeText.replace(/\n/g, "<br>");

  return safeText;
}

function saveChatHistory() {
  localStorage.setItem("dreamChatHistory", JSON.stringify(chatMessages));
}

function clearChatHistory() {
  localStorage.removeItem("dreamChatHistory");
  alert("Historique supprimé !");
}

function resetConversation() {
  if (confirm("Veux-tu vraiment réinitialiser la conversation ?")) {
    localStorage.removeItem("dreamChatHistory");
    chatMessages = [];
    chatBox.innerHTML = "";
    lastBotMessage = "";
    hasStartedConversation = false;
    welcomeScreen.classList.remove("fade-out");
    chatStage.classList.remove("active");
  }
}

// --- TRANSITION ACCUEIL ---
function startConversationIfNeeded() {
  if (hasStartedConversation) return;

  hasStartedConversation = true;
  welcomeScreen.classList.add("fade-out");
  chatStage.classList.add("active");
}

// --- AJOUT MESSAGE ---
function addChatMessage(type, text, withTransition = true) {
  startConversationIfNeeded();

  const row = document.createElement("div");
  row.className = `message-row ${type}`;

  const bubble = document.createElement("div");
  bubble.className = `message ${type}`;
  bubble.textContent = parseMarkdown(text);
  bubble.innerHTML = parseMarkdown(text);

  row.appendChild(bubble);
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (withTransition) {
    chatMessages.push({ role: type === "user" ? "user" : "assistant", content: text });
    saveChatHistory();
  }
}

// --- ANIMATION ATTENTE ---
function addTypingIndicator() {
  startConversationIfNeeded();

  const row = document.createElement("div");
  row.className = "message-row bot";

  const bubble = document.createElement("div");
  bubble.className = "message bot typing";
  bubble.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;

  row.appendChild(bubble);
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;

  return row;
}

// --- ENTREE CLAVIER ---
function handleChatEnter(event) {
  if (event.key === "Enter") {
    if (event.shiftKey) {
      // Shift+Enter = retour à la ligne
      const cursorPos = chatInput.selectionStart;
      const value = chatInput.value;
      chatInput.value = value.slice(0, cursorPos) + "\n" + value.slice(cursorPos);
      chatInput.selectionStart = chatInput.selectionEnd = cursorPos + 1;
    } else {
      // Enter seul = envoyer le message
      event.preventDefault();
      sendChat();
    }
  }
}

// --- ENVOI MESSAGE ---
async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;

  startConversationIfNeeded();
  addChatMessage("user", text);
  chatInput.value = "";
  statusLabel.textContent = "Réponse en cours...";

  const typingRow = addTypingIndicator();

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatMessages })
    });

    const data = await response.json();
    const reply = data.reply || "Aucune réponse.";

    typingRow.remove();
    lastBotMessage = reply;
    addChatMessage("bot", reply);
    saveChatHistory();

    statusLabel.textContent = "Prêt";

  } catch (error) {
    typingRow.remove();
    addChatMessage("bot", "Erreur : " + error.message);
    statusLabel.textContent = "Erreur";
  }
}

// --- DICTÉE VOCALE ---
function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("La reconnaissance vocale n’est pas disponible sur ce navigateur.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "fr-FR";
  recognition.start();
  statusLabel.textContent = "Écoute...";

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    statusLabel.textContent = "Prêt";
  };

  recognition.onerror = function() {
    statusLabel.textContent = "Erreur micro";
  };

  recognition.onend = function() {
    if (statusLabel.textContent === "Écoute...") {
      statusLabel.textContent = "Prêt";
    }
  };
}

// --- CHARGEMENT DE LA PAGE ---
window.addEventListener("DOMContentLoaded", () => {
  loadChatHistory();
});