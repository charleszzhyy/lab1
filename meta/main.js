import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


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
    const ret = {
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
  
    Object.defineProperty(ret, 'lines', { value: lines, enumerable: false });
    return ret;
  });
}


function addStat(dl, label, value) {
  dl.append('dt').html(label);
  dl.append('dd').text(value);
}
function periodOfDay(d) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  const totalLOC = data.length;
  const totalCommits = commits.length;
  const fileCount = new Set(data.map((d) => d.file)).size;
  const maxDepth = d3.max(data, (d) => d.depth) ?? 0;
  const avgDepth = Math.round((d3.mean(data, (d) => d.depth) ?? 0) * 10) / 10;
  const longestLineRow = d3.greatest(data, (d) => d.length);
  const longestLine = longestLineRow?.length ?? 0;
  const linesPerFile = d3.rollups(data, (v) => v.length, (d) => d.file);
  const avgFileLen =
    Math.round((d3.mean(linesPerFile, (d) => d[1]) ?? 0) * 10) / 10;
  const workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => periodOfDay(d.datetime)
  );
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0] ?? '—';

  addStat(dl, 'COMMITS', totalCommits);
  addStat(dl, 'FILES', fileCount);
  addStat(dl, 'TOTAL <abbr title="Lines of code">LOC</abbr>', totalLOC);
  addStat(dl, 'MAX DEPTH', maxDepth);
  addStat(dl, 'AVG DEPTH', avgDepth);
  addStat(dl, 'LONGEST LINE', longestLine);
  addStat(dl, 'AVG FILE LINES', avgFileLen);
  addStat(dl, 'BUSIEST PERIOD', maxPeriod);
}

function renderTooltipContent(commit = {}) {
  const link = document.getElementById('commit-link');
  const dateEl = document.getElementById('commit-date');
  const timeEl = document.getElementById('commit-time');
  const authorEl = document.getElementById('commit-author');
  const linesEl = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  dateEl.textContent = commit.datetime.toLocaleString('en', { dateStyle: 'full' });
  timeEl.textContent = commit.datetime.toLocaleTimeString();
  authorEl.textContent = commit.author ?? '—';
  linesEl.textContent = String(commit.totalLines);
}
function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}
function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const pad = 14;
  tooltip.style.left = `${event.clientX + pad}px`;
  tooltip.style.top  = `${event.clientY + pad}px`;
}


function renderScatterPlot(data, commits) {
  const width = 900;
  const height = 420;
  const margin = { top: 16, right: 20, bottom: 40, left: 44 };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  
  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([Math.max(1, minLines ?? 1), Math.max(1, maxLines ?? 1)])
    .range([3, 18]);

  
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-(width - margin.left - margin.right)));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(yAxis);


  const colorByHour = (h) => {
    if (h < 5 || h >= 22) return '#6b7cff';  
    if (h < 12)            return '#5ba7ff';   
    if (h < 17)            return '#4fc3a5';   
    return '#f29f5c';                           
  };


  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  const dots = svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
      .attr('cx', (d) => xScale(d.datetime))
      .attr('cy', (d) => yScale(d.hourFrac))
      .attr('r',  (d) => rScale(d.totalLines))
      .attr('fill', (d) => colorByHour(d.hourFrac))
      .style('fill-opacity', 0.75)
      .attr('stroke', 'var(--text-2, #333)')
      .attr('stroke-opacity', 0.15)
      .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1).attr('stroke-opacity', 0.35);
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mousemove', (event) => updateTooltipPosition(event))
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.75).attr('stroke-opacity', 0.15);
        updateTooltipVisibility(false);
      });

  
  const countEl = document.getElementById('selection-count');
  const langDl  = document.getElementById('language-breakdown');

  const isSelected = (selection, d) => {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const cx = xScale(d.datetime);
    const cy = yScale(d.hourFrac);
    return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
  };

  function renderLanguageBreakdown(selection) {
    if (!langDl) return;
    const selCommits = selection ? commits.filter((d) => isSelected(selection, d)) : [];
    if (selCommits.length === 0) { langDl.innerHTML = ''; return; }

    const lines = selCommits.flatMap((c) => c.lines); 
    const breakdown = d3.rollups(lines, v => v.length, d => d.type); 

    const total = lines.length;
    const fmt = d3.format('.1%');
    langDl.innerHTML = '';
    for (const [lang, count] of breakdown) {
      langDl.innerHTML += `<dt>${lang}</dt><dd>${count} lines (${fmt(count/total)})</dd>`;
    }
  }

  function brushed(event) {
    const sel = event.selection; 

    d3.selectAll('#chart circle')
      .classed('selected', (d) => isSelected(sel, d));

    const n = sel ? commits.filter((d) => isSelected(sel, d)).length : 0;
    countEl.textContent = n ? `${n} commits selected` : 'No commits selected';

    renderLanguageBreakdown(sel);
  }

  svg.call(d3.brush().on('start brush end', brushed));
  
  svg.selectAll('.dots, .overlay, .selection').raise();
}


async function main() {
  console.log('✅ main.js loaded');
  const data = await loadData();
  const commits = processCommits(data);
  console.log('📊 commits:', commits);
  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
}
main();