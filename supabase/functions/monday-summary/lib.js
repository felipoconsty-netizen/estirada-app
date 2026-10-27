// Generat amb npm run build:email. No l’editis a mà.

// src/lib/phv.ts
function ageAt(dob, date) {
  return (new Date(date).getTime() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1e3);
}
function maturityOffset(sex, age, m) {
  const leg = m.height - m.sitting;
  const ratio = m.mass / m.height * 100;
  if (sex === "F") {
    return -9.376 + 1882e-7 * leg * m.sitting + 22e-4 * age * leg + 5841e-6 * age * m.sitting - 2658e-6 * age * m.mass + 0.07693 * ratio;
  }
  return -9.236 + 2708e-7 * leg * m.sitting - 1663e-6 * age * leg + 7216e-6 * age * m.sitting + 0.02292 * ratio;
}
var PHASES = {
  pre: { key: "pre", label: { ca: "Abans de l'estirada", es: "Antes del estir\xF3n" }, level: "ok" },
  entrant: { key: "entrant", label: { ca: "Entrant a l'estirada", es: "Entrando en el estir\xF3n" }, level: "warn" },
  plena: { key: "plena", label: { ca: "En plena estirada", es: "En pleno estir\xF3n" }, level: "bad" },
  sortint: { key: "sortint", label: { ca: "Sortint de l'estirada", es: "Saliendo del estir\xF3n" }, level: "warn" },
  post: { key: "post", label: { ca: "Despr\xE9s de l'estirada", es: "Despu\xE9s del estir\xF3n" }, level: "ok" }
};
function phaseOf(offset) {
  if (offset < -1) return PHASES.pre;
  if (offset < -0.5) return PHASES.entrant;
  if (offset <= 0.5) return PHASES.plena;
  if (offset <= 1) return PHASES.sortint;
  return PHASES.post;
}
function targetHeight(sex, father, mother) {
  return sex === "F" ? (father + mother - 13) / 2 : (father + mother + 13) / 2;
}
function growthVelocity(measures) {
  if (measures.length < 2) return null;
  const a = measures[measures.length - 2];
  const b = measures[measures.length - 1];
  const years = (new Date(b.date).getTime() - new Date(a.date).getTime()) / (365.25 * 24 * 3600 * 1e3);
  if (years <= 0.08) return null;
  return (b.height - a.height) / years;
}
var FAST_GROWTH = 7.2;
var KR = [
  [4, [-10.2567, 1.23812, -0.087235, 0.50286], [-8.1325, 1.24768, -0.19435, 0.44774]],
  [4.5, [-10.719, 1.15964, -0.074454, 0.52887], [-6.47656, 1.22177, -0.18519, 0.41381]],
  [5, [-11.0213, 1.10674, -0.06478, 0.53919], [-5.13582, 1.19932, -0.1753, 0.38467]],
  [5.5, [-11.1556, 1.0748, -0.05776, 0.53691], [-4.13791, 1.1788, -0.16484, 0.36039]],
  [6, [-11.1138, 1.05923, -0.052947, 0.52513], [-3.51039, 1.15866, -0.154, 0.34105]],
  [6.5, [-11.0221, 1.05542, -0.049892, 0.50692], [-3.14322, 1.13737, -0.14294, 0.32672]],
  [7, [-10.9984, 1.05877, -0.048144, 0.48538], [-2.87645, 1.11342, -0.13184, 0.31748]],
  [7.5, [-11.0214, 1.06467, -0.047256, 0.46361], [-2.66291, 1.08525, -0.12086, 0.3134]],
  [8, [-11.0696, 1.06853, -0.046778, 0.44469], [-2.45559, 1.05135, -0.11019, 0.31457]],
  [8.5, [-11.122, 1.06572, -0.046255, 0.43171], [-2.20728, 1.01018, -0.09999, 0.32105]],
  [9, [-11.1571, 1.05166, -0.045254, 0.42776], [-1.87098, 0.9602, -0.09044, 0.33291]],
  [9.5, [-11.1405, 1.02174, -0.043311, 0.43593], [-1.0633, 0.89989, -0.08171, 0.35025]],
  [10, [-11.038, 0.97135, -0.039981, 0.45932], [0.33468, 0.82771, -0.07397, 0.37312]],
  [10.5, [-10.8286, 0.89589, -0.034814, 0.50101], [1.97366, 0.74213, -0.06739, 0.40161]],
  [11, [-10.4917, 0.81239, -0.02905, 0.54781], [3.50436, 0.67173, -0.06136, 0.42042]],
  [11.5, [-10.0065, 0.74134, -0.024167, 0.58409], [4.57747, 0.6415, -0.05518, 0.41686]],
  [12, [-9.3522, 0.68325, -0.020076, 0.60927], [4.84365, 0.64452, -0.04894, 0.3949]],
  [12.5, [-8.6055, 0.63869, -0.016681, 0.62279], [4.27869, 0.67386, -0.04272, 0.3585]],
  [13, [-7.8632, 0.60818, -0.013895, 0.62407], [3.21417, 0.7226, -0.03661, 0.31163]],
  [13.5, [-7.1348, 0.59228, -0.011618, 0.61253], [1.83456, 0.78383, -0.03067, 0.25826]],
  [14, [-6.4299, 0.59151, -9776e-6, 0.58762], [0.32425, 0.85062, -0.025, 0.20235]],
  [14.5, [-5.7578, 0.60643, -8256e-6, 0.54875], [-1.13224, 0.91605, -0.01967, 0.14787]],
  [15, [-5.1282, 0.63757, -6994e-6, 0.49536], [-2.35055, 0.97319, -0.01477, 0.0988]],
  [15.5, [-4.5092, 0.68548, -5863e-6, 0.42687], [-3.10326, 1.01514, -0.01037, 0.05909]],
  [16, [-3.9292, 0.75069, -4795e-6, 0.34271], [-3.17885, 1.03496, -655e-5, 0.03272]],
  [16.5, [-3.4873, 0.83375, -3695e-6, 0.24231], [-2.41657, 1.02573, -34e-4, 0.02364]],
  [17, [-3.283, 0.9352, -247e-5, 0.1251], [-0.65579, 0.98054, -1e-3, 0.03584]],
  [17.5, [-3.4156, 1.05558, -1033e-6, -95e-4], [2.26429, 0.89246, 57e-5, 0.07327]]
];
function predictAdultHeight(sex, age, height, mass, father, mother) {
  if (!(father > 100 && mother > 100) || age < 4 || age > 17.75) return null;
  const i = KR.findIndex(([a]) => a >= Math.min(age, 17.5));
  const k = (r) => sex === "M" ? r[1] : r[2];
  const hi = k(KR[i]), lo = k(KR[Math.max(0, i - 1)]);
  const w = i === 0 || age >= 17.5 ? 1 : (age - KR[i - 1][0]) / 0.5;
  const c = hi.map((x, j) => lo[j] + (x - lo[j]) * w);
  const inches = c[0] + c[1] * (height / 2.54) + c[2] * (mass * 2.20462) + c[3] * ((father + mother) / 2 / 2.54);
  return Math.max(height, inches * 2.54);
}
var pahBand = (pct) => pct < 85 ? "lluny" : pct < 90 ? "acosta" : pct <= 95 ? "pic" : "despres";
var birthQuarter = (dob) => Math.floor((Number(dob.slice(5, 7)) - 1) / 3) + 1;

