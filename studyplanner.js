/* studyplanner.js
   Unified Phase 2 -> Phase 4 script
   - Uses single localStorage key: "studyTasks"
   - Handles Add / Edit / Delete / Mark Done
   - Dispatches tasksUpdated event for dashboard/calendar refresh
   - Initializes FullCalendar if calendar element exists
*/

document.addEventListener("DOMContentLoaded", () => {
  // Elements (guarded)
  const form = document.getElementById("studyForm");
  const tableBody = document.querySelector("#scheduleTable tbody");

  // Utility: read/write storage (single source of truth)
  function readTasks() {
    return JSON.parse(localStorage.getItem("studyTasks")) || [];
  }
  function writeTasks(tasks) {
    localStorage.setItem("studyTasks", JSON.stringify(tasks));
    // notify dashboard / calendar that tasks changed
    document.dispatchEvent(new Event("tasksUpdated"));
    // also notify other tabs/windows
    localStorage.setItem("studyTasks_lastUpdate", Date.now());
  }

  // Render existing tasks into table (clear & re-render)
  function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const tasks = readTasks();
    tasks.forEach(task => addTaskRow(task));
  }

  // Add a row to table (DOM only)
  function addTaskRow(task) {
    if (!tableBody) return;
    const row = document.createElement("tr");
    row.setAttribute("data-id", task.id);
    row.style.animation = "fadeIn 0.35s ease";

    // Ensure classes for priority are applied on the cell element
    // We'll put class on the <td> to match CSS rules e.g., td.high etc.
    row.innerHTML = `
      <td class="subject-cell">${escapeHtml(task.subject)}</td>
      <td class="deadline-cell">${escapeHtml(task.deadline)}</td>
      <td class="hours-cell">${escapeHtml(String(task.hours))} hrs</td>
      <td class="priority-cell ${escapeHtml(task.priority)}">${escapeHtml(capitalize(task.priority))}</td>
      <td class="status-cell">${escapeHtml(task.status)}</td>
      <td class="actions-cell">
        <button class="markDone" title="Mark as Done">✅</button>
        <button class="edit" title="Edit Task">✏️</button>
        <button class="delete" title="Delete Task">🗑️</button>
      </td>
    `;

    if (task.status === "Completed") {
      row.classList.add("completed");
    }

    tableBody.appendChild(row);
  }

  // Simple helpers
  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  function escapeHtml(unsafe) {
    // Prevent accidental HTML injection when using innerHTML
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Add new task from form
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const subject = document.getElementById("subject").value.trim();
      const deadline = document.getElementById("deadline").value;
      const hours = document.getElementById("hours").value;
      const priority = document.getElementById("priority").value;

      if (!subject || !deadline || !hours) {
        alert("Please fill all fields!");
        return;
      }

      const newTask = {
        id: Date.now(), // unique id
        subject,
        deadline,
        hours: Number(hours),
        priority: priority || "medium",
        status: "Pending"
      };

      const tasks = readTasks();
      tasks.push(newTask);
      writeTasks(tasks);

      // update table (append new row)
      addTaskRow(newTask);

      // reset form
      form.reset();

      // update dashboard & calendar (listeners will respond)
    });
  }

  // Table actions (edit / delete / mark done)
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      const clicked = e.target;
      const row = clicked.closest("tr");
      if (!row) return;
      const id = Number(row.getAttribute("data-id"));
      let tasks = readTasks();
      const idx = tasks.findIndex(t => Number(t.id) === id);
      if (idx === -1) return;

      // MARK DONE
      if (clicked.classList.contains("markDone")) {
        tasks[idx].status = "Completed";
        writeTasks(tasks);
        // Visual updates
        row.children[4].innerText = "Completed";
        row.classList.add("completed");
      }

      // EDIT
      else if (clicked.classList.contains("edit")) {
        const current = tasks[idx];
        const newSubject = prompt("Edit Subject:", current.subject);
        if (newSubject === null) return; // user cancelled
        const newHours = prompt("Edit Hours (number):", String(current.hours));
        if (newHours === null) return;
        const newPriority = prompt("Edit Priority (high/medium/low):", current.priority);

        // basic validation and assignment
        if (newSubject.trim()) tasks[idx].subject = newSubject.trim();
        const parsedH = Number(newHours);
        if (!isNaN(parsedH) && parsedH > 0) tasks[idx].hours = parsedH;
        if (newPriority && ["high","medium","low"].includes(newPriority.toLowerCase())) {
          tasks[idx].priority = newPriority.toLowerCase();
        }

        writeTasks(tasks);
        // re-render the table for simplicity (keeps cells consistent)
        renderTable();
      }

      // DELETE
      else if (clicked.classList.contains("delete")) {
        if (!confirm("Delete this task?")) return;
        tasks.splice(idx, 1);
        writeTasks(tasks);
        row.remove();
      }

      // after each action, update dashboard/calendar via tasksUpdated event
      document.dispatchEvent(new Event("tasksUpdated"));
    });
  }

  // INITIAL RENDER of table
  renderTable();

  /* -----------------------------
     PHASE 3: FullCalendar integration
     - only initialize if #calendar element present
     - uses same localStorage "studyTasks"
  ------------------------------*/
  (function initCalendar() {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    // ensure FullCalendar script loaded
    if (typeof FullCalendar === "undefined" && typeof window.FullCalendar === "undefined") {
      console.warn("FullCalendar not found. Make sure you included its script.");
      return;
    }

    // function to convert tasks -> events
    function tasksToEvents() {
      const tasks = readTasks();
      return tasks.map((task) => ({
        id: String(task.id),
        title: `${task.subject} (${capitalize(task.priority)})`,
        start: task.deadline,
        allDay: true,
        backgroundColor: task.status === "Completed" ? "#A8E6CF" : "#FFD3B6",
        borderColor: "transparent"
      }));
    }

    // Create calendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      height: 650,
      editable: true,
      selectable: true,
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek"
      },
      events: tasksToEvents(),

      // click a date -> show tasks / add new task
      dateClick: function(info) {
        const date = info.dateStr;
        const tasks = readTasks().filter(t => t.deadline === date);

        let message = `📅 Tasks for ${date}:\n\n`;
        if (tasks.length) {
          tasks.forEach((t, i) => {
            message += `${i+1}. ${t.subject} - ${t.hours} hrs (${capitalize(t.priority)}) [${t.status}]\n`;
          });
        } else {
          message += "No tasks yet on this date.";
        }

        if (confirm(message + "\n\nAdd a new task for this date?")) {
          const newSubject = prompt("Enter subject name:");
          if (!newSubject) return;
          const newHours = prompt("Enter study hours (number):", "2");
          const newPriority = prompt("Enter priority (high/medium/low):", "medium");
          const newTask = {
            id: Date.now(),
            subject: newSubject.trim(),
            deadline: date,
            hours: Number(newHours) || 1,
            priority: (newPriority || "medium").toLowerCase(),
            status: "Pending"
          };
          const tasksArr = readTasks();
          tasksArr.push(newTask);
          writeTasks(tasksArr);
          calendar.addEvent({
            id: String(newTask.id),
            title: `${newTask.subject} (${capitalize(newTask.priority)})`,
            start: date,
            allDay: true,
            backgroundColor: "#FFD3B6",
            borderColor: "transparent"
          });
          alert("Task added.");
        }
      },

      // event dragged to new date -> update its deadline
      eventDrop: function(info) {
        const eventId = Number(info.event.id);
        const tasks = readTasks();
        const idx = tasks.findIndex(t => Number(t.id) === eventId);
        if (idx === -1) return;
        tasks[idx].deadline = info.event.startStr;
        writeTasks(tasks);
        alert(`Rescheduled "${tasks[idx].subject}" to ${tasks[idx].deadline}`);
      }
    });

    calendar.render();

    // Rebuild calendar events when tasksUpdated is dispatched
    document.addEventListener("tasksUpdated", () => {
      const events = tasksToEvents();
      calendar.removeAllEvents();
      events.forEach(ev => calendar.addEvent(ev));
    });

    // Also update on storage events (other tabs)
    window.addEventListener("storage", (e) => {
      if (e.key === "studyTasks" || e.key === "studyTasks_lastUpdate") {
        const events = tasksToEvents();
        calendar.removeAllEvents();
        events.forEach(ev => calendar.addEvent(ev));
      }
    });
  })();

  /* -----------------------------
     PHASE 4: Dashboard (progress tracking)
     - updateDashboard() reads "studyTasks"
  ------------------------------*/

  function animateBarById(barId, percent) {
    const barEl = document.getElementById(barId);
    if (!barEl) return;
    // CSS transition handled in CSS, we set width
    barEl.style.width = percent + "%";
  }

  function updateDashboard() {
    const tasks = readTasks();
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const pending = total - completed;

    // Summary counts (guarded)
    const totalEl = document.getElementById("totalTasks");
    const completedEl = document.getElementById("completedTasks");
    const pendingEl = document.getElementById("pendingTasks");
    if (totalEl) totalEl.textContent = total;
    if (completedEl) completedEl.textContent = completed;
    if (pendingEl) pendingEl.textContent = pending;

    // Daily percent (tasks with deadline == today)
    const today = new Date().toISOString().split("T")[0];
    const todayTasks = tasks.filter(t => t.deadline === today);
    const dailyPercent = todayTasks.length ? Math.round((todayTasks.filter(t => t.status === "Completed").length / todayTasks.length) * 100) : 0;

    // Weekly percent: tasks in next 7 days (including yesterday tolerance)
    const now = new Date();
    const weekTasks = tasks.filter(t => {
      const diff = (new Date(t.deadline) - now) / (1000*60*60*24);
      return diff >= -1 && diff <= 7;
    });
    const weeklyPercent = weekTasks.length ? Math.round((weekTasks.filter(t => t.status === "Completed").length / weekTasks.length)*100) : 0;

    // Update bars and text
    animateBarById("dailyBar", dailyPercent);
    animateBarById("weeklyBar", weeklyPercent);

    const dailyText = document.getElementById("dailyProgress");
    const weeklyText = document.getElementById("weeklyProgress");
    if (dailyText) dailyText.textContent = `${dailyPercent}% completed`;
    if (weeklyText) weeklyText.textContent = `${weeklyPercent}% completed`;
  }

  // Update dashboard initially
  updateDashboard();

  // Update dashboard when tasks change
  document.addEventListener("tasksUpdated", () => {
    renderTable(); // re-render table so it stays in sync
    updateDashboard();
  });

  // Also update if localStorage changes in other tabs
  window.addEventListener("storage", (e) => {
    if (e.key === "studyTasks" || e.key === "studyTasks_lastUpdate") {
      renderTable();
      updateDashboard();
    }
  });

}); // end DOMContentLoaded

