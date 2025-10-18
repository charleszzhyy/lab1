console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


(function highlightCurrentNav() {
  const navLinks = $$("nav a");
  if (!navLinks.length) return;

 
  navLinks.forEach(a => {
    a.classList.remove("current");
    a.removeAttribute("aria-current");
  });

  
  const normalizePath = (path) =>
    path.replace(/index\.html$/i, "").replace(/\/+$/, "") || "/";

  const hereHost = location.host;
  const herePath = normalizePath(location.pathname);

  const currentLink = navLinks.find(a => {

    const u = new URL(a.getAttribute("href"), location.href);
    const linkHost = u.host;
    const linkPath = normalizePath(u.pathname);
    return linkHost === hereHost && linkPath === herePath;
  });


  currentLink?.classList.add("current");
  if (currentLink) currentLink.setAttribute("aria-current", "page");
})();