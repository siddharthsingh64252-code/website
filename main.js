// ============================================================
// INKWELL — main.js  (PostgreSQL backend version)
// ============================================================

// -----------------------------------------------------------
// 1. DATA STORE — only currentUser lives in memory now
//    everything else is fetched from the PostgreSQL backend
// -----------------------------------------------------------
const DB = {
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
async function handleSignup() {
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

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        joined: new Date().toISOString().slice(0, 10)
      })
    });

    const data = await res.json();

    if (!data.ok) {
      return showFlash('signup-flash', data.error || 'Signup failed.');
    }

    showFlash('login-flash', 'Account created! Please sign in.', 'success');
    showPage('page-login');
  } catch (err) {
    showFlash('signup-flash', 'Server error. Please try again.');
  }
}

// -----------------------------------------------------------
// 5. LOGIN
// -----------------------------------------------------------
async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password)
    return showFlash('login-flash', 'Please fill in all fields.');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!data.ok) {
      return showFlash('login-flash', data.error || 'Invalid email or password.');
    }

    DB.currentUser = data.user;
    showPage('page-dashboard');
  } catch (err) {
    showFlash('login-flash', 'Server error. Please try again.');
  }
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
// 9. DASHBOARD — fetch and render all posts
// -----------------------------------------------------------
async function renderDashboard() {
  const feed = document.getElementById('feed-container');
  const name = document.getElementById('dash-username');

  name.textContent = DB.currentUser.username;
  feed.innerHTML = '<p style="color:#8a8a8a;padding:1rem">Loading posts...</p>';

  try {
    const res   = await fetch('/api/posts');
    const posts = await res.json();

    if (posts.length === 0) {
      feed.innerHTML = `
        <div class="empty-state">
          <p>No posts yet. Be the first to write something!</p>
          <button class="btn btn-accent" onclick="showPage('page-write')">Write first post</button>
        </div>`;
      return;
    }

    // NOTE: innerHTML with user content is intentionally unsafe here
    // so we can demonstrate XSS — fix by using escapeHtml() below
    feed.innerHTML = posts.map(post => `
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

  } catch (err) {
    feed.innerHTML = '<p style="color:#c8553d;padding:1rem">Failed to load posts.</p>';
  }
}

// -----------------------------------------------------------
// 10. NEW POST
// -----------------------------------------------------------
async function handleNewPost() {
  const title   = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();

  if (!title)              return showFlash('write-flash', 'Title is required.');
  if (!content)            return showFlash('write-flash', 'Content is required.');
  if (content.length < 10) return showFlash('write-flash', 'Content is too short.');

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:  DB.currentUser.id,
        username: DB.currentUser.username,
        title,
        content,
        date: new Date().toISOString().slice(0, 10)
      })
    });

    const data = await res.json();

    if (!data.ok) return showFlash('write-flash', data.error || 'Failed to publish.');

    document.getElementById('post-title').value   = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-char-count').textContent = '0 / 1000';

    showPage('page-dashboard');
  } catch (err) {
    showFlash('write-flash', 'Server error. Please try again.');
  }
}

// -----------------------------------------------------------
// 11. PROFILE — fetch and render user posts
// -----------------------------------------------------------
async function renderProfile() {
  const user = DB.currentUser;

  document.getElementById('profile-initial').textContent  = user.username[0].toUpperCase();
  document.getElementById('profile-username').textContent = user.username;
  document.getElementById('profile-joined').textContent   = 'Member since ' + user.joined;
  document.getElementById('profile-bio-display').textContent = user.bio || 'No bio yet.';
  document.getElementById('profile-bio-input').value = user.bio || '';

  const postList = document.getElementById('profile-posts');
  postList.innerHTML = '<p style="color:#8a8a8a;padding:1rem">Loading your posts...</p>';

  try {
    const res   = await fetch(`/api/posts/user/${user.id}`);
    const posts = await res.json();

    document.getElementById('profile-post-count').textContent = posts.length;

    if (posts.length === 0) {
      postList.innerHTML = `
        <div class="empty-state">
          <p>You haven't written anything yet.</p>
          <button class="btn btn-accent btn-sm" onclick="showPage('page-write')">Write now</button>
        </div>`;
      return;
    }

    postList.innerHTML = posts.map(post => `
      <div class="post-card">
        <div class="post-title">${post.title}</div>
        <div class="post-preview">${post.content.slice(0, 150)}${post.content.length > 150 ? '...' : ''}</div>
        <div style="font-size:11px;color:#8a8a8a;margin-top:8px;text-transform:uppercase;letter-spacing:.05em">${post.date}</div>
      </div>
    `).join('');

  } catch (err) {
    postList.innerHTML = '<p style="color:#c8553d;padding:1rem">Failed to load posts.</p>';
  }
}

// -----------------------------------------------------------
// 12. SAVE BIO
// -----------------------------------------------------------
async function saveBio() {
  const bio = document.getElementById('profile-bio-input').value.trim();

  try {
    const res  = await fetch('/api/bio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: DB.currentUser.id, bio })
    });

    const data = await res.json();
    if (!data.ok) return showFlash('profile-flash', 'Failed to update bio.');

    DB.currentUser.bio = bio;
    renderProfile();
    showFlash('profile-flash', 'Bio updated!', 'success');
  } catch (err) {
    showFlash('profile-flash', 'Server error. Please try again.');
  }
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
// 14. XSS DEMO HELPER
// Use this to fix XSS — replace raw innerHTML with escapeHtml()
// -----------------------------------------------------------
function escapeHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

// -----------------------------------------------------------
// 15. INIT
// -----------------------------------------------------------
function init() {
  charCounter('post-title',   'title-char-count', 120);
  charCounter('post-content', 'post-char-count',  1000);
  liveBioPreview();
  showPage('page-login');
}

document.addEventListener('DOMContentLoaded', init);