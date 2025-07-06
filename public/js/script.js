const socket = io();

const map = L.map("map").setView([17.6868, 83.2185], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "Deepthi",
    detectRetina: true,
    maxZoom: 19,
}).addTo(map);

const markers = {};
let mapCentered = false;

// Fetch city, state, zip from coordinates (no landmark)
async function fetchLocationDetails(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        );
        const data = await res.json();
        const address = data.address || {};

        return {
            city: address.city || address.town || address.village || "Unknown City",
            state: address.state || "Unknown State",
            postcode: address.postcode || "Unknown Zip",
        };
    } catch (err) {
        console.error("Reverse geocoding error:", err);
        return {
            city: "Unknown City",
            state: "Unknown State",
            postcode: "Unknown Zip",
        };
    }
}

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            socket.emit("send-location", { latitude, longitude });
        },
        (error) => {
            console.error(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        }
    );
}

socket.on("receive-location", async (data) => {
    const { id, latitude, longitude } = data;
    if (!latitude || !longitude) return;

    const info = await fetchLocationDetails(latitude, longitude);

    const popupContent = `
    <b>${id === socket.id ? "You" : "User: " + id}</b><br/>
    📍 <strong>City:</strong> ${info.city}<br/>
    🏛️ <strong>State:</strong> ${info.state}<br/>
    📫 <strong>Zip:</strong> ${info.postcode}<br/>
    🌐 <strong>Lat/Lon:</strong> ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
  `;

    if (!markers[id]) {
        markers[id] = L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup(popupContent)
            .openPopup();

        if (id === socket.id && !mapCentered) {
            map.setView([latitude, longitude], 16);
            mapCentered = true;
        }
    } else {
        markers[id].setLatLng([latitude, longitude]);
        markers[id].getPopup().setContent(popupContent);
    }
});

socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});
