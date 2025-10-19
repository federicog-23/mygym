// Simple Gym Notes app with Chart.js + localStorage
// Key structure:
// - "gym_sheets" => object mapping sheetName -> array of exercise names
// - "gym_exercise_history" => mapping exerciseKey -> [{date, weight, reps}...]

// --------- Helpers ----------
const LS_SHEETS = "gym_sheets_v1";
const LS_HISTORY = "gym_exercise_history_v1";

function loadSheets() {
  return JSON.parse(localStorage.getItem(LS_SHEETS) || "{}");
}
function saveSheets(obj) {
  localStorage.setItem(LS_SHEETS, JSON.stringify(obj));
}
function loadHistory() {
  return JSON.parse(localStorage.getItem(LS_HISTORY) || "{}");
}
function saveHistory(obj) {
  localStorage.setItem(LS_HISTORY, JSON.stringify(obj));
}

function uid(str) {
  return encodeURIComponent(str.replace(/\s+/g, "_").toLowerCase());
}

// --------- Initial demo data if empty ----------
if (!localStorage.getItem(LS_SHEETS)) {
  const demo = {
    "Lunedì - Petto": ["Panca piana", "Panca inclinata", "Croci"],
    "Martedì - Braccia": ["Curl bilanciere", "Curl manubri", "French press"],
    "Mercoledì - Dorso": ["Trazioni", "Rematore", "Lat machine"],
    "Giovedì - Spalle": ["Lento avanti", "Alzate laterali"],
    "Venerdì - Gambe": ["Squat", "Leg press", "Affondi"]
  };
  saveSheets(demo);
}

// --------- UI refs ----------
const viewMode = document.getElementById("viewMode");
const exerciseSelect = document.getElementById("exerciseSelect");
const exercisesList = document.getElementById("exercisesList");
const weightInput = document.getElementById("weightInput");
const repsInput = document.getElementById("repsInput");
const saveRecordBtn = document.getElementById("saveRecordBtn");
const newExerciseBtn = document.getElementById("newExerciseBtn");
const modal = document.getElementById("modal");
const closeModalBtn = document.getElementById("closeModalBtn");
const createExerciseBtn = document.getElementById("createExerciseBtn");
const newExerciseName = document.getElementById("newExerciseName");
const newExerciseDay = document.getElementById("newExerciseDay");
const progressCtx = document.getElementById("progressChart").getContext("2d");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Chart.js instance
let progressChart = null;

function buildViewOptions() {
  const sheets = loadSheets();
  viewMode.innerHTML = "";
  Object.keys(sheets).forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    viewMode.appendChild(opt);
  });
  // select first by default
  if (!viewMode.value && viewMode.options.length) viewMode.selectedIndex = 0;
}

function buildExerciseSelect() {
  const sheets = loadSheets();
  const selectedSheet = viewMode.value;
  exerciseSelect.innerHTML = "";
  if (!sheets[selectedSheet]) return;
  sheets[selectedSheet].forEach(ex => {
    const o = document.createElement("option");
    o.value = uid(selectedSheet + "||" + ex); // unique key
    o.textContent = ex;
    exerciseSelect.appendChild(o);
  });
  // build exercises list UI
  renderExercisesList();
  syncChart();
}

function renderExercisesList() {
  exercisesList.innerHTML = "";
  const sheets = loadSheets();
  const sheet = sheets[viewMode.value] || [];
  sheet.forEach(ex => {
    const key = uid(viewMode.value + "||" + ex);
    const hist = loadHistory()[key] || [];
    const last = hist.length ? hist[hist.length - 1] : null;
    const div = document.createElement("div");
    div.innerHTML = `<label>${ex}</label>
      <div style="text-align:right;color:var(--muted);font-size:0.9rem;">
        ${last ? `${last.weight} kg x ${last.reps}` : "—"} &nbsp;
        <button class="btn" onclick="deleteExercise('${viewMode.value}','${ex}')">Elimina</button>
      </div>`;
    exercisesList.appendChild(div);
  });
}

window.deleteExercise = function(sheetName, exName) {
  if (!confirm(`Eliminare l'esercizio "${exName}" da ${sheetName}?`)) return;
  const sheets = loadSheets();
  sheets[sheetName] = sheets[sheetName].filter(e => e !== exName);
  saveSheets(sheets);
  // remove history
  const key = uid(sheetName + "||" + exName);
  const hist = loadHistory();
  delete hist[key];
  saveHistory(hist);
  buildExerciseSelect();
};

// Save a new record (peso/reps) for selected exercise
saveRecordBtn.addEventListener("click", () => {
  const selected = exerciseSelect.value;
  if (!selected) { alert("Seleziona un esercizio."); return;}
  const weight = parseFloat(weightInput.value);
  const reps = parseInt(repsInput.value);
  if (isNaN(weight) || isNaN(reps)) { alert("Inserisci peso e ripetizioni validi."); return; }
  const hist = loadHistory();
  if (!hist[selected]) hist[selected] = [];
  hist[selected].push({ date: new Date().toISOString(), weight, reps });
  saveHistory(hist);
  weightInput.value = "";
  repsInput.value = "";
  renderExercisesList();
  syncChart();
});

// Add new exercise modal
newExerciseBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
  newExerciseName.value = "";
  newExerciseDay.value = viewMode.value || "";
});
closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
createExerciseBtn.addEventListener("click", () => {
  const name = (newExerciseName.value || "").trim();
  const day = (newExerciseDay.value || "").trim() || viewMode.value;
  if (!name || !day) { alert("Compila nome esercizio e scheda."); return; }
  const sheets = loadSheets();
  if (!sheets[day]) sheets[day] = [];
  sheets[day].push(name);
  saveSheets(sheets);
  modal.classList.add("hidden");
  buildViewOptions();
  viewMode.value = day;
  buildExerciseSelect();
});

// When sheet changed
viewMode.addEventListener("change", () => {
  buildExerciseSelect();
});

// When selected exercise changed -> update chart
exerciseSelect.addEventListener("change", () => {
  syncChart();
});

// Clear exercise history
clearHistoryBtn.addEventListener("click", () => {
  const sel = exerciseSelect.value;
  if (!sel) return;
  if (!confirm("Eliminare tutto lo storico per questo esercizio?")) return;
  const hist = loadHistory();
  delete hist[sel];
  saveHistory(hist);
  syncChart();
  renderExercisesList();
});

// Chart sync
function syncChart() {
  const sel = exerciseSelect.value;
  const histObj = loadHistory();
  const data = histObj[sel] ? histObj[sel].slice() : [];
  // transform into labels & values (by date)
  const labels = data.map(d => (new Date(d.date)).toLocaleDateString());
  const values = data.map(d => d.weight);
  if (!progressChart) {
    progressChart = new Chart(progressCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Peso (kg)',
          data: values,
          fill: false,
          tension: 0.2,
          borderWidth: 2
        }]
      },
      options: {
        scales: {
          x: { display: true },
          y: { beginAtZero: false }
        },
        plugins: {
          legend: { display: true }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  } else {
    progressChart.data.labels = labels;
    progressChart.data.datasets[0].data = values;
    progressChart.update();
  }
}

// Initial build
buildViewOptions();
buildExerciseSelect();
syncChart();
