import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;
let rScale;
let timeScale;

let commitProgress = 100;
let commitMaxTime;
let allCommits = [];
let currentCommits = [];

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  return d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime } = first;
    const commitObj = {
      id: commit,
      url: 'https://github.com/charleszzhyy/lab1/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };
    Object.defineProperty(commitObj, 'lines', { value: lines, enumerable: false });
    return commitObj;
  });
}

function addStat(dl, label, value) {
  dl.append('dt').html(label);
  dl.append('dd').text(value);
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  const totalLOC = data.length;
  const totalCommits = commits.length;
  const fileCount = new Set(data.map((d) => d.file)).size;
  const maxDepth = d3.max(data, (d) => d.depth) ?? 0;
  const avgDepth = Math.round((d3.mean(data, (d) => d.depth) ?? 0) * 10) / 10;
  const longestLineRow = d3.greatest(data, (d) => d.length);
  const longestLine = longestLineRow ? longestLineRow.length : 0;
  const linesPerFile = d3.rollups(data, (v) => v.length, (d) => d.file);
  const avgFileLen = Math.round((d3.mean(linesPerFile, (d) => d[1]) ?? 0) * 10) / 10;

  addStat(dl, 'COMMITS', totalCommits);
  addStat(dl, 'FILES', fileCount);
  addStat(dl, 'TOTAL LOC', totalLOC);
  addStat(dl, 'MAX DEPTH', maxDepth);
  addStat(dl, 'AVG DEPTH', avgDepth);
  addStat(dl, 'LONGEST LINE', longestLine);
  addStat(dl, 'AVG FILE LINES', avgFileLen);
}

function renderTooltipContent(commit) {
  if (!commit) return;
  const link = document.getElementById('commit-link');
  const dateEl = document.getElementById('commit-date');
  const timeEl = document.querySelector('#commit-tooltip #commit-time');
  const authorEl = document.getElementById('commit-author');
  const linesEl = document.getElementById('commit-lines');

  if (!link || !dateEl || !timeEl || !authorEl || !linesEl) return;

  link.href = commit.url;
  link.textContent = commit.id;
  dateEl.textContent = commit.datetime.toLocaleString('en', { dateStyle: 'full' });
  timeEl.textContent = commit.datetime.toLocaleTimeString();
  authorEl.textContent = commit.author || '';
  linesEl.textContent = String(commit.totalLines);
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  if (!tooltip) return;
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  if (!tooltip) return;
  const pad = 14;
  tooltip.style.left = `${event.clientX + pad}px`;
  tooltip.style.top = `${event.clientY + pad}px`;
}

function colorByHour(h) {
  if (h < 5 || h >= 22) return '#6b7cff';
  if (h < 12) return '#5ba7ff';
  if (h < 17) return '#4fc3a5';
  return '#f29f5c';
}

function attachDotHandlers(selection) {
  selection
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget)
        .style('fill-opacity', 1)
        .attr('stroke-opacity', 0.35);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => updateTooltipPosition(event))
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget)
        .style('fill-opacity', 0.75)
        .attr('stroke-opacity', 0.15);
      updateTooltipVisibility(false);
    });
}