/* ===============================
   PHASE 5: SMART FEATURES
================================*/

// 🌿 Zen Mode Functionality
const zenToggle = document.getElementById('zenToggle');
let zenActive = false;

zenToggle.addEventListener('click', () => {
  document.body.classList.toggle('zen-active');
  zenActive = !zenActive;
  zenToggle.textContent = zenActive ? "Exit Zen Mode" : "Activate Zen Mode";
  
  if (zenActive) {
    alert("🧘 Welcome to Zen Mode — focus and breathe deeply.");
  }
});

// 💬 Floating AI Assistant
const aiOrb = document.querySelector(".ai-orb");
const chatPopup = document.querySelector(".chat-popup");
const sendBtn = document.getElementById('sendBtn');
const chatBody = document.getElementById('chatBody');
const userInput = document.getElementById('userInput');

aiOrb.addEventListener('click', () => {
  chatPopup.classList.toggle("show");
});

sendBtn.addEventListener('click', () => {
  const userMsg = userInput.value.trim();
  if (userMsg === '') return;

  const userDiv = document.createElement('p');
  userDiv.innerHTML = `<b>You:</b> ${userMsg}`;
  chatBody.appendChild(userDiv);

  const aiReply = document.createElement('p');
  aiReply.innerHTML = `<b>Zen AI:</b> ${getAIResponse(userMsg)}`;
  chatBody.appendChild(aiReply);

  userInput.value = '';
  chatBody.scrollTop = chatBody.scrollHeight;
});