// src/lib/i18n.ts
var ZONES = { Genoll: "Rodilla", Tal\u00F3: "Tal\xF3n", Turmell: "Tobillo", Esquena: "Espalda", Maluc: "Cadera", Espatlla: "Hombro", Canell: "Mu\xF1eca", "Turmell esquerre": "Tobillo izquierdo" };
var zone = (z, lang) => lang === "es" ? ZONES[z] ?? z : z;

// src/lib/load.ts
var DAY = 24 * 3600 * 1e3;
var daysBetween = (from, to) => Math.round((Date.parse(to + "T12:00:00") - Date.parse(from + "T12:00:00")) / DAY);
var sessionLoad = (l) => l.minutes * l.rpe;
function loadView(loads, today) {
  const past = loads.filter((l) => daysBetween(l.date, today) >= 0);
  const within = (n) => past.filter((l) => daysBetween(l.date, today) < n);
  const sum = (ls) => ls.reduce((a, l) => a + sessionLoad(l), 0);
  const week = sum(within(7));
  const first = past.reduce((a, l) => !a || l.date < a ? l.date : a, null);
  const avg = first && daysBetween(first, today) >= 21 ? sum(within(28)) / 4 : null;
  const last = [...past].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return { week, avg, ratio: avg ? week / avg : null, sessions: within(7).length, lastRpe: last?.rpe ?? null };
}
var growing = (k) => k === "entrant" || k === "plena";
function loadAlert(v, phase, lang, fast = false) {
  if (v.ratio === null) return null;
  const g = growing(phase) || fast;
  if (v.ratio < (g ? 1.3 : 1.5)) return null;
  const es = lang === "es";
  const x = v.ratio.toLocaleString("es-ES", { maximumFractionDigits: 1 });
  return {
    level: v.ratio >= 1.5 && g ? "bad" : "warn",
    text: es ? `Carga disparada: \xD7${x} respecto a su media del mes${g ? " y est\xE1 creciendo" : ""}` : `C\xE0rrega disparada: \xD7${x} respecte a la seva mitjana del mes${g ? " i est\xE0 creixent" : ""}`
  };
}
var measureEvery = (k) => growing(k) ? 42 : 84;
var daysSinceMeasure = (p, today) => {
  const last = p.measures.at(-1);
  return last ? daysBetween(last.date, today) : null;
};

