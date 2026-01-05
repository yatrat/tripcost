<script>
let data = null;

const DATA_URL = "https://cdn.jsdelivr.net/gh/yatrat/tricost@v4.2/trip-data.json";

fetch(DATA_URL)
  .then(r => r.json())
  .then(j => {
    data = j;
    initAutocomplete(Object.keys(data.cities));
  });

const destInput = document.getElementById("destInput");
const destSug = document.getElementById("destSug");
const daysInput = document.getElementById("daysInput");
const peopleInput = document.getElementById("peopleInput");
const directTransport = document.getElementById("directTransport");
const hubTransport = document.getElementById("hubTransport");
const hubSection = document.getElementById("hubSection");
const hubCity = document.getElementById("hubCity");
const result = document.getElementById("result");
const calcBtn = document.getElementById("calcBtn");
const shareBtn = document.getElementById("copyCompareLink");

calcBtn.onclick = calculate;
shareBtn.onclick = copyResult;

function initAutocomplete(list) {
  destInput.addEventListener("input", () => {
    const q = destInput.value.toLowerCase().replace(/\s+/g,"-");
    destSug.innerHTML = "";
    if (!q) return destSug.style.display="none";

    list.filter(c => c.startsWith(q)).slice(0,8).forEach(c=>{
      const d = document.createElement("div");
      d.textContent = c.replace(/-/g," ");
      d.onclick = ()=> {
        destInput.value = d.textContent;
        destSug.style.display="none";
        onDestinationSelected(c);
      };
      destSug.appendChild(d);
    });

    destSug.style.display = destSug.children.length ? "block" : "none";
  });
}

function calculate() {
  const destKey = destInput.value.toLowerCase().replace(/\s+/g,"-");
  const days = +daysInput.value;
  const people = +peopleInput.value;

  if (!data.cities[destKey]) return alert("Invalid destination");

  renderResult(destKey, days, people);
}

function renderResult(dest, days, people) {
  const city = data.cities[dest];
  const c = city.costs;

  let hotel = c.hostel_per_night * days;
  let food = c.food_per_person_per_day * days * people;

  let total = hotel + food;

  let html = `<h3>${dest.replace(/-/g," ")}</h3>`;
  html += `<p>🏨 Hotel: ₹${hotel}</p>`;
  html += `<p>🍽 Food: ₹${food}</p>`;

  const dt = directTransport.value.toLowerCase();
  if (dt.includes("own")) {
    html += `<p>🚗 Own vehicle — <a href="https://www.yatratools.com/p/fuel-calculator.html" target="_blank">Check fuel price</a></p>`;
  } else if (dt.includes("train") || dt.includes("flight")) {
    html += `<p>✈️ ${dt} — Please check official price. Main transport not included.</p>`;
  }

  if (city.logistics.hub_city && hubTransport.value === "bus") {
    const route1 = `${city.logistics.hub_city}-${dest}`;
    const route2 = `${dest}-${city.logistics.hub_city}`;
    const price = data.bus_prices[route1] || data.bus_prices[route2];
    if (price) {
      html += `<p>🚌 Bus via ${city.logistics.hub_city}: ₹${price * people}</p>`;
      total += price * people;
    }
  }

  html += `<hr><p><strong>Total estimate:</strong> ₹${total}</p>`;
  html += `<button onclick="toggleDetails()">Load more</button>`;
  html += `<div id="details" style="display:none;">${renderDetails(city)}</div>`;

  result.innerHTML = html;
  shareBtn.style.display="inline-block";
}

function renderDetails(city) {
  return `
    <h4>Info</h4>${renderObject(city.meta)}
    <h4>Logistics</h4>${renderObject(city.logistics)}
    <h4>Scores</h4>${renderObject(city.scores)}
  `;
}

function renderObject(obj) {
  let h="";
  for (const k in obj) {
    let v = Array.isArray(obj[k]) ? obj[k].join(", ") : obj[k];
    h += `<p><b>${k.replace(/_/g," ")}:</b> ${v}</p>`;
  }
  return h;
}

function toggleDetails() {
  const d = document.getElementById("details");
  d.style.display = d.style.display==="none" ? "block" : "none";
}

function onDestinationSelected(destKey) {
  const c = data.cities[destKey];

  if (c.logistics.hub_city) {
    hubSection.style.display="block";
    hubCity.value = c.logistics.hub_city;
    hubTransport.innerHTML = "";
    c.logistics.hub_transport.forEach(t=>{
      const o = document.createElement("option");
      o.value=t; o.textContent=t;
      hubTransport.appendChild(o);
    });
  } else {
    hubSection.style.display="none";
  }
}

function copyResult() {
  navigator.clipboard.writeText(result.innerText);
  alert("Trip details copied!");
}
</script>
