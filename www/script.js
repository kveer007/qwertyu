// Utility function to format dates as DD/MM/YYYY
function formatDate(date) {
    const d = new Date(date);
    const day = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Generic Tracker Class to handle common functionality for both protein and water trackers
  class Tracker {
    constructor(config) {
      this.type = config.type; // "protein" or "water"
      this.unit = config.unit; // "g" or "ml"
      this.goalKey = `${this.type}Goal`;
      this.intakeKey = `${this.type}Intake`;
      this.historyKey = `dailyHistory_${this.type}`;
      this.reminderKey = `reminderTime_${this.type}`;
      this.lastResetKey = `lastResetDate_${this.type}`;
  
      // Initialize state from localStorage
      this.goal = parseInt(localStorage.getItem(this.goalKey)) || 0;
      this.totalIntake = parseInt(localStorage.getItem(this.intakeKey)) || 0;
      this.dailyHistory = JSON.parse(localStorage.getItem(this.historyKey)) || {};
      this.reminderInterval = null;
  
      // Element references
      this.totalDisplay = document.getElementById(`${this.type}-total`);
      this.remainingDisplay = document.getElementById(`${this.type}-remaining`);
      this.progressBar = document.getElementById(`${this.type}-progress-bar`);
      this.goalInput = document.getElementById(`${this.type}-goal`);
      this.reminderInput = document.getElementById(`${this.type}-reminder-time`);
      this.manualInput = document.getElementById(`${this.type}-manual`);
      // Settings and history sections
      this.settingsSection = document.getElementById(`${this.type}-settings-section`);
      this.historyPopup = document.getElementById(`${this.type}-history-popup`);
      // Tab content areas
      this.dailyHistoryTab = document.getElementById(`${this.type}-daily-history`);
      this.currentIntakeTab = document.getElementById(`${this.type}-current-intake`);
  
      this.updateDisplay();
      this.checkAndResetDailyIntake();
      setInterval(() => this.checkAndResetDailyIntake(), 60000);
    }
  
    updateDisplay() {
      this.totalDisplay.innerText = this.totalIntake;
      const remaining = this.goal > this.totalIntake ? this.goal - this.totalIntake : 0;
      this.remainingDisplay.innerText = remaining;
      this.updateProgressBar();
      localStorage.setItem(this.intakeKey, this.totalIntake);
    }
  
    updateProgressBar() {
      let progress = 0;
      if (this.goal > 0) {
        progress = (this.totalIntake / this.goal) * 100;
      }
      this.progressBar.style.width = Math.min(progress, 100) + "%";
    }
  
    setGoal() {
      const inputGoal = parseInt(this.goalInput.value);
      if (isNaN(inputGoal) || inputGoal <= 0) {
        alert("Please enter a valid goal (a positive number).");
        return;
      }
      this.goal = inputGoal;
      localStorage.setItem(this.goalKey, this.goal);
      this.updateDisplay();
    }
  
    addIntake(amount) {
      this.totalIntake += amount;
      this.saveDailyHistory(amount);
      this.updateDisplay();
      this.refreshHistory();
    }
  
    addManualIntake() {
      const amount = parseInt(this.manualInput.value);
      if (!isNaN(amount) && amount > 0) {
        this.addIntake(amount);
        this.manualInput.value = ""; // Clear the manual input after adding
      } else {
        alert(`Please enter a positive number for ${this.type} intake.`);
      }
    }
  
    saveDailyHistory(amount) {
      const currentDate = formatDate(new Date());
      if (!this.dailyHistory[currentDate]) {
        this.dailyHistory[currentDate] = [];
      }
      this.dailyHistory[currentDate].push(amount);
      localStorage.setItem(this.historyKey, JSON.stringify(this.dailyHistory));
    }
  
    refreshHistory() {
      this.showDailyHistory();
      this.showCurrentIntake();
    }
  
    showDailyHistory() {
      let historyData = `<h3>Weekly Data</h3>`;
      let dates = Object.keys(this.dailyHistory)
        .sort((a, b) => {
          const [dayA, monthA, yearA] = a.split("/").map(Number);
          const [dayB, monthB, yearB] = b.split("/").map(Number);
          return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
        })
        .slice(0, 7);
      dates.forEach(date => {
        const dayTotal = this.dailyHistory[date].reduce((a, b) => a + b, 0);
        historyData += `<div class="day-entry"><p><b>${date}:</b> ${dayTotal} ${this.unit}</p></div>`;
      });
      this.dailyHistoryTab.innerHTML = historyData;
    }
  
    showCurrentIntake() {
      const currentDate = formatDate(new Date());
      const currentData = this.dailyHistory[currentDate] || [];
      const total = currentData.reduce((a, b) => a + b, 0);
      let content = `<h3>Total: ${total} ${this.unit}</h3>`;
      if (currentData.length > 0) {
        content += "<h4>Details:</h4><ul>";
        currentData.forEach(entry => {
          content += `<li>${entry} ${this.unit}</li>`;
        });
        content += "</ul>";
      } else {
        content += `<p>No ${this.type} intake logged yet today.</p>`;
      }
      this.currentIntakeTab.innerHTML = content;
    }
  
    setReminder() {
      const time = parseInt(this.reminderInput.value);
      if (!isNaN(time) && time > 0) {
        if (this.reminderInterval) clearInterval(this.reminderInterval);
        if (Notification.permission === "granted") {
          new Notification(`Reminder set! You'll be notified every ${time} minutes between 8 AM - 10 PM.`);
        } else {
          console.log("Notification permission not granted.");
        }
        this.reminderInterval = setInterval(() => {
          const currentHour = new Date().getHours();
          if (currentHour >= 8 && currentHour < 22) {
            if (Notification.permission === "granted") {
              new Notification(`Time to log your ${this.type} intake!`);
            }
          }
        }, time * 60 * 1000);
        localStorage.setItem(this.reminderKey, time);
      }
    }
  
    enableNotifications() {
      if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            alert("Notifications enabled! Now set a reminder.");
          } else {
            alert("Notifications are blocked. Enable them in browser settings.");
          }
        });
      } else {
        alert("Your browser does not support notifications.");
      }
    }
  
    resetData() {
      if (confirm("Are you sure you want to reset all data?")) {
        localStorage.removeItem(this.intakeKey);
        localStorage.removeItem(this.goalKey);
        localStorage.removeItem(this.reminderKey);
        localStorage.removeItem(this.lastResetKey);
        localStorage.removeItem(this.historyKey);
        this.totalIntake = 0;
        this.goal = 0;
        this.dailyHistory = {};
        this.goalInput.value = "";
        this.reminderInput.value = "";
        this.updateDisplay();
        if (this.reminderInterval) clearInterval(this.reminderInterval);
        this.reminderInterval = null;
        alert("All data has been reset!");
      }
    }
  
    resetDailyIntake() {
      const currentDate = formatDate(new Date());
      if (this.dailyHistory[currentDate]) {
        this.dailyHistory[currentDate] = [];
        localStorage.setItem(this.historyKey, JSON.stringify(this.dailyHistory));
      }
      this.totalIntake = 0;
      localStorage.setItem(this.intakeKey, this.totalIntake);
      this.updateDisplay();
      this.refreshHistory();
    }
  
    checkAndResetDailyIntake() {
      const currentDate = formatDate(new Date());
      const lastResetDate = localStorage.getItem(this.lastResetKey);
      if (lastResetDate !== currentDate) {
        this.resetDailyIntake();
        localStorage.setItem(this.lastResetKey, currentDate);
      }
    }
  }
  
  // Instantiate trackers for protein and water
  const proteinTracker = new Tracker({ type: "protein", unit: "g" });
  const waterTracker = new Tracker({ type: "water", unit: "ml" });
  
  // --- Global Tab Navigation ---
  document.querySelectorAll('.tabs .tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      const app = button.getAttribute('data-app');
      document.getElementById('protein-app').classList.toggle('active', app === 'protein');
      document.getElementById('water-app').classList.toggle('active', app === 'water');
      document.getElementById('protein-tab-btn').classList.toggle('active', app === 'protein');
      document.getElementById('water-tab-btn').classList.toggle('active', app === 'water');
    });
  });
  
  // --- Protein Tracker Event Listeners ---
  document.querySelectorAll('[data-action="protein-add"]').forEach(button => {
    button.addEventListener('click', () => {
      const amount = parseInt(button.getAttribute('data-amount'));
      proteinTracker.addIntake(amount);
    });
  });
  document.getElementById('protein-add-manual').addEventListener('click', () => {
    proteinTracker.addManualIntake();
  });
  document.getElementById('protein-set-goal').addEventListener('click', () => {
    proteinTracker.setGoal();
  });
  document.getElementById('protein-set-reminder').addEventListener('click', () => {
    proteinTracker.setReminder();
  });
  document.getElementById('protein-enable-notifications').addEventListener('click', () => {
    proteinTracker.enableNotifications();
  });
  document.getElementById('protein-reset-data').addEventListener('click', () => {
    proteinTracker.resetData();
  });
  document.getElementById('protein-reset-daily').addEventListener('click', () => {
    proteinTracker.resetDailyIntake();
  });
  document.getElementById('protein-settings-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    proteinTracker.settingsSection.style.display =
      proteinTracker.settingsSection.style.display === 'block' ? 'none' : 'block';
  });
  document.getElementById('protein-history-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    proteinTracker.historyPopup.style.display =
      proteinTracker.historyPopup.style.display === 'block' ? 'none' : 'block';
    if (proteinTracker.historyPopup.style.display === 'block') {
      proteinTracker.showDailyHistory();
    }
  });
  document.querySelectorAll('#protein-history-popup .tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#protein-history-popup .tab-button').forEach(btn =>
        btn.classList.remove('active')
      );
      button.classList.add('active');
      const tab = button.getAttribute('data-tab');
      document.querySelectorAll('#protein-history-popup .tab-content').forEach(content => {
        content.style.display = content.id === tab ? 'block' : 'none';
      });
      if (tab === 'protein-daily-history') {
        proteinTracker.showDailyHistory();
      } else {
        proteinTracker.showCurrentIntake();
      }
    });
  });
  
  // --- Water Tracker Event Listeners ---
  document.querySelectorAll('[data-action="water-add"]').forEach(button => {
    button.addEventListener('click', () => {
      const amount = parseInt(button.getAttribute('data-amount'));
      waterTracker.addIntake(amount);
    });
  });
  document.getElementById('water-add-manual').addEventListener('click', () => {
    waterTracker.addManualIntake();
  });
  document.getElementById('water-set-goal').addEventListener('click', () => {
    waterTracker.setGoal();
  });
  document.getElementById('water-set-reminder').addEventListener('click', () => {
    waterTracker.setReminder();
  });
  document.getElementById('water-enable-notifications').addEventListener('click', () => {
    waterTracker.enableNotifications();
  });
  document.getElementById('water-reset-data').addEventListener('click', () => {
    waterTracker.resetData();
  });
  document.getElementById('water-reset-daily').addEventListener('click', () => {
    waterTracker.resetDailyIntake();
  });
  document.getElementById('water-settings-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    waterTracker.settingsSection.style.display =
      waterTracker.settingsSection.style.display === 'block' ? 'none' : 'block';
  });
  document.getElementById('water-history-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    waterTracker.historyPopup.style.display =
      waterTracker.historyPopup.style.display === 'block' ? 'none' : 'block';
    if (waterTracker.historyPopup.style.display === 'block') {
      waterTracker.showDailyHistory();
    }
  });
  document.querySelectorAll('#water-history-popup .tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#water-history-popup .tab-button').forEach(btn =>
        btn.classList.remove('active')
      );
      button.classList.add('active');
      const tab = button.getAttribute('data-tab');
      document.querySelectorAll('#water-history-popup .tab-content').forEach(content => {
        content.style.display = content.id === tab ? 'block' : 'none';
      });
      if (tab === 'water-daily-history') {
        waterTracker.showDailyHistory();
      } else {
        waterTracker.showCurrentIntake();
      }
    });
  });
  
  // --- Global Click Listener to Hide Popups When Clicking Outside ---
  document.addEventListener("click", function (event) {
    // Protein
    if (!event.target.closest("#protein-settings-section, #protein-settings-toggle")) {
      proteinTracker.settingsSection.style.display = "none";
    }
    if (!event.target.closest("#protein-history-popup, #protein-history-toggle")) {
      proteinTracker.historyPopup.style.display = "none";
    }
    // Water
    if (!event.target.closest("#water-settings-section, #water-settings-toggle")) {
      waterTracker.settingsSection.style.display = "none";
    }
    if (!event.target.closest("#water-history-popup, #water-history-toggle")) {
      waterTracker.historyPopup.style.display = "none";
    }
  });
  