// src/lib/derive.ts
var wellnessScore = (w) => (w.energy + w.sleep + w.legs + w.stress + w.mood) / 5;
var rank = { ok: 0, info: 0, warn: 1, bad: 2 };
function phaseNow(p) {
  const m = p.measures[p.measures.length - 1];
  return m ? phaseOf(maturityOffset(p.sex, ageAt(p.dob, m.date), m)) : null;
}
var fold = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function growthPain(phase, painZone, lang) {
  if (phase === "pre" || phase === "post") return null;
  const z = fold(painZone);
  const es = lang === "es";
  if (/genoll|rodilla|knee|rotul/.test(z)) return es ? "Posible Osgood-Schlatter (rodilla durante el estir\xF3n). Que lo mire el fisio y reduce los saltos." : "Possible Osgood-Schlatter (genoll durant l\u2019estirada). Que ho miri el fisio i redueix els salts.";
  if (/talo|heel|aquil/.test(z)) return es ? "Posible Sever (tal\xF3n durante el estir\xF3n). Que lo mire el fisio y reduce carreras y saltos." : "Possible Sever (tal\xF3 durant l\u2019estirada). Que ho miri el fisio i redueix curses i salts.";
  if (phase === "plena" && /esquena|espalda|lumbar|back/.test(z)) return es ? "Dolor de espalda en pleno estir\xF3n. Si dura m\xE1s de una semana, que lo mire el fisio." : "Dolor d\u2019esquena en plena estirada. Si dura m\xE9s d\u2019una setmana, que ho miri el fisio.";
  return null;
}
function derive(p, lang, today) {
  const es = lang === "es";
  const m = p.measures[p.measures.length - 1];
  if (!m) return null;
  const age = ageAt(p.dob, m.date);
  const offset = maturityOffset(p.sex, age, m);
  const phase = phaseOf(offset);
  const velocity = growthVelocity(p.measures);
  const target = targetHeight(p.sex, p.father, p.mother);
  const pah = predictAdultHeight(p.sex, age, m.height, m.mass, p.father, p.mother);
  const pctAdult = Math.min(100, m.height / (pah ?? target) * 100);
  const band = pah ? pahBand(pctAdult) : null;
  const fast = velocity !== null && velocity >= FAST_GROWTH;
  const slept = p.wellness.filter((w) => w.sleepHours).slice(-2);
  const sleepHours = p.wellness.at(-1)?.sleepHours ?? null;
  const shortSleep = slept.length === 2 && slept.every((w) => w.sleepHours < 8);
  const series = p.wellness.map(wellnessScore);
  const now = series[series.length - 1];
  const prev = series.slice(-5, -1);
  const prevAvg = prev.reduce((a, b) => a + b, 0) / Math.max(prev.length, 1);
  const last = p.wellness[p.wellness.length - 1];
  const pain = last?.pain ?? null;
  const painWeeks = [...p.wellness].reverse().findIndex((w) => !w.pain);
  const streak = painWeeks === -1 ? p.wellness.length : painWeeks;
  const gPain = pain ? growthPain(phase.key, pain.zone, lang) : null;
  const load = loadView(p.loads, today);
  const measureDays = daysSinceMeasure(p, today) ?? 0;
  const measureDue = measureDays > measureEvery(phase.key);
  const alerts = [];
  if (phase.key === "plena") alerts.push({ level: "bad", text: es ? "En pleno estir\xF3n: menos saltos e impactos" : "En plena estirada: menys salts i impactes" });
  else if (phase.level === "warn") alerts.push({ level: "warn", text: `${phase.label[lang]}: ${es ? "vigilar la carga" : "vigilar la c\xE0rrega"}` });
  if (fast) alerts.push({ level: pain && /genoll|rodilla|talo|aquil/.test(fold(pain.zone)) ? "bad" : "warn", text: es ? `Crece r\xE1pido: ${fmt(velocity)} cm/a\xF1o. M\xE1s riesgo de lesiones de crecimiento: menos saltos y vigila rodillas y talones` : `Creix r\xE0pid: ${fmt(velocity)} cm/any. M\xE9s risc de lesions de creixement: menys salts i vigila genolls i talons` });
  if (band && (phase.key === "pre" && pctAdult >= 92 || phase.key === "post" && pctAdult < 88)) alerts.push({ level: "info", text: es ? `Las dos estimaciones no coinciden (${phase.label.es.toLowerCase()} y ${fmt(pctAdult)} % de la altura adulta). Vuelve a medir con cuidado.` : `Les dues estimacions no coincideixen (${phase.label.ca.toLowerCase()} i ${fmt(pctAdult)} % de l'al\xE7ada adulta). Torna a mesurar amb cura.` });
  if (shortSleep) alerts.push({ level: fast || phase.key === "plena" ? "bad" : "warn", text: es ? `Duerme poco: menos de 8 h dos semanas seguidas${fast || phase.key === "plena" ? " y est\xE1 creciendo" : ""}` : `Dorm poc: menys de 8 h dues setmanes seguides${fast || phase.key === "plena" ? " i est\xE0 creixent" : ""}` });
  if (pain) {
    const lvl = pain.level >= 4 || pain.stopped ? "bad" : "warn";
    const weeks = streak >= 2 ? ` \xB7 ${streak} ${es ? "semanas seguidas" : "setmanes seguides"}` : "";
    alerts.push({ level: lvl, text: `${es ? "Dolor" : "Dolor"}: ${zone(pain.zone, lang).toLowerCase()} ${pain.level}/10${weeks}` });
    if (pain.stopped) alerts.push({ level: "bad", text: es ? "No ha podido entrenar esta semana" : "No ha pogut entrenar aquesta setmana" });
    if (gPain) alerts.push({ level: pain.level >= 4 || streak >= 2 || pain.stopped ? "bad" : "warn", text: gPain });
  }
  const la = loadAlert(load, phase.key, lang, fast || band === "pic");
  if (la) alerts.push(la);
  if (measureDue) alerts.push({ level: "info", text: es ? `Hace ${Math.floor(measureDays / 7)} semanas que no se mide` : `Fa ${Math.floor(measureDays / 7)} setmanes que no es mesura` });
  if (prev.length && now <= prevAvg - 0.8) alerts.push({ level: "warn", text: es ? "Bienestar a la baja respecto a las \xFAltimas semanas" : "Benestar a la baixa respecte a les \xFAltimes setmanes" });
  if (last?.comment) alerts.push({ level: "info", text: `${es ? "Comentario" : "Comentari"}: \xAB${last.comment}\xBB` });
  const level = alerts.reduce((acc, a) => rank[a.level] > rank[acc] ? a.level : acc, "ok");
  return {
    p,
    age,
    offset,
    phvAge: age - offset,
    phase,
    velocity,
    height: m.height,
    target,
    pah,
    pctAdult,
    band,
    fast,
    quarter: birthQuarter(p.dob),
    sleepHours,
    shortSleep,
    wellnessSeries: series,
    wellnessNow: now,
    pain,
    growthPain: gPain,
    load,
    measureDays,
    measureDue,
    alerts,
    level
  };
}
function deriveTeam(t, lang, today) {
  return t.players.map((p) => derive(p, lang, today)).filter((v) => v !== null);
}
function fmt(n, d = 1) {
  if (!Number.isFinite(n)) return "\u2014";
  return n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function firstName(name) {
  return name.split(" ")[0];
}
function mondaySummary(views, lang) {
  const es = lang === "es";
  const out = [];
  const plena = views.filter((v) => v.phase.key === "plena");
  const pain = views.filter((v) => v.pain && (v.pain.level >= 4 || v.pain.stopped) && !v.growthPain);
  const lowW = views.filter((v) => v.alerts.some((a) => a.text.startsWith("Benestar") || a.text.startsWith("Bienestar")));
  const fast = views.filter((v) => v.fast);
  const sleepy = views.filter((v) => v.shortSleep);
  const gp = views.filter((v) => v.growthPain);
  const heavy = views.filter((v) => v.alerts.some((a) => a.text.startsWith("C\xE0rrega") || a.text.startsWith("Carga")));
  const due = views.filter((v) => v.measureDue);
  const one = (vs) => vs.length === 1;
  if (plena.length) out.push({ level: "bad", text: es ? `${list(plena, lang)} ${one(plena) ? "est\xE1" : "est\xE1n"} en pleno estir\xF3n. Reduce saltos y esprints m\xE1ximos, y prioriza t\xE9cnica y movilidad.` : `${list(plena, lang)} ${one(plena) ? "est\xE0" : "estan"} en plena estirada. Redueix salts i esprints m\xE0xims, i prioritza t\xE8cnica i mobilitat.` });
  if (pain.length) out.push({ level: "bad", text: es ? `${list(pain, lang)} ${one(pain) ? "tiene" : "tienen"} dolor fuerte o repetido. H\xE1blalo antes de entrenar y, si sigue, que lo vea el fisio.` : `${list(pain, lang)} ${one(pain) ? "t\xE9" : "tenen"} dolor fort o repetit. Parla-hi abans d'entrenar i, si continua, que ho miri el fisio.` });
  for (const v of gp) out.push({ level: "bad", text: `${firstName(v.p.name)}: ${v.growthPain}` });
  if (heavy.length) out.push({ level: "warn", text: es ? `${list(heavy, lang)} ${one(heavy) ? "ha acumulado" : "han acumulado"} mucha m\xE1s carga que su media del mes. Haz una sesi\xF3n m\xE1s suave o con menos minutos.` : `${list(heavy, lang)} ${one(heavy) ? "ha acumulat" : "han acumulat"} molta m\xE9s c\xE0rrega que la seva mitjana del mes. Fes una sessi\xF3 m\xE9s suau o amb menys minuts.` });
  if (fast.length) out.push({ level: "warn", text: es ? `${list(fast, lang)} ${one(fast) ? "crece" : "crecen"} m\xE1s de ${fmt(FAST_GROWTH)} cm/a\xF1o. Es cuando m\xE1s se lesionan por crecimiento: menos saltos y vigila rodillas y talones.` : `${list(fast, lang)} ${one(fast) ? "creix" : "creixen"} m\xE9s de ${fmt(FAST_GROWTH)} cm/any. \xC9s quan m\xE9s es lesionen pel creixement: menys salts i vigila genolls i talons.` });
  if (sleepy.length) out.push({ level: "warn", text: es ? `${list(sleepy, lang)} ${one(sleepy) ? "duerme" : "duermen"} menos de 8 horas desde hace dos semanas. Dormir poco aumenta el riesgo de lesi\xF3n: com\xE9ntalo tambi\xE9n con la familia.` : `${list(sleepy, lang)} ${one(sleepy) ? "dorm" : "dormen"} menys de 8 hores des de fa dues setmanes. Dormir poc augmenta el risc de lesi\xF3: comenta-ho tamb\xE9 amb la fam\xEDlia.` });
  if (lowW.length) out.push({ level: "warn", text: es ? `${list(lowW, lang)} ${one(lowW) ? "dice" : "dicen"} que se encuentra${one(lowW) ? "" : "n"} peor que otras semanas. Una charla corta puede ayudar.` : `${list(lowW, lang)} ${one(lowW) ? "diu que es troba" : "diuen que es troben"} pitjor que altres setmanes. Una conversa curta pot ajudar.` });
  if (due.length) out.push({ level: "info", text: es ? `Toca medir a ${list(due, lang)}: sin medidas recientes la fase de maduraci\xF3n queda desfasada.` : `Toca mesurar ${list(due, lang)}: sense mesures recents la fase de maduraci\xF3 queda desfasada.` });
  if (!out.some((o) => o.level !== "info")) out.push({ level: "ok", text: es ? "Semana tranquila: ning\xFAn aviso importante en el equipo." : "Setmana tranquil\xB7la: cap av\xEDs important a l'equip." });
  return out;
}
function list(vs, lang) {
  const n = vs.map((v) => firstName(v.p.name));
  if (n.length === 1) return n[0];
  return n.slice(0, -1).join(", ") + (lang === "es" ? " y " : " i ") + n[n.length - 1];
}

// src/lib/schedule.ts
var at = (iso2) => /* @__PURE__ */ new Date(iso2 + "T12:00:00");
var iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
var shift = (s, n) => {
  const d = at(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
var isoDow = (s) => (at(s).getDay() + 6) % 7 + 1;
function pastSessions(days, today, n = 28) {
  return Array.from({ length: n }, (_, i) => shift(today, -i)).filter((d) => days.includes(isoDow(d)));
}

// src/lib/warmup.ts
var WARMUP_GOAL = 2;
function sessionsDone(dates, days, today) {
  if (!days?.length) return null;
  const ses = pastSessions(days, today);
  return { n: ses.filter((d) => dates.includes(d)).length, m: ses.length };
}
function warmupStats(dates, today, n = 4) {
  const weeks = Array.from({ length: n }, (_, i) => {
    const from = (n - 1 - i) * 7;
    return dates.filter((d) => {
      const x = daysBetween(d, today);
      return x >= from && x < from + 7;
    }).length;
  });
  const avg = weeks.reduce((a, b) => a + b, 0) / n;
  const level = avg >= WARMUP_GOAL ? "ok" : avg >= 1 ? "warn" : "bad";
  return { weeks, avg, last: weeks[n - 1], level, any: dates.length > 0 };
}
function warmupLine(dates, today, lang, days) {
  if (!dates?.length) return null;
  const s = warmupStats(dates, today);
  const es = lang === "es";
  const ses = sessionsDone(dates, days, today);
  const avg = s.avg.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + (ses ? ` (${ses.n} ${es ? "de" : "de"} ${ses.m} entrenos)` : "");
  if (s.level === "ok") return { level: "ok", text: es ? `Calentamiento de prevenci\xF3n: ${avg} por semana de media. Buen ritmo, es lo que protege.` : `Escalfament de prevenci\xF3: ${avg} per setmana de mitjana. Bon ritme, \xE9s el que protegeix.` };
  return { level: "warn", text: es ? `Calentamiento de prevenci\xF3n: solo ${avg} por semana de media. Para que proteja hacen falta ${WARMUP_GOAL} o m\xE1s.` : `Escalfament de prevenci\xF3: nom\xE9s ${avg} per setmana de mitjana. Perqu\xE8 protegeixi en calen ${WARMUP_GOAL} o m\xE9s.` };
}

// src/lib/survey.ts
var DIMS = ["energy", "sleep", "legs", "stress", "mood"];
var DIM_NAME = {
  ca: { energy: "energia", sleep: "son", legs: "cames", stress: "estr\xE8s", mood: "\xE0nim" },
  es: { energy: "energ\xEDa", sleep: "sue\xF1o", legs: "piernas", stress: "estr\xE9s", mood: "\xE1nimo" }
};
var DIM_TIP = {
  ca: {
    energy: "una sessi\xF3 m\xE9s curta o m\xE9s l\xFAdica pot anar b\xE9",
    sleep: "val la pena recordar h\xE0bits de son (pantalles, hores) i no allargar els entrenaments tard",
    legs: "conv\xE9 baixar el volum de salts i curses aquesta setmana",
    stress: "potser \xE9s \xE8poca d\u2019ex\xE0mens: baixa l\u2019exig\xE8ncia i pregunta com van",
    mood: "una estona de grup o una xerrada curta pot ajudar"
  },
  es: {
    energy: "una sesi\xF3n m\xE1s corta o m\xE1s l\xFAdica puede ir bien",
    sleep: "vale la pena recordar h\xE1bitos de sue\xF1o (pantallas, horas) y no alargar los entrenamientos tarde",
    legs: "conviene bajar el volumen de saltos y carreras esta semana",
    stress: "quiz\xE1 es \xE9poca de ex\xE1menes: baja la exigencia y pregunta c\xF3mo van",
    mood: "un rato de grupo o una charla corta puede ayudar"
  }
};
var SIDE = { Esquerre: ["esquerre", "izquierdo"], Dret: ["dret", "derecho"], "Tots dos": ["tots dos costats", "ambos lados"] };
var dimName = (d, lang) => DIM_NAME[lang][d];
var mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
var trivial = (c) => !c || /^(no|res|nada|nop?e?|-+|\.+|res a dir|nada que decir|cap|ninguna?)\.?$/i.test(c.trim());
var painText = (p, lang) => {
  const side = SIDE[p.side]?.[lang === "es" ? 1 : 0] ?? p.side;
  return `${zone(p.zone, lang).toLowerCase()}${side ? ` (${side})` : ""} ${p.level}/10`;
};
function surveyWeeks(players, current) {
  const [cd, cm] = current.split("/").map(Number);
  const key = (w) => {
    const [d, m] = w.split("/").map(Number);
    return (m > cm + 1 ? m - 12 : m) * 100 + d;
  };
  return [.../* @__PURE__ */ new Set([...players.flatMap((p) => p.wellness.map((w) => w.week)), current])].filter((w) => key(w) <= cm * 100 + cd).sort((a, b) => key(a) - key(b));
}
function mondayLabel(iso2) {
  const d = /* @__PURE__ */ new Date(iso2 + "T12:00:00");
  d.setDate(d.getDate() - 6);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
var answerOf = (p, week) => p.wellness.find((w) => w.week === week);
function conclusions(players, weeks, week, lang) {
  const es = lang === "es";
  const i = weeks.indexOf(week);
  const prevWeek = i > 0 ? weeks[i - 1] : void 0;
  const done = players.filter((p) => answerOf(p, week));
  const missing = players.filter((p) => !answerOf(p, week));
  const out = [];
  if (!done.length) return [{ level: "info", text: es ? "Nadie ha respondido todav\xEDa esta semana." : "Encara no ha respost ning\xFA aquesta setmana." }];
  out.push({
    level: missing.length > players.length / 3 ? "warn" : "ok",
    text: `${es ? "Han respondido" : "Han respost"} ${done.length} ${es ? "de" : "de"} ${players.length}.` + (missing.length ? ` ${es ? "Faltan" : "Falten"}: ${missing.map((p) => p.name).join(", ")}.` : "")
  });
  const ws = done.map((p) => answerOf(p, week));
  const teamNow = mean(ws.map(wellnessScore));
  const prevWs = prevWeek ? players.map((p) => answerOf(p, prevWeek)).filter((w) => !!w) : [];
  const teamPrev = prevWs.length ? mean(prevWs.map(wellnessScore)) : null;
  const delta = teamPrev === null ? "" : Math.abs(teamNow - teamPrev) < 0.15 ? es ? ", igual que la semana anterior" : ", igual que la setmana anterior" : `, ${teamNow > teamPrev ? es ? "mejor" : "millor" : es ? "peor" : "pitjor"} ${es ? "que la semana anterior" : "que la setmana anterior"} (${fmt(teamPrev)})`;
  out.push({ level: teamNow < 3 ? "bad" : teamNow < 3.5 ? "warn" : "ok", text: `${es ? "Bienestar medio del equipo" : "Benestar mitj\xE0 de l\u2019equip"}: ${fmt(teamNow)}/5${delta}.` });
  const avg = DIMS.map((d) => [d, mean(ws.map((w) => w[d]))]).sort((a, b) => a[1] - b[1]);
  const [weak, weakV] = avg[0];
  const [strong, strongV] = avg[avg.length - 1];
  if (weakV < 3.5) out.push({ level: weakV < 3 ? "bad" : "warn", text: `${es ? "El punto m\xE1s flojo del equipo es" : "El punt m\xE9s fluix de l\u2019equip \xE9s"} ${es ? "el" : "el"} ${dimName(weak, lang)} (${fmt(weakV)}/5): ${DIM_TIP[lang][weak]}.` });
  if (strongV >= 4) out.push({ level: "ok", text: `${es ? "Lo mejor" : "El millor"}: ${dimName(strong, lang)} (${fmt(strongV)}/5).` });
  const slept = done.map((p) => ({ p, h: answerOf(p, week).sleepHours })).filter((x) => !!x.h);
  if (slept.length) {
    const short = slept.filter((x) => x.h < 8);
    const avgH = fmt(mean(slept.map((x) => x.h)));
    out.push({ level: short.length > slept.length / 3 ? "warn" : "ok", text: (es ? `Duermen ${avgH} h de media.` : `Dormen ${avgH} h de mitjana.`) + (short.length ? es ? ` Menos de 8 h: ${short.map((x) => `${x.p.name} (${fmt(x.h)} h)`).join(", ")}. A estas edades se recomiendan 8\u201310 h.` : ` Menys de 8 h: ${short.map((x) => `${x.p.name} (${fmt(x.h)} h)`).join(", ")}. A aquestes edats es recomanen 8\u201310 h.` : "") });
  }
  for (const p of done) {
    const w = answerOf(p, week);
    if (w.pain) {
      let streak = 0;
      for (let j = i; j >= 0 && answerOf(p, weeks[j])?.pain; j--) streak++;
      const phase = phaseNow(p);
      const gp = phase ? growthPain(phase.key, w.pain.zone, lang) : null;
      if (gp) out.push({ level: w.pain.level >= 4 || w.pain.stopped || streak >= 2 ? "bad" : "warn", text: `${p.name} (${phase.label[lang].toLowerCase()}): ${gp}` });
      out.push({
        level: w.pain.level >= 4 || w.pain.stopped ? "bad" : "warn",
        text: `${p.name}: ${es ? "dolor de" : "dolor de"} ${painText(w.pain, lang)}` + (w.pain.stopped ? es ? ", no ha podido entrenar" : ", no ha pogut entrenar" : "") + (streak >= 2 ? ` \xB7 ${streak} ${es ? "semanas seguidas" : "setmanes seguides"}` : "") + `. ${es ? "Revisar antes de entrenar." : "Revisa-ho abans d\u2019entrenar."}`
      });
    } else if (prevWeek && answerOf(p, prevWeek)?.pain) {
      out.push({ level: "ok", text: `${p.name} ${es ? "ya no tiene dolor" : "ja no t\xE9 dolor"} (${es ? "la semana pasada" : "la setmana passada"}: ${painText(answerOf(p, prevWeek).pain, lang)}).` });
    }
  }
  for (const p of missing) {
    const last = [...p.wellness].reverse().find((w) => weeks.indexOf(w.week) < i);
    if (last?.pain) out.push({ level: "warn", text: `${p.name} ${es ? "no ha respondido y la \xFAltima vez ten\xEDa dolor de" : "no ha respost i l\u2019\xFAltima vegada tenia dolor de"} ${painText(last.pain, lang)}. ${es ? "Preg\xFAntale." : "Pregunta-li."}` });
  }
  for (const p of done) {
    const w = answerOf(p, week);
    const low = DIMS.filter((d) => w[d] <= 2);
    const prev = weeks.slice(Math.max(0, i - 4), i).map((x) => answerOf(p, x)).filter((x) => !!x);
    const prevAvg = prev.length ? mean(prev.map(wellnessScore)) : null;
    const now = wellnessScore(w);
    const reasons = [];
    if (low.length) reasons.push(low.map((d) => `${dimName(d, lang)} ${w[d]}/5`).join(", "));
    const repeated = low.filter((d) => prevWeek && (answerOf(p, prevWeek)?.[d] ?? 5) <= 2);
    if (repeated.length) reasons.push(`${repeated.map((d) => dimName(d, lang)).join(", ")} ${es ? "baja tambi\xE9n la semana anterior" : "baix tamb\xE9 la setmana anterior"}`);
    if (prevAvg !== null && now <= prevAvg - 0.8) reasons.push(`${es ? "ha bajado" : "ha baixat"} ${fmt(prevAvg)} \u2192 ${fmt(now)}`);
    if (reasons.length) out.push({ level: low.some((d) => w[d] === 1) || now < 2.6 ? "bad" : "warn", text: `${es ? "Habla con" : "Parla amb"} ${p.name}: ${reasons.join("; ")}.` });
    else if (prevAvg !== null && now >= prevAvg + 0.8) out.push({ level: "ok", text: `${p.name} ${es ? "est\xE1 mucho mejor" : "est\xE0 molt millor"} (${fmt(prevAvg)} \u2192 ${fmt(now)}).` });
  }
  for (const p of done) {
    const c = answerOf(p, week).comment;
    if (!trivial(c)) out.push({ level: "info", text: `${p.name} ${es ? "comenta" : "comenta"}: \xAB${c.trim()}\xBB` });
  }
  if (!out.some((c) => c.level === "bad" || c.level === "warn")) out.push({ level: "ok", text: es ? "Semana tranquila: ninguna alerta." : "Setmana tranquil\xB7la: cap av\xEDs." });
  return out;
}

// src/lib/weeklyEmail.ts
var COLOR = { bad: "#b3261e", warn: "#a8640a", ok: "#1d7a4a", info: "#1f5fbf" };
var esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var item = (level, text) => `<tr><td style="width:14px;vertical-align:top;padding:7px 0 0"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLOR[level]}"></span></td><td style="padding:3px 0 3px 6px;font-size:15px;line-height:1.45">${esc(text)}</td></tr>`;
function weeklyEmail(teams, coach, appUrl, today) {
  const week = mondayLabel(today);
  const blocks = [];
  for (const team of teams) {
    if (!team.players.length) continue;
    const views = deriveTeam(team, "ca", today);
    const weeks = surveyWeeks(team.players, week);
    const notes = conclusions(team.players, weeks, week, "ca").filter((c) => c.level === "bad" || c.level === "warn").slice(0, 8);
    const answered = team.players.filter((p) => p.wellness.some((w) => w.week === week)).length;
    const sessions = team.players.reduce((a, p) => a + loadView(p.loads, today).sessions, 0);
    const wl = warmupLine(team.warmups, today, "ca", team.days);
    blocks.push({ team, summary: [...mondaySummary(views, "ca"), ...wl ? [wl] : []], notes, answered, sessions });
  }
  if (!blocks.length) return null;
  const alerts = blocks.reduce((a, b) => a + b.summary.filter((s) => s.level === "bad" || s.level === "warn").length, 0);
  const subject = alerts ? `Estirada \xB7 Resum de dilluns: ${alerts} ${alerts === 1 ? "av\xEDs" : "avisos"}` : "Estirada \xB7 Resum de dilluns: setmana tranquil\xB7la";
  const html = `<!doctype html><html lang="ca"><body style="margin:0;background:#f3f5f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15202b">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<p style="margin:0 0 4px;font-size:13px;color:#586572">Setmana del ${esc(week)}</p>
<h1 style="margin:0 0 16px;font-size:24px">Bon dia${coach ? `, ${esc(coach.split(" ")[0])}` : ""}</h1>
${blocks.map((b) => `<div style="background:#fff;border-radius:12px;padding:18px 20px;margin:0 0 14px">
<h2 style="margin:0 0 2px;font-size:19px">${esc(b.team.name)}</h2>
<p style="margin:0 0 10px;font-size:13px;color:#586572">Q\xFCestionaris: ${b.answered}/${b.team.players.length}${b.sessions ? ` \xB7 ${b.sessions} esfor\xE7os apuntats aquesta setmana` : ""}</p>
<table role="presentation" style="border-collapse:collapse;width:100%">${b.summary.map((s) => item(s.level, s.text)).join("")}</table>
${b.notes.length ? `<h3 style="margin:14px 0 4px;font-size:15px">Del q\xFCestionari</h3><table role="presentation" style="border-collapse:collapse;width:100%">${b.notes.map((s) => item(s.level, s.text)).join("")}</table>` : ""}
</div>`).join("")}
<p style="margin:18px 0"><a href="${esc(appUrl)}" style="display:inline-block;background:#15202b;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600">Obre Estirada</a></p>
<p style="font-size:12px;color:#586572;line-height:1.5">Orientaci\xF3 per a l\u2019entrenament, no \xE9s un diagn\xF2stic m\xE8dic. Pots deixar de rebre aquest correu des del teu perfil a l\u2019app.</p>
</div></body></html>`;
  const text = blocks.map((b) => [`${b.team.name}`, ...b.summary.map((s) => `- ${s.text}`), ...b.notes.map((s) => `- ${s.text}`)].join("\n")).join("\n\n") + `

${appUrl}`;
  return { subject, html, text };
}

// src/lib/rows.ts
var num = (v) => v === null || v === void 0 ? NaN : Number(v);
var weekLabel = (iso2) => {
  const [, m, d] = iso2.split("-");
  return `${+d}/${+m}`;
};
function assembleTeams({ teams, players, measures, wellness, injuries, loads, warmups = [] }) {
  const byPlayer = (rows, map) => {
    const out = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const k = r.player_id;
      out.set(k, [...out.get(k) ?? [], map(r)]);
    }
    return out;
  };
  const ms = byPlayer(measures, (r) => ({ date: r.date, height: num(r.height), sitting: num(r.sitting), mass: num(r.mass) }));
  const ws = byPlayer(wellness, (r) => ({
    week: weekLabel(r.week),
    energy: num(r.energy),
    sleep: num(r.sleep),
    legs: num(r.legs),
    stress: num(r.stress),
    mood: num(r.mood),
    sleepHours: r.sleep_hours == null ? void 0 : num(r.sleep_hours),
    pain: r.pain_zone ? { zone: r.pain_zone, level: num(r.pain_level), side: r.pain_side ?? "", stopped: !!r.pain_stopped } : null,
    comment: r.comment || void 0
  }));
  const ls = byPlayer(loads, (r) => ({ id: r.id, date: r.date, kind: r.kind, minutes: num(r.minutes), rpe: num(r.rpe) }));
  const is = byPlayer(injuries, (r) => ({ id: r.id, date: r.date, zone: r.zone, note: r.note, status: r.status }));
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    sport: t.sport,
    coach: t.coach,
    survey_token: t.survey_token,
    owner: t.owner,
    days: Array.isArray(t.training_days) ? t.training_days.map(Number) : [],
    warmups: warmups.filter((w) => w.team_id === t.id).map((w) => w.date).sort(),
    players: players.filter((p) => p.team_id === t.id).map((p) => ({
      id: p.id,
      name: p.name,
      sex: p.sex,
      dob: p.dob,
      father: num(p.father),
      mother: num(p.mother),
      measures: ms.get(p.id) ?? [],
      wellness: (ws.get(p.id) ?? []).slice(-8),
      injuries: is.get(p.id) ?? [],
      loads: ls.get(p.id) ?? []
    }))
  }));
}
export {
  assembleTeams,
  weeklyEmail
};
