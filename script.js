/* Why Summer Is Warm: parameters, scenes, triggers, annotations (D3 v7 + d3-annotation) */

const W = 820, H = 460, M = { top: 20, right: 70, bottom: 46, left: 58 };
const iw = W - M.left - M.right, ih = H - M.top - M.bottom;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CITIES = ["Houston", "Los Angeles", "New York", "Chicago"];
const COLOR = { Houston: "#C0392B", "Los Angeles": "#E08A2E", "New York": "#2C7A9E", Chicago: "#3B4E8C" };
const GREY = "#C3CBD2";

const x  = d3.scaleLinear().domain([1, 12]).range([0, iw]);
const yT = d3.scaleLinear().domain([25, 100]).range([ih, 0]);   // °F
const yD = d3.scaleLinear().domain([8, 16]).range([ih, 0]);     // daylight hours

// PARAMETERS: the entire state of the visualization
const state = { scene: 1, city: "Houston", hovered: null };

// ANNOTATIONS: one template (circle + leader line + title + sentence) reused everywhere
function note(title, label, px, py, dx, dy, wrap = 190) {
  return {
    type: d3.annotationCalloutCircle,
    note: { title, label, wrap, align: "left", padding: 4, bgPadding: { top: 5, bottom: 5, left: 7, right: 7 } },
    connector: { type: "line" }, subject: { radius: 7, radiusPadding: 3 },
    x: px, y: py, dx, dy
  };
}

// SCENES: each entry fully describes that step: text, data, and its own annotations
const SCENES = {
  1: {
    title: "Temperature Follows Daylight",
    blurb: "As daylight increases from winter to summer, temperatures rise in response, creating a predictable seasonal cycle.",
    cities: ["Houston"], daylight: true, explore: false, hint: "Press Next to continue.",
    notes: () => []
  },
  2: {
    title: "Temperature Lags Behind Daylight",
    blurb: "The Earth's surface continues absorbing heat after the summer solstice, resulting in a thermal lag between daylight and temperature.",
    cities: ["Houston"], daylight: true, explore: false, hint: "Press Next to continue.",
    notes: () => [
      note("Longest Day - June", "Houston gets 14.1 hours of daylight, the most of the year.", x(6), yD(14.06), -180, 110, 160),
      note("Warmest Month - August", "94.9°F, about two months after the daylight peak.", x(8), yT(94.9), -20, 250)
    ]
  },
  3: {
    title: "Geography Changes the Temperature Response",
    blurb: "Cities at similar latitudes receive nearly the same daylight, but geography shapes how temperatures respond.",
    cities: CITIES, daylight: false, explore: false, hint: "Press Next to continue.",
    notes: () => [
      note("Los Angeles barely moves", "A 16.6°F range all year, despite a wider daylight swing than Houston's.", x(1), yT(68.0), 50, -120),
      note("Same Daylight, Different Heat", "In September, Houston and LA get almost identical daylight (12.4 hours), but Houston is at 90.4°F while LA has cooled to 83.0°F.", x(9), yT(90.4), -100, 180, 200)
    ]
  },
  4: {
    title: "Explore the Daylight-Temperature Relationship",
    blurb: "Select a city to compare its annual daylight and temperature cycles.",
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

function axisTitle(y, text) {
  return g.append("text").attr("class", "axis-title")
    .attr("transform", "rotate(-90)").attr("y", y).attr("text-anchor", "end").text(text);
}
axisTitle(-44, "Temperature (°F)");
const gYRTitle = axisTitle(iw + 56, "Daylight (hours)");

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
  d3.select(".plot").html("<p>seasons.csv did not load. Run this folder through a local web server (see README).</p>");
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

function drawDay(sel, cls, gen, colorAttr, data) {
  sel.selectAll("path").data(data).join("path")
    .attr("class", cls).attr("d", gen)
    .attr(colorAttr, d => COLOR[d[0].city]);
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
  gYRTitle.style("opacity", S.daylight ? 1 : 0);

  const dayCity = S.daylight ? (state.scene === 4 ? state.city : "Houston") : null;
  const dayData = dayCity ? [byCity.get(dayCity)] : [];
  drawDay(gArea, "dayarea", areaDay, "fill", dayData);
  drawDay(gDay, "dayline", lineDay, "stroke", dayData);

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

// legend has two rows: which cities are which color, and which line style is which measure
function drawLegend(S) {
  const cities = S.explore ? [] : S.cities.map(c => ({ label: c, color: COLOR[c] }));
  const lines = [{ label: "Temperature" }];
  if (S.daylight) lines.push({ label: "Daylight hours", dashed: true });

  d3.select("#legendCities").property("hidden", cities.length === 0)
    .selectAll("span").data(cities, d => d.label).join("span")
    .html(d => `<i class="key dot" style="background:${d.color}"></i>${d.label}`);

  d3.select("#legendLines").selectAll("span").data(lines, d => d.label).join("span")
    .html(d => `<i class="key" style="background:${d.dashed
        ? "repeating-linear-gradient(90deg,var(--ink) 0 5px,transparent 5px 9px)"
        : "var(--ink)"}"></i>${d.label}`);
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