function renderScatterPlot(data, commits) {
  allCommits = commits.slice();
  currentCommits = commits.slice();

  const width = 900;
  const height = 420;
  const margin = { top: 16, right: 20, bottom: 40, left: 44 };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  rScale = d3
    .scaleSqrt()
    .domain([
      Math.max(1, minLines ?? 1),
      Math.max(1, maxLines ?? 1),
    ])
    .range([3, 18]);

  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left},0)`)
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat('')
        .tickSize(-(width - margin.left - margin.right))
    );

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat(
    (d) => String(d % 24).padStart(2, '0') + ':00'
  );

  svg
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .attr('class', 'x-axis')
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .attr('class', 'y-axis')
    .call(yAxis);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  const dotsGroup = svg.append('g').attr('class', 'dots');

  const dots = dotsGroup
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', (d) => colorByHour(d.hourFrac))
    .style('fill-opacity', 0.75)
    .attr('stroke', 'var(--text-2, #333)')
    .attr('stroke-opacity', 0.15);

  attachDotHandlers(dots);
}

function updateScatterPlot(data, commits) {
  currentCommits = commits && commits.length ? commits.slice() : [];

  const svg = d3.select('#chart').select('svg');
  if (svg.empty() || !currentCommits.length) return;

  xScale.domain(d3.extent(currentCommits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(
    currentCommits,
    (d) => d.totalLines
  );
  rScale.domain([
    Math.max(1, minLines ?? 1),
    Math.max(1, maxLines ?? 1),
  ]);

  const xAxis = d3.axisBottom(xScale);
  svg.select('g.x-axis').call(xAxis);

  const sortedCommits = d3.sort(currentCommits, (d) => -d.totalLines);
  const dotsGroup = svg.select('g.dots');

  const dots = dotsGroup.selectAll('circle').data(sortedCommits, (d) => d.id);

  dots
    .exit()
    .transition()
    .duration(150)
    .attr('r', 0)
    .remove();

  const dotsEnter = dots
    .enter()
    .append('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 0)
    .attr('fill', (d) => colorByHour(d.hourFrac))
    .style('fill-opacity', 0.75)
    .attr('stroke', 'var(--text-2, #333)')
    .attr('stroke-opacity', 0.15);

  const dotsMerged = dotsEnter.merge(dots);

  attachDotHandlers(dotsMerged);

  dotsMerged
    .transition()
    .duration(250)
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines));
}

function updateFileDisplay(commits) {
  const container = d3.select('#files');
  if (container.empty()) return;

  const lines = commits.flatMap((c) => c.lines);

  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }));

  files = files.sort((a, b) =>
    d3.descending(a.lines.length, b.lines.length)
  );

  const filesSel = container
    .selectAll('div')
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append('div').call((div) => {
        div.append('dt');
        div.append('dd');
      })
    );

  filesSel
    .select('dt')
    .html(
      (d) =>
        `<code>${d.name}</code><small>${d.lines.length} lines</small>`
    );

  filesSel
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc');
}

function setupTimeSlider(commits, data) {
  const slider = document.getElementById('commit-progress');
  const timeEl = document.querySelector('#commit-filter time');

  if (!slider || !timeEl) return;

  timeScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, 100]);

  function onTimeSliderChange() {
    commitProgress = Number(slider.value);
    commitMaxTime = timeScale.invert(commitProgress);

    timeEl.textContent = commitMaxTime.toLocaleString('en', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const filtered = commits.filter(
      (d) => d.datetime <= commitMaxTime
    );

    updateScatterPlot(data, filtered);
    updateFileDisplay(filtered);
  }

  slider.addEventListener('input', onTimeSliderChange);
  onTimeSliderChange();
}

function renderCommitStory(commits) {
  const story = d3.select('#scatter-story');
  if (story.empty()) return;

  story
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => {
      const dateLabel = d.datetime.toLocaleString('en', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
      const summary =
        i > 0 ? 'another commit' : 'my first commit';
      const fileCount = d3.rollups(
        d.lines,
        (v) => v.length,
        (r) => r.file
      ).length;
      return `
        <p>On ${dateLabel}, I made <a href="${d.url}" target="_blank">${summary}</a>.</p>
        <p>I edited ${d.totalLines} lines across ${fileCount} files.</p>
      `;
    });
}

function setupScroller() {
  const container = document.querySelector('#scrolly-1');
  if (!container) return;

  function onStepEnter(response) {
    const commit = response.element.__data__;
    if (!commit) return;
    const maxTime = commit.datetime;
    const filtered = allCommits.filter((d) => d.datetime <= maxTime);
    updateScatterPlot(null, filtered);
    updateFileDisplay(filtered);
  }

  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
      offset: 0.6,
    })
    .onStepEnter(onStepEnter);

  window.addEventListener('resize', scroller.resize);
}

async function main() {
  const data = await loadData();
  const commits = processCommits(data);

  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
  updateFileDisplay(commits);
  setupTimeSlider(commits, data);
  renderCommitStory(commits);
  setupScroller();
}

main();