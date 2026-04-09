(() => {
  const STORAGE_KEY = "chatgpt_unlocker_enabled";
  let enabled = true;
  let observer = null;
  let intervalId = null;
  const intercepted = new WeakSet();

  chrome.storage.local.get([STORAGE_KEY], (result) => {
    enabled = result[STORAGE_KEY] !== false;
    if (enabled) {
      startWatching();
      startInterval();
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE") {
      enabled = msg.enabled;
      if (enabled) {
        startWatching();
        startInterval();
        forceEnableAll();
      } else {
        stopWatching();
        stopInterval();
      }
    }
    if (msg.type === "FORCE_UNLOCK") {
      forceEnableAll();
    }
  });

  // ─── Core: intercept React's disabled setter ───────────────────────────────
  // React sets el.disabled = true via the DOM property, not setAttribute.
  // We override the property descriptor so it can never be set to true again.
  function interceptDisabled(el) {
    if (!el || intercepted.has(el)) return;
    intercepted.add(el);

    const proto = Object.getPrototypeOf(el);
    const nativeDesc = Object.getOwnPropertyDescriptor(proto, 'disabled');
    if (!nativeDesc) return;

    Object.defineProperty(el, 'disabled', {
      get() {
        return false;
      },
      set(_val) {
        // silently swallow React trying to disable this element
      },
      configurable: true,
    });

    // Also freeze aria-disabled
    const origSetAttr = el.setAttribute.bind(el);
    el.setAttribute = function (name, value) {
      if (name === 'aria-disabled' && value === 'true') return;
      if (name === 'disabled') return;
      origSetAttr(name, value);
    };
  }

  // ─── Unlock a single element ───────────────────────────────────────────────
  function unlock(el) {
    if (!el) return;

    interceptDisabled(el);

    // Remove disabled in every form it might appear
    try { el.removeAttribute('disabled'); } catch (_) {}
    try { el.removeAttribute('aria-disabled'); } catch (_) {}
    try { el.removeAttribute('data-disabled'); } catch (_) {}

    if (el.getAttribute('contenteditable') === 'false') {
      el.setAttribute('contenteditable', 'true');
    }

    // Remove any "pointer-events: none" or opacity hacks
    el.style.pointerEvents = 'auto';
    el.style.opacity = '';
    el.style.cursor = 'text';

    // Poke React's synthetic event system so it re-syncs
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.dispatchEvent(new Event('focus', { bubbles: true }));
  }

  // ─── Dismiss the "limit reached" banner ───────────────────────────────────
  function dismissLimitBanner() {
    // The banner that blocks input — try to close/hide it
    const bannerTexts = [
      "You've reached the Free limit",
      "free limit",
      "Upgrade now or wait",
    ];

    document.querySelectorAll('div, section, aside').forEach((el) => {
      const text = el.innerText || '';
      if (bannerTexts.some((t) => text.includes(t))) {
        // Don't remove the whole banner (it has "New chat" button too)
        // Just make sure it doesn't block the input
        el.style.pointerEvents = 'none';
      }
    });
  }

  // ─── Find all relevant elements and unlock them ────────────────────────────
  function forceEnableAll() {
    // Input area
    const inputSelectors = [
      '#prompt-textarea',
      'textarea',
      'div[contenteditable]',
      'div[contenteditable="false"]',
      'div[contenteditable="true"]',
      '[data-testid="text-editor"]',
    ];

    inputSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach(unlock);
    });

    // Send button — find all disabled buttons and unlock
    document.querySelectorAll('button[disabled]').forEach((btn) => {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      const testId = btn.getAttribute('data-testid') || '';
      if (
        label.includes('send') ||
        testId.includes('send') ||
        btn.querySelector('svg') // icon-only send button
      ) {
        unlock(btn);
      }
    });

    // Also unlock ALL disabled buttons in the form area
    document.querySelectorAll('form button[disabled]').forEach(unlock);

    dismissLimitBanner();
  }

  // ─── MutationObserver: react to DOM changes ────────────────────────────────
  function startWatching() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      if (!enabled) return;

      let needsUnlock = false;

      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const el = mutation.target;
          const attr = mutation.attributeName;
          if (
            attr === 'disabled' ||
            attr === 'aria-disabled' ||
            attr === 'contenteditable'
          ) {
            unlock(el);
            needsUnlock = true;
          }
        }

        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            needsUnlock = true;
          });
        }
      }

      if (needsUnlock) forceEnableAll();
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'contenteditable', 'data-disabled', 'style'],
    });

    forceEnableAll();
  }

  function stopWatching() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // ─── Interval fallback: brute-force re-enable every 800ms ─────────────────
  // Needed because React may re-disable elements outside of DOM mutations
  function startInterval() {
    if (intervalId) return;
    intervalId = setInterval(() => {
      if (enabled) forceEnableAll();
    }, 800);
  }

  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
})();
