document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing ZenStudy Planner...');
  initializeApp();
});

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeApp() {
  setupDOMElements();
  attachEventListeners();
  renderTable();
  updateDashboard();
  loadZenPoints();
  updateBadgesDisplay();
  updateGrowthTree();
  initPomodoro();
  initAIAssistant();
  updateMotivation();
  updateProgressOverview();
  initCalendar();
  setupAutoRefresh();
  console.log('✅ ZenStudy Planner initialized successfully!');
}

// ============================================================================
// DOM ELEMENTS & VARIABLES
// ============================================================================

let appState = {
  timerRunning: false,
  timerInterval: null,
  pomodoroSeconds: 1500, // 25 minutes
  zenPoints: localStorage.getItem('zenPoints') ? parseInt(localStorage.getItem('zenPoints')) : 0,
  badges: JSON.parse(localStorage.getItem('badges')) || [],
  streak: localStorage.getItem('streak') ? parseInt(localStorage.getItem('streak')) : 0,
};

let domElements = {};

function setupDOMElements() {
  // Form elements
  domElements.form = document.getElementById('studyForm');
  domElements.subjectInput = document.getElementById('subject');
  domElements.deadlineInput = document.getElementById('deadline');
  domElements.hoursInput = document.getElementById('hours');
  domElements.priorityInput = document.getElementById('priority');

  // Table
  domElements.tableBody = document.querySelector('#scheduleTable tbody');

  // Stats
  domElements.totalTasksEl = document.getElementById('totalTasks');
  domElements.completedTasksEl = document.getElementById('completedTasks');
  domElements.pendingTasksEl = document.getElementById('pendingTasks');
  domElements.zenPointsEl = document.getElementById('zenPoints');
  domElements.badgesEl = document.getElementById('badges');
  domElements.streakEl = document.getElementById('streak');
  domElements.achievementsEl = document.getElementById('achievements');
  domElements.bestDayEl = document.getElementById('bestDay');

  // Timer elements
  domElements.timerDisplay = document.getElementById('timerDisplay');
  domElements.startBtn = document.getElementById('startBtn');
  domElements.pauseBtn = document.getElementById('pauseBtn');
  domElements.resetBtn = document.getElementById('resetBtn');

  // AI Assistant
  domElements.assistantInput = document.getElementById('assistantInput');
  domElements.assistantChat = document.getElementById('assistantChat');
  
  // Find send button - multiple selectors
  domElements.sendBtn = document.querySelector('.chat-send-btn') || 
                        document.querySelector('button[onclick*="sendAssistantMessage"]') ||
                        document.querySelector('#assistantChat + button');

  // Other elements
  domElements.motivationQuote = document.getElementById('motivationQuote');
  domElements.growthTree = document.getElementById('growthTree');
  domElements.calendar = document.getElementById('calendar');
  domElements.todayTasks = document.getElementById('todayTasks');
  domElements.todayHours = document.getElementById('todayHours');
  domElements.progressBar = document.querySelector('.progress-bar-fill');
  domElements.upcomingDeadlines = document.querySelector('.upcoming-deadlines');

  console.log('✓ DOM elements mapped');
}

// ============================================================================
// EVENT LISTENERS ATTACHMENT
// ============================================================================

