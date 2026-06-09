/* main.js – shared across all pages */

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}
