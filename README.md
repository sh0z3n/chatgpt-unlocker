# 🔓 ChatGPT Input Unlocker

A Chrome extension that automatically re-enables the ChatGPT input box when it gets randomly disabled — including when React re-disables it internally.

## Features

- Real-time watching via `MutationObserver`
- Intercepts React's `disabled` property setter so it can never re-apply
- Interval-based fallback scan every 800ms
- Toggle on/off from the popup
- One-click **Force Unlock** button

## Install

1. Download or clone this repo
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `chatgpt-unlocker` folder
5. Done

## Files

```
chatgpt-unlocker/
├── manifest.json
├── content.js
├── background.js
├── popup.html
├── popup.js
└── icons/
```

## License

MIT
