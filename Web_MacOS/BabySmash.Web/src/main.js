const shapeTypes = [
  "circle",
  "oval",
  "rectangle",
  "square",
  "triangle",
  "hexagon",
  "trapezoid",
  "star",
  "heart"
];

const colors = [
  { name: "Red", value: "#ff5757" },
  { name: "Green", value: "#2cb67d" },
  { name: "Blue", value: "#4a7cff" },
  { name: "Orange", value: "#ff9448" },
  { name: "Purple", value: "#9b5de5" },
  { name: "Yellow", value: "#f4cc2f" },
  { name: "Pink", value: "#ff7eb6" }
];

const settingsDefaults = {
  Sounds: "Speech",
  FadeAway: true,
  FadeAfter: 4,
  ClearAfter: 30,
  FacesOnShapes: true,
  ForceUppercase: true
};

const appState = {
  settings: loadSettings(),
  figures: [],
  words: new Set(),
  strings: {},
  locale: "en-EN",
  speechEnabled: "speechSynthesis" in window,
  audioEnabled: false
};

const ui = {
  gameSurface: document.querySelector("#gameSurface"),
  statusText: document.querySelector("#statusText"),
  optionsButton: document.querySelector("#optionsButton"),
  optionsDialog: document.querySelector("#optionsDialog"),
  soundsSelect: document.querySelector("#soundsSelect"),
  fadeAwayCheck: document.querySelector("#fadeAwayCheck"),
  fadeAfterInput: document.querySelector("#fadeAfterInput"),
  clearAfterInput: document.querySelector("#clearAfterInput"),
  facesOnShapesCheck: document.querySelector("#facesOnShapesCheck"),
  forceUppercaseCheck: document.querySelector("#forceUppercaseCheck"),
  saveOptionsButton: document.querySelector("#saveOptionsButton"),
  cancelOptionsButton: document.querySelector("#cancelOptionsButton")
};

boot().catch((error) => {
  ui.statusText.textContent = `Startup error: ${error.message}`;
});

async function boot() {
  await Promise.all([loadWords(), loadLocaleStrings()]);
  bindEvents();
  hydrateOptions();
  if (window.babySmashDesktop?.onOpenOptions) {
    window.babySmashDesktop.onOpenOptions(openOptions);
  }
  ui.gameSurface.focus();
  ui.statusText.textContent = "Ready. Smash keys to create shapes and letters.";
}

function bindEvents() {
  window.addEventListener("keydown", onKeyDown);
  ui.gameSurface.addEventListener("pointerdown", onGameSurfacePointerDown);
  ui.gameSurface.addEventListener("pointerdown", onFirstInteraction, { once: true });
  ui.optionsButton.addEventListener("click", openOptions);
  ui.cancelOptionsButton.addEventListener("click", closeOptions);
  ui.saveOptionsButton.addEventListener("click", saveOptions);
}

function onGameSurfacePointerDown() {
  ui.gameSurface.focus();
}

function onFirstInteraction() {
  appState.audioEnabled = true;
  playSound("EditedJackPlaysBabySmash.wav");
}

function onKeyDown(event) {
  if (isTypingTarget(event.target)) {
    return;
  }

  if (event.key === "Escape") {
    closeOptions();
    window.babySmashDesktop?.setFullscreen?.(true);
    ui.gameSurface.focus();
    event.preventDefault();
    return;
  }

  if (event.altKey && event.key.toLowerCase() === "o") {
    openOptions();
    event.preventDefault();
    return;
  }

  if (!ui.optionsDialog.classList.contains("hidden")) {
    return;
  }

  const displayChar = getDisplayChar(event);
  if (!displayChar) {
    return;
  }

  const normalizedChar =
    appState.settings.ForceUppercase && /[a-z]/i.test(displayChar)
      ? displayChar.toUpperCase()
      : displayChar;

  const template = generateFigureTemplate(normalizedChar);
  renderFigure(template);
  handleWordDetection();

  if (!handleWordSpeech()) {
    playForTemplate(template);
  }

  event.preventDefault();
}

function getDisplayChar(event) {
  if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
    return event.key;
  }

  if (/^Numpad[0-9]$/.test(event.code)) {
    return event.code.replace("Numpad", "");
  }

  return "*";
}

function generateFigureTemplate(displayChar) {
  const color = randomItem(colors);
  const shapeType = randomItem(shapeTypes);
  const isLetter = /^[A-Z0-9]$/i.test(displayChar);

  return {
    color,
    shapeType,
    letter: isLetter ? displayChar : "",
    name: isLetter ? displayChar : `${localize(color.name)} ${localize(shapeType)}`,
    isLetter
  };
}

function renderFigure(template) {
  const figure = document.createElement("div");
  figure.className = `figure shape-${template.shapeType}`;
  figure.style.background = template.color.value;

  const maxX = Math.max(0, ui.gameSurface.clientWidth - 140);
  const maxY = Math.max(0, ui.gameSurface.clientHeight - 140);
  figure.style.left = `${randomNumber(0, maxX)}px`;
  figure.style.top = `${randomNumber(0, maxY)}px`;

  if (template.isLetter) {
    figure.textContent = template.letter;
  } else if (appState.settings.FacesOnShapes) {
    const face = document.createElement("span");
    face.className = "face";
    figure.append(face);
  }

  ui.gameSurface.append(figure);
  appState.figures.push({ node: figure, template });

  trimFigures();
  maybeScheduleFade(figure);
}

