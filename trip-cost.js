let data = null;

const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/tripcost@v4.4/trip-data.json";

fetch(DATA_URL)
  .then(r => r.json())
  .then(j => {
    data = j;
    initAutocomplete(Object.keys(data.cities));
  })
  .catch(err => {
    console.error("Failed to load JSON", err);
    alert("Data failed to load");
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

directTransport.onchange = () => {
  directMsg.innerHTML = transportMessage(directTransport.value);
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

function initAutocomplete(list) {
  destInput.addEventListener("input", () => {
    const q = destInput.value.toLowerCase();
    destSug.innerHTML = "";
    if (!q) return destSug.style.display = "none";

    const matches = list.filter(c => c.startsWith(q)).slice(0, 10);

    matches.forEach(c => {
      const d = document.createElement("div");
      d.textContent = c.replace(/-/g, " ");
      d.onclick = () => {
        destInput.value = d.textContent;
        destSug.style.display = "none";
        onDestinationSelected(c);
      };
      destSug.appendChild(d);
    });

    destSug.style.display = matches.length ? "block" : "none";
  });

  document.addEventListener("click", e => {
    if (!destSug.contains(e.target) && e.target !== destInput) {
      destSug.style.display = "none";
    }
  });
}

function calculate() {
  if (!data) return alert("Data still loading...");

  const destKey = destInput.value.toLowerCase().replace(/\s+/g, "-");
  const days = Number(daysInput.value);
  const people = Number(peopleInput.value);

  if (!data.cities[destKey]) return alert("Select valid destination");
  if (!Number.isInteger(days) || days < 1 || days > 30) return alert("Days must be 1–30");
  if (!Number.isInteger(people) || people < 1 || people > 10) return alert("People must be 1–10");

  renderResult(destKey, days, people);
}

function renderResult(dest, days, people) {
  const city = data.cities[dest];
  const c = city.costs;

  let total =
    (c.hostel_per_night * days) +
    (c.food_per_person_per_day * days * people) +
    (c.local_transport_per_day * days);

  if (hubTransport.value === "bus" && city.logistics.hub_city) {
    const a = city.logistics.hub_city;
    const b = dest;
    const price = data.bus_prices[`${a}-${b}`] || data.bus_prices[`${b}-${a}`];
    if (price) total += price * people;
  }

  let html = `<h3>${dest.replace(/-/g," ")}</h3>`;
  html += `<p>🏨 Stay: ₹${c.hostel_per_night} per night</p>`;
  html += `<p>🍽 Food: ₹${c.food_per_person_per_day} per person / day</p>`;
  html += `<p>🚌 Local transport: ₹${c.local_transport_per_day} per day</p>`;
  html += `<hr>`;
  html += `<p><strong>Estimate for ${people} people, ${days} days:</strong> ₹${total}</p>`;
  html += `<button onclick="toggleDetails()">Load more</button>`;
  html += `<div id="details" style="display:none;margin-top:10px;">${renderDetails(city)}</div>`;

  result.innerHTML = html;
  result.style.display = "block";
  shareBtn.style.display = "inline-block";
}

function renderDetails(city) {
  return `
    <h4>About</h4>
    ${pick(city.meta, ["region","climate","best_for","famous_for","best_months"])}
    <h4>Logistics</h4>
    ${pick(city.logistics, ["nearest_airport","nearest_railway","hub_city"])}
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

function onDestinationSelected(destKey) {
  const city = data.cities[destKey];

  if (city.logistics.hub_city) {
    hubSection.style.display = "block";
    hubCity.value = city.logistics.hub_city;
  } else {
    hubSection.style.display = "none";
  }
}
