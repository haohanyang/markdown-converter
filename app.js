"use strict";

// ---- Conversion -----------------------------------------------------------

function makeResolver(pageUrl) {
  const url = new URL(pageUrl); // throws on invalid input
  const root = url.origin;
  const base = url.origin + url.pathname.replace(/\/+$/, "") + "/";

  return function resolve(target) {
    const t = target.trim();
    if (!t || t.startsWith("#") || t.startsWith("//")) return target;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return target; // has a scheme
    if (t.startsWith("/")) return root + t;
    return new URL(t, base).href;
  };
}

function convert(markdown, pageUrl) {
  const resolve = makeResolver(pageUrl);

  // Protect fenced code blocks and inline code from rewriting.
  const stash = [];
  const hold = (m) => `\u0000${stash.push(m) - 1}\u0000`;
  let text = markdown
    .replace(/^( {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n {0,3}\2[`~]*[ \t]*(?=\n|$)|$)/gm, hold)
    .replace(/(`+)[^`\n][\s\S]*?\1(?!`)/g, hold);

  // Inline links and images: [text](url "title") / ![alt](<url> 'title')
  text = text.replace(
    /(\]\(\s*)(<[^>\n]*>|(?:[^\s()]|\([^\s()]*\))*)/g,
    (m, open, dest) => {
      if (dest.startsWith("<")) return open + "<" + resolve(dest.slice(1, -1)) + ">";
      return open + resolve(dest);
    }
  );

  // Reference definitions: [id]: url
  text = text.replace(
    /^( {0,3}\[[^\]\n]+\]:[ \t]*)(<[^>\n]*>|\S+)/gm,
    (m, head, dest) =>
      dest.startsWith("<")
        ? head + "<" + resolve(dest.slice(1, -1)) + ">"
        : head + resolve(dest)
  );

  // HTML attributes: src="..." href="..."
  text = text.replace(
    /(\b(?:src|href)\s*=\s*)(["'])(.*?)\2/gi,
    (m, head, q, val) => head + q + resolve(val) + q
  );

  return text.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[i]);
}

// ---- UI -------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const urlEl = $("url"), inputEl = $("input"), outputEl = $("output");
const previewEl = $("preview"), errorEl = $("error");
const tabMd = $("tab-md"), tabPreview = $("tab-preview"), copyBtn = $("copy");

function showTab(preview) {
  tabMd.setAttribute("aria-selected", String(!preview));
  tabPreview.setAttribute("aria-selected", String(preview));
  tabMd.classList.toggle("active", !preview);
  tabPreview.classList.toggle("active", preview);
  outputEl.hidden = preview;
  previewEl.hidden = !preview;
  if (preview) renderPreview();
}

function renderPreview() {
  if (!window.marked || !window.DOMPurify) {
    previewEl.textContent = "Preview libraries failed to load (offline?).";
    return;
  }
  previewEl.innerHTML = DOMPurify.sanitize(marked.parse(outputEl.value));
  previewEl.querySelectorAll("a[href]").forEach((a) => {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });
}

function update() {
  errorEl.hidden = true;
  const value = urlEl.value.trim();
  if (!value) {
    outputEl.value = inputEl.value;
  } else {
    try {
      outputEl.value = convert(inputEl.value, value);
      localStorage.setItem("mdUrl", value);
    } catch {
      errorEl.textContent = "Enter a valid absolute URL, e.g. https://example.com/docs/page";
      errorEl.hidden = false;
      outputEl.value = inputEl.value;
    }
  }
  if (!previewEl.hidden) renderPreview();
}

async function copy() {
  try {
    await navigator.clipboard.writeText(outputEl.value);
  } catch {
    const wasHidden = outputEl.hidden;
    outputEl.hidden = false;
    outputEl.select();
    document.execCommand("copy");
    outputEl.hidden = wasHidden;
  }
  copyBtn.textContent = "Copied!";
  setTimeout(() => (copyBtn.textContent = "Copy markdown"), 1500);
}

urlEl.addEventListener("input", update);
inputEl.addEventListener("input", update);
tabMd.addEventListener("click", () => showTab(false));
tabPreview.addEventListener("click", () => showTab(true));
copyBtn.addEventListener("click", copy);

urlEl.value = localStorage.getItem("mdUrl") || "";
update();
