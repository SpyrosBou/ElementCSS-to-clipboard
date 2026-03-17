// Track the last right-clicked element
let lastRightClicked = null;

document.addEventListener("contextmenu", (e) => {
  lastRightClicked = e.target;
});

// --- Extraction logic (mirrors sidebar.js but operates on a real element ref) ---

function getIdentification(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? "#" + el.id : "";
  const classes = (typeof el.className === "string" ? el.className : el.getAttribute("class") || "").trim();
  const classSuffix = classes ? "." + classes.split(/\s+/).join(".") : "";

  const path = [];
  let current = el;
  while (current && current.nodeType === 1) {
    let seg = current.tagName.toLowerCase();
    if (current.id) {
      seg += "#" + current.id;
      path.unshift(seg);
      break;
    }
    const cls = (typeof current.className === "string" ? current.className : current.getAttribute("class") || "").trim();
    if (cls) seg += "." + cls.split(/\s+/).join(".");
    path.unshift(seg);
    current = current.parentElement;
  }

  return {
    tag,
    identifier: tag + id + classSuffix,
    selectorPath: path.join(" > ")
  };
}

function extractComputed(el) {
  const identification = getIdentification(el);
  const selected = window.getComputedStyle(el);
  const refEl = document.createElement(identification.tag);
  refEl.style.position = "absolute";
  refEl.style.visibility = "hidden";
  refEl.style.pointerEvents = "none";
  refEl.style.left = "-9999px";
  const refParent = document.body || document.documentElement;
  refParent.appendChild(refEl);

  try {
    const defaults = window.getComputedStyle(refEl);
    const styles = [];
    for (let i = 0; i < selected.length; i++) {
      const prop = selected[i];
      const val = selected.getPropertyValue(prop);
      if (val !== defaults.getPropertyValue(prop)) {
        styles.push(`${prop}: ${val};`);
      }
    }

    const lines = [
      `/* Element: ${identification.identifier} */`,
      `/* Selector: ${identification.selectorPath} */`,
      `/* Source: Computed (non-default) styles */`,
      "",
      ...styles
    ];
    return lines.join("\n");
  } finally {
    refParent.removeChild(refEl);
  }
}

function extractStyles(el) {
  const identification = getIdentification(el);
  const lines = [
    `/* Element: ${identification.identifier} */`,
    `/* Selector: ${identification.selectorPath} */`,
    `/* Source: Matched CSS rules */`,
    ""
  ];

  // Inline styles
  const inlineStyles = el.style.cssText;
  if (inlineStyles) {
    lines.push("/* --- element.style --- */");
    for (const decl of inlineStyles.split(";").map((s) => s.trim()).filter(Boolean)) {
      lines.push(decl + ";");
    }
    lines.push("");
  }

  // Stylesheet source helper
  function getSource(sheet) {
    if (sheet.href) {
      try { return new URL(sheet.href).pathname.split("/").pop() || sheet.href; }
      catch { return sheet.href; }
    }
    const owner = sheet.ownerNode;
    if (owner?.tagName === "STYLE") {
      const allStyles = document.querySelectorAll("style");
      for (let i = 0; i < allStyles.length; i++) {
        if (allStyles[i] === owner) return `inline <style> #${i + 1}`;
      }
    }
    return "unknown";
  }

  // Traverse stylesheets
  const warnings = [];
  function processRules(rules, sheet, mediaContext) {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule instanceof CSSStyleRule) {
        try {
          if (el.matches(rule.selectorText)) {
            const decl = rule.style.cssText;
            if (decl) {
              let header = `${rule.selectorText} (${getSource(sheet)})`;
              if (mediaContext) header += ` ${mediaContext}`;
              lines.push(`/* --- ${header} --- */`);
              for (const d of decl.split(";").map((s) => s.trim()).filter(Boolean)) {
                lines.push(d + ";");
              }
              lines.push("");
            }
          }
        } catch { /* skip unsupported selectors */ }
      } else if (rule instanceof CSSMediaRule) {
        const mt = rule.media.mediaText;
        if (window.matchMedia(mt).matches) {
          processRules(rule.cssRules, sheet, `@media ${mt}`);
        }
      } else if (rule instanceof CSSSupportsRule) {
        const st = rule.conditionText || rule.cssText.split("{")[0].trim();
        if (CSS.supports(st)) processRules(rule.cssRules, sheet, `@supports ${st}`);
      } else if (rule instanceof CSSImportRule && rule.styleSheet) {
        processRules(rule.styleSheet.cssRules, rule.styleSheet, mediaContext);
      } else if (rule instanceof CSSLayerBlockRule) {
        processRules(rule.cssRules, sheet, rule.name ? `@layer ${rule.name}` : "@layer");
      }
    }
  }

  let allSheets = Array.from(document.styleSheets);
  if (document.adoptedStyleSheets) allSheets = allSheets.concat(Array.from(document.adoptedStyleSheets));
  for (const sheet of allSheets) {
    try {
      if (sheet.cssRules) processRules(sheet.cssRules, sheet, null);
    } catch (e) {
      if (e.name === "SecurityError") warnings.push(`Could not access cross-origin stylesheet: ${sheet.href || "unknown"}`);
    }
  }

  for (const w of warnings) lines.push(`/* [!] ${w} */`);
  return lines.join("\n");
}

