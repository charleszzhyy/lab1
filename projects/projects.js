import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let allProjects = [];
let searchQuery = '';
let selectedIndex = -1; 

let sliceLabelsForCurrentView = [];

async function initProjectsPage() {
  allProjects = await fetchJSON('../lib/projects.json');

  renderEverything();

  const searchInput = document.querySelector('.searchBar');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      searchQuery = event.target.value || '';
      
      renderEverything();
    });
  }
}

function renderEverything() {
  const projectsContainer =
    document.getElementById('projects-list') ||
    document.querySelector('.projects');
  const titleEl = document.querySelector('.projects-title');

  const filteredBySearch = filterBySearch(allProjects, searchQuery);

  if (titleEl) {
    const count = Array.isArray(filteredBySearch)
      ? filteredBySearch.length
      : 0;
    titleEl.textContent = `${count} Projects`;
  }

  renderProjects(filteredBySearch, projectsContainer, 'h2');

  renderPieAndLegend(filteredBySearch);
}

function filterBySearch(projectArray, queryStr) {
  if (!queryStr) return projectArray;
  const q = queryStr.toLowerCase();

  return projectArray.filter((project) => {
    const valuesJoined = Object.values(project)
      .join('\n')
      .toLowerCase();
    return valuesJoined.includes(q);
  });
}

function buildPieDataFromProjects(projectsArray) {
  const rolled = d3.rollups(
    projectsArray,
    (v) => v.length,
    (d) => d.year || 'Unknown'
  );

  const pieData = rolled.map(([year, count]) => ({
    label: year,
    value: count,
  }));

  sliceLabelsForCurrentView = pieData.map((d) => d.label);

  return pieData;
}

function renderPieAndLegend(currentProjects) {

  const pieData = buildPieDataFromProjects(currentProjects);

  clearPieAndLegend();

  drawPieChart(pieData);

  buildLegend(pieData);

  applySelectionStyles();

  addInteractiveHandlers();
}

function clearPieAndLegend() {
  const svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();

  const legend = d3.select('.legend');
  legend.selectAll('li').remove();
}

function drawPieChart(pieData) {
  const svg = d3.select('#projects-pie-plot');
  if (svg.empty()) {
    console.warn('No #projects-pie-plot SVG found.');
    return;
  }

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(pieData);

  const arcGenerator = d3
    .arc()
    .innerRadius(0)
    .outerRadius(50);

  svg
    .selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (d, i) => colors(i))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .attr('data-idx', (_, i) => i)
    .attr('style', (_, i) => `--color:${colors(i)}`);
}

function buildLegend(pieData) {
  const legend = d3.select('.legend');
  if (legend.empty()) {
    console.warn('No .legend element found.');
    return;
  }

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  legend
    .selectAll('li')
    .data(pieData)
    .join('li')
    .attr('data-idx', (_, i) => i)
    .attr('style', (_, i) => `--color:${colors(i)}`)
    .html(
      (d) =>
        `<span class="swatch"></span>${d.label} <em>(${d.value})</em>`
    );
}

function applySelectionStyles() {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');

  svg.selectAll('path').classed('selected', false);
  legend.selectAll('li').classed('selected', false);

  if (selectedIndex === -1) return;

  svg
    .selectAll(`path[data-idx="${selectedIndex}"]`)
    .classed('selected', true);

  legend
    .selectAll(`li[data-idx="${selectedIndex}"]`)
    .classed('selected', true);
}

function addInteractiveHandlers() {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');

  svg.selectAll('path').on('click', function () {
    const idx = Number(this.getAttribute('data-idx'));
    selectedIndex = selectedIndex === idx ? -1 : idx;
    renderEverything();
  });

  legend.selectAll('li').on('click', function () {
    const idx = Number(this.getAttribute('data-idx'));
    selectedIndex = selectedIndex === idx ? -1 : idx;
    renderEverything();
  });
}

initProjectsPage();