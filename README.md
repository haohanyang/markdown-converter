# Markdown Link Converter

A static page that converts relative links and image paths in markdown to full URLs, based on the URL of the page the markdown came from.

- `[Configuration](/en-us/dotnet/config)` becomes `[Configuration](<root-url>/en-us/dotnet/config)`
- `[Tutorial](tutorial)` becomes `[Tutorial](<markdown-url>/tutorial)`

It also has a sanitized preview and a copy button. There is no build step.

## Run locally

Open `index.html`, or run `python -m http.server` and visit http://localhost:8000.

## Deploy to GitHub Pages

Push to GitHub, then go to Settings → Pages → Deploy from branch → `main` / root.
