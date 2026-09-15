/**
 * TheStackedHq - Core Frontend Logic
 * Lead form lives inside the chatbot. Chat UI unlocks only after successful lead submission.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSession();
  initChatWidget();
  setCurrentYear();
});

/* ==========================================================================
   1. Session Management
   ========================================================================== */
const SESSION_KEY = 'thestackedhq_session_id';
const LEAD_EMAIL_KEY = 'thestackedhq_lead_email';
const LEAD_CAPTURED_KEY = 'thestackedhq_lead_captured';

function getOrCreateSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    const randomHex = Math.random().toString(36).substring(2, 10);
    sessionId = `thestackedhq-${Date.now()}-${randomHex}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function initSession() {
  getOrCreateSessionId();
}

function hasLeadBeenCaptured() {
  return localStorage.getItem(LEAD_CAPTURED_KEY) === 'true' &&
         !!localStorage.getItem(LEAD_EMAIL_KEY);
}

/* ==========================================================================
   2. Responsive Navigation
   ========================================================================== */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggleBtn = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link, .nav-btn');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('active');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/* ==========================================================================
   3. AI Chat Widget (lead form is the first screen inside the widget)
   ========================================================================== */
function initChatWidget() {
  const LEAD_WEBHOOK_URL = 'https://odebs3480.app.n8n.cloud/webhook/thestackedhq-lead';
  // Only chat webhook URL
  const CHAT_WEBHOOK_URL = 'https://odebs3480.app.n8n.cloud/webhook/7b835ec1-cfe0-4663-89ea-212c4c511f90';

  const triggerBtn = document.getElementById('chatTriggerBtn');
  const chatWindow = document.getElementById('chatWindow');
  const closeBtn = document.getElementById('chatCloseBtn');
  const clearBtn = document.getElementById('chatClearBtn');
  const chatForm = document.getElementById('chatInputForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const chipButtons = document.querySelectorAll('.chat-chip');
  const openChatFromTrialBtn = document.getElementById('openChatFromTrial');

  const leadGate = document.getElementById('chatLeadGate');
  const activeArea = document.getElementById('chatActiveArea');
  const chatLeadForm = document.getElementById('chatLeadForm');
  const chatLeadName = document.getElementById('chatLeadName');
  const chatLeadEmail = document.getElementById('chatLeadEmail');
  const chatLeadPhone = document.getElementById('chatLeadPhone');
  const chatLeadSubmitBtn = document.getElementById('chatLeadSubmitBtn');
  const chatNameError = document.getElementById('chatNameError');
  const chatEmailError = document.getElementById('chatEmailError');
  const chatPhoneError = document.getElementById('chatPhoneError');
  const chatFormAlert = document.getElementById('chatFormAlert');
  const btnLabel = chatLeadSubmitBtn ? chatLeadSubmitBtn.querySelector('.btn-label') : null;

  let isChatOpen = false;
  let isSending = false;
  let hasShownInitialGreeting = false;

  function showLeadGate() {
    if (leadGate) leadGate.hidden = false;
    if (activeArea) activeArea.hidden = true;
    if (clearBtn) clearBtn.hidden = true;
  }

  function showChatInterface() {
    if (leadGate) leadGate.hidden = true;
    if (activeArea) activeArea.hidden = false;
    if (clearBtn) clearBtn.hidden = false;
  }

  function prepareChatView() {
    if (hasLeadBeenCaptured()) {
      showChatInterface();
    } else {
      showLeadGate();
    }
  }

  function appendMessage(text, sender = 'bot') {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-bubble ${sender}-message`;
    msgEl.textContent = text;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgEl;
  }

  function showInitialGreeting() {
    if (hasShownInitialGreeting) return;
    hasShownInitialGreeting = true;
    chatMessages.innerHTML = '';
    // Frontend-only welcome — do NOT send to n8n
    appendMessage('Hi! Welcome to TheStackedHq. How can I help you today?', 'bot');
  }

  function toggleChat(forceOpen = null) {
    isChatOpen = forceOpen !== null ? forceOpen : !isChatOpen;
    if (isChatOpen) {
      prepareChatView();
      chatWindow.hidden = false;
      void chatWindow.offsetHeight;
      chatWindow.classList.add('open');
      triggerBtn.setAttribute('aria-expanded', 'true');
      setTimeout(() => {
        if (hasLeadBeenCaptured()) {
          showInitialGreeting();
          if (chatInput) chatInput.focus();
        } else if (chatLeadName) {
          chatLeadName.focus();
        }
      }, 150);
    } else {
      chatWindow.classList.remove('open');
      triggerBtn.setAttribute('aria-expanded', 'false');
      setTimeout(() => {
        if (!chatWindow.classList.contains('open')) {
          chatWindow.hidden = true;
        }
      }, 300);
    }
  }

  triggerBtn.addEventListener('click', () => toggleChat());
  closeBtn.addEventListener('click', () => toggleChat(false));

  if (openChatFromTrialBtn) {
    openChatFromTrialBtn.addEventListener('click', () => toggleChat(true));
  }

  clearBtn.addEventListener('click', () => {
    if (!hasLeadBeenCaptured()) return;
    chatMessages.innerHTML = '';
    hasShownInitialGreeting = false;
    showInitialGreeting();
  });

  /* ---------- Lead form inside chat ---------- */
  function clearLeadErrors() {
    chatNameError.textContent = '';
    chatEmailError.textContent = '';
    chatPhoneError.textContent = '';
    chatLeadName.classList.remove('invalid');
    chatLeadEmail.classList.remove('invalid');
    chatLeadPhone.classList.remove('invalid');
    chatFormAlert.className = 'chat-form-alert';
    chatFormAlert.style.display = 'none';
    chatFormAlert.textContent = '';
  }

  function validateLeadForm() {
    let isValid = true;
    clearLeadErrors();

    const nameVal = chatLeadName.value.trim();
    const emailVal = chatLeadEmail.value.trim();
    const phoneVal = chatLeadPhone.value.trim();

    if (!nameVal) {
      chatNameError.textContent = 'Please enter your full name.';
      chatLeadName.classList.add('invalid');
      isValid = false;
    } else if (nameVal.length < 2) {
      chatNameError.textContent = 'Name must be at least 2 characters.';
      chatLeadName.classList.add('invalid');
      isValid = false;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailVal) {
      chatEmailError.textContent = 'Please enter your email address.';
      chatLeadEmail.classList.add('invalid');
      isValid = false;
    } else if (!emailPattern.test(emailVal)) {
      chatEmailError.textContent = 'Please provide a valid email address.';
      chatLeadEmail.classList.add('invalid');
      isValid = false;
    }

    const phoneDigits = phoneVal.replace(/[^0-9]/g, '');
    if (!phoneVal) {
      chatPhoneError.textContent = 'Please enter your phone number.';
      chatLeadPhone.classList.add('invalid');
      isValid = false;
    } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      chatPhoneError.textContent = 'Please enter a valid phone number (7-15 digits).';
      chatLeadPhone.classList.add('invalid');
      isValid = false;
    }

    return isValid;
  }

  chatLeadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateLeadForm()) return;

    const payload = {
      name: chatLeadName.value.trim(),
      email: chatLeadEmail.value.trim(),
      phone: chatLeadPhone.value.trim(),
      sessionId: getOrCreateSessionId()
    };

    chatLeadSubmitBtn.disabled = true;
    chatLeadSubmitBtn.classList.add('submitting');
    if (btnLabel) btnLabel.textContent = 'Starting Chat...';
    clearLeadErrors();

    try {
      const response = await fetch(LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Must receive a valid HTTP response
      if (!response.ok) {
        throw new Error('Request failed');
      }

      let data = {};
      try {
        data = await response.json();
      } catch (_) {
        data = {};
      }

      const isSuccess = data.success === true ||
        (data.success === undefined && response.status >= 200 && response.status < 300);

      if (isSuccess) {
        localStorage.setItem(LEAD_EMAIL_KEY, payload.email);
        localStorage.setItem(LEAD_CAPTURED_KEY, 'true');

        // Switch to real chat interface inside the same widget
        showChatInterface();
        hasShownInitialGreeting = false;
        showInitialGreeting();
        setTimeout(() => {
          if (chatInput) chatInput.focus();
        }, 100);
      } else {
        // success: false — keep form, show message from webhook if present
        const errorMsg = (typeof data.message === 'string' && data.message.trim())
          ? data.message.trim()
          : 'Please provide name, email and phone number.';
        chatFormAlert.className = 'chat-form-alert error';
        chatFormAlert.textContent = errorMsg;
        chatFormAlert.style.display = 'block';
      }
    } catch (err) {
      console.error('Lead submission error:', err);
      chatFormAlert.className = 'chat-form-alert error';
      chatFormAlert.textContent = 'Something went wrong. Please try again.';
      chatFormAlert.style.display = 'block';
    } finally {
      chatLeadSubmitBtn.disabled = false;
      chatLeadSubmitBtn.classList.remove('submitting');
      if (btnLabel) btnLabel.textContent = 'Submit & Start Chat';
    }
  });

  /* ---------- Chat messaging (only after lead success) ---------- */
  function showTypingIndicator() {
    const typingEl = document.createElement('div');
    typingEl.className = 'typing-indicator';
    typingEl.id = 'chatTypingIndicator';
    typingEl.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    chatMessages.appendChild(typingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTypingIndicator() {
    const typingEl = document.getElementById('chatTypingIndicator');
    if (typingEl) typingEl.remove();
  }

  async function sendChatMessage(rawMessage) {
    if (!hasLeadBeenCaptured()) return;

    const userMessage = rawMessage.trim();
    if (!userMessage || isSending) return;

    appendMessage(userMessage, 'user');
    chatInput.value = '';
    isSending = true;
    showTypingIndicator();

    const payload = {
      message: userMessage,
      session_id: getOrCreateSessionId(),
      email: localStorage.getItem(LEAD_EMAIL_KEY) || null
    };

    try {
      const response = await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      removeTypingIndicator();

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.output || data.reply || data.response || data.message ||
        "I've logged your request. A team member can also help you directly at the front desk!";
      appendMessage(aiReply, 'bot');
    } catch (err) {
      console.error('Chat error:', err);
      removeTypingIndicator();
      const errBubble = document.createElement('div');
      errBubble.className = 'chat-bubble error-message';
      errBubble.textContent = "Unable to reach the concierge right now. Please try again shortly.";
      chatMessages.appendChild(errBubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } finally {
      isSending = false;
    }
  }

  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      if (query && !isSending && hasLeadBeenCaptured()) {
        chatInput.value = query;
        sendChatMessage(query);
      }
    });
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!hasLeadBeenCaptured()) return;
    sendChatMessage(chatInput.value);
  });
}

/* ==========================================================================
   4. Dynamic Date
   ========================================================================== */
function setCurrentYear() {
  const yearEl = document.getElementById('yearSpan');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}