function attachEventListeners() {
  // Form submission
  if (domElements.form) {
    domElements.form.addEventListener('submit', handleAddTask);
    console.log('✓ Form listener attached');
  }

  // Timer buttons - FIXED: Direct assignment
  if (domElements.startBtn) {
    domElements.startBtn.onclick = null; // Clear any existing listeners
    domElements.startBtn.addEventListener('click', function(e) {
      e.preventDefault();
      startTimer();
      return false;
    });
    console.log('✓ Start button listener attached');
  }
  
  if (domElements.pauseBtn) {
    domElements.pauseBtn.onclick = null;
    domElements.pauseBtn.addEventListener('click', function(e) {
      e.preventDefault();
      pauseTimer();
      return false;
    });
    console.log('✓ Pause button listener attached');
  }
  
  if (domElements.resetBtn) {
    domElements.resetBtn.onclick = null;
    domElements.resetBtn.addEventListener('click', function(e) {
      e.preventDefault();
      resetTimer();
      return false;
    });
    console.log('✓ Reset button listener attached');
  }

  // AI Assistant
  if (domElements.sendBtn) {
    domElements.sendBtn.onclick = null;
    domElements.sendBtn.addEventListener('click', sendAssistantMessage);
    console.log('✓ Send button listener attached');
  }
  
  if (domElements.assistantInput) {
    domElements.assistantInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendAssistantMessage();
        return false;
      }
    });
    console.log('✓ Assistant input listener attached');
  }

  // Logout button
  const logoutBtn = document.querySelector('[onclick*="logoutUser"]') || 
                    document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = null;
    logoutBtn.addEventListener('click', logoutUser);
    console.log('✓ Logout button listener attached');
  }

  // Motivation refresh
  const motivationRefreshBtn = document.querySelector('.motivation-refresh') ||
                               document.querySelector('button[onclick*="updateMotivation"]');
  if (motivationRefreshBtn) {
    motivationRefreshBtn.onclick = null;
    motivationRefreshBtn.addEventListener('click', updateMotivation);
    console.log('✓ Motivation refresh listener attached');
  }

  // Feature buttons
  const analyticsBtn = document.querySelector('button[onclick*="displayAnalytics"]');
  const focusBtn = document.querySelector('button[onclick*="activateFocusMode"]');
  const quickAddBtn = document.querySelector('button[onclick*="createQuickAddPanel"]');
  const exportBtn = document.querySelector('button[onclick*="exportStudyData"]');

  if (analyticsBtn) {
    analyticsBtn.onclick = null;
    analyticsBtn.addEventListener('click', displayAnalytics);
  }
  if (focusBtn) {
    focusBtn.onclick = null;
    focusBtn.addEventListener('click', activateFocusMode);
  }
  if (quickAddBtn) {
    quickAddBtn.onclick = null;
    quickAddBtn.addEventListener('click', createQuickAddPanel);
  }
  if (exportBtn) {
    exportBtn.onclick = null;
    exportBtn.addEventListener('click', exportStudyData);
  }

  console.log('✓ All event listeners attached');
}

// ============================================================================
// STORAGE MANAGEMENT
// ============================================================================

function getTasks() {
  const tasks = localStorage.getItem('studyTasks');
  return tasks ? JSON.parse(tasks) : [];
}

function saveTasks(tasks) {
  localStorage.setItem('studyTasks', JSON.stringify(tasks));
  updateDashboard();
}

function getTaskStats() {
  const tasks = getTasks();
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const pending = tasks.filter(t => t.status === 'Pending').length;
  return { total, completed, pending, tasks };
}

// ============================================================================
// TASK MANAGEMENT FUNCTIONS
// ============================================================================

