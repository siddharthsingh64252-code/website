// ============================================================
// INKWELL — main.js
// All JavaScript for the entire app lives here
// ============================================================

// -----------------------------------------------------------
// 1. DATA STORE
// We use a simple JS object as our "database" since this
// is a frontend-only demo. In real apps this lives on a server.
// -----------------------------------------------------------
const DB = {
  users: [],       // stores registered users
  posts: [],       // stores all posts
  currentUser: null  // who is logged in right now
};

// -----------------------------------------------------------
// 2. PAGE NAVIGATION
// We have one HTML file with multiple <div class="page">.
// showPage() hides all pages then shows only the one we want.
// -----------------------------------------------------------
function showPage(pageId) {
  // hide every page first
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // show the page we want
  document.getElementById(pageId).classList.add('active');

  // update navbar visibility
  const authNav  = document.getElementById('nav-auth');
  const appNav   = document.getElementById('nav-app');
  const isLoggedIn = DB.currentUser !== null;

  authNav.style.display = isLoggedIn ? 'none' : 'flex';
  appNav.style.display  = isLoggedIn ? 'flex' : 'none';

  // always scroll to top when switching pages
  window.scrollTo(0, 0);

  // run page-specific setup
  if (pageId === 'page-dashboard') renderDashboard();
  if (pageId === 'page-profile')   renderProfile();
}

