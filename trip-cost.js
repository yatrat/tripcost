
let data = null;

const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/tripcost@v4/trip-data.json";

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
const shareBtn = document.getElementById("copyCompareLink");

const directTransport = document.getElementById("directTransport");
const hubTransport = document.getElementById("hubTransport");
const hubSection = document.getElementById("hubSection");
const hubCity = document.getElementById("hubCity");

calcBtn.onclick = calculate;
shareBtn.onclick = copyResult;

function makeRange(value, percent = 10) {
  const d = Math.round(value * percent / 100);
  return [value - d, value + d];
}

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

function calculate() {
  if (!data) return alert("Data loading...");

  const destKey = destInput.value.toLowerCase().replace(/\s+/g, "-");
  const days = +daysInput.value;
  const people = +peopleInput.value;

  if (!data.cities[destKey]) return alert("Invalid destination");

  renderResult(destKey, days, people);
}

function renderResult(dest, days, people) {
  const city = data.cities[dest];
  const c = city.costs;

  const [hotelMin, hotelMax] = makeRange(c.hostel_per_night * days);
  const [foodMin, foodMax] = makeRange(c.food_per_person_per_day * days * people);

  let minTotal = hotelMin + foodMin;
  let maxTotal = hotelMax + foodMax;

  let html = `<h3>${dest.replace(/-/g," ")}</h3>`;
  html += `<p>🏨 Hotel: ₹${hotelMin}–₹${hotelMax}</p>`;
  html += `<p>🍽 Food: ₹${foodMin}–₹${foodMax}</p>`;

  const dt = directTransport.value.toLowerCase();
  if (dt.includes("own")) {
    html += `<p>🚗 Own vehicle — <a href="https://www.yatratools.com/p/fuel-calculator.html" target="_blank">Check fuel price</a></p>`;
  } else if (dt.includes("train") || dt.includes("flight")) {
    html += `<p>✈️ ${dt} — Please check official price. Main transport not included.</p>`;
  }

  if (city.logistics.hub_city && hubTransport.value) {
    const ht = hubTransport.value.toLowerCase();
    if (ht.includes("own")) {
      html += `<p>🚗 Via ${city.logistics.hub_city} — <a href="https://www.yatratools.com/p/fuel-calculator.html" target="_blank">Check fuel price</a></p>`;
    } else if (ht.includes("train") || ht.includes("flight")) {
      html += `<p>✈️ Via ${city.logistics.hub_city} — Please check official price. Main transport not included.</p>`;
    } else if (ht === "bus") {
      const price = data.bus_prices[`${city.logistics.hub_city}-${dest}`];
      if (price) {
        const [busMin, busMax] = makeRange(price * people);
        html += `<p>🚌 Bus via ${city.logistics.hub_city}: ₹${busMin}–₹${busMax}</p>`;
        minTotal += busMin;
        maxTotal += busMax;
      }
    }
  }

  html += `<hr>`;
  html += `<p><strong>Total estimate:</strong> ₹${minTotal}–₹${maxTotal}</p>`;
  html += `<p class="disclaimer">* Approximate only</p>`;

  html += `<button onclick="toggleDetails()">Load more</button>`;
  html += `<div id="details" style="display:none;margin-top:8px;">${renderAllDetails(city)}</div>`;

  result.innerHTML = html;
  shareBtn.style.display = "inline-block";
}

function renderAllDetails(city) {
  return `
    <h4>Meta</h4>${renderObject(city.meta)}
    <h4>Logistics</h4>${renderObject(city.logistics)}
    <h4>Scores</h4>${renderObject(city.scores)}
  `;
}

function renderObject(obj) {
  let html = "";
  for (const k in obj) {
    const label = k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
    const v = Array.isArray(obj[k]) ? obj[k].join(", ") : obj[k];
    html += `<p><b>${label}:</b> ${v}</p>`;
  }
  return html;
}

function toggleDetails() {
  const d = document.getElementById("details");
  d.style.display = d.style.display === "none" ? "block" : "none";
}

function onDestinationSelected(destKey) {
  const c = data.cities[destKey];

  if (c.logistics.hub_city) {
    hubSection.style.display = "block";
    hubCity.value = c.logistics.hub_city;

    hubTransport.innerHTML = "";
    c.logistics.hub_transport.forEach(t => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      hubTransport.appendChild(o);
    });
  } else {
    hubSection.style.display = "none";
  }
}

function copyResult() {
  navigator.clipboard.writeText(result.innerText).then(() => {
    alert("Trip details copied!");
  });
}
