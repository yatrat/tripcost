let data = null;

const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/tripcost@v4.5/trip-data.json";

fetch(DATA_URL)
  .then(r => r.json())
  .then(j => {
    data = j;
    initAutocomplete(Object.keys(data.cities));
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
const shareBtn = document.getElementById("copyCompareLink");

calcBtn.onclick = calculate;

/* ---------- TRANSPORT LOGIC ---------- */

directTransport.onchange = () => {
  directMsg.innerHTML = transportMessage(directTransport.value);

  if (directTransport.value === "own_vehicle") {
    hubSection.style.display = "none";
    hubTransport.value = "";
  } else {
    showHubIfApplicable();
  }
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
  if (type === "bus") {
    return `🚌 Bus price will be added automatically if available.`;
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

/* ---------- CORE LOGIC ---------- */

function calculate() {
  if (!data) return alert("Data still loading...");

  const destKey = destInput.value.toLowerCase().replace(/\s+/g, "-");
  const start = startCity.value.toLowerCase();
  const days = +daysInput.value;
  const people = +peopleInput.value;

  if (!data.cities[destKey]) return alert("Select valid destination");

  // Illogical combos
  if (directTransport.value === "own_vehicle" && hubTransport.value) {
    alert("If you use own vehicle directly, hub transport is not applicable.");
    return;
  }

  if ((directTransport.value === "flight" || directTransport.value === "train") && hubTransport.value === "own_vehicle") {
    alert("You cannot fly/train and then use your own vehicle at the hub.");
    return;
  }

  renderResult(destKey, start, days, people);
}

function renderResult(dest, start, days, people) {
  const city = data.cities[dest];
  const c = city.costs;

  let total =
    (c.hostel_per_night * days) +
    (c.food_per_person_per_day * days * people) +
    (c.local_transport_per_day * days);

  let hubAutoApplied = false;

  if (city.logistics.hub_city) {
    const hub = city.logistics.hub_city;
    const startNorm = start.replace(/\s+/g, "-");

    // Auto include bus if start === hub
    if (startNorm === hub) {
      const price = data.bus_prices[`${hub}-${dest}`] || data.bus_prices[`${dest}-${hub}`];
      if (price) {
        total += price * people;
        hubAutoApplied = true;
      }
    }

    // Normal hub bus selection
    if (!hubAutoApplied && hubTransport.value === "bus") {
      const price = data.bus_prices[`${hub}-${dest}`] || data.bus_prices[`${dest}-${hub}`];
      if (price) total += price * people;
    }
  }

  let html = `<h3>${dest.replace(/-/g," ")}</h3>`;
  html += `<p>🏨 Stay: ₹${c.hostel_per_night} per night</p>`;
  html += `<p>🍽 Food: ₹${c.food_per_person_per_day} per person / day</p>`;
  html += `<p>🚌 Local transport: ₹${c.local_transport_per_day} per day</p>`;

  if (hubAutoApplied) {
    html += `<p>🚌 Bus from ${city.logistics.hub_city} included automatically</p>`;
  }

  html += `<hr><p><strong>Estimate for ${people} people, ${days} days:</strong> ₹${total}</p>`;
  html += `<button onclick="toggleDetails()">Load more</button>`;
  html += `<div id="details" style="display:none;margin-top:10px;">${renderDetails(city)}</div>`;

  result.innerHTML = html;
  result.style.display = "block";
  shareBtn.style.display = "inline-block";
}

/* ---------- DETAILS ---------- */

function renderDetails(city) {
  return `
    <h4>About</h4>
    ${pick(city.meta, ["region","climate","best_for","famous_for","best_months","best_viewpoints","travel_type","off_season","peak_season","monsoon_rainfall","special_attraction",])}
    <h4>Logistics</h4>
    ${pick(city.logistics, ["nearest_airport","nearest_railway"])}
    <h4>Scores</h4>
    ${renderObject(city.scores)}
  `;
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

function renderObject(obj) {
  let h = "";
  for (let k in obj) {
    h += `<p><b>${k.replace(/_/g," ")}:</b> ${obj[k]}</p>`;
  }
  return h;
}

/* ---------- HUB DISPLAY ---------- */

function onDestinationSelected(destKey) {
  const city = data.cities[destKey];

  if (city.logistics.hub_city && directTransport.value !== "own_vehicle") {
    hubSection.style.display = "block";
    hubCity.value = city.logistics.hub_city;
  } else {
    hubSection.style.display = "none";
    hubCity.value = "";
    hubTransport.value = "";
  }
}

function showHubIfApplicable() {
  const destKey = destInput.value.toLowerCase().replace(/\s+/g,"-");
  if (data && data.cities[destKey] && data.cities[destKey].logistics.hub_city) {
    hubSection.style.display = "block";
    hubCity.value = data.cities[destKey].logistics.hub_city;
  }
}
