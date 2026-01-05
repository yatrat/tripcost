let data = null;

const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/tripcost@v4.8/trip-data.json";

fetch(DATA_URL)
  .then(r => r.json())
  .then(j => {
    data = j;
    initAutocomplete(Object.keys(data.cities));
     applyCityFromURL();
  });

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

calcBtn.onclick = calculate;

/* ---------- TRANSPORT ---------- */

directTransport.onchange = () => {
  directMsg.innerHTML = transportMessage(directTransport.value);
  showHubIfApplicable();
};

hubTransport.onchange = () => {
  hubMsg.innerHTML = transportMessage(hubTransport.value);
};

function transportMessage(type) {
  if (type === "own_vehicle") {
    return `⛽ <a href="https://www.yatratools.com/p/fuel-calculator.html" target="_blank">Check fuel price</a>`;
  }
  if (type === "train" || type === "flight") {
    return `⚠️ Main transport not included — please check official price.`;
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
  const start = startCity.value.toLowerCase().replace(/\s+/g, "-");
  const days = +daysInput.value;
  const people = +peopleInput.value;

  if (!data.cities[destKey]) return alert("Select valid destination");

  renderResult(destKey, start, days, people);
}

function renderResult(dest, start, days, people) {
  const city = data.cities[dest];
  const c = city.costs;

  let total =
    (c.hostel_per_night * days) +
    (c.food_per_person_per_day * days * people) +
    (c.local_transport_per_day * days);

  let busApplied = false;
  let busPrice = null;
  let busFrom = null;

  if (city.logistics.hub_city) {
    const hub = city.logistics.hub_city;
    const price = data.bus_prices[`${hub}-${dest}`] || data.bus_prices[`${dest}-${hub}`];

    if (price && (start === hub || hubTransport.value === "bus")) {
      busApplied = true;
      busPrice = price;
      busFrom = hub;
    }
  }

  if (busApplied) total += busPrice * people;

  let html = `<div class="main-result">
    <h3>${dest.replace(/-/g," ")}</h3>
    <p>🏨 Stay: ₹${c.hostel_per_night} per night</p>
    <p>🍽 Food: ₹${c.food_per_person_per_day} per person / day</p>
    <p>🚌 Local transport: ₹${c.local_transport_per_day} per day</p>`;

  if (busApplied) {
    html += `<p>🚌 Bus from ${busFrom}: ₹${busPrice} per person</p>`;
  }

  html += `<hr><p><strong>Estimate for ${people} people, ${days} days:</strong> ₹${total}</p>`;
  html += `</div>`;

  html += `<div class="load-more-wrapper">
    <button id="loadMoreBtn" onclick="toggleDetails()">Load more</button>
  </div>`;

  html += `<div id="details" class="details-section" style="display:none;">
    ${renderDetails(city)}
  </div>`;

  result.innerHTML = html;
  result.style.display = "block";
  shareBtn.style.display = "inline-block";
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
      <a href="/p/itinerary-planner.html" class="itinerary-link">
        🗺️ Create day-wise itinerary for this trip
      </a>
    </div>
  `;
}

function renderScores(scores) {
  let h = "";
  for (let k in scores) {
    h += `<p><b>${k.replace(/_/g," ")}:</b> ${scores[k]} / 10</p>`;
  }
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
      let v = Array.isArray(obj[k]) ? obj[k].join(", ") : obj[k];
      h += `<p><b>${k.replace(/_/g," ")}:</b> ${v}</p>`;
    }
  });
  return h;
}

/* ---------- HUB ---------- */

function onDestinationSelected(destKey) {
  showHubIfApplicable();
}

function showHubIfApplicable() {
  const destKey = destInput.value.toLowerCase().replace(/\s+/g,"-");
  const start = startCity.value.toLowerCase().replace(/\s+/g,"-");

  if (data && data.cities[destKey] && data.cities[destKey].logistics.hub_city) {
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
/* ---------- SHARE LINK ---------- */

setupShareButton();

function setupShareButton() {
  const btn = document.getElementById("copyLink");
  if (!btn) return;

  let status = document.getElementById("copyStatus");
  if (!status) {
    status = document.createElement("span");
    status.id = "copyStatus";
    status.className = "copy-status";
    btn.after(status);
  }

  btn.onclick = async () => {
    const url = buildShareURL();

    try {
      await navigator.clipboard.writeText(url);
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

/* ---------- LOAD FROM SHORT LINK ---------- */

function applyCityFromURL() {
  const params = new URLSearchParams(window.location.search);
  const city = params.get("city");
  if (!city || !data || !data.cities[city]) return;

  destInput.value = city.replace(/-/g, " ");
  showHubIfApplicable();
  calculate();
}
