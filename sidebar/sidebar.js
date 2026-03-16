const btnComputed = document.getElementById("btn-computed");
const btnStyles = document.getElementById("btn-styles");
const btnAnimations = document.getElementById("btn-animations");
const elementInfo = document.getElementById("element-info");
const statusEl = document.getElementById("status");

// --- Element identification (shared by both extractors) ---

function buildIdentificationCode() {
  return `
    var el = $0;
    var tag = el.tagName.toLowerCase();
    var id = el.id ? '#' + el.id : '';
    var classes = (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '')
      .trim();
    var classSuffix = classes ? '.' + classes.split(/\\s+/).join('.') : '';

    var path = [];
    var current = el;
    while (current && current.nodeType === 1) {
      var seg = current.tagName.toLowerCase();
      if (current.id) {
        seg += '#' + current.id;
        path.unshift(seg);
        break;
      }
      var cls = (typeof current.className === 'string' ? current.className : current.getAttribute('class') || '').trim();
      if (cls) seg += '.' + cls.split(/\\s+/).join('.');
      path.unshift(seg);
      current = current.parentElement;
    }

    var identification = {
      tag: tag,
      identifier: tag + id + classSuffix,
      selectorPath: path.join(' > ')
    };
  `;
}

// --- Computed styles extraction ---

function buildComputedStylesCode() {
  return `(function() {
    if (!$0) return { error: 'No element selected' };
    try {
      ${buildIdentificationCode()}

      var selected = window.getComputedStyle($0);
      var refEl = document.createElement(tag);
      refEl.style.position = 'absolute';
      refEl.style.visibility = 'hidden';
      refEl.style.pointerEvents = 'none';
      refEl.style.left = '-9999px';
      var refParent = document.body || document.documentElement;
      refParent.appendChild(refEl);

      try {
        var defaults = window.getComputedStyle(refEl);
        var styles = [];
        for (var i = 0; i < selected.length; i++) {
          var prop = selected[i];
          var val = selected.getPropertyValue(prop);
          var defVal = defaults.getPropertyValue(prop);
          if (val !== defVal) {
            styles.push([prop, val]);
          }
        }
        return {
          identification: identification,
          styles: styles
        };
      } finally {
        refParent.removeChild(refEl);
      }
    } catch(e) {
      return { error: e.message };
    }
  })()`;
}

// --- Matched rules extraction ---

function buildMatchedRulesCode() {
  return `(function() {
    if (!$0) return { error: 'No element selected' };
    try {
      ${buildIdentificationCode()}

      var el = $0;
      var inlineStyles = el.style.cssText || '';
      var matchedRules = [];
      var warnings = [];

      function getSource(sheet) {
        if (sheet.href) {
          try {
            return new URL(sheet.href).pathname.split('/').pop() || sheet.href;
          } catch(e) {
            return sheet.href;
          }
        }
        var owner = sheet.ownerNode;
        if (owner && owner.tagName === 'STYLE') {
          var styles = document.querySelectorAll('style');
          for (var i = 0; i < styles.length; i++) {
            if (styles[i] === owner) return 'inline <style> #' + (i + 1);
          }
        }
        return 'unknown';
      }

      function processRules(rules, sheet, mediaContext) {
        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i];
          if (rule instanceof CSSStyleRule) {
            try {
              if (el.matches(rule.selectorText)) {
                var decl = rule.style.cssText;
                if (decl) {
                  var entry = {
                    selector: rule.selectorText,
                    declarations: decl,
                    source: getSource(sheet)
                  };
                  if (mediaContext) entry.media = mediaContext;
                  matchedRules.push(entry);
                }
              }
            } catch(e) {
              // Skip rules with unsupported selectors (e.g. pseudo-elements)
            }
          } else if (rule instanceof CSSMediaRule) {
            var mediaText = rule.media.mediaText;
            if (window.matchMedia(mediaText).matches) {
              processRules(rule.cssRules, sheet, '@media ' + mediaText);
            }
          } else if (rule instanceof CSSSupportsRule) {
            var supportsText = rule.conditionText || rule.cssText.split('{')[0].trim();
            if (CSS.supports(supportsText)) {
              processRules(rule.cssRules, sheet, '@supports ' + supportsText);
            }
          } else if (rule instanceof CSSImportRule && rule.styleSheet) {
            processRules(rule.styleSheet.cssRules, rule.styleSheet, mediaContext);
          } else if (rule instanceof CSSLayerBlockRule) {
            var layerCtx = rule.name ? '@layer ' + rule.name : '@layer';
            processRules(rule.cssRules, sheet, layerCtx);
          }
        }
      }

      var allSheets = Array.from(document.styleSheets);
      if (document.adoptedStyleSheets) {
        allSheets = allSheets.concat(Array.from(document.adoptedStyleSheets));
      }

      for (var s = 0; s < allSheets.length; s++) {
        var sheet = allSheets[s];
        try {
          var rules = sheet.cssRules;
          if (rules) processRules(rules, sheet, null);
        } catch(e) {
          if (e.name === 'SecurityError') {
            warnings.push('Could not access cross-origin stylesheet: ' + (sheet.href || 'unknown'));
          }
        }
      }

      return {
        identification: identification,
        inlineStyles: inlineStyles,
        matchedRules: matchedRules,
        warnings: warnings
      };
    } catch(e) {
      return { error: e.message };
    }
  })()`;
}

