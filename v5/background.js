// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('To-Do List extension installed!');
  restoreAlarms();
});

// Restore alarms when service worker starts
chrome.runtime.onStartup.addListener(() => {
  restoreAlarms();
});

// Restore alarms for tasks that have alarms enabled
function restoreAlarms() {
  chrome.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    let needsUpdate = false;
    
    tasks.forEach(task => {
      if (task.alarmActive && task.deadline) {
        const deadlineTime = new Date(task.deadline).getTime();
        const now = Date.now();
        
        if (deadlineTime > now) {
          chrome.alarms.create(`task-${task.id}`, {
            when: deadlineTime
          });
        } else {
          // Deadline has passed, disable alarm
          task.alarmActive = false;
          needsUpdate = true;
        }
      }
    });
    
    if (needsUpdate) {
      chrome.storage.local.set({ tasks: tasks });
    }
  });
}

// Listen for alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('task-')) {
    const taskId = parseInt(alarm.name.replace('task-', ''));
    
    // Get task details
    chrome.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || [];
      const task = tasks.find(t => t.id === taskId);
      
      if (task && task.alarmActive) {
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Task Deadline!',
          message: `"${task.name}" deadline has arrived!`
        });
        
        // Clear the alarm status
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          tasks[taskIndex].alarmActive = false;
          chrome.storage.local.set({ tasks: tasks });
        }
      }
    });
  }
});
