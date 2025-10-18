console.log("IT'S ALIVE!");

export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// ---------- Lab 3 Step 2: auto-highlight current nav link ----------
(function highlightCurrentNav() {
  const navLinks = $$("nav a");
  if (!navLinks.length) return;

  // 清除所有手动/旧的 current 标记
  navLinks.forEach(a => {
    a.classList.remove("current");
    a.removeAttribute("aria-current");
  });

  // 规范化路径：把 /index.html 当作 /
  const normalizePath = (path) =>
    path.replace(/index\.html$/i, "").replace(/\/+$/, "") || "/";

  const hereHost = location.host;
  const herePath = normalizePath(location.pathname);

  const currentLink = navLinks.find(a => {
    // 使用 URL 确保拿到绝对地址（即便 a.href 是相对路径）
    const u = new URL(a.getAttribute("href"), location.href);
    const linkHost = u.host;
    const linkPath = normalizePath(u.pathname);
    return linkHost === hereHost && linkPath === herePath;
  });

  // 可选链避免未找到时报错
  currentLink?.classList.add("current");
  if (currentLink) currentLink.setAttribute("aria-current", "page");
})();