function handleAddTask(e) {
  e.preventDefault();

  if (!domElements.subjectInput.value.trim()) {
    showNotification('⚠️ Please enter a subject name', 'error');
    return;
  }

  if (!domElements.deadlineInput.value) {
    showNotification('⚠️ Please select a deadline', 'error');
    return;
  }

  if (!domElements.hoursInput.value || domElements.hoursInput.value <= 0) {
    showNotification('⚠️ Please enter valid study hours', 'error');
    return;
  }

  const newTask = {
    id: Date.now(),
    subject: domElements.subjectInput.value.trim(),
    deadline: domElements.deadlineInput.value,
    hours: parseInt(domElements.hoursInput.value),
    priority: domElements.priorityInput.value || 'Medium',
    status: 'Pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const tasks = getTasks();
  tasks.push(newTask);
  saveTasks(tasks);

  domElements.form.reset();
  showNotification('✅ Task added successfully!', 'success');
  renderTable();
  updateDashboard();
  updateProgressOverview();
}

function renderTable() {
  if (!domElements.tableBody) return;

  domElements.tableBody.innerHTML = '';
  const tasks = getTasks();

  if (tasks.length === 0) {
    domElements.tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No tasks yet. Add one to get started! 🚀</td></tr>';
    return;
  }

  tasks.forEach(task => {
    const row = document.createElement('tr');
    row.className = task.status === 'Completed' ? 'completed-row' : '';
    row.dataset.taskId = task.id;

    const priorityClass = `priority-${task.priority.toLowerCase()}`;
    const deadlineDate = new Date(task.deadline);
    const today = new Date();
    const isOverdue = deadlineDate < today && task.status !== 'Completed';

    row.innerHTML = `
      <td class="subject-cell">${escapeHtml(task.subject)}</td>
      <td class="deadline-cell ${isOverdue ? 'overdue' : ''}">${formatDate(task.deadline)}</td>
      <td class="hours-cell">${task.hours}h</td>
      <td><span class="priority-badge ${priorityClass}">${task.priority}</span></td>
      <td>
        <span class="status-badge ${task.status.toLowerCase()}">
          ${task.status}
        </span>
      </td>
      <td class="actions-cell">
        <button class="btn-action mark-done" data-id="${task.id}" title="Mark as done">
          ✓
        </button>
        <button class="btn-action edit-task" data-id="${task.id}" title="Edit">
          ✏️
        </button>
        <button class="btn-action delete-task" data-id="${task.id}" title="Delete">
          🗑️
        </button>
      </td>
    `;

    domElements.tableBody.appendChild(row);
  });

  attachTableListeners();
}

function attachTableListeners() {
  // Mark as done
  document.querySelectorAll('.mark-done').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      markTaskAsComplete(id);
    });
  });

  // Edit task
  document.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      editTask(id);
    });
  });

  // Delete task
  document.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      deleteTask(id);
    });
  });
}

function markTaskAsComplete(taskId) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);

  if (task) {
    if (task.status === 'Completed') {
      task.status = 'Pending';
      task.completedAt = null;
      showNotification('📌 Task marked as pending', 'info');
    } else {
      task.status = 'Completed';
      task.completedAt = new Date().toISOString();
      addZenPoints(10);
      checkAndAwardBadges();
      updateGrowthTree();
      updateStreak();
      showNotification('🎉 Task completed! +10 Zen Points', 'success');
    }
    saveTasks(tasks);
    renderTable();
    updateDashboard();
  }
}

function deleteTask(taskId) {
  if (confirm('Are you sure you want to delete this task?')) {
    const tasks = getTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    saveTasks(filteredTasks);
    renderTable();
    showNotification('🗑️ Task deleted', 'info');
    updateDashboard();
  }
}

function editTask(taskId) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);

  if (task) {
    domElements.subjectInput.value = task.subject;
    domElements.deadlineInput.value = task.deadline;
    domElements.hoursInput.value = task.hours;
    domElements.priorityInput.value = task.priority;

    deleteTask(taskId);

    domElements.form.scrollIntoView({ behavior: 'smooth' });
    domElements.subjectInput.focus();
    showNotification('✏️ Edit the task and click "Add to Schedule" to update', 'info');
  }
}

// ============================================================================
// DASHBOARD UPDATE FUNCTIONS
// ============================================================================

function updateDashboard() {
  const { total, completed, pending } = getTaskStats();

  if (domElements.totalTasksEl) {
    domElements.totalTasksEl.textContent = total;
  }
  if (domElements.completedTasksEl) {
    domElements.completedTasksEl.textContent = completed;
  }
  if (domElements.pendingTasksEl) {
    domElements.pendingTasksEl.textContent = pending;
  }

  updateProgressStats();
  updateOverviewCards();
}

function updateProgressStats() {
  const { total, completed } = getTaskStats();
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  if (domElements.progressBar) {
    domElements.progressBar.style.width = percentage + '%';
  }

  const progressLabel = document.querySelector('.progress-percentage');
  if (progressLabel) {
    progressLabel.textContent = percentage + '% Completed';
  }
}