function extractAnimations(el) {
  const identification = getIdentification(el);
  const cs = window.getComputedStyle(el);
  const lines = [
    `/* Element: ${identification.identifier} */`,
    `/* Selector: ${identification.selectorPath} */`,
    `/* Source: Animations & Transitions */`,
    ""
  ];

  // Animation properties
  const animName = cs.getPropertyValue("animation-name");
  const hasAnimation = animName && animName !== "none";
  if (hasAnimation) {
    lines.push("/* --- CSS Animation Properties --- */");
    for (const p of ["animation-name", "animation-duration", "animation-timing-function",
      "animation-delay", "animation-iteration-count", "animation-direction",
      "animation-fill-mode", "animation-play-state"]) {
      lines.push(`${p}: ${cs.getPropertyValue(p)};`);
    }
    lines.push("");
  }

  // Transition properties
  const transDur = cs.getPropertyValue("transition-duration");
  const transProp = cs.getPropertyValue("transition-property");
  const hasTransition = transDur && transDur !== "0s" && transProp && transProp !== "none";
  if (hasTransition) {
    lines.push("/* --- CSS Transition Properties --- */");
    for (const p of ["transition-property", "transition-duration",
      "transition-timing-function", "transition-delay"]) {
      lines.push(`${p}: ${cs.getPropertyValue(p)};`);
    }
    lines.push("");
  }

  // @keyframes from stylesheets
  if (hasAnimation) {
    const names = animName.split(",").map((n) => n.trim()).filter((n) => n !== "none");
    let allSheets = Array.from(document.styleSheets);
    if (document.adoptedStyleSheets) allSheets = allSheets.concat(Array.from(document.adoptedStyleSheets));

    const found = [];
    function findKeyframes(rules) {
      for (let i = 0; i < rules.length; i++) {
        if (rules[i] instanceof CSSKeyframesRule && names.includes(rules[i].name)) {
          found.push(rules[i].cssText);
        } else if (rules[i].cssRules) {
          findKeyframes(rules[i].cssRules);
        }
      }
    }
    for (const sheet of allSheets) {
      try { if (sheet.cssRules) findKeyframes(sheet.cssRules); } catch {}
    }
    if (found.length) {
      lines.push("/* --- @keyframes (from stylesheets) --- */");
      for (const kf of found) { lines.push(kf); lines.push(""); }
    }
  }

  if (!hasAnimation && !hasTransition) {
    lines.push("/* No animations or transitions on this element */");
  }

  return lines.join("\n");
}

// --- Clipboard ---

function copyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

// --- Message handler ---

const extractors = {
  "copy-computed": extractComputed,
  "copy-styles": extractStyles,
  "copy-animations": extractAnimations
};

chrome.runtime.onMessage.addListener((msg) => {
  const extractor = extractors[msg.action];
  if (!extractor) return;

  // For context menu: use last right-clicked element
  // For keyboard shortcut: also use last right-clicked element (sidebar handles $0 separately)
  const el = lastRightClicked;
  if (!el || !el.parentNode) return;

  try {
    const result = extractor(el);
    copyText(result);
  } catch (e) {
    console.error("[ElementCSS]", e.message);
  }
});
