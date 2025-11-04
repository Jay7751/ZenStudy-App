// Updated Auth System - Connects to Backend
const API_URL = 'http://localhost:5000/api';

let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
let currentUser = localStorage.getItem('currentUser');
let authToken = localStorage.getItem('authToken');

// Check if token is still valid
function checkAuthStatus() {
    if (authToken) {
        isLoggedIn = true;
    } else {
        isLoggedIn = false;
        currentUser = null;
    }
}

checkAuthStatus();

// User Registration
async function signupUser(email, password, confirmPassword, fullName) {
    // Validate inputs
    if (!email || !password || !confirmPassword) {
        alert('Please fill all fields!');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                fullName: fullName || 'User'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Signup failed');
            return;
        }

        // Store auth data
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', email);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.userId);
        
        isLoggedIn = true;
        currentUser = email;
        authToken = data.token;

        alert('Signup successful!');
        window.location.href = 'studyplanner.html';
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed: ' + error.message);
    }
}

// User Login
async function loginUser(email, password) {
    // Validate inputs
    if (!email || !password) {
        alert('Please fill all fields!');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Login failed');
            return;
        }

        // Store auth data
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', email);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.userId);
        
        isLoggedIn = true;
        currentUser = email;
        authToken = data.token;

        alert('Login successful!');
        window.location.href = 'studyplanner.html';
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

// User Logout
function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('studyTasks');
        localStorage.removeItem('zenPoints');
        
        isLoggedIn = false;
        currentUser = null;
        authToken = null;
        
        window.location.href = 'index.html';
    }
}

// Verify user is logged in
function requireLogin() {
    if (!isLoggedIn || !authToken) {
        alert('Please log in to continue.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Get Authorization Header
function getAuthHeader() {
    return {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
}

// Handle form submissions
document.addEventListener('DOMContentLoaded', function() {
    // Signup form handler
    if (window.location.pathname.includes('signup')) {
        const signupForm = document.querySelector('form');
        if (signupForm) {
            signupForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const fullName = document.querySelector('input[placeholder="Full Name"]')?.value || '';
                const email = document.querySelector('input[type="email"]')?.value || '';
                const password = document.querySelectorAll('input[type="password"]')[0]?.value || '';
                const confirmPassword = document.querySelectorAll('input[type="password"]')[1]?.value || '';
                
                signupUser(email, password, confirmPassword, fullName);
            });
        }
    }

    // Login form handler
    if (window.location.pathname.includes('login')) {
        const loginForm = document.querySelector('form');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('email')?.value || '';
                const password = document.getElementById('password')?.value || '';
                
                loginUser(email, password);
            });
        }
    }

    // Check auth on dashboard pages
    if (window.location.pathname.includes('studyplanner') || 
        window.location.pathname.includes('planner')) {
        if (!requireLogin()) return;
    }
});
