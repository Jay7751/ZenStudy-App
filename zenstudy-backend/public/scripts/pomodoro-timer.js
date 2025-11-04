// Pomodoro Timer - Complete working implementation
// Syncs with localStorage and database

class PomodoroTimer {
  constructor() {
    this.workDuration = 25 * 60; // 25 minutes in seconds
    this.breakDuration = 5 * 60; // 5 minutes in seconds
    this.timeLeft = this.workDuration;
    this.isRunning = false;
    this.isWorkSession = true;
    this.totalSessionsCompleted = 0;
    this.timerInterval = null;
    this.userId = localStorage.getItem('userId');
    
    this.initializeDisplay();
    this.loadState();
  }

  initializeDisplay() {
    const timerDisplay = document.getElementById('timerDisplay') || document.getElementById('timer-display');
    if (!timerDisplay) {
      console.warn('Timer display element not found');
      return;
    }
    this.updateDisplay();
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateDisplay() {
    const timerDisplay = document.getElementById('timerDisplay') || document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = this.formatTime(this.timeLeft);
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft === 0) {
        this.onSessionComplete();
      }
    }, 1000);

    this.saveState();
    this.updateButtonStates();
  }

  pause() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    clearInterval(this.timerInterval);
    this.saveState();
    this.updateButtonStates();
  }

  reset() {
    this.isRunning = false;
    clearInterval(this.timerInterval);
    this.timeLeft = this.isWorkSession ? this.workDuration : this.breakDuration;
    this.updateDisplay();
    this.saveState();
    this.updateButtonStates();
  }

  onSessionComplete() {
    this.isRunning = false;
    clearInterval(this.timerInterval);

    if (this.isWorkSession) {
      this.totalSessionsCompleted++;
      this.showNotification(`✅ Work session complete! Time for a break.`);
      this.addZenPoints(15); // Add points for completed session
    } else {
      this.showNotification(`☕ Break time over! Ready to work?`);
    }

    // Switch session type
    this.isWorkSession = !this.isWorkSession;
    this.timeLeft = this.isWorkSession ? this.workDuration : this.breakDuration;
    this.updateDisplay();
    this.saveState();
    this.updateButtonStates();

    // Play sound
    this.playNotificationSound();
  }

  switchSession() {
    this.pause();
    this.isWorkSession = !this.isWorkSession;
    this.timeLeft = this.isWorkSession ? this.workDuration : this.breakDuration;
    this.updateDisplay();
    this.saveState();
    this.updateButtonStates();
  }

  addZenPoints(points) {
    if (!this.userId) return;

    fetch('/api/stats/addpoints', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ points })
    })
    .catch(err => console.error('Failed to add points:', err));
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification show';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #8B5CF6, #A78BFA);
      color: white;
      padding: 15px 25px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      font-weight: 600;
      animation: slideInRight 0.4s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  playNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  updateButtonStates() {
    const startBtn = document.querySelector('[onclick="pomodoroTimer.start()"]');
    const pauseBtn = document.querySelector('[onclick="pomodoroTimer.pause()"]');
    
    if (startBtn) startBtn.disabled = this.isRunning;
    if (pauseBtn) pauseBtn.disabled = !this.isRunning;
  }

  saveState() {
    if (this.userId) {
      localStorage.setItem(`timer_state_${this.userId}`, JSON.stringify({
        timeLeft: this.timeLeft,
        isWorkSession: this.isWorkSession,
        totalSessionsCompleted: this.totalSessionsCompleted,
        timestamp: Date.now()
      }));
    }
  }

  loadState() {
    if (!this.userId) return;
    
    const saved = localStorage.getItem(`timer_state_${this.userId}`);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.timeLeft = state.timeLeft;
        this.isWorkSession = state.isWorkSession;
        this.totalSessionsCompleted = state.totalSessionsCompleted;
        this.updateDisplay();
      } catch (e) {
        console.error('Failed to load timer state:', e);
      }
    }
  }

  getStats() {
    return {
      sessionsCompleted: this.totalSessionsCompleted,
      totalMinutesWorked: this.totalSessionsCompleted * 25,
      currentSession: this.isWorkSession ? 'Work' : 'Break',
      timeLeft: this.formatTime(this.timeLeft)
    };
  }
}

// Initialize global instance
let pomodoroTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  pomodoroTimer = new PomodoroTimer();
});
