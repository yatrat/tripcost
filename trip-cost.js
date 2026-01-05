<script>
let data = null;

const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/tripcost//itinerary-data.json";

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

calcBtn.onclick = calculate;

function makeRange(value, percent = 10) {
  const delta = Math.round(value * percent / 100);
  return [value - delta, value + delta];
}

function initAutocomplete(list) {
  destInput.addEventListener("input", () => {
    const q = destInput.value.toLowerCase().replace(/\s+/g, "-");
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

  const start = startCity.value;
  const destKey = destInput.value.toLowerCase().replace(/\s+/g, "-");
  const days = Number(daysInput.value);
  const people = Number(peopleInput.value);

  if (!start) return alert("Select start city");
  if (!data.cities[destKey]) return alert("Select valid destination");
  if (!Number.isInteger(days) || days < 1 || days > 30) return alert("Days must be 1–30");
  if (!Number.isInteger(people) || people < 1 || people > 10) return alert("People must be 1–10");

  renderResult(start, destKey, days, people);
}

function renderResult(start, dest, days, people) {
  const city = data.cities[dest];

  const [hotelMin, hotelMax] = makeRange(city.costs.hostel_per_night * days);
  const [foodMin, foodMax] = makeRange(city.costs.food_per_person_per_day * days * people);

  let minTotal = hotelMin + foodMin;
  let maxTotal = hotelMax + foodMax;

  let html = `<h3>${dest.replace(/-/g," ")}</h3>`;

  html += `<p>🏨 Hotel cost: ₹${hotelMin}–₹${hotelMax} for ${days} days</p>`;
  html += `<p>🍽 Food cost: ₹${foodMin}–₹${foodMax} for ${people} people for ${days} days</p>`;

  const dt = directTransport.value;
  if (dt === "own_vehicle") {
    html += `<p>🚗 Travel: Own vehicle — <a href="/p/fuel-calculator.html">use fuel calculator</a></p>`;
  } else {
    html += `<p>✈️ Travel: ${dt || "—"} — check official site</p>`;
  }

  if (city.logistics.hub_city && hubTransport.value === "bus") {
    const route = `${city.logistics.hub_city}-${dest}`;
    const base = data.bus_prices[route];

    if (base) {
      const [busMin, busMax] = makeRange(base * people);
      html += `<p>🚌 Bus via ${city.logistics.hub_city}: ₹${busMin}–₹${busMax} for ${people} people</p>`;
      minTotal += busMin;
      maxTotal += busMax;
    }
  }

  html += `<hr>`;
  html += `<p><strong>Total rough estimate for ${people} people for ${days} days trip:</strong> ₹${minTotal}–₹${maxTotal}</p>`;
  html += `<p class="disclaimer">* All prices are approximate and may vary based on season, availability, and booking time.</p>`;

  html += `<button onclick="toggleDetails()">Load more</button>`;
  html += `<div id="details" style="display:none;margin-top:8px;">${renderDetails(city.meta)}</div>`;

  result.innerHTML = html;
  result.style.display = "block";
}

function renderDetails(meta) {
  return `
    <p><b>Region:</b> ${meta.region}</p>
    <p><b>Climate:</b> ${meta.climate}</p>
    <p><b>Best for:</b> ${meta.best_for.join(", ")}</p>
    <p><b>Famous for:</b> ${meta.famous_for.join(", ")}</p>
    <p><b>Best months:</b> ${meta.best_months.join(", ")}</p>
  `;
}

function toggleDetails() {
  const d = document.getElementById("details");
  d.style.display = d.style.display === "none" ? "block" : "none";
}

function onDestinationSelected(destKey) {
  const c = data.cities[destKey];

  directTransport.innerHTML = "";
  (c.logistics.direct_transport || []).forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    directTransport.appendChild(opt);
  });

  if (c.logistics.hub_city) {
    hubSection.style.display = "block";
    hubCity.value = c.logistics.hub_city;

    hubTransport.innerHTML = "";
    (c.logistics.hub_transport || []).forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      hubTransport.appendChild(opt);
    });
  } else {
    hubSection.style.display = "none";
  }
}
</script>
