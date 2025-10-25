import { fetchJSON, renderProjects } from '../global.js';

async function initProjectsPage() {
  
  const projectsData = await fetchJSON('../lib/projects.json');

  
  const container = document.getElementById('projects-list')
                    || document.querySelector('.projects');
  renderProjects(projectsData, container, 'h2');

  
  const titleEl = document.querySelector('.projects-title');
  if (titleEl) {
    const count = Array.isArray(projectsData) ? projectsData.length : 0;
    titleEl.textContent = `${count} Projects`;
  }
}

initProjectsPage();