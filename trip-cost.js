let data = null;

const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/tripcost@v4.3/trip-data.json";

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
  if (!data.cities[destKey]) return alert("Invalid destination");

  const days = +daysInput.value;
  const people = +peopleInput.value;

  renderResult(destKey, days, people);
}

function renderResult(dest, days, people) {
  const city = data.cities[dest];
  const c = city.costs;

  const stay = c.hostel_per_night;
  const food = c.food_per_person_per_day;
  const local = c.local_transport_per_day || 0;

  let total = (stay * days) + (food * days * people) + (local * days);

  let html = `<h3>${dest.replace(/-/g," ")}</h3>`;
  html += `<p>🏨 Stay: ₹${stay} per night</p>`;
  html += `<p>🍽 Food: ₹${food} per person / day</p>`;
  html += `<p>🚌 Local transport: ₹${local} per day</p>`;

  // Direct transport info
  const dt = directTransport.value.toLowerCase();
  if (dt.includes("own")) {
    html += `<p>🚗 Own vehicle — <a href="https://www.yatratools.com/p/fuel-calculator.html" target="_blank">Check fuel price</a></p>`;
  } else if (dt.includes("train") || dt.includes("flight")) {
    html += `<p>✈️ ${dt} — Please check official price. Main transport not included.</p>`;
  }

  // Hub transport
  if (city.logistics.hub_city && hubTransport.value) {
    const hub = city.logistics.hub_city;
    const ht = hubTransport.value.toLowerCase();

    if (ht.includes("own")) {
      html += `<p>🚗 Via ${hub} — <a href="https://www.yatratools.com/p/fuel-calculator.html" target="_blank">Check fuel price</a></p>`;
    } else if (ht.includes("train") || ht.includes("flight")) {
      html += `<p>✈️ Via ${hub} — Please check official price. Main transport not included.</p>`;
    } else if (ht === "bus") {
      const r1 = `${hub}-${dest}`;
      const r2 = `${dest}-${hub}`;
      const price = data.bus_prices[r1] || data.bus_prices[r2];

      if (price) {
        const busCost = price * people;
        total += busCost;
        html += `<p>🚌 Bus via ${hub}: ₹${price} per person</p>`;
      }
    }
  }

  html += `<hr><p><strong>Estimate for ${people} people, ${days} days:</strong> ₹${total}</p>`;
  html += `<button onclick="toggleDetails()">Load more</button>`;
  html += `<div id="details" style="display:none;margin-top:10px;">${renderDetails(city)}</div>`;

  result.innerHTML = html;
  shareBtn.style.display = "inline-block";
}

function renderDetails(city) {
  return `
    <h4>About this place</h4>
    ${pick(city.meta, ["region","climate","best_for","famous_for","best_months"])}

    <h4>Logistics</h4>
    ${renderObject(city.logistics)}

    <h4>Scores</h4>
    ${renderObject(city.scores)}
  `;
}

function renderObject(obj) {
  let html = "";
  for (const k in obj) {
    const v = Array.isArray(obj[k]) ? obj[k].join(", ") : obj[k];
    html += `<p><b>${k.replace(/_/g," ")}:</b> ${v}</p>`;
  }
  return html;
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

function toggleDetails() {
  const d = document.getElementById("details");
  d.style.display = d.style.display === "none" ? "block" : "none";
}

function onDestinationSelected(destKey) {
  const city = data.cities[destKey];

  if (city.logistics.hub_city) {
    hubSection.style.display = "block";
    hubCity.value = city.logistics.hub_city;
    hubTransport.innerHTML = `<option value="">Select hub transport</option>`;
    city.logistics.hub_transport.forEach(t => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t.replace(/_/g," ");
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