function getAIResponse(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes("physics")) return "Try short, spaced study sessions and practice formulas daily.";
  if (lower.includes("math")) return "Solve 3 problems of each type — focus on understanding patterns.";
  if (lower.includes("motivate")) return "You're stronger than your doubts — keep pushing 💪";
  return "Let's focus together. What subject do you want to study?";
}



// 💬 Daily Motivation (random)
const quotes = [
  "Stay patient. Your time is coming. 🌿",
  "Focus on progress, not perfection. 💫",
  "Small steps lead to big results. 🚀",
  "Believe in yourself — you’re doing great! 💜",
  "Discipline beats motivation every time. ⚡"
];
document.getElementById('motivation-text').textContent =
  quotes[Math.floor(Math.random() * quotes.length)];

  const zenToggleBtn = document.getElementById('zenToggle');
const zenOverlay = document.getElementById('zenOverlay');
const exitZenBtn = document.getElementById('exitZen');

zenToggleBtn.addEventListener('click', () => {
  zenOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
});

exitZenBtn.addEventListener('click', () => {
  zenOverlay.style.display = 'none';
  document.body.style.overflow = 'auto';
});

// Optional: detect if user switches tabs (focus reminder)
document.addEventListener("visibilitychange", () => {
  if (document.hidden && zenOverlay.style.display === 'flex') {
    alert("👀 Stay focused! Don't get distracted!");
  }
});