function updateOverviewCards() {
  const tasks = getTasks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Today's tasks
  const todayTasks = tasks.filter(t => {
    const deadline = new Date(t.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() === today.getTime();
  });

  if (domElements.todayTasks) {
    domElements.todayTasks.textContent = todayTasks.length + ' Tasks';
  }

  if (domElements.todayHours) {
    const totalHours = todayTasks.reduce((sum, t) => sum + (t.hours || 0), 0);
    domElements.todayHours.textContent = totalHours + ' hrs';
  }

  // Upcoming deadlines
  const upcomingTasks = tasks.filter(t => {
    const deadline = new Date(t.deadline);
    return deadline >= today && t.status !== 'Completed';
  });

  const uniqueSubjects = [...new Set(upcomingTasks.map(t => t.subject))];
  if (domElements.upcomingDeadlines) {
    domElements.upcomingDeadlines.textContent = uniqueSubjects.length + ' Subjects Due';
  }
}

function updateProgressOverview() {
  const { tasks } = getTaskStats();
  
  // Create visual progress indicators for all progress sections
  const progressBars = document.querySelectorAll('[class*="progress"]');
  progressBars.forEach(bar => {
    const stats = getTaskStats();
    const total = stats.total;
    const completed = stats.completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    if (bar.classList.contains('progress-bar-fill')) {
      bar.style.width = percentage + '%';
    }
  });
}

// ============================================================================
// ZEN POINTS & GAMIFICATION
// ============================================================================

function loadZenPoints() {
  const points = localStorage.getItem('zenPoints');
  appState.zenPoints = points ? parseInt(points) : 0;
  updateZenPointsDisplay();
}

function addZenPoints(points) {
  appState.zenPoints += points;
  localStorage.setItem('zenPoints', appState.zenPoints.toString());
  updateZenPointsDisplay();
}

function updateZenPointsDisplay() {
  if (domElements.zenPointsEl) {
    domElements.zenPointsEl.textContent = appState.zenPoints;
  }
  
  // Update all zen point displays
  const allZenElements = document.querySelectorAll('[id*="zenPoints"], [id*="zenPointsDisplay"]');
  allZenElements.forEach(el => {
    el.textContent = appState.zenPoints;
  });
}

function updateStreak() {
  const lastActivityDate = localStorage.getItem('lastActivityDate');
  const today = new Date().toDateString();

  if (lastActivityDate !== today) {
    if (lastActivityDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastActivityDate === yesterday.toDateString()) {
        appState.streak += 1;
      } else {
        appState.streak = 1;
      }
    } else {
      appState.streak = 1;
    }
    localStorage.setItem('lastActivityDate', today);
    localStorage.setItem('streak', appState.streak.toString());
  }

  if (domElements.streakEl) {
    domElements.streakEl.textContent = appState.streak + ' days';
  }
  
  // Update all streak displays
  const allStreakElements = document.querySelectorAll('[id*="streak"]');
  allStreakElements.forEach(el => {
    if (el !== domElements.streakEl) {
      el.textContent = appState.streak + ' days';
    }
  });
}

// ============================================================================
// BADGES & ACHIEVEMENTS
// ============================================================================

function updateBadgesDisplay() {
  appState.badges = JSON.parse(localStorage.getItem('badges')) || [];
  
  if (!domElements.badgesEl) return;

  if (appState.badges.length === 0) {
    domElements.badgesEl.innerHTML = '<p>No badges yet — complete your first task!</p>';
    return;
  }

  const badgesHTML = appState.badges.map(badge => 
    `<div class="badge-item" title="${badge.description}">
      <span class="badge-icon">${badge.icon}</span>
      <span class="badge-name">${badge.name}</span>
    </div>`
  ).join('');

  domElements.badgesEl.innerHTML = badgesHTML;
  
  // Update achievements count
  if (domElements.achievementsEl) {
    domElements.achievementsEl.textContent = appState.badges.length;
  }
}

