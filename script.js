const daySelect = document.getElementById("daySelect");
const dayTitle = document.getElementById("dayTitle");
const exerciseContainer = document.getElementById("exerciseContainer");
const addExerciseBtn = document.getElementById("addExerciseBtn");
const modal = document.getElementById("modal");
const saveExerciseBtn = document.getElementById("saveExerciseBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const newExerciseName = document.getElementById("newExerciseName");

const STORAGE_KEY = "gym_notes_v2";

// Carica dati dal localStorage
function loadData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

// Salva dati
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Mostra esercizi per il giorno selezionato
function renderExercises() {
  const data = loadData();
  const day = daySelect.value;
  dayTitle.textContent = day;
  const exercises = data[day] || [];
  exerciseContainer.innerHTML = "";

  exercises.forEach((ex, index) => {
    const div = document.createElement("div");
    div.classList.add("exercise");
    div.innerHTML = `
      <div class="info"><strong>${ex.name}</strong></div>
      <div>
        <input type="number" placeholder="kg" value="${ex.weight || ""}" id="weight-${day}-${index}" />
        <input type="number" placeholder="reps" value="${ex.reps || ""}" id="reps-${day}-${index}" />
        <button class="btn primary" onclick="saveRecord('${day}', ${index})">💾</button>
        <button class="btn danger" onclick="deleteExercise('${day}', ${index})">🗑️</button>
      </div>
    `;
    exerciseContainer.appendChild(div);
  });
}

// Salva record peso/ripetizioni
function saveRecord(day, index) {
  const data = loadData();
  const ex = data[day][index];
  ex.weight = parseFloat(document.getElementById(`weight-${day}-${index}`).value);
  ex.reps = parseInt(document.getElementById(`reps-${day}-${index}`).value);
  saveData(data);
}

// Aggiungi nuovo esercizio
addExerciseBtn.addEventListener("click", () => {
  newExerciseName.value = "";
  modal.classList.remove("hidden");
});

saveExerciseBtn.addEventListener("click", () => {
  const name = newExerciseName.value.trim();
  if (!name) return alert("Inserisci un nome per l'esercizio.");
  const data = loadData();
  const day = daySelect.value;
  if (!data[day]) data[day] = [];
  data[day].push({ name, weight: null, reps: null });
  saveData(data);
  modal.classList.add("hidden");
  renderExercises();
});

closeModalBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// Elimina esercizio
function deleteExercise(day, index) {
  if (!confirm("Vuoi eliminare questo esercizio?")) return;
  const data = loadData();
  data[day].splice(index, 1);
  saveData(data);
  renderExercises();
}

// Aggiorna lista quando cambia giorno
daySelect.addEventListener("change", renderExercises);

// Avvio
renderExercises();
