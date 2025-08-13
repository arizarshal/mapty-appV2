"use strict";

/* =========================
   Models (class hierarchy)
   ========================= */

class Workout {
  constructor({ _id, workout_type, distance, duration, coords, cadence, elevation_gain, created_at }) {
    this._id = _id || null;
    this.workout_type = workout_type;               // 'running' | 'cycling'
    this.distance = Number(distance);               // km
    this.duration = Number(duration);               // min
    this.coords = coords || null;                   // { latitude, longitude }
    this.cadence = cadence != null ? Number(cadence) : undefined;
    this.elevation_gain = elevation_gain != null ? Number(elevation_gain) : undefined;
    this.created_at = created_at ? new Date(created_at) : new Date();

    this.description = this._buildDescription();
  }

  _buildDescription() {
    const months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    const d = this.created_at;
    const title = this.workout_type[0].toUpperCase() + this.workout_type.slice(1);
    return `${title} on ${months[d.getMonth()]} ${d.getDate()}`;
  }
}

class Running extends Workout {
  constructor(payload) {
    super({ ...payload, workout_type: "running" });
  }
}

class Cycling extends Workout {
  constructor(payload) {
    super({ ...payload, workout_type: "cycling" });
  }
}

/* =========================
   App Controller
   ========================= */

class App {
  #map;
  #mapZoom = 13;
  #workouts = [];               // array of Workout instances
  #markersById = new Map();     // _id -> Leaflet marker
  #lastClickLatLng = null;      // Leaflet click latlng

  constructor() {
    // UI elements
    this.form = document.querySelector(".form");
    this.container = document.querySelector(".workouts");
    this.inputType = document.querySelector(".form__input--type");
    this.inputDistance = document.querySelector(".form__input--distance");
    this.inputDuration = document.querySelector(".form__input--duration");
    this.inputCadence = document.querySelector(".form__input--cadence");
    this.inputElevation = document.querySelector(".form__input--elevation");

    // Bind events
    this.form.addEventListener("submit", (e) => this.#onSubmit(e));
    this.inputType.addEventListener("change", () => this.#toggleCadenceElevation());
    this.container.addEventListener("click", (e) => this.#onWorkoutClick(e));

    // Bootstrap
    this.#getPosition();
  }

  /* ---------- Geolocation + Map ---------- */

  #getPosition() {
    if (!navigator.geolocation) {
      alert("Your browser does not support geolocation");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => this.#loadMap(pos),
      (err) => {
        console.error(err);
        alert("Could not get your location");
      }
    );
  }

  async #loadMap(position) {
    const { latitude, longitude } = position.coords;
    const userCoords = [latitude, longitude];

    this.#map = L.map("map").setView(userCoords, this.#mapZoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Show form on map click & remember where the user clicked
    this.#map.on("click", (e) => {
      this.#lastClickLatLng = e.latlng; // { lat, lng }
      this.form.classList.remove("hidden");
      this.inputDistance.focus();
    });

