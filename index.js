import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function initHomePage() {
  
  const allProjects = await fetchJSON('./lib/projects.json');
  const latestProjects = allProjects.slice(0, 3);

  const projectsContainer = document.querySelector('.projects');
  renderProjects(latestProjects, projectsContainer, 'h3');


  const githubData = await fetchGitHubData('charleszzhyy'); 

 
  const profileStats = document.querySelector('#profile-stats');

  if (profileStats && githubData) {
    profileStats.innerHTML = `
      <h2>My GitHub Stats</h2>
      <dl class="github-stats-grid">
        <dt>Followers</dt>
        <dd>${githubData.followers}</dd>

        <dt>Following</dt>
        <dd>${githubData.following}</dd>

        <dt>Public Repos</dt>
        <dd>${githubData.public_repos}</dd>

        <dt>Public Gists</dt>
        <dd>${githubData.public_gists}</dd>
      </dl>
    `;
  }
}

initHomePage();