function checkAndAwardBadges() {
  const { total, completed } = getTaskStats();
  const badges = JSON.parse(localStorage.getItem('badges')) || [];
  const badgeNames = badges.map(b => b.name);

  const badgeCriteria = [
    {
      name: 'First Step',
      condition: () => completed >= 1,
      icon: '🌱',
      description: 'Complete your first task',
    },
    {
      name: 'Getting Started',
      condition: () => completed >= 5,
      icon: '⚡',
      description: 'Complete 5 tasks',
    },
    {
      name: 'Momentum',
      condition: () => completed >= 10,
      icon: '🔥',
      description: 'Complete 10 tasks',
    },
    {
      name: 'Unstoppable',
      condition: () => completed >= 25,
      icon: '💪',
      description: 'Complete 25 tasks',
    },
    {
      name: 'Zen Master',
      condition: () => appState.zenPoints >= 500,
      icon: '🎯',
      description: 'Earn 500 Zen Points',
    },
    {
      name: 'Week Warrior',
      condition: () => appState.streak >= 7,
      icon: '🌟',
      description: 'Maintain a 7-day streak',
    },
  ];

  badgeCriteria.forEach(criteria => {
    if (!badgeNames.includes(criteria.name) && criteria.condition()) {
      badges.push({
        name: criteria.name,
        icon: criteria.icon,
        description: criteria.description,
        unlockedAt: new Date().toISOString(),
      });
      showBadgePopup(criteria.name, criteria.icon);
    }
  });

  localStorage.setItem('badges', JSON.stringify(badges));
  updateBadgesDisplay();
}

function showBadgePopup(badgeName, icon) {
  const popup = document.createElement('div');
  popup.className = 'badge-popup';
  popup.innerHTML = `
    <div class="badge-popup-content">
      <div class="badge-popup-icon">${icon}</div>
      <h3>New Badge Unlocked!</h3>
      <p>${badgeName}</p>
    </div>
  `;

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add('show');
  }, 100);

  setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => popup.remove(), 300);
  }, 3000);
}

// ============================================================================
// GROWTH TREE VISUALIZATION
// ============================================================================

function updateGrowthTree() {
  if (!domElements.growthTree) return;

  const { completed } = getTaskStats();
  let treeStage = 0;
  let message = '';

  if (completed === 0) {
    treeStage = 0;
    message = 'Your journey has just begun — start completing tasks! 🌱';
  } else if (completed < 5) {
    treeStage = 1;
    message = 'Your Zen Tree is sprouting! Keep going! 🌿';
  } else if (completed < 10) {
    treeStage = 2;
    message = 'Your Zen Tree is growing beautifully! 🌳';
  } else if (completed < 20) {
    treeStage = 3;
    message = 'Your Zen Tree is flourishing! Amazing progress! 🌲';
  } else {
    treeStage = 4;
    message = 'Your Zen Tree is magnificent! You are a true master! 🌳✨';
  }

  const treeASCII = [
    '   🌱\n   |\n   —',
    '   🌿\n   |\n   —\n   |',
    '   🌳\n  /|\\\\\n   |\n   —',
    '   🌲\n  /|\\\\\n   |\n  /|\\\\\n   |',
    '   🌳✨\n  /|\\\\\n   |\n  /|\\\\\n  /|\\\\\n   |',
  ];

  domElements.growthTree.innerHTML = `
    <pre style="font-size: 20px; text-align: center;">${treeASCII[treeStage]}</pre>
    <p style="text-align: center; margin-top: 10px;">${message}</p>
    <p style="text-align: center; color: #888; font-size: 12px;">Tasks: ${completed}</p>
  `;
}

// ============================================================================
// POMODORO TIMER FUNCTIONS - FIXED VERSION
// ============================================================================

function initPomodoro() {
  console.log('⏱️ Pomodoro initialized - 25:00');
  updateTimerDisplay();
}