// --- Animations extraction ---

function buildAnimationsCode() {
  return `(function() {
    if (!$0) return { error: 'No element selected' };
    try {
      ${buildIdentificationCode()}

      var el = $0;
      var cs = window.getComputedStyle(el);

      // Gather animation properties from computed style
      var animProps = {};
      var animPropNames = [
        'animation-name', 'animation-duration', 'animation-timing-function',
        'animation-delay', 'animation-iteration-count', 'animation-direction',
        'animation-fill-mode', 'animation-play-state'
      ];
      var hasAnimation = false;
      for (var i = 0; i < animPropNames.length; i++) {
        var val = cs.getPropertyValue(animPropNames[i]);
        if (val && val !== 'none' && val !== 'normal' && val !== '0s' && val !== 'running' && val !== '1') {
          hasAnimation = true;
        }
        animProps[animPropNames[i]] = val;
      }

      // Gather transition properties
      var transProps = {};
      var transPropNames = [
        'transition-property', 'transition-duration', 'transition-timing-function',
        'transition-delay'
      ];
      var hasTransition = false;
      for (var i = 0; i < transPropNames.length; i++) {
        var val = cs.getPropertyValue(transPropNames[i]);
        if (val && val !== 'all' && val !== '0s' && val !== 'ease' && val !== 'none') {
          hasTransition = true;
        }
        transProps[transPropNames[i]] = val;
      }
      // Also check if transition-property is set to something specific
      if (transProps['transition-property'] && transProps['transition-property'] !== 'all'
          && transProps['transition-property'] !== 'none') {
        hasTransition = true;
      }
      // Check if duration is non-zero
      if (transProps['transition-duration'] && transProps['transition-duration'] !== '0s') {
        hasTransition = true;
      }

      // Get active Web Animations via getAnimations()
      var webAnimations = [];
      if (el.getAnimations) {
        var anims = el.getAnimations();
        for (var i = 0; i < anims.length; i++) {
          var anim = anims[i];
          var info = {
            name: anim.animationName || (anim.id || 'unnamed'),
            playState: anim.playState,
            currentTime: anim.currentTime,
            duration: anim.effect && anim.effect.getTiming ? anim.effect.getTiming().duration : null,
            iterations: anim.effect && anim.effect.getTiming ? anim.effect.getTiming().iterations : null,
            easing: anim.effect && anim.effect.getTiming ? anim.effect.getTiming().easing : null,
            fill: anim.effect && anim.effect.getTiming ? anim.effect.getTiming().fill : null,
            direction: anim.effect && anim.effect.getTiming ? anim.effect.getTiming().direction : null,
            delay: anim.effect && anim.effect.getTiming ? anim.effect.getTiming().delay : null
          };

          // Get computed keyframes if available
          if (anim.effect && anim.effect.getKeyframes) {
            var kfs = anim.effect.getKeyframes();
            info.keyframes = kfs.map(function(kf) {
              var obj = { offset: kf.offset, easing: kf.easing, composite: kf.composite };
              // Extract all animated properties
              for (var key in kf) {
                if (key !== 'offset' && key !== 'easing' && key !== 'composite'
                    && key !== 'computedOffset') {
                  obj[key] = kf[key];
                }
              }
              return obj;
            });
          }

          webAnimations.push(info);
        }
      }

      // Find @keyframes rules by name from stylesheets
      var animationNames = (animProps['animation-name'] || '').split(',').map(function(n) {
        return n.trim();
      }).filter(function(n) { return n && n !== 'none'; });

      var keyframesRules = {};
      if (animationNames.length > 0) {
        var allSheets = Array.from(document.styleSheets);
        if (document.adoptedStyleSheets) {
          allSheets = allSheets.concat(Array.from(document.adoptedStyleSheets));
        }

        function findKeyframes(rules) {
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            if (rule instanceof CSSKeyframesRule) {
              if (animationNames.indexOf(rule.name) !== -1) {
                keyframesRules[rule.name] = rule.cssText;
              }
            } else if (rule.cssRules) {
              findKeyframes(rule.cssRules);
            }
          }
        }

        for (var s = 0; s < allSheets.length; s++) {
          try {
            var rules = allSheets[s].cssRules;
            if (rules) findKeyframes(rules);
          } catch(e) {}
        }
      }

      return {
        identification: identification,
        animProps: hasAnimation ? animProps : null,
        transProps: hasTransition ? transProps : null,
        webAnimations: webAnimations,
        keyframesRules: keyframesRules,
        hasContent: hasAnimation || hasTransition || webAnimations.length > 0
      };
    } catch(e) {
      return { error: e.message };
    }
  })()`;
}

