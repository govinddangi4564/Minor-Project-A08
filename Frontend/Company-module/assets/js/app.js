import { STORAGE_KEYS, getStoredData, initStorage, ensureMatches } from './data.js';

function setActiveNav() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === current || (current === "" && href === "index.html")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function handleThemeToggle() {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
  root.setAttribute("data-theme", savedTheme);

  const toggleBtn = document.querySelector("#themeToggleBtn");
  if (!toggleBtn || toggleBtn.dataset.initialized) return;

  toggleBtn.textContent = savedTheme === "dark" ? "Light" : "Dark";
  toggleBtn.dataset.initialized = "true";
  toggleBtn.addEventListener("click", () => {
    const currentTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", currentTheme);
    localStorage.setItem(STORAGE_KEYS.theme, currentTheme);
    toggleBtn.textContent = currentTheme === "dark" ? "Light" : "Dark";
  });
}

function initTabs() {
  document.querySelectorAll(".tabs").forEach((tabGroup) => {
    if (tabGroup.dataset.initialized) return;
    tabGroup.dataset.initialized = "true";
    const buttons = Array.from(tabGroup.querySelectorAll("button"));
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        const targetId = button.getAttribute("data-tab-target");
        if (targetId) {
          document.querySelectorAll(`[data-tab-section='${targetId}']`).forEach((section) => {
            section.classList.remove("hidden");
          });
          document
            .querySelectorAll(`.tab-section[data-tab-group='${tabGroup.dataset.tabGroup || "default"}']`)
            .forEach((section) => {
              if (section.getAttribute("data-tab-section") !== targetId) {
                section.classList.add("hidden");
              }
            });
        }
      });
    });
  });
}

function setupAssistant() {
  const assistantPanel = document.querySelector(".assistant-panel");
  const assistantBody = document.querySelector("#assistantBody");
  const assistantInput = document.querySelector("#assistantInput");
  if (!assistantPanel || !assistantBody || !assistantInput || assistantPanel.dataset.initialized) {
    return;
  }

  const initialMessage =
    assistantPanel.dataset.initialMessage || "Hi! Ask me to filter candidates by skill or score.";

  const renderMessage = (text, variant = "assistant") => {
    const bubble = document.createElement("div");
    bubble.className = `assistant-bubble ${variant}`.trim();
    bubble.textContent = text;
    assistantBody.appendChild(bubble);
    assistantBody.scrollTop = assistantBody.scrollHeight;
  };

  renderMessage(initialMessage);
  assistantPanel.dataset.initialized = "true";

  assistantInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const query = assistantInput.value.trim();
    if (!query) return;
    renderMessage(query, "user");
    assistantInput.value = "";
    handleAssistantQuery(query, renderMessage);
  });

  // Create floating emoji toggle button (🤖) to open/close the assistant panel
  if (!document.querySelector('.assistant-toggle')) {
    const toggle = document.createElement('button');
    toggle.className = 'assistant-toggle';
    toggle.type = 'button';
    toggle.title = 'Open AI Assistant';
    toggle.innerHTML = '🤖';
    document.body.appendChild(toggle);

    // Restore open state if stored
    try {
      const open = localStorage.getItem('assistant_open') === 'true';
      if (open) {
        assistantPanel.classList.add('open');
        toggle.classList.add('active');
      }
    } catch (e) {
      /* ignore storage errors */
    }

    toggle.addEventListener('click', () => {
      const isOpen = assistantPanel.classList.toggle('open');
      toggle.classList.toggle('active');
      // persist state
      try {
        localStorage.setItem('assistant_open', isOpen ? 'true' : 'false');
      } catch (e) { }
    });
  }

  // Add a close button in the panel header if not present
  const header = assistantPanel.querySelector('header');
  if (header && !header.querySelector('.ai-close-btn')) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ai-close-btn';
    closeBtn.type = 'button';
    closeBtn.title = 'Close assistant';
    closeBtn.textContent = '✕';
    header.appendChild(closeBtn);
    closeBtn.addEventListener('click', () => {
      assistantPanel.classList.remove('open');
      const toggle = document.querySelector('.assistant-toggle');
      if (toggle) toggle.classList.remove('active');
      try {
        localStorage.setItem('assistant_open', 'false');
      } catch (e) { }
    });
  }
}

function handleAssistantQuery(query, render) {
  const candidates = getStoredData(STORAGE_KEYS.candidates) || [];
  const expMatch = query.match(/(\d+)\s*(?:\+|plus)?\s*years?/i);
  const skillMatch = query.match(/with\s+(.+)/i);

  let filtered = [...candidates];

  if (expMatch) {
    const years = parseInt(expMatch[1], 10);
    filtered = filtered.filter((cand) => cand.experience >= years);
  }

  if (skillMatch) {
    const skills = skillMatch[1]
      .split(/,|\band\b/i)
      .map((skill) => skill.trim().toLowerCase())
      .filter(Boolean);
    if (skills.length) {
      filtered = filtered.filter((cand) =>
        skills.every((skill) => cand.skills.some((candSkill) => candSkill.toLowerCase().includes(skill)))
      );
    }
  }

  const aboveScore = query.match(/above\s*(\d+)%?/i);
  if (aboveScore) {
    const score = parseInt(aboveScore[1], 10);
    filtered = filtered.filter((cand) => (cand.matches?.finalScore || 0) >= score);
  }

  const shortlistedOnly = /(shortlisted|shortlist)/i.test(query);
  if (shortlistedOnly) {
    const shortlist = getStoredData(STORAGE_KEYS.shortlist) || {};
    filtered = filtered.filter((cand) => shortlist[cand.id]?.shortlisted);
  }

  if (!filtered.length) {
    render("No candidates found for that query. Try refining the skills or score threshold.");
    return;
  }

  const summary = filtered
    .map((cand) => `${cand.name} (${cand.experience} yrs, ${cand.matches?.finalScore || 0} score)`)
    .join("; ");
  render(`Found ${filtered.length} candidates: ${summary}`);
}

function setupSidebarToggle() {
  const sidebarToggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');

  if (sidebarToggleBtn && sidebar) {
    // Check if overlay already exists
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      // Create and append the overlay element if it doesn't exist
      overlay = document.createElement('div');
      overlay.classList.add('sidebar-overlay');
      document.body.appendChild(overlay);
    }

    // Function to open or close the sidebar
    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    };

    // Attach event listeners
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
  }
}

function initShared() {
  initStorage();
  ensureMatches();
  setActiveNav();
  handleThemeToggle();
  initTabs();
  setupAssistant();
  setupSidebarToggle(); // Add this line to initialize the sidebar toggle
}

document.addEventListener("DOMContentLoaded", initShared);