// 🎯 Gamified Progress System
let zenPoints = parseInt(localStorage.getItem("zenPoints")) || 0;
const zenPointsEl = document.getElementById("zenPoints");
const badgesContainer = document.getElementById("badgesContainer");
const badgePopup = document.getElementById("badgePopup");
const badgeName = document.getElementById("badgeName");

zenPointsEl.textContent = zenPoints;

const badges = [
  { id: 1, name: "Starter Scholar 🪶", condition: (pts) => pts >= 10 },
  { id: 2, name: "Focused Learner 📘", condition: (pts) => pts >= 50 },
  { id: 3, name: "Time Master ⏳", condition: (pts) => pts >= 100 },
  { id: 4, name: "Zen Genius 🧠", condition: (pts) => pts >= 200 },
];

function checkBadges() {
  badgesContainer.innerHTML = "";
  let unlocked = 0;

  badges.forEach((badge) => {
    if (badge.condition(zenPoints)) {
      const el = document.createElement("div");
      el.classList.add("badge");
      el.textContent = badge.name.split(" ")[1];
      badgesContainer.appendChild(el);
      unlocked++;
    }
  });

  if (unlocked === 0) {
    badgesContainer.innerHTML = "<p>No badges yet — complete your first task!</p>";
  }
}

// 🎉 Show popup when new badge earned
function showBadgePopup(name) {
  badgeName.textContent = name;
  badgePopup.style.display = "block";
  startConfetti(); // 🎊 trigger animation
  setTimeout(() => (badgePopup.style.display = "none"), 3000);
}


// 🪙 Add points when task marked as done
document.getElementById("scheduleTable").addEventListener("click", (e) => {
  if (e.target.classList.contains("markDone")) {
    zenPoints += 10;
    zenPointsEl.textContent = zenPoints;
    localStorage.setItem("zenPoints", zenPoints);

    // Check new badges
    const newBadge = badges.find((b) => b.condition(zenPoints) && !document.getElementById(`badge-${b.id}`));
    if (newBadge) {
      showBadgePopup(newBadge.name);
    }

    checkBadges();
  }
});

// Initial load
checkBadges();

// 🎊 Confetti Animation
const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");
let confettiPieces = [];
const confettiColors = ["#FFD700", "#FF69B4", "#00FFFF", "#ADFF2F", "#FFA07A", "#9370DB"];

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

function createConfetti() {
  for (let i = 0; i < 150; i++) {
    confettiPieces.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 0.5 + 0.5,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      tilt: Math.random() * 10 - 10
    });
  }
}

function drawConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces.forEach((p) => {
    confettiCtx.beginPath();
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(p.x, p.y, p.r, p.r);
    confettiCtx.fill();
  });
  updateConfetti();
}

function updateConfetti() {
  confettiPieces.forEach((p) => {
    p.y += p.d * 5;
    p.x += Math.sin(p.y * 0.02);
    if (p.y > confettiCanvas.height) {
      p.y = -10;
      p.x = Math.random() * confettiCanvas.width;
    }
  });
}