// --- Formatting ---

function formatAnimationsResult(result) {
  const lines = [
    `/* Element: ${result.identification.identifier} */`,
    `/* Selector: ${result.identification.selectorPath} */`,
    `/* Source: Animations & Transitions */`,
    ""
  ];

  if (!result.hasContent) {
    lines.push("/* No animations or transitions on this element */");
    return lines.join("\n");
  }

  // CSS animation properties
  if (result.animProps) {
    lines.push("/* --- CSS Animation Properties --- */");
    for (const [prop, val] of Object.entries(result.animProps)) {
      lines.push(`${prop}: ${val};`);
    }
    lines.push("");
  }

  // CSS transition properties
  if (result.transProps) {
    lines.push("/* --- CSS Transition Properties --- */");
    for (const [prop, val] of Object.entries(result.transProps)) {
      lines.push(`${prop}: ${val};`);
    }
    lines.push("");
  }

  // Active Web Animations (runtime state)
  if (result.webAnimations.length > 0) {
    lines.push("/* --- Active Animations (runtime) --- */");
    for (const anim of result.webAnimations) {
      lines.push(`/* ${anim.name} [${anim.playState}] */`);
      if (anim.duration != null) lines.push(`/*   duration: ${anim.duration}ms */`);
      if (anim.iterations != null) lines.push(`/*   iterations: ${anim.iterations === Infinity ? 'infinite' : anim.iterations} */`);
      if (anim.easing) lines.push(`/*   easing: ${anim.easing} */`);
      if (anim.fill) lines.push(`/*   fill: ${anim.fill} */`);
      if (anim.direction) lines.push(`/*   direction: ${anim.direction} */`);
      if (anim.delay) lines.push(`/*   delay: ${anim.delay}ms */`);

      // Output keyframes
      if (anim.keyframes && anim.keyframes.length > 0) {
        lines.push("");
        lines.push(`@keyframes ${anim.name} {`);
        for (const kf of anim.keyframes) {
          const pct = kf.offset != null ? `${Math.round(kf.offset * 100)}%` : "?";
          const props = Object.entries(kf)
            .filter(([k]) => k !== "offset" && k !== "easing" && k !== "composite")
            .map(([k, v]) => {
              // Convert camelCase to kebab-case
              const kebab = k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
              return `    ${kebab}: ${v};`;
            });
          lines.push(`  ${pct} {`);
          if (kf.easing && kf.easing !== "linear") lines.push(`    animation-timing-function: ${kf.easing};`);
          lines.push(...props);
          lines.push("  }");
        }
        lines.push("}");
      }
      lines.push("");
    }
  }

  // @keyframes from stylesheets
  const sheetKeyframes = Object.entries(result.keyframesRules);
  if (sheetKeyframes.length > 0) {
    lines.push("/* --- @keyframes (from stylesheets) --- */");
    for (const [name, cssText] of sheetKeyframes) {
      lines.push(cssText);
      lines.push("");
    }
  }

  return lines.join("\n");
}

function formatComputedResult(result) {
  const lines = [
    `/* Element: ${result.identification.identifier} */`,
    `/* Selector: ${result.identification.selectorPath} */`,
    `/* Source: Computed (non-default) styles */`,
    ""
  ];

  for (const [prop, val] of result.styles) {
    lines.push(`${prop}: ${val};`);
  }

  return lines.join("\n");
}

