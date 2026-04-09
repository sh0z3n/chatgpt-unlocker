const STORAGE_KEY = "chatgpt_unlocker_enabled";

const toggleSwitch = document.getElementById("toggleSwitch");
const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const forceBtn = document.getElementById("forceBtn");

function updateUI(enabled) {
  toggleSwitch.checked = enabled;
  if (enabled) {
    statusBadge.className = "status-badge active";
    statusText.textContent = "Active — Watching";
    statusDot.classList.add("pulse");
  } else {
    statusBadge.className = "status-badge inactive";
    statusText.textContent = "Disabled";
    statusDot.classList.remove("pulse");
  }
}

// Load current state
chrome.storage.local.get([STORAGE_KEY], (result) => {
  const enabled = result[STORAGE_KEY] !== false;
  updateUI(enabled);
});

// Toggle switch
toggleSwitch.addEventListener("change", () => {
  const enabled = toggleSwitch.checked;
  chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  updateUI(enabled);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE", enabled }).catch(() => {});
    }
  });
});

// Force unlock button — sends a message to the content script instead of injecting
forceBtn.addEventListener("click", () => {
  forceBtn.textContent = "✅ Unlocked!";
  forceBtn.style.opacity = "0.7";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "FORCE_UNLOCK" }).catch(() => {});
    }
  });

  setTimeout(() => {
    forceBtn.textContent = "⚡ Force Unlock Now";
    forceBtn.style.opacity = "1";
  }, 1500);
});
