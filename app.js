const PROFILE_KEY = "projetoescola-profile-v1";
const DATA_KEY = "projetoescola-complaints-v1";

const $ = id => document.getElementById(id);

let profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
let complaints = JSON.parse(localStorage.getItem(DATA_KEY) || "[]");

let map;
let markers = [];

function save() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(DATA_KEY, JSON.stringify(complaints));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function showApp() {

  $("register").classList.add("hidden");
  $("app").classList.remove("hidden");

  $("user").textContent = profile.name;

  $("neighborhoodLabel").textContent =
    `${profile.neighborhood}, ${profile.city}`;

  if (!map) {

    map = L.map("map").setView(
      [-14.235, -51.925],
      4
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenStreetMap contributors"
      }
    ).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

  }

  render();
}

function render() {

  $("count").textContent = complaints.length;

  markers.forEach(marker => marker.remove());

  markers = [];

  complaints.forEach(complaint => {

    const marker = L.circleMarker(
      [complaint.lat, complaint.lon],
      {
        radius: 9,
        color: "#b91c1c",
        fillColor: "#ef233c",
        fillOpacity: .9,
        weight: 2
      }
    ).addTo(map);

    marker.bindPopup(`
      <b>${escapeHtml(complaint.address)}</b>
      <p>${escapeHtml(complaint.text)}</p>
      <small>${escapeHtml(complaint.neighborhood)}</small>
    `);

    markers.push(marker);

  });

  $("list").innerHTML = complaints.length
    ? complaints
        .slice()
        .reverse()
        .map(complaint => `
          <article class="complaint">

            <strong>
              ${escapeHtml(complaint.address)}
            </strong>

            <p>
              ${escapeHtml(complaint.text)}
            </p>

            <small>
              ${new Date(complaint.createdAt).toLocaleString("pt-BR")}
            </small>

          </article>
        `)
        .join("")
    : "<p>Nenhuma reclamação registrada ainda.</p>";
}


$("registerForm").addEventListener("submit", event => {

  event.preventDefault();

  profile = {
    name: $("name").value.trim(),
    city: $("city").value.trim(),
    neighborhood: $("neighborhood").value.trim()
  };

  save();
  showApp();

});


$("change").addEventListener("click", () => {

  $("app").classList.add("hidden");
  $("register").classList.remove("hidden");

  $("name").value = profile.name;
  $("city").value = profile.city;
  $("neighborhood").value = profile.neighborhood;

});


$("complaintForm").addEventListener("submit", async event => {

  event.preventDefault();

  const button = $("submit");

  button.disabled = true;
  button.textContent = "Localizando endereço...";

  $("message").textContent = "";

  try {

    const address = $("address").value.trim();
    const text = $("text").value.trim();

    const query = encodeURIComponent(address);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`,
      {
        headers: {
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error("Falha no serviço de localização.");
    }

    const data = await response.json();

    if (!data.length) {
      throw new Error(
        "Endereço não encontrado. Tente incluir cidade e estado."
      );
    }

    const complaint = {

      id: crypto.randomUUID(),

      address,

      text,

      lat: Number(data[0].lat),

      lon: Number(data[0].lon),

      neighborhood: profile.neighborhood,

      createdAt: new Date().toISOString()

    };

    complaints.push(complaint);

    save();

    $("complaintForm").reset();

    render();

    map.setView(
      [complaint.lat, complaint.lon],
      15
    );

    $("message").textContent =
      "Reclamação adicionada ao mapa.";

  }

  catch (error) {

    $("message").textContent =
      error.message;

  }

  finally {

    button.disabled = false;
    button.textContent = "Adicionar ao mapa";

  }

});


$("clear").addEventListener("click", () => {

  if (
    confirm(
      "Apagar todas as reclamações salvas neste navegador?"
    )
  ) {

    complaints = [];

    save();

    render();

  }

});


$("locate").addEventListener("click", () => {

  if (!navigator.geolocation) {
    alert("Seu navegador não suporta localização.");
    return;
  }

  navigator.geolocation.getCurrentPosition(

    position => {

      map.setView(
        [
          position.coords.latitude,
          position.coords.longitude
        ],
        15
      );

    },

    () => {
      alert(
        "Não foi possível obter sua localização."
      );
    }

  );

});


if ("serviceWorker" in navigator) {

  navigator.serviceWorker.register("./sw.js");

}


if (profile) {
  showApp();
}
