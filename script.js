/* Why Summer Is Warm — parameters, scenes, triggers, annotations (D3 v7 + d3-annotation) */

const W = 820, H = 460, M = { top: 20, right: 60, bottom: 46, left: 52 };
const iw = W - M.left - M.right, ih = H - M.top - M.bottom;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CITIES = ["Houston", "Los Angeles", "New York", "Chicago"];
const COLOR = { Houston: "#C0392B", "Los Angeles": "#E08A2E", "New York": "#2C7A9E", Chicago: "#3B4E8C" };
const GREY = "#C3CBD2";

const x  = d3.scaleLinear().domain([1, 12]).range([0, iw]);
const yT = d3.scaleLinear().domain([25, 100]).range([ih, 0]);   // °F
const yD = d3.scaleLinear().domain([8, 16]).range([ih, 0]);     // daylight hours

// PARAMETERS — the entire state of the visualization
const state = { scene: 1, city: "Houston", hovered: null };

// ANNOTATIONS — one template (circle + leader line + title + sentence) reused everywhere
function note(title, label, px, py, dx, dy, wrap = 190) {
  return {
    type: d3.annotationCalloutCircle,
    note: { title, label, wrap, align: "left", padding: 4, bgPadding: { top: 5, bottom: 5, left: 7, right: 7 } },
    connector: { type: "line" }, subject: { radius: 7, radiusPadding: 3 },
    x: px, y: py, dx, dy
  };
}

// SCENES — each entry fully describes that step: text, data, and its own annotations
const SCENES = {
  1: {
    title: "Houston has one cycle a year",
    blurb: "The average daily high climbs from winter to late summer and falls back again.",
    cities: ["Houston"], daylight: false, explore: false, hint: "Press Next to continue.",
    notes: () => [
      note("August is the peak", "94.9°F — 31 degrees warmer than January.", x(8), yT(94.9), 6, 175),
      note("January is the floor", "63.8°F. From here the curve only climbs for seven months.", x(1), yT(63.8), 34, 118)
    ]
  },
  2: {
    title: "Daylight makes the same wave — but earlier",
    blurb: "Daylight follows an identical rhythm, yet the hottest month comes two months after the longest day.",
    cities: ["Houston"], daylight: true, explore: false, hint: "Press Next to continue.",
    notes: () => [
      note("Daylight peaks in June", "Houston's longest day gives it 14.1 hours of light.", x(6), yD(14.06), 230, -72, 150),
      note("The heat peaks two months later", "Ground and water keep absorbing warmth even as days shorten.", x(8), yT(94.9), -20, 250)
    ]
  },
  3: {
    title: "Every city, same shape — very different size",
    blurb: "All four peak in summer and bottom out in winter, but how far they swing depends on geography, not just latitude.",
    cities: CITIES, daylight: false, explore: false, hint: "Press Next to continue.",
    notes: () => [
      note("Los Angeles barely moves", "A 16.6°F range all year, despite a wider daylight swing than Houston's.", x(1), yT(68.0), 50, -120),
      note("Chicago swings 53°F", "31.6°F in January to 84.5°F in July — the widest range of the four.", x(1), yT(31.6), 470, -22)
    ]
  },
  4: {
    title: "Now look for yourself",
    blurb: "Pick a city to compare its temperature curve to its own daylight curve, and hover any point for the numbers.",
    cities: CITIES, daylight: true, explore: true, hint: "Pick a city, then hover any point on the line.",
    notes: () => {
      const rows = byCity.get(state.city);
      const hot = d3.greatest(rows, d => d.avg_high_f), cold = d3.least(rows, d => d.avg_high_f);
      return [note(state.city,
        `Warmest in ${hot.month} at ${f1(hot.avg_high_f)}°F, coldest in ${cold.month} at ${f1(cold.avg_high_f)}°F.`,
        x(hot.month_num), yT(hot.avg_high_f), -120, 150, 210)];
    }
  }
};

