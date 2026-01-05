/* ---- helper -----*/
function makeRange(value, percent = 10) {
  const delta = Math.round(value * percent / 100);
  const min = Math.max(0, value - delta);
  const max = value + delta;
  return [min, max];
}


/* ---------- NORMALIZE URL ---------- */

function normalizeCityParam() {
  const params = new URLSearchParams(window.location.search);
  const city = params.get("city");

  if (city) {
    const norm = city.toLowerCase().replace(/\s+/g, "-");
    if (city !== norm) {
      params.set("city", norm);
      const newUrl = window.location.pathname + "?" + params.toString();
      window.history.replaceState({}, "", newUrl);
    }
  }
}

normalizeCityParam();

/* ---------- DATA ---------- */

let data = null;
const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/tripcost@v5.1/trip-data.json";

fetch(DATA_URL)
  .then(r => r.json())
  .then(j => {
    data = j;
    initAutocomplete(Object.keys(data.cities));
    applyCityFromURL();
  });

/* ---------- ELEMENTS ---------- */

const startCity = document.getElementById("startCity");
const destInput = document.getElementById("destInput");
const destSug = document.getElementById("destSug");
const daysInput = document.getElementById("daysInput");
const peopleInput = document.getElementById("peopleInput");
const result = document.getElementById("result");
const calcBtn = document.getElementById("calcBtn");

const directTransport = document.getElementById("directTransport");
const hubTransport = document.getElementById("hubTransport");
const hubSection = document.getElementById("hubSection");
const hubCity = document.getElementById("hubCity");
const directMsg = document.getElementById("directMsg");
const hubMsg = document.getElementById("hubMsg");
const shareBtn = document.getElementById("copyLink");

/* ---------- EVENTS ---------- */

calcBtn.onclick = calculate;

directTransport.onchange = () => {
  directMsg.innerHTML = transportMessage(directTransport.value);
  showHubIfApplicable();
};

hubTransport.onchange = () => {
  hubMsg.innerHTML = transportMessage(hubTransport.value);
};

/* ---------- TRANSPORT MSG ---------- */

function transportMessage(type) {
  if (type === "own_vehicle") {
    return `⛽ <a href="https://www.yatratools.com/p/fuel-calculator.html" target="_blank">Check fuel price</a>`;
  }
  if (type === "train" || type === "flight") {
    return ` Main transport not included — please check official price.`;
  }
  return "";
}

/* ---------- AUTOCOMPLETE ---------- */

function initAutocomplete(list) {
  destInput.addEventListener("input", () => {
    const q = destInput.value.toLowerCase().replace(/\s+/g, "-");
    destSug.innerHTML = "";
    if (!q) return destSug.style.display = "none";

    list.filter(c => c.startsWith(q)).slice(0, 8).forEach(c => {
      const d = document.createElement("div");
      d.textContent = c.replace(/-/g, " ");
      d.onclick = () => {
        destInput.value = d.textContent;
        destSug.style.display = "none";
        onDestinationSelected(c);
      };
      destSug.appendChild(d);
    });

    destSug.style.display = destSug.children.length ? "block" : "none";
  });
}

/* ---------- CORE ---------- */

function calculate() {
  if (!data) return alert("Data still loading...");

  const destKey = destInput.value.toLowerCase().replace(/\s+/g, "-");
const start = startCity.value.trim().toLowerCase().replace(/\s+/g,"-");
  const days = +daysInput.value;
  const people = +peopleInput.value;

  if (!data.cities[destKey]) return alert("Select valid destination");

  renderResult(destKey, start, days, people);
}

