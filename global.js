console.log("IT'S ALIVE!");


function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


const normalizePath = (path) =>
  path.replace(/index\.html$/i, "").replace(/\/+$/, "") || "/";


const pages = [
  { url: "",           title: "Home"     },
  { url: "projects/",  title: "Projects" },
  { url: "contact/",   title: "Contact"  },
  { url: "resume/",    title: "Resume"   },
  { url: "https://github.com/charleszzhyy", title: "GitHub" },
];


let BASE_PATH = "/";
if (!["localhost", "127.0.0.1"].includes(location.hostname)) {
  if (location.hostname.endsWith(".github.io")) {
    
    const firstSegment = location.pathname.split("/").filter(Boolean)[0] || "";
    BASE_PATH = firstSegment ? `/${firstSegment}/` : "/";
  } else {
    BASE_PATH = "/"; 
  }
}

const nav = document.createElement("nav");
document.body.prepend(nav);


for (const p of pages) {
  let url = p.url;
  const title = p.title;


  url = !String(url).startsWith("http") ? BASE_PATH + url : url;

  const a = document.createElement("a");
  a.href = url;
  a.textContent = title;


  const dest = new URL(a.href, location.href);
  if (dest.host !== location.host) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }

  const isSameHost = dest.host === location.host;
  const onThisPage =
    isSameHost &&
    normalizePath(dest.pathname) === normalizePath(location.pathname);


  a.classList.toggle("current", onThisPage);
  if (onThisPage) a.setAttribute("aria-current", "page");

  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector('.color-scheme select');
const root = document.documentElement;


function setColorScheme(value) {
  root.style.setProperty('color-scheme', value);
  localStorage.colorScheme = value; 
}

if (localStorage.colorScheme) {
  setColorScheme(localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}

select.addEventListener('input', (e) => {
  setColorScheme(e.target.value);
  console.log('color scheme changed to', e.target.value);
});