// -----------------------------------------------------------
// 3. FLASH MESSAGES
// showFlash() creates a dismissable alert at the top of a card
// type: 'error' (default) or 'success'
// -----------------------------------------------------------
function showFlash(containerId, message, type = 'error') {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="flash ${type === 'success' ? 'success' : ''}">
      <span>${message}</span>
      <button class="flash-close" onclick="this.parentElement.remove()">✕</button>
    </div>`;

  // auto dismiss after 4 seconds
  setTimeout(() => {
    const flash = container.querySelector('.flash');
    if (flash) flash.remove();
  }, 4000);
}

// -----------------------------------------------------------
// 4. SIGNUP
// Validates form inputs, checks for duplicates, saves user
// -----------------------------------------------------------
function handleSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  // --- Validation ---
  if (!username || !email || !password) {
    return showFlash('signup-flash', 'All fields are required.');
  }

  if (username.length < 3) {
    return showFlash('signup-flash', 'Username must be at least 3 characters.');
  }

  if (!email.includes('@') || !email.includes('.')) {
    return showFlash('signup-flash', 'Please enter a valid email address.');
  }

  if (password.length < 6) {
    return showFlash('signup-flash', 'Password must be at least 6 characters.');
  }

  // --- Check duplicates ---
  const exists = DB.users.find(u => u.username === username || u.email === email);
  if (exists) {
    return showFlash('signup-flash', 'Username or email already taken.');
  }

  // --- Save user ---
  DB.users.push({
    id: Date.now(),          // unique id using timestamp
    username,
    email,
    password,
    bio: '',
    joined: new Date().toISOString().slice(0, 10)  // YYYY-MM-DD
  });

  showFlash('login-flash', 'Account created! Please sign in.', 'success');
  showPage('page-login');
}

// -----------------------------------------------------------
// 5. LOGIN
// Finds user by email+password, sets currentUser, goes to dashboard
// -----------------------------------------------------------
function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    return showFlash('login-flash', 'Please fill in all fields.');
  }

  // find matching user
  const user = DB.users.find(u => u.email === email && u.password === password);

  if (!user) {
    return showFlash('login-flash', 'Invalid email or password.');
  }

  // log them in
  DB.currentUser = user;
  showPage('page-dashboard');
}

// -----------------------------------------------------------
// 6. LOGOUT
// -----------------------------------------------------------
function handleLogout() {
  DB.currentUser = null;
  showPage('page-login');
}

// -----------------------------------------------------------
// 7. SHOW / HIDE PASSWORD
// Toggles input type between "password" and "text"
// -----------------------------------------------------------
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';  // change icon
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// -----------------------------------------------------------
// 8. CHARACTER COUNTER
// Updates a counter element as the user types
// -----------------------------------------------------------
function charCounter(inputId, counterId, max) {
  const input   = document.getElementById(inputId);
  const counter = document.getElementById(counterId);

  // update on every keystroke
  input.addEventListener('input', () => {
    const remaining = max - input.value.length;
    counter.textContent = `${input.value.length} / ${max}`;
    counter.style.color = remaining < 20 ? '#c8553d' : '#8a8a8a';
  });
}

// -----------------------------------------------------------
// 9. DASHBOARD — render all posts
// -----------------------------------------------------------
function renderDashboard() {
  const feed = document.getElementById('feed-container');
  const name = document.getElementById('dash-username');

  name.textContent = DB.currentUser.username;

  if (DB.posts.length === 0) {
    feed.innerHTML = `
      <div class="empty-state">
        <p>No posts yet. Be the first to write something!</p>
        <button class="btn btn-accent" onclick="showPage('page-write')">Write first post</button>
      </div>`;
    return;
  }

  // sort newest first
  const sorted = [...DB.posts].sort((a, b) => b.id - a.id);

  feed.innerHTML = sorted.map(post => `
    <div class="post-card">
      <div class="post-meta">
        <div class="avatar">${post.username[0].toUpperCase()}</div>
        <span class="post-author">${post.username}</span>
        <span class="dot">•</span>
        <span class="post-date">${post.date}</span>
      </div>
      <div class="post-title">${post.title}</div>
      <div class="post-preview">${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}</div>
    </div>
  `).join('');
}

// -----------------------------------------------------------
// 10. NEW POST — save a post
// -----------------------------------------------------------
function handleNewPost() {
  const title   = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();

  if (!title) return showFlash('write-flash', 'Title is required.');
  if (!content) return showFlash('write-flash', 'Content is required.');
  if (content.length < 10) return showFlash('write-flash', 'Content is too short.');

  DB.posts.push({
    id:       Date.now(),
    user_id:  DB.currentUser.id,
    username: DB.currentUser.username,
    title,
    content,
    date:     new Date().toISOString().slice(0, 10)
  });

  // clear the form
  document.getElementById('post-title').value   = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-char-count').textContent = '0 / 1000';

  showPage('page-dashboard');
}

// -----------------------------------------------------------
// 11. PROFILE — render user info and their posts
// -----------------------------------------------------------
function renderProfile() {
  const user  = DB.currentUser;
  const posts = DB.posts.filter(p => p.user_id === user.id);

  document.getElementById('profile-initial').textContent  = user.username[0].toUpperCase();
  document.getElementById('profile-username').textContent = user.username;
  document.getElementById('profile-joined').textContent   = 'Member since ' + user.joined;
  document.getElementById('profile-bio-display').textContent = user.bio || 'No bio yet.';
  document.getElementById('profile-post-count').textContent  = posts.length;
  document.getElementById('profile-bio-input').value = user.bio || '';

  const postList = document.getElementById('profile-posts');

  if (posts.length === 0) {
    postList.innerHTML = `
      <div class="empty-state">
        <p>You haven't written anything yet.</p>
        <button class="btn btn-accent btn-sm" onclick="showPage('page-write')">Write now</button>
      </div>`;
    return;
  }

  const sorted = [...posts].sort((a, b) => b.id - a.id);

  postList.innerHTML = sorted.map(post => `
    <div class="post-card">
      <div class="post-title">${post.title}</div>
      <div class="post-preview">${post.content.slice(0, 150)}${post.content.length > 150 ? '...' : ''}</div>
      <div style="font-size:11px;color:#8a8a8a;margin-top:8px;text-transform:uppercase;letter-spacing:.05em">${post.date}</div>
    </div>
  `).join('');
}

// -----------------------------------------------------------
// 12. SAVE BIO
// Updates the currentUser bio and re-renders profile
// -----------------------------------------------------------
function saveBio() {
  const bio = document.getElementById('profile-bio-input').value.trim();
  DB.currentUser.bio = bio;

  // also update in DB.users array
  const user = DB.users.find(u => u.id === DB.currentUser.id);
  if (user) user.bio = bio;

  renderProfile();
  showFlash('profile-flash', 'Bio updated!', 'success');
}

// -----------------------------------------------------------
// 13. LIVE BIO PREVIEW
// Updates bio display text as user types
// -----------------------------------------------------------
function liveBioPreview() {
  const input   = document.getElementById('profile-bio-input');
  const display = document.getElementById('profile-bio-display');

  input.addEventListener('input', () => {
    display.textContent = input.value || 'No bio yet.';
  });
}

// -----------------------------------------------------------
// 14. INIT — runs when the page first loads
// -----------------------------------------------------------
function init() {
  // setup character counters
  charCounter('post-title',   'title-char-count',   120);
  charCounter('post-content', 'post-char-count',   1000);

  // setup live bio preview
  liveBioPreview();

  // start on the login page
  showPage('page-login');
}

// run init when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);