function startTimer() {
  console.log('🟢 Timer START clicked - Running:', appState.timerRunning);
  
  if (appState.timerRunning) {
    console.log('⚠️ Timer already running!');
    return;
  }

  appState.timerRunning = true;

  if (domElements.startBtn) {
    domElements.startBtn.disabled = true;
    domElements.startBtn.style.opacity = '0.5';
  }
  if (domElements.pauseBtn) {
    domElements.pauseBtn.disabled = false;
    domElements.pauseBtn.style.opacity = '1';
  }

  console.log('✓ Timer started, interval about to begin');

  appState.timerInterval = setInterval(() => {
    appState.pomodoroSeconds--;
    console.log('⏱️ Time remaining:', appState.pomodoroSeconds, 'seconds');

    if (appState.pomodoroSeconds <= 0) {
      console.log('✅ Timer completed!');
      pauseTimer();
      addZenPoints(25);
      showNotification('🎉 Pomodoro session complete! +25 Zen Points', 'success');
      appState.pomodoroSeconds = 1500; // Reset to 25 minutes
      return;
    }

    updateTimerDisplay();
  }, 1000);

  console.log('⏱️ Interval ID:', appState.timerInterval);
}

function pauseTimer() {
  console.log('🔴 Timer PAUSE clicked');
  
  appState.timerRunning = false;

  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
    console.log('✓ Interval cleared');
  }

  if (domElements.startBtn) {
    domElements.startBtn.disabled = false;
    domElements.startBtn.style.opacity = '1';
  }
  if (domElements.pauseBtn) {
    domElements.pauseBtn.disabled = true;
    domElements.pauseBtn.style.opacity = '0.5';
  }

  console.log('✓ Timer paused at:', formatTimerSeconds(appState.pomodoroSeconds));
}

function resetTimer() {
  console.log('↻ Timer RESET clicked');
  
  pauseTimer();
  appState.pomodoroSeconds = 1500;
  updateTimerDisplay();
  showNotification('⏱️ Timer reset to 25:00', 'info');
  console.log('✓ Timer reset to 25:00');
}

function updateTimerDisplay() {
  const minutes = Math.floor(appState.pomodoroSeconds / 60);
  const seconds = appState.pomodoroSeconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (domElements.timerDisplay) {
    domElements.timerDisplay.textContent = display;
  }
  
  // Update all timer displays
  const allTimerElements = document.querySelectorAll('[id*="timer"]');
  allTimerElements.forEach(el => {
    if (el.id.includes('Display') || el.id === 'timerDisplay') {
      el.textContent = display;
    }
  });
}

function formatTimerSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================================
// AI ASSISTANT FUNCTIONS
// ============================================================================

function initAIAssistant() {
  if (domElements.assistantChat) {
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'chat-message bot-message';
    welcomeMessage.innerHTML = `<p>👋 Hi! I'm your AI Study Assistant. Ask me anything about your study plan or get motivational tips!</p>`;
    domElements.assistantChat.appendChild(welcomeMessage);
  }
}

function sendAssistantMessage() {
  const message = domElements.assistantInput?.value.trim();

  if (!message) {
    showNotification('⚠️ Please type a message', 'error');
    return;
  }

  if (!domElements.assistantChat) return;

  // Add user message
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-message user-message';
  userDiv.innerHTML = `<p>${escapeHtml(message)}</p>`;
  domElements.assistantChat.appendChild(userDiv);

  // Clear input
  if (domElements.assistantInput) {
    domElements.assistantInput.value = '';
  }

  // Generate AI response
  setTimeout(() => {
    const response = generateAIResponse(message);
    const botDiv = document.createElement('div');
    botDiv.className = 'chat-message bot-message';
    botDiv.innerHTML = `<p>${response}</p>`;
    domElements.assistantChat.appendChild(botDiv);

    // Auto scroll
    domElements.assistantChat.scrollTop = domElements.assistantChat.scrollHeight;
  }, 500);
}

function generateAIResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();

  const responses = {
    study: 'I recommend breaking your study sessions into 25-minute Pomodoro intervals. Take short breaks to stay focused! 📚',
    focus: 'Enable Focus Mode to minimize distractions. Silence notifications and focus on one task at a time! 🎯',
    motivation: 'You\'re doing great! Every completed task brings you closer to your goals. Keep pushing! 💪',
    help: 'I can help you with study tips, task management advice, and motivation! Just ask me anything. 🤖',
    deadline: 'Don\'t miss your deadlines! I\'ve tracked all your upcoming deadlines in the calendar. Stay organized! 📅',
    progress: 'Great progress! Keep completing tasks to unlock badges and grow your Zen Tree! 🌳',
  };

  for (const [key, response] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }

  return 'That\'s an interesting question! Remember to stay focused and take regular breaks. You\'ve got this! 🌟';
}