function trimFigures() {
  while (appState.figures.length > appState.settings.ClearAfter) {
    const oldest = appState.figures.shift();
    oldest?.node.remove();
  }
}

function maybeScheduleFade(node) {
  if (!appState.settings.FadeAway) {
    return;
  }

  const fadeMs = Math.max(1, Number(appState.settings.FadeAfter)) * 1000;
  node.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: fadeMs,
    easing: "linear",
    fill: "forwards"
  });
  setTimeout(() => node.remove(), fadeMs + 40);
}

function handleWordDetection() {
  const maxLength = 15;
  let candidate = "";
  let best = "";

  for (let i = appState.figures.length - 1; i >= 0 && candidate.length < maxLength; i -= 1) {
    const letter = appState.figures[i].template.letter;
    if (!letter || !/^[A-Z0-9]$/i.test(letter)) {
      break;
    }

    candidate = `${letter.toUpperCase()}${candidate}`;
    if (candidate.length >= 2 && appState.words.has(candidate)) {
      best = candidate;
    }
  }

  if (best) {
    ui.statusText.textContent = `You spelled ${best}!`;
    appState.lastWord = best;
  }
}

function handleWordSpeech() {
  if (!appState.lastWord) {
    return false;
  }

  speak(`You spelled ${appState.lastWord}`);
  appState.lastWord = null;
  return true;
}

function playForTemplate(template) {
  if (appState.settings.Sounds === "None") {
    return;
  }

  if (appState.settings.Sounds === "Laughter") {
    playSound(randomItem([
      "giggle.wav",
      "babylaugh.wav",
      "babygigl2.wav",
      "ccgiggle.wav",
      "laughingmice.wav",
      "scooby2.wav"
    ]));
    return;
  }

  if (template.isLetter) {
    speak(template.letter);
  } else {
    speak(`${localize(template.color.name)} ${localize(template.shapeType)}`);
  }
}

function playSound(fileName) {
  if (!appState.audioEnabled) {
    return;
  }

  const audio = new Audio(`/assets/sounds/${fileName}`);
  audio.play().catch(() => {
    ui.statusText.textContent = "Audio blocked. Click game area to enable sound.";
  });
}

function speak(text) {
  if (!appState.speechEnabled || appState.settings.Sounds === "None") {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = appState.locale;
  window.speechSynthesis.speak(utterance);
}

function localize(key) {
  return appState.strings[key] ?? key;
}

async function loadWords() {
  const response = await fetch("/assets/Words.txt");
  const text = await response.text();
  appState.words = new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.trim().toUpperCase())
      .filter((line) => line.length >= 2 && line.length <= 15 && !line.includes(";") && !line.includes("/") && !line.includes("\\"))
  );
}

async function loadLocaleStrings() {
  const language = navigator.language || "en-EN";
  const baseLanguage = language.split("-")[0];
  const candidates = [language, `${baseLanguage}-${baseLanguage.toUpperCase()}`, "en-EN"];

  for (const candidate of candidates) {
    try {
      const response = await fetch(`/assets/strings/${candidate}.json`);
      if (!response.ok) {
        continue;
      }

      appState.strings = await response.json();
      appState.locale = candidate;
      return;
    } catch {
      // Ignore locale loading errors and fallback.
    }
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem("babysmash-web-settings");
    if (!raw) {
      return { ...settingsDefaults };
    }
    const parsed = JSON.parse(raw);
    return { ...settingsDefaults, ...parsed };
  } catch {
    return { ...settingsDefaults };
  }
}

function hydrateOptions() {
  ui.soundsSelect.value = appState.settings.Sounds;
  ui.fadeAwayCheck.checked = Boolean(appState.settings.FadeAway);
  ui.fadeAfterInput.value = String(appState.settings.FadeAfter);
  ui.clearAfterInput.value = String(appState.settings.ClearAfter);
  ui.facesOnShapesCheck.checked = Boolean(appState.settings.FacesOnShapes);
  ui.forceUppercaseCheck.checked = Boolean(appState.settings.ForceUppercase);
}

function openOptions() {
  hydrateOptions();
  ui.optionsDialog.classList.remove("hidden");
  window.babySmashDesktop?.setFullscreen?.(false);
}

function closeOptions() {
  ui.optionsDialog.classList.add("hidden");
  window.babySmashDesktop?.setFullscreen?.(true);
  ui.gameSurface.focus();
}

function saveOptions() {
  appState.settings = {
    ...appState.settings,
    Sounds: ui.soundsSelect.value,
    FadeAway: ui.fadeAwayCheck.checked,
    FadeAfter: clampNumber(ui.fadeAfterInput.value, 1, 60, settingsDefaults.FadeAfter),
    ClearAfter: clampNumber(ui.clearAfterInput.value, 5, 200, settingsDefaults.ClearAfter),
    FacesOnShapes: ui.facesOnShapesCheck.checked,
    ForceUppercase: ui.forceUppercaseCheck.checked
  };

  localStorage.setItem("babysmash-web-settings", JSON.stringify(appState.settings));
  closeOptions();
  ui.statusText.textContent = "Options saved.";
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function isTypingTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}
