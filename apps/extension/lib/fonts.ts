// Noto Sans HK for Chinese, from Google Fonts (served in small unicode-range slices).
// System fonts (PingFang HK, Microsoft JhengHei) take over when offline.
const href = "https://fonts.googleapis.com/css2?family=Noto+Sans+HK:wght@400;500;700&display=swap"
if (!document.querySelector(`link[href="${href}"]`)) {
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = href
  document.head.appendChild(link)
}

export {}