function startConfetti() {
  confettiPieces = [];
  createConfetti();
  let duration = 3000; // milliseconds
  let start = Date.now();

  function animate() {
    let elapsed = Date.now() - start;
    if (elapsed < duration) {
      drawConfetti();
      requestAnimationFrame(animate);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }
  animate();
}
// When a new badge is unlocked
function showBadgeMessage(badgeName) {
  const message = document.createElement("div");
  message.classList.add("badge-message");
  message.innerText = `🏅 New Badge Unlocked: ${badgeName}!`;

  document.body.appendChild(message);

  // Add fade-in animation
  message.classList.add("show");

  // Remove message after 4 seconds
  setTimeout(() => {
    message.classList.remove("show");
    message.classList.add("hide");
    setTimeout(() => message.remove(), 1000); // remove from DOM after fade-out
  }, 4000);
}
function generateSuggestions() {
  const suggestions = [
    "Complete one pending short task 🎯",
    "Take a 5-min break ☕",
    "Review your weakest subject 🧠",
    "Try finishing an easy task to boost streak 🔥",
    "Plan tomorrow’s schedule now 📅",
    "Revise notes from yesterday’s study 📚",
  ];

  const selected = [];
  while (selected.length < 3) {
    const random = suggestions[Math.floor(Math.random() * suggestions.length)];
    if (!selected.includes(random)) selected.push(random);
  }

  const list = document.getElementById("aiSuggestions");
  list.innerHTML = "";

  // 🪄 Fade-in effect for smooth animation
  selected.forEach((s, i) => {
    setTimeout(() => {
      const li = document.createElement("li");
      li.textContent = s;
      li.style.opacity = 0;
      li.style.transition = "opacity 0.6s ease-in";
      list.appendChild(li);
      setTimeout(() => (li.style.opacity = 1), 50);
    }, i * 400);
  });
}

// Auto-generate on page load
window.addEventListener("load", generateSuggestions);

// 🌿 Growth Tree Visualization Logic
function updateGrowthTree() {
  const tasks = JSON.parse(localStorage.getItem("studyTasks")) || [];
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed").length;

  const progress = total > 0 ? (completed / total) * 100 : 0;
  const treeImage = document.getElementById("treeImage");
  const growthMessage = document.getElementById("growthMessage");

  if (!treeImage || !growthMessage) return;

  if (progress === 0) {
    treeImage.src = "images/tree1.png";
    growthMessage.innerText = "Your journey has just begun — start completing tasks!";
  } else if (progress <= 25) {
    treeImage.src = "images/tree2.png";
    growthMessage.innerText = "Your seed has sprouted 🌱 — keep going!";
  } else if (progress <= 50) {
    treeImage.src = "images/tree3.png";
    growthMessage.innerText = "Your tree is growing strong 🌿";
  } else if (progress <= 75) {
    treeImage.src = "images/tree3.png";
    growthMessage.innerText = "Almost there! Your tree is flourishing 🌳";
  } else {
    treeImage.src = "images/tree4.png";
    growthMessage.innerText = "Congratulations! Your Zen Tree is fully grown 🌺";
  }

  treeImage.style.transform = "scale(1.05)";
  setTimeout(() => (treeImage.style.transform = "scale(1)"), 800);
}

// Call whenever a task is marked done or deleted
tableBody.addEventListener("click", (e) => {
  if (e.target.classList.contains("markDone") || e.target.classList.contains("delete")) {
    setTimeout(updateGrowthTree, 500);
  }
});

// Initialize tree on page load
window.addEventListener("load", updateGrowthTree);

// 🌳 Growth Tree Visualization Logic
function updateGrowthTree() {
  const completionRate = parseInt(document.getElementById("dailyProgress").textContent) || 0;
  const treeImage = document.getElementById("growthTreeImage");
  const stageText = document.getElementById("growthStageText");

  let newImage = "tree1.png";
  let newText = "Keep growing 🌱";

  if (completionRate >= 75) {
    newImage = "tree4.png";
    newText = "You're flourishing 🌸";
  } else if (completionRate >= 50) {
    newImage = "tree3.png";
    newText = "You're growing strong 🌳";
  } else if (completionRate >= 25) {
    newImage = "tree2.png";
    newText = "You're sprouting 🌿";
  }

  // Smooth transition effect
  treeImage.classList.remove("grow");
  setTimeout(() => {
    treeImage.src = newImage;
    stageText.textContent = newText;
    treeImage.classList.add("grow");
  }, 200);
}

// Run whenever progress updates
setInterval(updateGrowthTree, 1000);

let timer;
let isRunning = false;
let timeLeft = 25 * 60; // 25 minutes in seconds

const display = document.getElementById("timerDisplay");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  display.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

startBtn.addEventListener("click", () => {
  if (!isRunning) {
    isRunning = true;
    timer = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateDisplay();
      } else {
        clearInterval(timer);
        isRunning = false;
        alert("Time's up! Take a short break. 🧘‍♀️");
      }
    }, 1000);
  }
});

pauseBtn.addEventListener("click", () => {
  clearInterval(timer);
  isRunning = false;
});

resetBtn.addEventListener("click", () => {
  clearInterval(timer);
  isRunning = false;
  timeLeft = 25 * 60;
  updateDisplay();
});


