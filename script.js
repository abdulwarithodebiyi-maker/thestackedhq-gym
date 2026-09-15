/**
 * TheStackedHq - Core Frontend Logic
 * Production-ready static implementation for Netlify.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSession();
  initLeadForm();
  initChatWidget();
  setCurrentYear();
});

/* ==========================================================================
   1. Session Management
   ========================================================================== */
const SESSION_KEY = 'thestackedhq_session_id';

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

/* ==========================================================================
   2. Responsive Navigation & Sticky Scroll State
   ========================================================================== */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggleBtn = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link, .nav-btn');

  // Sticky border update on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // Mobile menu toggle
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('active');
    });

    // Close on link click
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/* ==========================================================================
   3. Lead Registration Form & n8n Webhook Integration
   ========================================================================== */
function initLeadForm() {
  const form = document.getElementById('leadRegistrationForm');
  if (!form) return;

  const LEAD_WEBHOOK_URL = 'https://odebs3480.app.n8n.cloud/webhook/thestackedhq-lead';

  const nameInput = document.getElementById('leadName');
  const emailInput = document.getElementById('leadEmail');
  const phoneInput = document.getElementById('leadPhone');
  const submitBtn = document.getElementById('submitLeadBtn');
  const formAlert = document.getElementById('formAlert');

  const nameError = document.getElementById('nameError');
  const emailError = document.getElementById('emailError');
  const phoneError = document.getElementById('phoneError');

  function clearErrors() {
    nameError.textContent = '';
    emailError.textContent = '';
    phoneError.textContent = '';
    nameInput.classList.remove('invalid');
    emailInput.classList.remove('invalid');
    phoneInput.classList.remove('invalid');
    formAlert.className = 'form-alert';
    formAlert.style.display = 'none';
    formAlert.textContent = '';
  }

  function validate() {
    let isValid = true;
    clearErrors();

    const nameVal = nameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const phoneVal = phoneInput.value.trim();

    // Name Validation
    if (!nameVal) {
      nameError.textContent = 'Please enter your full name.';
      nameInput.classList.add('invalid');
      isValid = false;
    } else if (nameVal.length < 2) {
      nameError.textContent = 'Name must be at least 2 characters.';
      nameInput.classList.add('invalid');
      isValid = false;
    }

    // Email Validation (RFC 5322 standard regex)
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailVal) {
      emailError.textContent = 'Please enter your email address.';
      emailInput.classList.add('invalid');
      isValid = false;
    } else if (!emailPattern.test(emailVal)) {
      emailError.textContent = 'Please provide a valid email address.';
      emailInput.classList.add('invalid');
      isValid = false;
    }

    // Phone Validation (Allows standard international/domestic formats)
    const phoneDigits = phoneVal.replace(/[^0-9]/g, '');
    if (!phoneVal) {
      phoneError.textContent = 'Please enter your phone number.';
      phoneInput.classList.add('invalid');
      isValid = false;
    } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      phoneError.textContent = 'Please enter a valid phone number (7-15 digits).';
      phoneInput.classList.add('invalid');
      isValid = false;
    }

    return isValid;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      sessionId: getOrCreateSessionId()
    };

    // Stash email in localStorage so the chat widget can attribute queries
    localStorage.setItem('thestackedhq_lead_email', payload.email);

    // Set UI State: Submitting
    submitBtn.disabled = true;
    submitBtn.classList.add('submitting');
    clearErrors();

    try {
      const response = await fetch(LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Status ${response.status}`);
      }

      let data = {};
      try {
        data = await response.json();
      } catch (parseErr) {
        // If n8n returns standard 200 without JSON, treat as success
        data = { success: true };
      }

      if (data.success === true || (data.success === undefined && response.status === 200)) {
        formAlert.className = 'form-alert success';
        formAlert.textContent = 'Thanks! Your details have been received.';
        formAlert.style.display = 'block';
        form.reset();
      } else {
        const errorMsg = data.message || "We couldn't submit your details right now. Please try again.";
        formAlert.className = 'form-alert error';
        formAlert.textContent = errorMsg;
        formAlert.style.display = 'block';
      }
    } catch (networkOrApiError) {
      console.error('Submission Error:', networkOrApiError);
      formAlert.className = 'form-alert error';
      formAlert.textContent = "We couldn't submit your details right now. Please try again.";
      formAlert.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('submitting');
    }
  });
}

/* ==========================================================================
   4. AI Chat Widget
   ========================================================================== */
function initChatWidget() {
  const CHAT_WEBHOOK_URL = 'https://odebs3480.app.n8n.cloud/webhook/thestackedhq-chat/chat';// Replace with your production n8n Chat Webhook URL

  const triggerBtn = document.getElementById('chatTriggerBtn');
  const chatWindow = document.getElementById('chatWindow');
  const closeBtn = document.getElementById('chatCloseBtn');
  const clearBtn = document.getElementById('chatClearBtn');
  const chatForm = document.getElementById('chatInputForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const chipButtons = document.querySelectorAll('.chat-chip');

  let isChatOpen = false;
  let isSending = false;

  // Toggle Window
  function toggleChat(forceOpen = null) {
    isChatOpen = forceOpen !== null ? forceOpen : !isChatOpen;
    if (isChatOpen) {
      chatWindow.hidden = false;
      // Trigger reflow for transition
      void chatWindow.offsetHeight;
      chatWindow.classList.add('open');
      triggerBtn.setAttribute('aria-expanded', 'true');
      setTimeout(() => chatInput.focus(), 150);
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

  // Clear Chat History
  clearBtn.addEventListener('click', () => {
    chatMessages.innerHTML = `
      <div class="chat-bubble bot-message">
        Conversation cleared. How can I assist you with TheStackedHq today?
      </div>
    `;
  });

  // Quick Chips
  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      if (query && !isSending) {
        chatInput.value = query;
        sendChatMessage(query);
      }
    });
  });

  // Append Bubbles
  function appendMessage(text, sender = 'bot') {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-bubble ${sender}-message`;
    msgEl.textContent = text;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgEl;
  }

  // Append Typing indicator
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

  // Send Logic to n8n
  async function sendChatMessage(rawMessage) {
    const userMessage = rawMessage.trim();
    if (!userMessage || isSending) return;

    // Display user message
    appendMessage(userMessage, 'user');
    chatInput.value = '';
    isSending = true;

    showTypingIndicator();

    const payload = {
      message: userMessage,
      session_id: getOrCreateSessionId(),
      email: localStorage.getItem('thestackedhq_lead_email') || null
    };

    try {
      if (CHAT_WEBHOOK_URL === 'CHAT_WEBHOOK_URL_HERE') {
        // Helpful dev state simulation when placeholder is unconfigured
        await new Promise(resolve => setTimeout(resolve, 800));
        removeTypingIndicator();
        appendMessage(
          "I'm ready to assist! (Note: Replace 'CHAT_WEBHOOK_URL_HERE' in script.js with your live n8n chat webhook URL to activate full AI responses).",
          'bot'
        );
        isSending = false;
        return;
      }

      const response = await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      removeTypingIndicator();

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      
      // Parse flexible n8n response payloads (e.g. { output: '...' } or { reply: '...' } or { message: '...' })
      const aiReply = data.output || data.reply || data.response || data.message || "I've logged your request. A team member can also help you directly at the front desk!";
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

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendChatMessage(chatInput.value);
  });
}

/* ==========================================================================
   5. Dynamic Date
   ========================================================================== */
function setCurrentYear() {
  const yearEl = document.getElementById('yearSpan');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