const svg = d3.select("#chart").attr("viewBox", `0 0 ${W} ${H}`);
const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
const gArea = g.append("g"), gDay = g.append("g"), gTemp = g.append("g"), gDots = g.append("g"), gAnno = g.append("g");
const gX = g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`);
const gYL = g.append("g").attr("class", "axis");
const gYR = g.append("g").attr("class", "axis").attr("transform", `translate(${iw},0)`);

gYL.call(d3.axisLeft(yT).ticks(6));
gX.call(d3.axisBottom(x).tickValues(d3.range(1, 13)).tickFormat(m => MONTHS[m - 1]));

const lineTemp = d3.line().x(d => x(d.month_num)).y(d => yT(d.avg_high_f)).curve(d3.curveMonotoneX);
const lineDay  = d3.line().x(d => x(d.month_num)).y(d => yD(d.daylight_hours)).curve(d3.curveMonotoneX);
const areaDay  = d3.area().x(d => x(d.month_num)).y0(ih).y1(d => yD(d.daylight_hours)).curve(d3.curveMonotoneX);

const tip = d3.select("#tip");
const f1 = d3.format(".1f");
let byCity;

d3.csv("seasons.csv", d3.autoType).then(rows => {
  byCity = d3.group(rows, d => d.city);
  buildChips();
  render();
}).catch(() => {
  d3.select(".plot").html("<p>seasons.csv did not load — run this folder through a local web server (see README).</p>");
});

// TRIGGERS
d3.select("#next").on("click", () => go(state.scene + 1));
d3.select("#back").on("click", () => go(state.scene - 1));

function go(n) {
  state.scene = Math.max(1, Math.min(4, n));
  hideTip();
  render();
}

function buildChips() {
  d3.select("#chips").selectAll("button").data(CITIES).join("button")
    .attr("class", "chip").attr("type", "button")
    .html(c => `<span class="key" style="background:${COLOR[c]}"></span>${c}`)
    .on("click", (e, c) => { state.city = c; hideTip(); render(); });   // trigger
}

// true once a city is selected (scene 4) and this line isn't it
const dim = c => state.scene === 4 && c !== state.city;

function drawDay(sel, cls, gen, data) {
  sel.selectAll("path").data(data).join("path").attr("class", cls).attr("d", gen);
}

function render() {
  const S = SCENES[state.scene];

  d3.select("#sceneNo").text(`Scene ${state.scene} of 4`);
  d3.select("#sceneTitle").text(S.title);
  d3.select("#sceneBlurb").text(S.blurb);
  d3.select("#hint").text(S.hint);
  d3.select("#back").property("disabled", state.scene === 1);
  d3.select("#next").property("disabled", state.scene === 4);
  d3.select("#explore").property("hidden", !S.explore);
  d3.selectAll(".chip").attr("aria-pressed", c => c === state.city);

  gYR.style("opacity", S.daylight ? 1 : 0).call(d3.axisRight(yD).ticks(5));

  const dayCity = S.daylight ? (state.scene === 4 ? state.city : "Houston") : null;
  const dayData = dayCity ? [byCity.get(dayCity)] : [];
  drawDay(gArea, "dayarea", areaDay, dayData);
  drawDay(gDay, "dayline", lineDay, dayData);

  gTemp.selectAll("path").data(S.cities, c => c).join("path")
    .attr("class", "tline")
    .attr("d", c => lineTemp(byCity.get(c)))
    .attr("stroke", c => dim(c) ? GREY : COLOR[c])
    .attr("stroke-width", c => c === state.city && state.scene === 4 ? 3 : dim(c) ? 1.5 : 3)
    .style("opacity", c => dim(c) ? 0.6 : 1);

  const dots = state.scene === 4 ? byCity.get(state.city) : [];
  gDots.selectAll("circle").data(dots, d => d.month_num).join("circle")
    .attr("class", "dot").attr("r", 5)
    .attr("cx", d => x(d.month_num)).attr("cy", d => yT(d.avg_high_f))
    .attr("fill", d => COLOR[d.city])
    .on("mouseenter", showTip).on("mousemove", showTip).on("mouseleave", hideTip);   // trigger

  gAnno.selectAll("*").remove();
  gAnno.call(d3.annotation().annotations(S.notes()));

  drawLegend(S);
}

function drawLegend(S) {
  const items = S.cities.map(c => ({ label: c, color: COLOR[c] }));
  if (S.daylight) items.push({ label: "Daylight hours", dashed: true });
  d3.select("#legend").selectAll("span").data(items, d => d.label).join("span")
    .html(d => (d.dashed ? `<i class="key dashed"></i>` : `<i class="key" style="background:${d.color}"></i>`) + d.label);
}

function showTip(event, d) {
  state.hovered = d;
  const k = document.querySelector(".plot").clientWidth / W;
  tip.style("left", (M.left + x(d.month_num)) * k + "px")
     .style("top", (M.top + yT(d.avg_high_f)) * k + "px")
     .style("opacity", 1)
     .html(`<b>${d.city} &middot; ${d.month}</b>${f1(d.avg_high_f)}°F high<br>${f1(d.daylight_hours)}h daylight`);
}

function hideTip() {
  state.hovered = null;
  tip.style("opacity", 0);
}