    // Fetch existing workouts after map is ready
    await this.#fetchAndRenderAll();
  }

  /* ---------- Form helpers ---------- */

  #toggleCadenceElevation() {
    // Show cadence for running, elevation for cycling
    const isRunning = this.inputType.value === "running";
    this.inputCadence.closest(".form__row").classList.toggle("form__row--hidden", !isRunning);
    this.inputElevation.closest(".form__row").classList.toggle("form__row--hidden", isRunning);
  }

  #resetForm() {
    this.inputDistance.value = "";
    this.inputDuration.value = "";
    this.inputCadence.value = "";
    this.inputElevation.value = "";

    this.form.style.display = "none";
    this.form.classList.add("hidden");
    setTimeout(() => (this.form.style.display = "grid"), 250);
  }

  /* ---------- API ---------- */

  async #fetchAndRenderAll() {
    try {
      const res = await fetch("/workouts");
      if (!res.ok) throw new Error(`GET /workouts failed: ${res.status}`);
      const list = await res.json();

      // Convert plain objects -> class instances
      this.#workouts = list.map((w) => {
        const base = {
          _id: w._id,
          workout_type: w.workout_type,
          distance: w.distance,
          duration: w.duration,
          coords: w.coords || w.coods, // tolerate schema typo if still present
          cadence: w.cadence,
          elevation_gain: w.elevation_gain,
          created_at: w.created_at,
        };
        return w.workout_type === "running" ? new Running(base) : new Cycling(base);
      });

      // Render list + markers
      this.#workouts.forEach((w) => {
        this.#renderWorkoutItem(w);
        this.#renderMarker(w);
      });
    } catch (err) {
      console.error(err);
      alert("Failed to fetch workouts.");
    }
  }

  async #createWorkout(payload) {
    const res = await fetch("/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`POST /workouts failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  /* ---------- Submit handler ---------- */

  async #onSubmit(e) {
    e.preventDefault();

    // Basic validation
    const type = this.inputType.value; // 'running' | 'cycling'
    const distance = Number(this.inputDistance.value);
    const duration = Number(this.inputDuration.value);
    const isFiniteNums = (...ns) => ns.every((n) => Number.isFinite(n));
    const positive = (...ns) => ns.every((n) => n > 0);

    if (!this.#lastClickLatLng) {
      alert("Click on the map to set a location first.");
      return;
    }
    const coords = {
      latitude: this.#lastClickLatLng.lat,
      longitude: this.#lastClickLatLng.lng,
    };

    if (!isFiniteNums(distance, duration) || !positive(distance, duration)) {
      alert("Distance and duration must be positive numbers.");
      return;
    }

    let payload = {
      workout_type: type,
      distance,
      duration,
      coords, // requires tiny backend addition (see note above)
    };

    if (type === "running") {
      const cadence = Number(this.inputCadence.value);
      if (!isFiniteNums(cadence) || !positive(cadence)) {
        alert("Cadence must be a positive number.");
        return;
      }
      payload.cadence = cadence;
    } else if (type === "cycling") {
      const elevation = Number(this.inputElevation.value);
      // elevation can be negative IRL, but your schema marks it required; keep non-negative for simplicity:
      if (!isFiniteNums(elevation)) {
        alert("Elevation gain must be a number.");
        return;
      }
      payload.elevation_gain = elevation;
    }

    try {
      // Save to DB
      const created = await this.#createWorkout(payload);

      // Normalize & create proper class instance
      const instanceBase = {
        _id: created._id,
        workout_type: created.workout_type,
        distance: created.distance,
        duration: created.duration,
        coords: created.coords || created.coods || coords,
        cadence: created.cadence,
        elevation_gain: created.elevation_gain,
        created_at: created.created_at,
      };
      const workout =
        created.workout_type === "running"
          ? new Running(instanceBase)
          : new Cycling(instanceBase);

      // Single source of truth
      this.#workouts.push(workout);

      // Render once
      this.#renderWorkoutItem(workout);
      this.#renderMarker(workout);

      // Done
      this.#resetForm();
    } catch (err) {
      console.error(err);
      alert("Failed to create workout.");
    }
  }

  /* ---------- Rendering ---------- */

  #renderWorkoutItem(workout) {
    const li = document.createElement("li");
    li.className = `workout workout--${workout.workout_type}`;
    li.dataset.id = workout._id || crypto.randomUUID();

    const common = `
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${workout.workout_type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    const extras =
      workout.workout_type === "running"
        ? `
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence ?? "-"}</span>
        <span class="workout__unit">spm</span>
      </div>`
        : `
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevation_gain ?? "-"}</span>
        <span class="workout__unit">m</span>
      </div>`;

    li.innerHTML = common + extras;
    this.form.insertAdjacentElement("afterend", li);
  }

  #renderMarker(workout) {
    if (!workout.coords || workout.coords.latitude == null || workout.coords.longitude == null) {
      // No coordinates → cannot render marker (backend didn’t persist coords)
      return;
    }
    const { latitude, longitude } = workout.coords;
    const marker = L.marker([latitude, longitude])
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.workout_type}-popup`,
        })
      )
      .setPopupContent(`${workout.workout_type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`)
      .openPopup();

    if (workout._id) this.#markersById.set(workout._id, marker);
  }

  /* ---------- Interactions ---------- */

  #onWorkoutClick(e) {
    const el = e.target.closest(".workout");
    if (!el) return;

    const id = el.dataset.id;
    const workout = this.#workouts.find((w) => (w._id || "") === id);
    if (!workout || !workout.coords) return;

    this.#map.setView([workout.coords.latitude, workout.coords.longitude], this.#mapZoom, {
      animate: true,
      pan: { duration: 1 },
    });

    // Optional: bounce the marker if we have it
    const m = this.#markersById.get(workout._id);
    if (m) {
      m.openPopup();
    }
  }
}

/* Bootstrap the app */
window.addEventListener("DOMContentLoaded", () => {
  new App();
});
