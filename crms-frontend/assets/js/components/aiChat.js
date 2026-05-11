/* aiChat.js
   Floating AI chat widget. Features persistent history, rich car cards, 
   typing indicators, and a clean UI mimicking "Robi's design principles".
*/

(function () {
  if (!window.API || document.querySelector('.crms-ai-widget')) return;

  const STORAGE_KEY = 'crms_ai_history';

  // Inject CSS if missing
  if (!document.querySelector('link[href*="ai-widget.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../../assets/css/components/ai-widget.css';
    document.head.appendChild(link);
  }

  // Inject the DOM structure
  const widget = document.createElement('div');
  widget.className = 'crms-ai-widget';
  widget.innerHTML = `
    <button class="crms-ai-fab" aria-label="Open AI assistant" type="button">
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </button>
    <div class="crms-ai-panel">
      <header class="crms-ai-header">
        <div class="crms-ai-header-title">
          <div class="crms-ai-header-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M12 18v2"></path><path d="M4.93 10.93l1.41 1.41"></path><path d="M17.66 17.66l1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M6.34 17.66l-1.41 1.41"></path><path d="M19.07 10.93l-1.41 1.41"></path></svg>
          </div>
          CRMS Assistant
        </div>
        <button class="crms-ai-close" aria-label="Close" type="button">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </header>
      <div class="crms-ai-body" role="log" aria-live="polite"></div>
      <footer class="crms-ai-footer">
        <div>
          <button class="crms-ai-suggest-pill" type="button" data-recommend>💡 Recommend a car for me</button>
        </div>
        <form class="crms-ai-form">
          <input type="text" name="message" placeholder="Ask about cars, policies..." autocomplete="off" required />
          <button type="submit" aria-label="Send message">
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </footer>
    </div>
  `;

  document.body.appendChild(widget);

  const fab = widget.querySelector('.crms-ai-fab');
  const panel = widget.querySelector('.crms-ai-panel');
  const closeBtn = widget.querySelector('.crms-ai-close');
  const form = widget.querySelector('.crms-ai-form');
  const input = form.querySelector('input[name="message"]');
  const bodyNode = widget.querySelector('.crms-ai-body');
  const suggestBtn = widget.querySelector('[data-recommend]');

  let history = loadHistory();

  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {}
  }

  function parseMessageText(text) {
    let html = text.replace(/Car\s+#(\d+)\s*[-–]\s*([^,\n]+)/gi, (match, id, name) => {
      return `
        <a href="./car-detail.html?id=${id}" class="crms-ai-car-card" title="View ${name.trim()}">
          <div class="crms-ai-car-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/>
            </svg>
          </div>
          <div class="crms-ai-car-info">
            <span class="crms-ai-car-name">${name.trim()}</span>
            <span class="crms-ai-car-action">View details →</span>
          </div>
        </a>
      `;
    });

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  function appendMessage(role, text) {
    const wrapper = document.createElement('div');
    wrapper.className = 'crms-ai-msg ' + (role === 'assistant' ? 'assistant' : role === 'error' ? 'assistant error' : 'user');
    
    const bubble = document.createElement('div');
    bubble.className = 'crms-ai-bubble';
    
    if (role === 'assistant') {
      bubble.innerHTML = parseMessageText(text);
    } else {
      bubble.textContent = text; 
    }
    
    wrapper.appendChild(bubble);
    bodyNode.appendChild(wrapper);
    bodyNode.scrollTop = bodyNode.scrollHeight;
  }

  function addTypingIndicator() {
    const wrapper = document.createElement('div');
    wrapper.className = 'crms-ai-msg assistant typing-indicator';
    const bubble = document.createElement('div');
    bubble.className = 'crms-ai-bubble';
    bubble.innerHTML = `<div class="crms-ai-typing"><span></span><span></span><span></span></div>`;
    wrapper.appendChild(bubble);
    bodyNode.appendChild(wrapper);
    bodyNode.scrollTop = bodyNode.scrollHeight;
    return wrapper;
  }

  function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  function renderHistory() {
    bodyNode.innerHTML = '';
    if (history.length === 0) {
      appendMessage('assistant', "Hello! I'm your CRMS assistant. How can I help you today?");
    } else {
      history.forEach((msg) => {
        appendMessage(msg.role, msg.content);
      });
    }
  }

  function openPanel(focusInput = true) {
    panel.classList.add('is-open');
    if (focusInput) input.focus();
    renderHistory();
  }

  fab.addEventListener('click', (e) => {
    e.preventDefault();
    if (panel.classList.contains('is-open')) {
      panel.classList.remove('is-open');
    } else {
      openPanel();
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('is-open');
  });

  suggestBtn.addEventListener('click', async () => {
    const prompt = 'Can you recommend a reliable car for a trip?';
    appendMessage('user', prompt);
    input.value = '';
    
    const indicator = addTypingIndicator();
    
    try {
      const res = await window.API.ai.recommend(prompt);
      removeTypingIndicator(indicator);
      
      const reply = (res.data && res.data.reply) || res.reply || 'Sorry, I could not generate a response.';
      appendMessage('assistant', reply);

      history.push({ role: 'user', content: prompt });
      history.push({ role: 'assistant', content: reply });
      saveHistory();
    } catch (err) {
      removeTypingIndicator(indicator);
      appendMessage('error', 'AI error: ' + (err.message || err));
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;

    appendMessage('user', msg);
    input.value = '';
    
    const indicator = addTypingIndicator();

    try {
      const res = await window.API.ai.chat(msg, history);
      removeTypingIndicator(indicator);

      const reply = (res.data && res.data.reply) || res.reply || 'Sorry, I could not generate a response.';
      appendMessage('assistant', reply);

      history.push({ role: 'user', content: msg });
      history.push({ role: 'assistant', content: reply });
      saveHistory();
    } catch (err) {
      removeTypingIndicator(indicator);
      appendMessage('error', 'AI error: ' + (err.message || err));
    }
  });
})();
