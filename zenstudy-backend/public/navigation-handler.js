// FIXED Navigation Handler - Manages navbar across all pages
// FIXES: Session persistence, logout, and proper auth check

class NavigationManager {
  constructor() {
    this.token = localStorage.getItem('token');
    this.userId = localStorage.getItem('userId');
    this.userName = localStorage.getItem('userName');
    this.initNavigation();
    this.startSessionCheck();
  }

  initNavigation() {
    const navButtons = document.getElementById('navButtons');
    if (!navButtons) return;

    if (this.token && this.userId) {
      this.setupAuthenticatedNav(navButtons);
    } else {
      this.setupGuestNav(navButtons);
    }

    this.updateNavLinks();
  }

  setupAuthenticatedNav(navButtons) {
    navButtons.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="color: #333; font-weight: 600; font-family: Poppins, sans-serif;">${this.userName || 'User'}</span>
        <button onclick="navigationManager.logout()" class="logout-btn" style="
          background: linear-gradient(135deg, #8B5CF6, #A78BFA);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-family: Poppins, sans-serif;
          transition: transform 0.2s;
        ">
          Logout
        </button>
      </div>
    `;

    // Add hover effect
    const logoutBtn = navButtons.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('mouseenter', (e) => {
        e.target.style.transform = 'scale(1.05)';
      });
      logoutBtn.addEventListener('mouseleave', (e) => {
        e.target.style.transform = 'scale(1)';
      });
    }
  }

  setupGuestNav(navButtons) {
    navButtons.innerHTML = `
      <a href="login.html" class="login-btn" style="
        color: #6c63ff;
        border: 2px solid #6c63ff;
        padding: 8px 18px;
        border-radius: 20px;
        text-decoration: none;
        font-weight: 600;
        font-family: Poppins, sans-serif;
        transition: all 0.3s;
        display: inline-block;
      ">
        Login
      </a>
      <a href="signup.html" class="signup-btn" style="
        background: linear-gradient(135deg, #A78BFA, #5EEAD4);
        color: white;
        padding: 8px 18px;
        border-radius: 20px;
        text-decoration: none;
        font-weight: 600;
        font-family: Poppins, sans-serif;
        transition: all 0.3s;
        display: inline-block;
      ">
        Sign Up
      </a>
    `;
  }

  updateNavLinks() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Remove "Demo" link if it exists
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
      if (link.textContent.toLowerCase() === 'demo') {
        link.remove();
      }
    });

    // If authenticated, show link to dashboard
    if (this.token && this.userId) {
      const existingDashboard = navLinks.querySelector('a[href="studyplanner.html"]');
      if (!existingDashboard) {
        const dashboardLink = document.createElement('a');
        dashboardLink.href = 'studyplanner.html';
        dashboardLink.textContent = 'Dashboard';
        dashboardLink.style.cssText = `
          color: #333;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s;
        `;
        dashboardLink.addEventListener('mouseenter', () => {
          dashboardLink.style.color = '#6c63ff';
        });
        dashboardLink.addEventListener('mouseleave', () => {
          dashboardLink.style.color = '#333';
        });

        // Append dashboard link
        navLinks.appendChild(dashboardLink);
      }
    }
  }

  logout() {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');

    // Show confirmation
    alert('Logged out successfully!');

    // Redirect to home
    window.location.href = 'index.html';
  }

  setAuthData(token, userId, userName, userEmail) {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('userName', userName);
    localStorage.setItem('userEmail', userEmail);
    
    // Update timestamps for session tracking
    localStorage.setItem('authTimestamp', Date.now().toString());
    
    // Refresh nav
    this.token = token;
    this.userId = userId;
    this.userName = userName;
    this.initNavigation();
  }

  isAuthenticated() {
    return !!this.token && !!this.userId;
  }

  // Check session periodically (every 30 seconds)
  startSessionCheck() {
    setInterval(() => {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      // If localStorage was cleared but we're still on a protected page, redirect
      if (!token || !userId) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPage === 'studyplanner.html') {
          window.location.href = 'login.html';
        }
        // Update nav if it changed
        if (this.isAuthenticated() !== (!!token && !!userId)) {
          this.initNavigation();
        }
      }
    }, 30000);
  }

  redirect(page) {
    if (!this.isAuthenticated() && page === 'studyplanner.html') {
      alert('Please log in to access the dashboard');
      window.location.href = 'login.html';
      return;
    }
    window.location.href = page;
  }
}

// Initialize on page load
let navigationManager = null;

document.addEventListener('DOMContentLoaded', () => {
  navigationManager = new NavigationManager();

  // Protect dashboard page
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage === 'studyplanner.html' && !navigationManager.isAuthenticated()) {
    alert('Please log in to access the dashboard');
    window.location.href = 'login.html';
  }
});

// Make functions global for onclick handlers
function logout() {
  if (navigationManager) navigationManager.logout();
}

function redirectTo(page) {
  if (navigationManager) navigationManager.redirect(page);
}
