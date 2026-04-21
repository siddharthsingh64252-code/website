// ============================================================
// INKWELL — main.js
// All JavaScript for the entire app lives here
// ============================================================

// -----------------------------------------------------------
// 1. DATA STORE
// -----------------------------------------------------------
const DB = {
  users: [],
  posts: [],
  currentUser: null
};

// -----------------------------------------------------------
// 2. PAGE NAVIGATION
// -----------------------------------------------------------
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  const authNav  = document.getElementById('nav-auth');
  const appNav   = document.getElementById('nav-app');
  const isLoggedIn = DB.currentUser !== null;

  authNav.style.display = isLoggedIn ? 'none' : 'flex';
  appNav.style.display  = isLoggedIn ? 'flex' : 'none';

  window.scrollTo(0, 0);

  if (pageId === 'page-dashboard') renderDashboard();
  if (pageId === 'page-profile')   renderProfile();
}

// -----------------------------------------------------------
// 3. FLASH MESSAGES
// -----------------------------------------------------------
function showFlash(containerId, message, type = 'error') {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="flash ${type === 'success' ? 'success' : ''}">
      <span>${message}</span>
      <button class="flash-close" onclick="this.parentElement.remove()">✕</button>
    </div>`;
  setTimeout(() => {
    const flash = container.querySelector('.flash');
    if (flash) flash.remove();
  }, 4000);
}

// -----------------------------------------------------------
// 4. SIGNUP
// -----------------------------------------------------------
function handleSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!username || !email || !password)
    return showFlash('signup-flash', 'All fields are required.');
  if (username.length < 3)
    return showFlash('signup-flash', 'Username must be at least 3 characters.');
  if (!email.includes('@') || !email.includes('.'))
    return showFlash('signup-flash', 'Please enter a valid email address.');
  if (password.length < 6)
    return showFlash('signup-flash', 'Password must be at least 6 characters.');

  const exists = DB.users.find(u => u.username === username || u.email === email);
  if (exists)
    return showFlash('signup-flash', 'Username or email already taken.');

  DB.users.push({
    id:       Date.now(),
    username,
    email,
    password,
    bio:      '',
    joined:   new Date().toISOString().slice(0, 10)
  });

  showFlash('login-flash', 'Account created! Please sign in.', 'success');
  showPage('page-login');
}

// -----------------------------------------------------------
// 5. LOGIN
// -----------------------------------------------------------
function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password)
    return showFlash('login-flash', 'Please fill in all fields.');

  const user = DB.users.find(u => u.email === email && u.password === password);
  if (!user)
    return showFlash('login-flash', 'Invalid email or password.');

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
// -----------------------------------------------------------
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// -----------------------------------------------------------
// 8. CHARACTER COUNTER
// -----------------------------------------------------------
function charCounter(inputId, counterId, max) {
  const input   = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
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

  const sorted = [...DB.posts].sort((a, b) => b.id - a.id);

  // intentionally using innerHTML so XSS can be demonstrated
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
// 10. NEW POST
// -----------------------------------------------------------
function handleNewPost() {
  const title   = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();

  if (!title)              return showFlash('write-flash', 'Title is required.');
  if (!content)            return showFlash('write-flash', 'Content is required.');
  if (content.length < 10) return showFlash('write-flash', 'Content is too short.');

  DB.posts.push({
    id:       Date.now(),
    user_id:  DB.currentUser.id,
    username: DB.currentUser.username,
    title,
    content,
    date:     new Date().toISOString().slice(0, 10)
  });

  document.getElementById('post-title').value   = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-char-count').textContent = '0 / 1000';

  showPage('page-dashboard');
}

// -----------------------------------------------------------
// 11. PROFILE
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
// -----------------------------------------------------------
function saveBio() {
  const bio = document.getElementById('profile-bio-input').value.trim();
  DB.currentUser.bio = bio;

  const user = DB.users.find(u => u.id === DB.currentUser.id);
  if (user) user.bio = bio;

  renderProfile();
  showFlash('profile-flash', 'Bio updated!', 'success');
}

// -----------------------------------------------------------
// 13. LIVE BIO PREVIEW
// -----------------------------------------------------------
function liveBioPreview() {
  const input   = document.getElementById('profile-bio-input');
  const display = document.getElementById('profile-bio-display');
  input.addEventListener('input', () => {
    display.textContent = input.value || 'No bio yet.';
  });
}

// -----------------------------------------------------------
// 14. INIT
// -----------------------------------------------------------
function init() {
  charCounter('post-title',   'title-char-count', 120);
  charCounter('post-content', 'post-char-count',  1000);
  liveBioPreview();
  showPage('page-login');
}

document.addEventListener('DOMContentLoaded', init);