function renderResult(dest, start, days, people) {
  const city = data.cities[dest];
  if (!city.costs) {
    result.innerHTML = "<p>Cost data not available for this destination.</p>";
    result.style.display = "block";
    return;
  }
  const c = city.costs;


  const [stayMin, stayMax] = makeRange(c.hostel_per_night * days);
  const [foodMin, foodMax] = makeRange(c.food_per_person_per_day * days * people);
  const [localMin, localMax] = makeRange(c.local_transport_per_day * days);

  let busApplied = false;
  let busPrice = 0;
  let busFrom = null;

  if (city.logistics.hub_city) {
    const hub = city.logistics.hub_city;
    const price = data.bus_prices[`${hub}-${dest}`] || data.bus_prices[`${dest}-${hub}`];

    if (price && (start === hub || hubTransport.value === "bus")) {
      busApplied = true;
      busPrice = price * people;
      busFrom = hub;
    }
  }

  const [busMin, busMax] = busApplied ? makeRange(busPrice) : [0, 0];

  const totalMin = stayMin + foodMin + localMin + busMin;
  const totalMax = stayMax + foodMax + localMax + busMax;

  let html = `<div class="main-result">
    <h3>${dest.replace(/-/g," ")}</h3>
    <p>🏨 Stay: ₹${stayMin} – ₹${stayMax}</p>
    <p>🍽 Food: ₹${foodMin} – ₹${foodMax}</p>
    <p>🚌 Local transport: ₹${localMin} – ₹${localMax}</p>`;

  if (busApplied) {
    html += `<p>🚌 Bus from ${busFrom}: ₹${busMin} – ₹${busMax}</p>`;
  }

  html += `<hr>
    <p><strong>Estimate for ${people} people, ${days} days:</strong> ₹${totalMin} – ₹${totalMax}</p>
    <p class="disclaimer">* All prices are approximate and may vary based on season, availability, and booking time.</p>
  </div>`;

  html += `<div class="load-more-wrapper">
    <button onclick="toggleDetails()">Load more</button>
  </div>`;

  html += `<div id="details" class="details-section" style="display:none;">
    ${renderDetails(city)}
    <p class="disclaimer">* Destination information is indicative only and may change without notice.</p>
  </div>`;

  result.innerHTML = html;
  result.style.display = "block";
  if (shareBtn) shareBtn.style.display = "inline-block";
}

/* ---------- DETAILS ---------- */

function renderDetails(city) {
  return `
    <h4>About</h4>
    ${pick(city.meta, ["region","climate","best_for","famous_for","best_months","best_viewpoints","travel_type","off_season","peak_season","monsoon_rainfall","special_attraction"])}
    <h4>Logistics</h4>
    ${pick(city.logistics, ["nearest_airport","nearest_railway"])}
    <h4>Scores</h4>
    ${renderScores(city.scores)}
    <div class="itinerary-link-box">
      <a href="/p/itinerary-planner.html" class="itinerary-link">🗺️ Create day-wise itinerary for this trip</a>
    </div>`;
}

function renderScores(scores) {
  let h = "";
  for (let k in scores) h += `<p><b>${k.replace(/_/g," ")}:</b> ${scores[k]} / 10</p>`;
  return h;
}

function toggleDetails() {
  const d = document.getElementById("details");
  d.style.display = d.style.display === "none" ? "block" : "none";
}

function pick(obj, keys) {
  let h = "";
  keys.forEach(k => {
    if (obj[k]) {
      const v = Array.isArray(obj[k]) ? obj[k].join(", ") : obj[k];
      h += `<p><b>${k.replace(/_/g," ")}:</b> ${v}</p>`;
    }
  });
  return h;
}

/* ---------- HUB ---------- */

function onDestinationSelected() { showHubIfApplicable(); }

function showHubIfApplicable() {
  const destKey = destInput.value.toLowerCase().replace(/\s+/g,"-");
const start = startCity.value.toLowerCase().replace(/\s+/g,"-");


  if (data && data.cities[destKey]?.logistics?.hub_city) {
    const hub = data.cities[destKey].logistics.hub_city;
    if (start === hub) {
      hubSection.style.display = "none";
      hubTransport.value = "";
    } else {
      hubSection.style.display = "block";
      hubCity.value = hub;
    }
  } else {
    hubSection.style.display = "none";
    hubCity.value = "";
    hubTransport.value = "";
  }
}

/* ---------- SHARE ---------- */

setupShareButton();

function setupShareButton() {
  if (!shareBtn) return;

  let status = document.getElementById("copyStatus");
  if (!status) {
    status = document.createElement("span");
    status.id = "copyStatus";
    status.className = "copy-status";
    shareBtn.after(status);
  }

  shareBtn.onclick = async () => {
  if (!destInput.value.trim()) return;

    try {
      await navigator.clipboard.writeText(buildShareURL());
      status.textContent = "Link copied!";
      setTimeout(() => status.textContent = "", 2000);
    } catch {
      status.textContent = "Copy failed";
    }
  };
}

function buildShareURL() {
  const base = window.location.origin + window.location.pathname;
  const city = destInput.value.toLowerCase().replace(/\s+/g, "-");
  return base + "?city=" + encodeURIComponent(city);
}

/* ---------- LOAD FROM URL ---------- */

function applyCityFromURL() {
  const city = new URLSearchParams(window.location.search).get("city");
  if (!city || !data?.cities?.[city]) return;

  destInput.value = city.replace(/-/g, " ");
  showHubIfApplicable();
  calculate();
}

/* ---------- SEO ---------- */

(function injectCanonical() {
  if (!document.querySelector('link[rel="canonical"]')) {
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = window.location.origin + window.location.pathname;
    document.head.appendChild(link);
  }
})();

(function injectNoIndexIfCityParam() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("city") && !document.querySelector('meta[name="robots"]')) {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    document.head.appendChild(meta);
  }
})();
