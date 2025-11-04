// Updated Study Planner - Connects to Backend API

const API_URL = 'http://localhost:5000/api';

// Get auth token from localStorage
function getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Fetch all tasks from backend
async function fetchTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'GET',
            headers: getAuthHeader()
        });

        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        const tasks = await response.json();
        localStorage.setItem('studyTasks', JSON.stringify(tasks));
        return tasks;
    } catch (error) {
        console.error('Fetch tasks error:', error);
        return JSON.parse(localStorage.getItem('studyTasks') || '[]');
    }
}

// Create new task
async function createTask(subject, deadline, hours, priority) {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({
                subject,
                deadline,
                hours: parseInt(hours),
                priority: priority || 'medium'
            })
        });

        if (!response.ok) throw new Error('Failed to create task');
        
        const task = await response.json();
        
        // Update local cache
        let tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
        tasks.push(task);
        localStorage.setItem('studyTasks', JSON.stringify(tasks));
        
        // Dispatch event for UI updates
        document.dispatchEvent(new Event('tasksUpdated'));
        
        return task;
    } catch (error) {
        console.error('Create task error:', error);
        alert('Failed to create task: ' + error.message);
        return null;
    }
}

// Update task
async function updateTask(taskId, updates) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Failed to update task');
        
        const task = await response.json();
        
        // Update local cache
        let tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) tasks[idx] = task;
        localStorage.setItem('studyTasks', JSON.stringify(tasks));
        
        // Dispatch event for UI updates
        document.dispatchEvent(new Event('tasksUpdated'));
        
        return task;
    } catch (error) {
        console.error('Update task error:', error);
        alert('Failed to update task: ' + error.message);
        return null;
    }
}

// Delete task
async function deleteTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });

        if (!response.ok) throw new Error('Failed to delete task');
        
        // Update local cache
        let tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
        tasks = tasks.filter(t => t.id !== taskId);
        localStorage.setItem('studyTasks', JSON.stringify(tasks));
        
        // Dispatch event for UI updates
        document.dispatchEvent(new Event('tasksUpdated'));
        
        return true;
    } catch (error) {
        console.error('Delete task error:', error);
        alert('Failed to delete task: ' + error.message);
        return false;
    }
}

// Fetch dashboard stats
async function fetchDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard`, {
            method: 'GET',
            headers: getAuthHeader()
        });

        if (!response.ok) throw new Error('Failed to fetch dashboard');
        
        const dashboard = await response.json();
        return dashboard;
    } catch (error) {
        console.error('Fetch dashboard error:', error);
        return null;
    }
}

// Fetch user stats
async function fetchStats() {
    try {
        const response = await fetch(`${API_URL}/stats`, {
            method: 'GET',
            headers: getAuthHeader()
        });

        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const stats = await response.json();
        localStorage.setItem('zenPoints', stats.zenPoints);
        return stats;
    } catch (error) {
        console.error('Fetch stats error:', error);
        return null;
    }
}

// Add points to user (when task completed)
async function addZenPoints(points = 10) {
    try {
        const response = await fetch(`${API_URL}/stats/addpoints`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ points })
        });

        if (!response.ok) throw new Error('Failed to add points');
        
        const stats = await response.json();
        localStorage.setItem('zenPoints', stats.zenPoints);
        return stats;
    } catch (error) {
        console.error('Add points error:', error);
        return null;
    }
}

// Initialize planner on page load
document.addEventListener('DOMContentLoaded', async function() {
    if (!localStorage.getItem('authToken')) {
        alert('Please log in to continue');
        window.location.href = 'login.html';
        return;
    }

    // Load initial data
    await fetchTasks();
    await fetchStats();
    
    const form = document.getElementById('studyForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const subject = document.getElementById('subject')?.value.trim();
            const deadline = document.getElementById('deadline')?.value;
            const hours = document.getElementById('hours')?.value;
            const priority = document.getElementById('priority')?.value || 'medium';
            
            if (!subject || !deadline || !hours) {
                alert('Please fill all fields!');
                return;
            }
            
            const task = await createTask(subject, deadline, hours, priority);
            if (task) {
                form.reset();
                alert('Task added successfully!');
            }
        });
    }

    // Listen for task updates from other tabs
    window.addEventListener('storage', async (e) => {
        if (e.key === 'authToken' || e.key === 'isLoggedIn') {
            // Auth changed, reload
            location.reload();
        }
    });
});

// Mark task as complete
async function markTaskComplete(taskId) {
    if (confirm('Mark this task as completed?')) {
        const task = await updateTask(taskId, { status: 'Completed' });
        if (task) {
            await addZenPoints(10);
            alert('Task completed! +10 ZenPoints');
        }
    }
}

// Edit task
async function editTask(taskId) {
    const tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    const newSubject = prompt('Edit Subject:', task.subject);
    if (newSubject === null) return;
    
    const newHours = prompt('Edit Hours:', task.hours);
    if (newHours === null) return;
    
    const newPriority = prompt('Edit Priority (high/medium/low):', task.priority);
    if (newPriority === null) return;
    
    const updated = await updateTask(taskId, {
        subject: newSubject,
        hours: parseInt(newHours),
        priority: newPriority
    });
    
    if (updated) alert('Task updated!');
}

// Delete task with confirmation
async function confirmDeleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        const deleted = await deleteTask(taskId);
        if (deleted) alert('Task deleted!');
    }
}

// Export functions for use in studyplanner.js
window.markTaskComplete = markTaskComplete;
window.editTask = editTask;
window.confirmDeleteTask = confirmDeleteTask;
window.fetchTasks = fetchTasks;
window.fetchDashboard = fetchDashboard;
window.fetchStats = fetchStats;
