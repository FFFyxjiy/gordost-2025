// Номинации, за которые голосуем (дополнительные)

const VOTING_DEADLINE = new Date("2025-12-06T23:59:00+03:00");
const VOTE_NOMINATIONS = [
    {
        id: "meme_person",
        name: "Человек-мем года",
        tagline: "Главный источник внутренних шуток и легендарных моментов.",
    },
    {
        id: "charisma_person",
        name: "Человек-харизма года",
        tagline: "Тот, кто заходит в комнату — и атмосфера меняется.",
    },
    {
        id: "delivery_year",
        name: "Завоз года",
        tagline: "Самый мощный завоз, та ситуация которая изменила мир.",
    },
    {
        id: "cringe_year",
        name: "Кринж года",
        tagline: "Ситуация, о которой неловко вспоминать, но все помнят.",
    },
    {
        id: "fail_year",
        name: "Фейл года",
        tagline: "Главный провал, который стал мемом или уроком.",
    },
];

function startCountdown() {
    const daysEl = document.getElementById("cd-days");
    const hoursEl = document.getElementById("cd-hours");
    const minutesEl = document.getElementById("cd-minutes");
    const secondsEl = document.getElementById("cd-seconds");
    const countdownWrapper = document.getElementById("countdown");

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl || !countdownWrapper) return;

    function updateCountdown() {
        const now = new Date().getTime();
        const target = VOTING_DEADLINE.getTime();
        const diff = target - now;

        if (diff <= 0) {
            daysEl.textContent = "00";
            hoursEl.textContent = "00";
            minutesEl.textContent = "00";
            secondsEl.textContent = "00";
            countdownWrapper.classList.add("countdown--finished");
            return;
        }

        const seconds = Math.floor(diff / 1000);
        const days = Math.floor(seconds / (60 * 60 * 24));
        const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
        const minutes = Math.floor((seconds % (60 * 60)) / 60);
        const secs = seconds % 60;

        daysEl.textContent = String(days).padStart(2, "0");
        hoursEl.textContent = String(hours).padStart(2, "0");
        minutesEl.textContent = String(minutes).padStart(2, "0");
        secondsEl.textContent = String(secs).padStart(2, "0");
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}


const LOCAL_STORAGE_KEY = "gordost_2025_vote_nomination";

const MAX_SELECTIONS = 2;

const GOOGLE_SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbx0A0Jt-_zfXIWWmzrbn5r0z9PfKZMjCAOwNTeWWMVdbVB6wLMHEVElDJzMpwio4uoK/exec";

// Небольшой id сессии (чтобы в таблице как‑то различать устройства)
const SESSION_ID_KEY = "gordost_2025_session_id";

function getSessionId() {
    try {
        let id = localStorage.getItem(SESSION_ID_KEY);
        if (!id) {
            id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem(SESSION_ID_KEY, id);
        }
        return id;
    } catch {
        return "no-localstorage";
    }
}

function hasAlreadyVoted() {
    try {
        return Boolean(localStorage.getItem(LOCAL_STORAGE_KEY));
    } catch (e) {
        return false;
    }
}

function setVoted(nominationId) {
    try {
        const payload = {
            nominationId: nominationId,
            votedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
        // ничего не делаем, если localStorage недоступен
    }
}

function getVotedNominationId() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data && data.nominationId ? data.nominationId : null;
    } catch (e) {
        return null;
    }
}

function getSelectedNominations() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (Array.isArray(data?.nominations)) {
            return data.nominations;
        }
        // поддержка старого формата { nominationId }
        if (data?.nominationId) {
            return [data.nominationId];
        }
        return [];
    } catch {
        return [];
    }
}

