# Why Summer Is Warm

A small martini-glass narrative visualization (D3 v7 + d3-annotation) about why temperature swings track daylight and geography, ending in a scene where you pick a city and explore the numbers yourself.

`index.html`, `style.css`, `script.js` and `seasons.csv` must stay in the same folder — the page loads the CSV with a relative path. To run it locally, serve the folder (e.g. `python3 -m http.server`) and open `http://localhost:8000`; opening `index.html` directly won't load the data. To publish, push those four files to a public GitHub repo and turn on GitHub Pages (Settings → Pages → Deploy from branch `main`, root folder).

Temperatures are NOAA 1991–2020 climate normals; daylight hours are computed from each station's latitude.