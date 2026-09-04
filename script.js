const GITHUB_USERNAME = 'BrnToLrn';
const REPOS_PER_PAGE = 6;
let repositories = [];
let visibleRepositories = [];
let currentPage = 1;
const bookmarkedIds = new Set(JSON.parse(localStorage.getItem('hisu-an-bookmarks') || '[]'));

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupContactForm();
  if (document.getElementById('projectGrid')) setupProjects();
});

function setupNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.getElementById('primary-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    links.style.display = open ? 'none' : 'flex';
    links.style.flexDirection = 'column';
    links.style.position = 'absolute';
    links.style.top = '76px';
    links.style.right = '1.25rem';
    links.style.padding = '1rem';
    links.style.background = 'var(--paper)';
    links.style.border = '1px solid var(--line)';
  });
}

function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = [...form.querySelectorAll('input, textarea')];
    let valid = true;

    fields.forEach((field) => {
      const error = form.querySelector(`[data-error-for="${field.id}"]`);
      let message = '';

      if (!field.value.trim()) {
        message = 'This field is required.';
      } else if (field.id === 'phone') {
        const phPhoneRegex = /^(09\d{9}|\+639\d{9})$/;
        if (!phPhoneRegex.test(field.value.trim())) {
          message = 'Please enter a valid PH phone number (+639XXXXXXXXX or 09XXXXXXXXX).';
        }
      } else if (!field.checkValidity()) {
        message = 'Please enter a valid value.';
      }

      field.setAttribute('aria-invalid', String(Boolean(message)));
      if (error) error.textContent = message;
      if (message) valid = false;
    });

    const status = document.getElementById('formStatus');
    if (valid) {
      form.reset();
      fields.forEach((field) => field.removeAttribute('aria-invalid'));
      status.textContent = 'Thanks! Your message has been sent successfully.';
    } else {
      status.textContent = 'Please review the highlighted fields.';
      form.querySelector('[aria-invalid="true"]')?.focus();
    }
  });
}

async function setupProjects() {
  const loading = document.getElementById('loadingState');
  const error = document.getElementById('errorState');
  const search = document.getElementById('projectSearch');
  const retry = document.getElementById('retryButton');
  
  try {
    loading.classList.remove('is-hidden');
    error.classList.add('is-hidden');

    // Live GitHub REST API Request
    const params = new URLSearchParams({
      sort: 'updated',
      direction: 'desc',
      per_page: '100',
      type: 'owner'
    });
    
    const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?${params}`);
    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }
    
    repositories = await response.json();
    visibleRepositories = repositories;
    renderProjects();
  } catch (requestError) {
    console.error(requestError);
    document.getElementById('errorMessage').textContent = 'Could not retrieve repositories from GitHub. Please check your connection or username.';
    error.classList.remove('is-hidden');
    document.getElementById('projectGrid').innerHTML = '';
  } finally {
    loading.classList.add('is-hidden');
  }

  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    visibleRepositories = repositories.filter((repo) => repo.name.toLowerCase().includes(query));
    currentPage = 1;
    renderProjects();
  });

  retry?.addEventListener('click', setupProjects);
}

function renderProjects() {
  const grid = document.getElementById('projectGrid');
  const summary = document.getElementById('repoSummary');
  const pagination = document.getElementById('pagination');
  if (!grid || !summary || !pagination) return;

  const pageCount = Math.max(1, Math.ceil(visibleRepositories.length / REPOS_PER_PAGE));
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * REPOS_PER_PAGE;
  const pageRepos = visibleRepositories.slice(start, start + REPOS_PER_PAGE);

  summary.textContent = `${visibleRepositories.length} public repositor${visibleRepositories.length === 1 ? 'y' : 'ies'} · Page ${currentPage} of ${pageCount}`;
  
  grid.innerHTML = pageRepos.length 
    ? pageRepos.map(createProjectCard).join('') 
    : '<div class="empty-state"><h3>No matching projects</h3><p>Try searching for another repository name.</p></div>';

  grid.querySelectorAll('[data-bookmark]').forEach((button) => button.addEventListener('click', toggleBookmark));

  pagination.innerHTML = Array.from({ length: pageCount }, (_, index) => 
    `<button class="page-button ${index + 1 === currentPage ? 'active' : ''}" type="button" data-page="${index + 1}" aria-label="Go to page ${index + 1}">${index + 1}</button>`
  ).join('');

  pagination.querySelectorAll('[data-page]').forEach((button) => 
    button.addEventListener('click', () => { 
      currentPage = Number(button.dataset.page); 
      renderProjects(); 
    })
  );
}

function createProjectCard(repo) {
  const isBookmarked = bookmarkedIds.has(repo.id);
  const description = repo.description || 'A project exploring ideas through code and the web.';
  return `
    <article class="project-card">
      <div class="card-top">
        <span class="language-dot">${escapeHtml(repo.language || 'Web')}</span>
        <button class="bookmark ${isBookmarked ? 'is-bookmarked' : ''}" type="button" data-bookmark="${repo.id}" aria-label="${isBookmarked ? 'Remove bookmark from' : 'Bookmark'} ${escapeHtml(repo.name)}">
          ${isBookmarked ? '★' : '☆'}
        </button>
      </div>
      <h3>${escapeHtml(repo.name)}</h3>
      <p>${escapeHtml(description)}</p>
      <div class="project-meta">
        <span>★ ${repo.stargazers_count}</span>
        <span>⑂ ${repo.forks_count}</span>
      </div>
      <a class="card-link" href="${repo.html_url}" target="_blank" rel="noreferrer">View repository ↗</a>
    </article>
  `;
}

function toggleBookmark(event) {
  const button = event.currentTarget;
  const id = Number(button.dataset.bookmark);
  if (bookmarkedIds.has(id)) {
    bookmarkedIds.delete(id);
  } else {
    bookmarkedIds.add(id);
  }
  localStorage.setItem('hisu-an-bookmarks', JSON.stringify([...bookmarkedIds]));
  renderProjects();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ 
    '&': '&amp;', 
    '<': '&lt;', 
    '>': '&gt;', 
    "'": '&#39;', 
    '"': '&quot;' 
  })[character]);
}