// ============================================================================
// FEATURE FUNCTIONS
// ============================================================================

function displayAnalytics() {
  const { total, completed, pending } = getTaskStats();
  const completionRate = total === 0 ? 0 : ((completed / total) * 100).toFixed(1);

  const analytics = `
    📊 YOUR ANALYTICS REPORT
    ========================
    Total Tasks: ${total}
    Completed: ${completed}
    Pending: ${pending}
    Completion Rate: ${completionRate}%
    Zen Points: ${appState.zenPoints}
    Current Streak: ${appState.streak} days
    Badges Earned: ${appState.badges.length}
  `;

  alert(analytics);
}

function activateFocusMode() {
  const focusMode = localStorage.getItem('focusMode') === 'true';
  localStorage.setItem('focusMode', (!focusMode).toString());

  if (!focusMode) {
    document.body.style.filter = 'grayscale(50%)';
    showNotification('🎯 Focus Mode activated! Minimize distractions and stay focused.', 'success');
  } else {
    document.body.style.filter = 'none';
    showNotification('✨ Focus Mode deactivated', 'info');
  }
}

function createQuickAddPanel() {
  const quickPanel = document.createElement('div');
  quickPanel.className = 'quick-add-modal';
  quickPanel.innerHTML = `
    <div class="quick-add-content">
      <span class="close-btn" onclick="this.closest('.quick-add-modal').remove()">×</span>
      <h2>Quick Add Task</h2>
      <input type="text" id="quickSubject" placeholder="Subject/Topic" style="width: 100%; margin: 10px 0; padding: 8px;">
      <input type="number" id="quickHours" placeholder="Hours" style="width: 100%; margin: 10px 0; padding: 8px;" value="1">
      <select id="quickPriority" style="width: 100%; margin: 10px 0; padding: 8px;">
        <option value="Low">Low Priority</option>
        <option value="Medium" selected>Medium Priority</option>
        <option value="High">High Priority</option>
      </select>
      <input type="date" id="quickDeadline" style="width: 100%; margin: 10px 0; padding: 8px;">
      <button onclick="addQuickTask()" style="width: 100%; padding: 10px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">Add Task</button>
    </div>
  `;

  document.body.appendChild(quickPanel);

  window.addQuickTask = function() {
    const subject = document.getElementById('quickSubject').value.trim();
    const hours = document.getElementById('quickHours').value;
    const priority = document.getElementById('quickPriority').value;
    const deadline = document.getElementById('quickDeadline').value;

    if (!subject || !hours || !deadline) {
      showNotification('⚠️ Please fill all fields', 'error');
      return;
    }

    const newTask = {
      id: Date.now(),
      subject,
      hours: parseInt(hours),
      priority,
      deadline,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    const tasks = getTasks();
    tasks.push(newTask);
    saveTasks(tasks);

    quickPanel.remove();
    renderTable();
    showNotification('✅ Task added quickly!', 'success');
  };
}

function exportStudyData() {
  const tasks = getTasks();
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'Completed').length,
    zenPoints: appState.zenPoints,
    badges: appState.badges.length,
    streak: appState.streak,
    exportDate: new Date().toISOString(),
  };

  const data = {
    statistics: stats,
    tasks: tasks,
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `study-plan-${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  showNotification('📥 Study data exported successfully!', 'success');
}

// ============================================================================
// CALENDAR FUNCTIONALITY
// ============================================================================

function initCalendar() {
  if (!domElements.calendar) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  renderCalendar(year, month);
}

function renderCalendar(year, month) {
  if (!domElements.calendar) return;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const tasks = getTasks();

  let html = `<div class="calendar-month"><h3>${new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>`;
  html += '<div class="calendar-grid">';

  // Day headers
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayHeaders.forEach(day => {
    html += `<div class="calendar-day-header">${day}</div>`;
  });

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.deadline === dateStr);
    const hasTask = dayTasks.length > 0;
    const isCompleted = dayTasks.some(t => t.status === 'Completed');

    html += `<div class="calendar-day ${hasTask ? 'has-task' : ''} ${isCompleted ? 'completed' : ''}" title="${dayTasks.length} task(s)">
      ${day}
      ${hasTask ? '<span class="task-dot"></span>' : ''}
    </div>`;
  }

  html += '</div></div>';
  domElements.calendar.innerHTML = html;
}

// ============================================================================
// MOTIVATION FUNCTIONS
// ============================================================================

function updateMotivation() {
  if (!domElements.motivationQuote) return;

  const quotes = [
    '🌟 The only way to do great work is to love what you do. - Steve Jobs',
    '💪 Success is not final, failure is not fatal. - Winston Churchill',
    '🚀 Believe you can and you\'re halfway there. - Theodore Roosevelt',
    '🎯 The future depends on what you do today. - Mahatma Gandhi',
    '⚡ Don\'t watch the clock; do what it does. Keep going! - Sam Levenson',
    '🔥 Excellence is not a destination; it\'s a continuous journey.',
    '🌈 Every expert was once a beginner. Keep learning!',
    '💡 Your potential is endless. Dream big and act bigger!',
    '🏆 Success is the sum of small efforts repeated day in and day out.',
    '✨ You are stronger than you think. Push forward!',
  ];

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  domElements.motivationQuote.textContent = randomQuote;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    z-index: 10000;
    animation: slideIn 0.3s ease-in-out;
    font-weight: bold;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function logoutUser() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  }
}

function setupAutoRefresh() {
  // Refresh dashboard every 30 seconds
  setInterval(() => {
    updateDashboard();
    updateProgressOverview();
    updateBadgesDisplay();
  }, 30000);
}

// ============================================================================
// ADD ANIMATION STYLES
// ============================================================================

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  .badge-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
    z-index: 10001;
    transition: all 0.3s ease-in-out;
  }

  .badge-popup.show {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }

  .badge-popup-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px 40px;
    border-radius: 15px;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .badge-popup-icon {
    font-size: 60px;
    margin-bottom: 10px;
  }

  .quick-add-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
  }

  .quick-add-content {
    background: white;
    padding: 30px;
    border-radius: 10px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .close-btn {
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    color: #999;
  }

  .close-btn:hover {
    color: #000;
  }

  .btn-action {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    margin: 0 5px;
    transition: transform 0.2s;
  }

  .btn-action:hover {
    transform: scale(1.2);
  }

  .completed-row {
    opacity: 0.6;
  }

  .completed-row .subject-cell {
    text-decoration: line-through;
  }

  .overdue {
    color: #ef4444;
    font-weight: bold;
  }

  .priority-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
  }

  .priority-high {
    background: #fee;
    color: #c33;
  }

  .priority-medium {
    background: #ffeaa7;
    color: #d63031;
  }

  .priority-low {
    background: #d4edda;
    color: #155724;
  }

  .status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
  }

  .status-completed {
    background: #d4edda;
    color: #155724;
  }

  .status-pending {
    background: #cfe2ff;
    color: #084298;
  }

  .chat-message {
    margin: 10px 0;
    padding: 10px 15px;
    border-radius: 8px;
    max-width: 70%;
  }

  .user-message {
    background: #667eea;
    color: white;
    margin-left: auto;
  }

  .bot-message {
    background: #e0e0e0;
    color: #333;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    margin-top: 15px;
  }

  .calendar-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    border: 1px solid #ddd;
    position: relative;
    cursor: pointer;
  }

  .calendar-day.has-task {
    background: #f0f4ff;
    border-color: #667eea;
  }

  .calendar-day.completed {
    background: #d4edda;
  }

  .task-dot {
    position: absolute;
    bottom: 2px;
    width: 4px;
    height: 4px;
    background: #667eea;
    border-radius: 50%;
  }

  .calendar-day-header {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #667eea;
    margin-bottom: 5px;
  }

  .calendar-day.empty {
    border: none;
    background: none;
  }
`;

document.head.appendChild(style);

console.log('✅ All initialization code loaded and ready!');