function formatMatchedResult(result) {
  const lines = [
    `/* Element: ${result.identification.identifier} */`,
    `/* Selector: ${result.identification.selectorPath} */`,
    `/* Source: Matched CSS rules */`,
    ""
  ];

  if (result.inlineStyles) {
    lines.push("/* --- element.style --- */");
    for (const decl of result.inlineStyles.split(";").map((s) => s.trim()).filter(Boolean)) {
      lines.push(decl + ";");
    }
    lines.push("");
  }

  for (const rule of result.matchedRules) {
    let header = rule.selector + " (" + rule.source + ")";
    if (rule.media) header += " " + rule.media;
    lines.push(`/* --- ${header} --- */`);
    for (const decl of rule.declarations.split(";").map((s) => s.trim()).filter(Boolean)) {
      lines.push(decl + ";");
    }
    lines.push("");
  }

  for (const warning of result.warnings) {
    lines.push(`/* [!] ${warning} */`);
  }

  return lines.join("\n");
}

// --- Clipboard ---

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}

// --- Status display ---

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status " + type;
  if (type === "success") {
    setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.textContent = "";
        statusEl.className = "status";
      }
    }, 3000);
  }
}

// --- Eval wrapper ---

function evalInPage(code) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(code, (result, exceptionInfo) => {
      if (exceptionInfo) {
        const msg = exceptionInfo.isException
          ? (exceptionInfo.value || "Unknown exception")
          : (exceptionInfo.description || "Eval failed");
        reject(new Error(msg));
      } else {
        resolve(result);
      }
    });
  });
}

// --- Shared extract-and-copy handler ---

async function extractAndCopy(buildCode, formatResult, countResult) {
  showStatus("Extracting...", "info");
  try {
    const result = await evalInPage(buildCode());
    if (result.error) {
      showStatus(result.error, "error");
      return;
    }
    const formatted = formatResult(result);
    const ok = await copyToClipboard(formatted);
    if (ok) {
      showStatus(`Copied ${countResult(result)}`, "success");
    } else {
      showStatus("Clipboard write failed", "error");
    }
  } catch (e) {
    showStatus(e.message, "error");
  }
}

// --- Button handlers ---

btnComputed.addEventListener("click", () =>
  extractAndCopy(
    buildComputedStylesCode,
    formatComputedResult,
    (r) => `${r.styles.length} computed properties`
  )
);

btnStyles.addEventListener("click", () =>
  extractAndCopy(
    buildMatchedRulesCode,
    formatMatchedResult,
    (r) => {
      const count = r.matchedRules.length + (r.inlineStyles ? 1 : 0);
      return `${count} matched rule${count !== 1 ? "s" : ""}`;
    }
  )
);

btnAnimations.addEventListener("click", () =>
  extractAndCopy(
    buildAnimationsCode,
    formatAnimationsResult,
    (r) => {
      if (!r.hasContent) return "no animations found";
      const parts = [];
      if (r.animProps) parts.push("animations");
      if (r.transProps) parts.push("transitions");
      if (r.webAnimations.length > 0) parts.push(`${r.webAnimations.length} active`);
      const kfCount = Object.keys(r.keyframesRules).length;
      if (kfCount > 0) parts.push(`${kfCount} @keyframes`);
      return parts.join(" + ");
    }
  )
);

// --- Selection tracking ---

let selectionGeneration = 0;

function updateElementInfo() {
  const gen = ++selectionGeneration;
  evalInPage(`(function() {
    if (!$0) return null;
    var tag = $0.tagName.toLowerCase();
    var id = $0.id ? '#' + $0.id : '';
    var cls = (typeof $0.className === 'string' ? $0.className : $0.getAttribute('class') || '').trim();
    var classSuffix = cls ? '.' + cls.split(/\\s+/).join('.') : '';
    return tag + id + classSuffix;
  })()`).then((info) => {
    if (gen !== selectionGeneration) return;
    if (info) {
      elementInfo.textContent = info;
      btnComputed.disabled = false;
      btnStyles.disabled = false;
      btnAnimations.disabled = false;
    } else {
      elementInfo.textContent = "No element selected";
      btnComputed.disabled = true;
      btnStyles.disabled = true;
      btnAnimations.disabled = true;
    }
  }).catch(() => {
    if (gen !== selectionGeneration) return;
    elementInfo.textContent = "No element selected";
    btnComputed.disabled = true;
    btnStyles.disabled = true;
    btnAnimations.disabled = true;
  });
}

chrome.devtools.panels.elements.onSelectionChanged.addListener(updateElementInfo);
updateElementInfo();

// --- Keyboard shortcut listener ---
// When DevTools is open, keyboard shortcuts route through here to use $0

const commandMap = {
  "copy-computed": () => btnComputed.click(),
  "copy-styles": () => btnStyles.click(),
  "copy-animations": () => btnAnimations.click()
};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.source === "keyboard" && commandMap[msg.action]) {
    commandMap[msg.action]();
  }
});
