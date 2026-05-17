/* -- SPOPEER AGENT HUB -- */
(function () {
  const AGENT_MODES = {
    secretary: {
      greeting: "Hi! I'm your Secretary Agent. I can help you schedule tasks, draft messages, or manage your sports to-do list.",
      actions: [
        { label: 'Draft a message', url: '/pages/messaging/inbox.html', icon: 'fa-envelope' },
        { label: 'Edit your profile', url: '/pages/profiles/edit-profile.html', icon: 'fa-user-pen' },
        { label: 'Go to your feed', url: '/feed.html', icon: 'fa-rss' },
        { label: 'Contact support', url: '/pages/contact/index.html', icon: 'fa-headset' }
      ]
    },
    manager: {
      greeting: "Hi! I'm your Manager Agent. I help you grow your sports career � visibility, connections, and opportunities.",
      actions: [
        { label: 'Find coaches', url: '/pages/search/search.html', icon: 'fa-whistle' },
        { label: 'Find athletes', url: '/pages/search/search.html', icon: 'fa-person-running' },
        { label: 'Browse clubs', url: '/pages/search/search.html', icon: 'fa-shield-halved' },
        { label: 'Your followers', url: '/pages/profiles/followers.html', icon: 'fa-users' }
      ]
    },
    journalist: {
      greeting: "Hi! I'm your Journalist Agent. I can help you write posts, articles, and sports content.",
      actions: [
        { label: 'Write a post on feed', url: '/feed.html', icon: 'fa-pen-nib' },
        { label: 'Browse community', url: '/pages/community/community.html', icon: 'fa-people-group' },
        { label: 'Check your profile', url: '/pages/profiles/edit-profile.html', icon: 'fa-id-badge' },
        { label: 'Explore the platform', url: '/pages/search/search.html', icon: 'fa-magnifying-glass' }
      ]
    },
    scout: {
      greeting: "Hi! I'm your Scout Agent. I discover athletes, coaches and clubs for you.",
      actions: [
        { label: 'Search athletes', url: '/pages/search/search.html', icon: 'fa-person-running' },
        { label: 'Search coaches', url: '/pages/search/search.html', icon: 'fa-whistle' },
        { label: 'Search clubs', url: '/pages/search/search.html', icon: 'fa-shield-halved' },
        { label: 'Send a message', url: '/pages/messaging/inbox.html', icon: 'fa-envelope' }
      ]
    },
    athlete: {
      greeting: "Hi! I'm the Athlete Finder. Tell me what sport, level or country you're looking for.",
      actions: [
        { label: 'Search athletes', url: '/pages/search/search.html', icon: 'fa-person-running' },
        { label: 'View athlete profiles', url: '/pages/profiles/athlete-profile.html', icon: 'fa-id-card' },
        { label: 'Connect with athletes', url: '/pages/messaging/inbox.html', icon: 'fa-envelope' },
        { label: 'Explore community', url: '/pages/community/community.html', icon: 'fa-people-group' }
      ]
    },
    coach: {
      greeting: "Hi! I'm the Coach Finder. I help you find the right coach for your sport and level.",
      actions: [
        { label: 'Search coaches', url: '/pages/search/search.html', icon: 'fa-whistle' },
        { label: 'View coach profiles', url: '/pages/profiles/coach-profile.html', icon: 'fa-id-card' },
        { label: 'Message a coach', url: '/pages/messaging/inbox.html', icon: 'fa-envelope' },
        { label: 'Browse community', url: '/pages/community/community.html', icon: 'fa-people-group' }
      ]
    },
    club: {
      greeting: "Hi! I'm the Club Finder. I help you discover and connect with sports clubs worldwide.",
      actions: [
        { label: 'Search clubs', url: '/pages/search/search.html', icon: 'fa-shield-halved' },
        { label: 'View club profiles', url: '/pages/profiles/club-profile.html', icon: 'fa-id-card' },
        { label: 'Contact a club', url: '/pages/messaging/inbox.html', icon: 'fa-envelope' },
        { label: 'Your connections', url: '/pages/profiles/followers.html', icon: 'fa-users' }
      ]
    },
    sponsor: {
      greeting: "Hi! I'm your Sponsor Agent. I help you find sponsorship opportunities or connect sponsors with talent.",
      actions: [
        { label: 'Browse marketplace', url: '/pages/marketplace/index.html', icon: 'fa-store' },
        { label: 'Find athletes', url: '/pages/search/search.html', icon: 'fa-person-running' },
        { label: 'Manage ads', url: '/pages/ads/ads-manager.html', icon: 'fa-bullhorn' },
        { label: 'Contact support', url: '/pages/contact/index.html', icon: 'fa-headset' }
      ]
    }
  };

  let agentMemory = { goal: 'Not selected yet', nextStep: 'Ask the agent what you want to do' };

  function appendMessage(text, role) {
    const chat = document.getElementById('agentChat');
    if (!chat) return;
    const div = document.createElement('div');
    div.className = 'agent-message ' + role;
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function showResults(actions) {
    const resultsEl = document.getElementById('agentResults');
    const content = document.getElementById('agentResultsContent');
    if (!resultsEl || !content) return;
    content.innerHTML = actions.map(a => `
      <a class="agent-result-block" href="${a.url}">
        <span class="agent-result-icon"><i class="fa-solid ${a.icon}"></i></span>
        <div>
          <div class="agent-result-label">${a.label}</div>
        </div>
      </a>
    `).join('');
    resultsEl.classList.add('visible');
  }

  function updateMemory(goal, nextStep) {
    agentMemory = { goal, nextStep };
    const goalEl = document.getElementById('agentGoal');
    const stepEl = document.getElementById('agentNextStep');
    if (goalEl) goalEl.textContent = goal;
    if (stepEl) stepEl.textContent = nextStep;
  }

  function handleUserMessage(text) {
    const mode = document.getElementById('agentMode');
    const modeKey = mode ? mode.value : 'secretary';
    const modeData = AGENT_MODES[modeKey] || AGENT_MODES.secretary;

    appendMessage(text, 'user');
    updateMemory(text, 'Showing suggested actions below');

    const lower = text.toLowerCase();
    let reply = "Got it! Here are some suggested actions based on what you told me.";
    if (lower.includes('coach') || lower.includes('trainer')) {
      reply = "Looking for coaches! Here are the best ways to find and connect with coaches on Spopeer.";
    } else if (lower.includes('athlete') || lower.includes('player')) {
      reply = "Looking for athletes! Here is how to find and connect with athletes on Spopeer.";
    } else if (lower.includes('club') || lower.includes('team')) {
      reply = "Looking for clubs or teams! Here is how to find them on Spopeer.";
    } else if (lower.includes('message') || lower.includes('contact') || lower.includes('reach out')) {
      reply = "Sure! Head to your inbox to send messages and reach out to anyone on Spopeer.";
    } else if (lower.includes('write') || lower.includes('article') || lower.includes('post')) {
      reply = "Great! You can write posts directly in your feed or community pages.";
    } else if (lower.includes('sponsor') || lower.includes('brand') || lower.includes('deal')) {
      reply = "Let's explore sponsorship opportunities on Spopeer!";
    } else if (lower.includes('profile')) {
      reply = "Let's update your profile so you can stand out to coaches and clubs!";
    }

    setTimeout(() => {
      appendMessage(reply, 'bot');
      showResults(modeData.actions);
    }, 320);
  }

  function initAgentHub() {
    const modeSelect = document.getElementById('agentMode');
    const form = document.getElementById('agentForm');
    const input = document.getElementById('agentInput');
    const quickBtns = document.querySelectorAll('.agent-quick-actions button');
    const resultsEl = document.getElementById('agentResults');

    if (!form || !input) return;

    // Set greeting on mode change
    if (modeSelect) {
      modeSelect.addEventListener('change', function () {
        const modeData = AGENT_MODES[this.value] || AGENT_MODES.secretary;
        const chat = document.getElementById('agentChat');
        if (chat) chat.innerHTML = '';
        if (resultsEl) resultsEl.classList.remove('visible');
        appendMessage(modeData.greeting, 'bot');
        updateMemory('Mode: ' + this.options[this.selectedIndex].text, 'Ask the agent what you want to do');
      });
    }

    // Quick action buttons
    quickBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const prompt = this.dataset.prompt;
        if (prompt) handleUserMessage(prompt);
      });
    });

    // Form submit
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      handleUserMessage(text);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgentHub);
  } else {
    initAgentHub();
  }
})();
