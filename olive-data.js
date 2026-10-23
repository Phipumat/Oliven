(function () {
  const CFG = window.OLIVE_CONFIG || {};
  const API = (CFG.apiUrl || '').trim();
  const LS = 'olive2026_state_v1';
  const CREW = ['Philippe', 'Teresa', 'Sami', 'Ricardo', 'Tommi', 'Lucas', 'Charles', 'Romy', 'Pierre', 'Willy', 'Marie-Jo', 'Inge', 'Heinz'];
  const START = '2026-10-24', END = '2026-11-08';
  const LAT = 43.9017, LON = 10.6896;
  const BOAR_HOURS = 4;

  const iso = d => { const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const DAYS = (() => { const out = []; for (let d = START; d <= END; d = addDays(d, 1)) out.push(d); return out; })();
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const WD_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const fmtDay = s => { const d = parse(s); return WD[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'; };
  const num = (n, dig = 1) => n == null || isNaN(n) ? '–' : Number(n).toLocaleString('de-DE', { maximumFractionDigits: dig, minimumFractionDigits: 0 });

  const HOUSE = [
    ['wasser', 'Wasser', 'Acqua'], ['strom', 'Strom', 'Corrente'], ['geraete', 'Gerätschaften', 'Attrezzi'],
    ['pool', 'Pool', 'Piscina'], ['holz', 'Feuerholz', 'Legna'], ['gas', 'Gas', 'Gas'], ['wlan', 'WLAN', 'Wi-Fi']
  ];

  function emptyState() {
    const crew = {}; CREW.forEach(n => crew[n] = false);
    return {
      version: 1, updated: null,
      goals: [{ kg: 400, deadline: '2026-10-28' }],
      harvest: [], sectors: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, activeSector: 1,
      crew, mill: [], days: {},
      house: HOUSE.map(([key, de, it]) => ({ key, de, it, pct: 100, note: '' })),
      boar: []
    };
  }

  function demoState() {
    const s = emptyState();
    s.updated = Date.now() - 12 * 60000;
    ['Philippe', 'Teresa', 'Sami', 'Ricardo', 'Lucas', 'Romy', 'Inge', 'Heinz'].forEach(n => s.crew[n] = true);
    const h = (date, kg, sector) => s.harvest.push({ id: Math.random().toString(36).slice(2), date, kg, sector });
    h('2026-10-24', 34, 1); h('2026-10-24', 24, 1);
    h('2026-10-25', 46, 1); h('2026-10-25', 35, 2);
    h('2026-10-26', 41, 2); h('2026-10-26', 33, 2);
    h('2026-10-27', 29, 2); h('2026-10-27', 23, 3);
    s.sectors = { 1: 100, 2: 92, 3: 18, 4: 0, 5: 0 }; s.activeSector = 3;
    s.mill = [{ id: 'm1', date: '2026-10-26', kg: 211, oilKg: 31.2, oilL: 34.1 }];
    s.days = {
      '2026-10-24': { dolceVita: 74, pizzas: 4, puzzle: 9, pool: 18.4, kitchen: [{ t: '07:30', c: 14.1 }, { t: '13:00', c: 19.6 }, { t: '20:30', c: 22.8 }], dish: { name: 'Pici all’aglione', photo: '' } },
      '2026-10-25': { dolceVita: 81, pizzas: 0, puzzle: 21, pool: 18.9, kitchen: [{ t: '07:15', c: 15.0 }, { t: '12:30', c: 20.4 }, { t: '21:00', c: 23.6 }], dish: { name: 'Ribollita', photo: '' } },
      '2026-10-26': { dolceVita: null, pizzas: 7, puzzle: 34, pool: 17.6, kitchen: [{ t: '07:45', c: 13.8 }, { t: '13:30', c: 18.9 }, { t: '20:00', c: 24.1 }], dish: { name: 'Pizza-Abend am Holzofen', photo: '' } },
      '2026-10-27': { dolceVita: 88, pizzas: 2, puzzle: 41, pool: 18.1, kitchen: [{ t: '07:30', c: 14.6 }, { t: '12:45', c: 20.1 }], dish: { name: 'Bruschetta mit frischem Öl', photo: '' } }
    };
    s.house = s.house.map(x => ({ ...x, pct: { wasser: 95, strom: 100, geraete: 70, pool: 80, holz: 38, gas: 55, wlan: 25 }[x.key], note: x.key === 'wlan' ? 'Router im Keller zickt' : x.key === 'geraete' ? 'Rüttler Nr. 2 klemmt' : '' }));
    s.boar = [
      { id: 'b1', ts: Date.now() - 2 * 86400000 - 3 * 3600000, sector: 4, note: 'Spuren am Bach' },
      { id: 'b2', ts: Date.now() - 95 * 60000, sector: 5, note: 'Rotte mit 3 Frischlingen' }
    ];
    return s;
  }

  function normalize(s) {
    const e = emptyState();
    if (!s || typeof s !== 'object') return e;
    const out = Object.assign(e, s);
    CREW.forEach(n => { if (out.crew[n] == null) out.crew[n] = false; });
    return out;
  }

  async function load() {
    if (API) {
      const r = await fetch(API + (API.includes('?') ? '&' : '?') + 'action=get&t=' + Date.now());
      const j = await r.json();
      return normalize(j.state);
    }
    try { const raw = localStorage.getItem(LS); if (raw) return normalize(JSON.parse(raw)); } catch (e) {}
    return demoState();
  }

  async function post(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    return r.json();
  }

  async function save(state, pin) {
    state.updated = Date.now();
    if (API) { const j = await post({ action: 'save', pin, state }); if (!j.ok) throw new Error(j.error || 'Fehler'); return j; }
    localStorage.setItem(LS, JSON.stringify(state));
    return { ok: true };
  }

  async function auth(pin) {
    if (API) { const j = await post({ action: 'auth', pin }); return !!j.ok; }
    return pin === (CFG.demoPin || '2026');
  }

  async function upload(dataUrl, name, pin) {
    if (!API) return dataUrl;
    const j = await post({ action: 'upload', pin, name, data: dataUrl });
    if (!j.ok) throw new Error(j.error || 'Upload fehlgeschlagen');
    return j.url;
  }

  function resizeImage(file, max = 1000, q = 0.75) {
    return new Promise((res, rej) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = rej; img.src = url;
    });
  }

  async function weather() {
    const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day' +
      '&hourly=temperature_2m,precipitation_probability,precipitation,uv_index,soil_temperature_0cm,soil_moisture_0_to_1cm' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max' +
      '&timezone=Europe%2FRome&forecast_days=7';
    const r = await fetch(u); if (!r.ok) throw new Error('Wetter nicht erreichbar'); return r.json();
  }

  function today() { return API ? iso(new Date()) : '2026-10-27'; }
  const harvestByDay = s => { const m = {}; s.harvest.forEach(h => m[h.date] = (m[h.date] || 0) + Number(h.kg || 0)); return m; };
  const totalKg = s => s.harvest.reduce((a, h) => a + Number(h.kg || 0), 0);
  const boarActive = s => { const now = Date.now(); return s.boar.filter(b => !b.ended && now - b.ts >= 0 && now - b.ts < BOAR_HOURS * 3600000).sort((a, b) => b.ts - a.ts)[0] || null; };

  function dolceSuggest(s, date) {
    const d = s.days[date] || {};
    let v = 45;
    v += Math.min(20, (d.pizzas || 0) * 5);
    if (d.pool != null && d.pool !== '') v += Math.max(-10, Math.min(12, (Number(d.pool) - 16) * 2));
    if (d.dish && (d.dish.name || d.dish.photo)) v += 8;
    v += Object.values(s.crew).filter(Boolean).length / CREW.length * 10;
    if ((harvestByDay(s)[date] || 0) > 0) v += 5;
    const k = (d.kitchen || []).map(x => Number(x.c));
    if (k.length) { const avg = k.reduce((a, b) => a + b, 0) / k.length; if (avg >= 18 && avg <= 23) v += 5; }
    return Math.round(Math.max(0, Math.min(100, v)));
  }
  const dolceFor = (s, date) => { const d = s.days[date]; return d && d.dolceVita != null && d.dolceVita !== '' ? { v: Number(d.dolceVita), auto: false } : { v: dolceSuggest(s, date), auto: true }; };

  window.Olive = { API, isDemo: !API, CREW, START, END, DAYS, WD, WD_IT, BOAR_HOURS, iso, parse, addDays, diffDays, fmtDay, num, emptyState, demoState, load, save, auth, upload, resizeImage, weather, today, harvestByDay, totalKg, boarActive, dolceSuggest, dolceFor, resetDemo: () => localStorage.removeItem(LS) };
})();
