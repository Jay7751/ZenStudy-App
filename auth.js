// Simple localStorage-based authentication system

// Check if user is logged in
let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
let currentUser = localStorage.getItem('currentUser');

// User registration
function signupUser(email, password, confirmPassword) {
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

    // Check if user already exists
    let users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[email]) {
        alert('User already exists! Please login.');
        return;
    }

    // Register new user
    users[email] = { password: password, createdAt: new Date().toISOString() };
    localStorage.setItem('users', JSON.stringify(users));
    
    alert('Signup successful! Please login.');
    window.location.href = 'login.html';
}

// User login
function loginUser(email, password) {
    // Validate inputs
    if (!email || !password) {
        alert('Please fill all fields!');
        return;
    }

    // Check user credentials
    let users = JSON.parse(localStorage.getItem('users') || '{}');
    
    if (!users[email]) {
        alert('User not found! Please signup first.');
        return;
    }

    if (users[email].password !== password) {
        alert('Incorrect password!');
        return;
    }

    // Login successful
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', email);
    isLoggedIn = true;
    currentUser = email;
    
    alert('Login successful!');
    window.location.href = 'studyplanner.html';
}

// User logout
function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.setItem('isLoggedIn', 'false');
        localStorage.removeItem('currentUser');
        isLoggedIn = false;
        currentUser = null;
        window.location.href = 'index.html';
    }
}

// Load signup form functionality
document.addEventListener('DOMContentLoaded', function() {
    // Signup form handler
    const signupForm = document.querySelector('form');
    if (signupForm && window.location.pathname.includes('signup')) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const fullName = document.querySelector('input[placeholder="Full Name"]')?.value || '';
            const email = document.querySelector('input[type="email"]')?.value || '';
            const password = document.querySelectorAll('input[type="password"]')[0]?.value || '';
            const confirmPassword = document.querySelectorAll('input[type="password"]')[1]?.value || '';
            
            signupUser(email, password, confirmPassword);
        });
    }

    // Login form handler
    if (signupForm && window.location.pathname.includes('login')) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email')?.value || '';
            const password = document.getElementById('password')?.value || '';
            
            loginUser(email, password);
        });
    }
});