function saveSelectedNominations(nominationsArray) {
    try {
        const unique = Array.from(new Set(nominationsArray)).slice(0, MAX_SELECTIONS);
        const payload = {
            nominations: unique,
            votedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // ignore
    }
}

function hasReachedLimit() {
    return getSelectedNominations().length >= MAX_SELECTIONS;
}

// ====== UI СТАТУС ======

function renderStatus(message, type) {
    const statusEl = document.getElementById("poll-status");
    const textEl = document.getElementById("poll-status-text");
    if (!statusEl || !textEl) return;

    textEl.textContent = message;

    statusEl.classList.remove(
        "poll__status_hidden",
        "poll__status--success",
        "poll__status--warning"
    );

    if (type === "success") {
        statusEl.classList.add("poll__status--success");
    } else if (type === "warning") {
        statusEl.classList.add("poll__status--warning");
    }
}

// ====== РЕНДЕР НОМИНАЦИЙ ======

function renderCandidates() {
    const container = document.getElementById("candidates");
    if (!container) return;

    container.innerHTML = "";

    const selected = getSelectedNominations();
    const selectedCount = selected.length;

    if (selectedCount > 0) {
        renderStatus(
            `Вы уже выбрали ${selectedCount} из ${MAX_SELECTIONS} номинаций. Можно выбрать до двух.`,
            "success"
        );
    } else {
        renderStatus(
            "Вы можете выбрать до двух дополнительных номинаций. После отправки изменить выбор нельзя."
        );
    }

    VOTE_NOMINATIONS.forEach((nomination, index) => {
        const card = document.createElement("article");
        card.className = "candidate";
        card.dataset.id = nomination.id;

        const isSelected = selected.includes(nomination.id);
        if (isSelected) {
            card.classList.add("candidate--voted");
        }

        const buttonText = isSelected
            ? "Выбрано"
            : selectedCount >= MAX_SELECTIONS
                ? "Лимит 2 из 2"
                : "Выбрать";

        card.innerHTML = `
          <div class="candidate__header">
            <div class="candidate__title-wrap">
              <h3 class="candidate__name">${nomination.name}</h3>
              <p class="candidate__tagline">${nomination.tagline}</p>
            </div>
          </div>

          <div class="candidate__footer">
            <span class="candidate__votes" data-votes-for="${nomination.id}">
              Номинация
            </span>
            <button class="candidate__btn" data-vote-btn="${nomination.id}">
              <span>${buttonText}</span>
            </button>
          </div>
        `;

        card.style.opacity = "0";
        card.style.transform = "translateY(6px)";
        setTimeout(() => {
            card.style.transition =
                "opacity 0.25s ease-out, transform 0.25s ease-out";
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }, 40 * index);

        container.appendChild(card);
    });

    container.addEventListener("click", handleCandidateClick);
}

// ====== ОБРАБОТКА КЛИКА ======

function handleCandidateClick(event) {
    const button = event.target.closest("[data-vote-btn]");
    if (!button) return;

    const nominationId = button.getAttribute("data-vote-btn");
    if (!nominationId) return;

    let selected = getSelectedNominations();
    const isAlreadySelected = selected.includes(nominationId);

    if (isAlreadySelected) {
        // можно сделать «отмена выбора», если нужно. Сейчас просто игнорируем.
        renderStatus("Эта номинация уже выбрана вами.", "warning");
        return;
    }

    if (selected.length >= MAX_SELECTIONS) {
        renderStatus(
            "Вы уже выбрали 2 номинации. Больше выбрать нельзя.",
            "warning"
        );
        return;
    }

    // добавляем новую номинацию
    selected.push(nominationId);
    voteForNomination(selected);
}

// ====== СОХРАНЕНИЕ ВЫБОРА ======

function voteForNomination(newSelectedArray) {
    saveSelectedNominations(newSelectedArray);

    const count = newSelectedArray.length;
    if (count < MAX_SELECTIONS) {
        renderStatus(
            `Номинация добавлена! Выбрано ${count} из ${MAX_SELECTIONS}. Можно выбрать ещё одну.`,
            "success"
        );
    } else {
        renderStatus(
            "Спасибо! Вы выбрали 2 номинации. Лимит голосов достигнут.",
            "success"
        );
    }

    highlightSelectedNominations(newSelectedArray);

    // отправляем выбор в Google Таблицу
    sendVoteToGoogleSheet(newSelectedArray);
}

function sendVoteToGoogleSheet(selectedNominations) {
    if (!GOOGLE_SHEET_ENDPOINT) return;

    const payload = {
        sessionId: getSessionId(),
        nominations: selectedNominations,
        userAgent: navigator.userAgent || "",
    };

    fetch(GOOGLE_SHEET_ENDPOINT, {
        method: "POST",
        mode: "no-cors",               // КЛЮЧЕВОЕ: не трогаем CORS, просто шлём
        body: JSON.stringify(payload), // без заголовков → text/plain
    }).catch(() => {
        // Игнорируем ошибки сети/браузера, чтобы UX не ломался
    });
}


function highlightSelectedNominations(selectedIds) {
    const set = new Set(selectedIds);
    const cards = document.querySelectorAll(".candidate");

    cards.forEach((card) => {
        const id = card.getAttribute("data-id");
        const btn = card.querySelector(".candidate__btn");
        if (!btn) return;

        if (set.has(id)) {
            card.classList.add("candidate--voted");
            btn.innerHTML = "<span>Выбрано</span>";
        } else if (selectedIds.length >= MAX_SELECTIONS) {
            btn.innerHTML = "<span>Лимит 2 из 2</span>";
        } else {
            btn.innerHTML = "<span>Выбрать</span>";
        }
    });
}

function setupYearSummarySlider() {
    const cards = Array.from(document.querySelectorAll(".year-summary__card"));
    const prevBtn = document.getElementById("summary-prev");
    const nextBtn = document.getElementById("summary-next");
    const progressEl = document.getElementById("summary-progress");

    if (!cards.length || !prevBtn || !nextBtn || !progressEl) {
        return;
    }

    const total = cards.length;
    let currentIndex = 0;

    // Собираем все аудио по слайдам (до 10 штук или сколько есть)
    const slideAudios = cards.map((card) => card.querySelector("audio") || null);

    function setAudioToStart(audio) {
        if (!audio) return;
        try {
            if (audio.currentTime < 10) {
                audio.currentTime = 10;
            } else {
                // если уже дальше — всё равно начинаем с 10
                audio.currentTime = 10;
            }
        } catch {
            // ignore
        }
    }

    function stopAllAudios() {
        slideAudios.forEach((audio) => {
            if (!audio) return;
            try {
                audio.pause();
                setAudioToStart(audio);
            } catch {
                // ignore
            }
        });
    }

    function playAudioForIndex(index) {
        const audio = slideAudios[index];
        if (!audio) {
            // если для этого слайда нет аудио — просто стопаем остальные
            stopAllAudios();
            return;
        }

        stopAllAudios();
        setAudioToStart(audio);

        try {
            audio.play().catch(() => {
                // браузер мог заблокировать autoplay — не ломаем ничего
            });
        } catch {
            // ignore
        }
    }

    function updateSlides(nextIndex = currentIndex, direction = 1, { autoplay } = { autoplay: false }) {
        if (nextIndex < 0 || nextIndex >= total) return;
        const prevIndex = currentIndex;
        currentIndex = nextIndex;

        cards.forEach((card, idx) => {
            card.classList.remove(
                "year-summary__card--active",
                "year-summary__card--leaving-left"
            );
            if (idx === currentIndex) {
                card.classList.add("year-summary__card--active");
            } else if (idx === prevIndex && direction > 0) {
                card.classList.add("year-summary__card--leaving-left");
            }
        });

        progressEl.textContent = `${currentIndex + 1} / ${total}`;
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === total - 1;

        if (autoplay) {
            playAudioForIndex(currentIndex);
        } else {
            // если autoplay выключен (первый показ) — просто приводим все
            // аудио к старту и ждём включения по кнопке "итоги"
            stopAllAudios();
        }
    }

    prevBtn.addEventListener("click", () => {
        updateSlides(currentIndex - 1, -1, { autoplay: true });
    });

    nextBtn.addEventListener("click", () => {
        updateSlides(currentIndex + 1, 1, { autoplay: true });
    });

    // При первом запуске показываем первый слайд без автозапуска,
    // но выставляем всем аудио стартовую позицию 0:10
    stopAllAudios();
    updateSlides(0, 1, { autoplay: false });

    // API для toggle
    return {
        resetToFirst: () => updateSlides(0, 1, { autoplay: true }),
        stopAllAudios,
    };
}

function setupSummaryToggle() {
    const btn = document.getElementById("btn-summary");
    const pollSection = document.getElementById("poll-section");
    const infoSection = document.getElementById("info-section");
    const summarySection = document.getElementById("year-summary");
    const closeBtn = document.getElementById("summary-close");

    if (!btn || !pollSection || !infoSection || !summarySection) {
        console.warn("Summary toggle: some elements not found");
        return;
    }

    const sliderApi = setupYearSummarySlider(); // { resetToFirst, stopAllAudios } или undefined
    let showingSummary = false;

    function showSummary() {
        showingSummary = true;

        if (sliderApi && typeof sliderApi.resetToFirst === "function") {
            sliderApi.resetToFirst(); // показываем первый слайд и запускаем его трек
        }

        summarySection.classList.remove("hidden");
        summarySection.classList.remove("year-summary--visible");
        requestAnimationFrame(() => {
            summarySection.classList.add("year-summary--visible");
        });

        pollSection.classList.add("hidden");
        infoSection.classList.add("hidden");
        btn.classList.add("top-nav__btn--active");
    }

    function hideSummary() {
        showingSummary = false;

        if (sliderApi && typeof sliderApi.stopAllAudios === "function") {
            sliderApi.stopAllAudios(); // стопаем ВСЕ треки
        }

        summarySection.classList.add("hidden");
        summarySection.classList.remove("year-summary--visible");

        pollSection.classList.remove("hidden");
        infoSection.classList.remove("hidden");
        btn.classList.remove("top-nav__btn--active");
    }

    btn.addEventListener("click", () => {
        if (showingSummary) {
            hideSummary();
        } else {
            showSummary();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", hideSummary);
    }
}

// ====== ИНИЦИАЛИЗАЦИЯ ======

document.addEventListener("DOMContentLoaded", function () {
    startCountdown();
    renderCandidates();
    setupSummaryToggle();
});