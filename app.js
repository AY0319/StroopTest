(() => {
  "use strict";

  const CONFIG = {
    practiceTrials: 16,
    formalDurationMs: 15 * 60 * 1000,
    stimulusDurationMs: 1200,
    fixationDurationMs: 300,
    feedbackDurationMs: 500,
    congruentRatio: 0.35
  };

  const COLORS = {
    "紅": { css: "#ff2020", key: "f" },
    "綠": { css: "#2ecc40", key: "g" },
    "藍": { css: "#2997ff", key: "j" },
    "黃": { css: "#ffd400", key: "k" }
  };

  const VALID_KEYS = ["f", "g", "j", "k"];
  const state = {
    participant: "",
    session: "1",
    vasPre: null,
    vasPost: null,
    trials: [],
    currentBlock: null,
    formalStartTime: null,
    csvText: ""
  };

  const screens = [...document.querySelectorAll(".screen")];
  const el = id => document.getElementById(id);

  function showScreen(id) {
    screens.forEach(screen => screen.classList.remove("active"));
    el(id).classList.add("active");
  }

  function escapeCsv(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function createTrial(condition) {
    const names = Object.keys(COLORS);
    const ink = randomChoice(names);
    let word = ink;

    if (condition === "incongruent") {
      word = randomChoice(names.filter(name => name !== ink));
    }

    return {
      condition,
      word,
      ink,
      correctKey: COLORS[ink].key
    };
  }

  function createPracticeTrials() {
    const list = [];
    for (let i = 0; i < CONFIG.practiceTrials; i++) {
      list.push(createTrial(i % 2 === 0 ? "congruent" : "incongruent"));
    }
    return list.sort(() => Math.random() - 0.5);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function requestFullscreen() {
    const root = document.documentElement;
    if (root.requestFullscreen) {
      root.requestFullscreen().catch(() => {});
    }
  }

  async function runTrial(trial, trialIndex, blockName, showFeedback) {
    const fixation = el("fixation");
    const stimulus = el("stimulus");
    const feedback = el("feedback");

    fixation.textContent = "+";
    fixation.style.display = "block";
    stimulus.textContent = "";
    feedback.textContent = "";

    await delay(CONFIG.fixationDurationMs);

    fixation.style.display = "none";
    stimulus.textContent = trial.word;
    stimulus.style.color = COLORS[trial.ink].css;

    const onsetPerf = performance.now();
    const onsetIso = nowIso();

    let responseKey = "";
    let reactionTimeMs = "";
    let responseStatus = "omission";
    let correct = 0;
    let settled = false;

    const responsePromise = new Promise(resolve => {
      const handler = event => {
        const key = event.key.toLowerCase();

        if (key === "escape") {
          window.removeEventListener("keydown", handler);
          settled = true;
          resolve({ aborted: true });
          return;
        }

        if (!VALID_KEYS.includes(key) || settled) return;

        settled = true;
        responseKey = key;
        reactionTimeMs = Math.round((performance.now() - onsetPerf) * 10) / 10;
        correct = Number(key === trial.correctKey);
        responseStatus = correct ? "correct" : "incorrect";
        window.removeEventListener("keydown", handler);
        resolve({ aborted: false });
      };

      window.addEventListener("keydown", handler);

      setTimeout(() => {
        if (!settled) {
          settled = true;
          window.removeEventListener("keydown", handler);
          resolve({ aborted: false });
        }
      }, CONFIG.stimulusDurationMs);
    });

    const result = await responsePromise;

    if (result.aborted) {
      throw new Error("Experiment aborted");
    }

    const elapsed = performance.now() - onsetPerf;
    if (elapsed < CONFIG.stimulusDurationMs) {
      await delay(CONFIG.stimulusDurationMs - elapsed);
    }

    stimulus.textContent = "";

    if (showFeedback) {
      feedback.textContent =
        responseStatus === "correct" ? "正確" :
        responseStatus === "incorrect" ? "錯誤" : "未作答";
      await delay(CONFIG.feedbackDurationMs);
      feedback.textContent = "";
    }

    const record = {
      participant: state.participant,
      session: state.session,
      block: blockName,
      trialIndex,
      condition: trial.condition,
      word: trial.word,
      inkColor: trial.ink,
      correctKey: trial.correctKey,
      responseKey,
      reactionTimeMs,
      correct,
      responseStatus,
      stimulusOnsetIso: onsetIso,
      formalElapsedMs: blockName === "formal"
        ? Math.round(performance.now() - state.formalStartTime)
        : ""
    };

    state.trials.push(record);
  }

  async function runPractice() {
    showScreen("screen-task");
    state.currentBlock = "practice";
    el("block-label").textContent = "練習";
    el("timer-label").textContent = "";

    const trials = createPracticeTrials();

    try {
      for (let i = 0; i < trials.length; i++) {
        await runTrial(trials[i], i + 1, "practice", true);
      }
      showScreen("screen-practice-end");
    } catch {
      alert("實驗已中止。");
      location.reload();
    }
  }

  async function runFormal() {
    showScreen("screen-task");
    state.currentBlock = "formal";
    state.formalStartTime = performance.now();
    el("block-label").textContent = "正式作業";

    let trialIndex = 0;
    let timerId = null;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        CONFIG.formalDurationMs - (performance.now() - state.formalStartTime)
      );
      const totalSeconds = Math.ceil(remaining / 1000);
      const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
      const sec = String(totalSeconds % 60).padStart(2, "0");
      el("timer-label").textContent = `${min}:${sec}`;
    };

    updateTimer();
    timerId = setInterval(updateTimer, 250);

    try {
      while (performance.now() - state.formalStartTime < CONFIG.formalDurationMs) {
        trialIndex += 1;
        const condition = Math.random() < CONFIG.congruentRatio
          ? "congruent"
          : "incongruent";

        await runTrial(createTrial(condition), trialIndex, "formal", false);
      }

      clearInterval(timerId);
      el("timer-label").textContent = "00:00";
      showScreen("screen-vas-post");
    } catch {
      clearInterval(timerId);
      alert("實驗已中止。");
      location.reload();
    }
  }

  function buildCsv() {
    const headers = [
      "participant",
      "session",
      "vas_pre",
      "vas_post",
      "vas_change",
      "block",
      "trial_index",
      "condition",
      "word",
      "ink_color",
      "correct_key",
      "response_key",
      "reaction_time_ms",
      "correct",
      "response_status",
      "stimulus_onset_iso",
      "formal_elapsed_ms"
    ];

    const rows = state.trials.map(row => [
      row.participant,
      row.session,
      state.vasPre,
      state.vasPost,
      Math.round((state.vasPost - state.vasPre) * 10) / 10,
      row.block,
      row.trialIndex,
      row.condition,
      row.word,
      row.inkColor,
      row.correctKey,
      row.responseKey,
      row.reactionTimeMs,
      row.correct,
      row.responseStatus,
      row.stimulusOnsetIso,
      row.formalElapsedMs
    ]);

    return [
      headers.map(escapeCsv).join(","),
      ...rows.map(row => row.map(escapeCsv).join(","))
    ].join("\n");
  }

  function downloadCsv() {
    state.csvText = buildCsv();
    const bom = "\uFEFF";
    const blob = new Blob([bom + state.csvText], {
      type: "text/csv;charset=utf-8"
    });

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

    const filename =
      `${state.participant || "unknown"}_session-${state.session}_stroop_${timestamp}.csv`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  el("vas-pre").addEventListener("input", event => {
    el("vas-pre-value").textContent = Number(event.target.value).toFixed(1);
  });

  el("vas-post").addEventListener("input", event => {
    el("vas-post-value").textContent = Number(event.target.value).toFixed(1);
  });

  el("btn-start-info").addEventListener("click", () => {
    const participant = el("participant-id").value.trim();
    const session = el("session-id").value.trim() || "1";

    if (!participant) {
      alert("請輸入受試者編號。");
      return;
    }

    state.participant = participant;
    state.session = session;
    requestFullscreen();
    showScreen("screen-vas-pre");
  });

  el("btn-vas-pre").addEventListener("click", () => {
    state.vasPre = Number(el("vas-pre").value);
    showScreen("screen-instructions");
  });

  el("btn-practice").addEventListener("click", runPractice);
  el("btn-formal").addEventListener("click", runFormal);

  el("btn-vas-post").addEventListener("click", () => {
    state.vasPost = Number(el("vas-post").value);
    downloadCsv();

    const formalTrials = state.trials.filter(row => row.block === "formal");
    const correctCount = formalTrials.reduce((sum, row) => sum + row.correct, 0);
    const accuracy = formalTrials.length
      ? (correctCount / formalTrials.length * 100).toFixed(1)
      : "0.0";

    el("summary-text").textContent =
      `資料已下載。正式作業共 ${formalTrials.length} 題，正確率 ${accuracy}%，疲勞 VAS 變化為 ${(state.vasPost - state.vasPre).toFixed(1)}。`;

    showScreen("screen-end");
  });

  el("btn-download-again").addEventListener("click", downloadCsv);

  window.addEventListener("beforeunload", event => {
    if (state.currentBlock === "formal") {
      event.preventDefault();
      event.returnValue = "";
    }
  });
})();
