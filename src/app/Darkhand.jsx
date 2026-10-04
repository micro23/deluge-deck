import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Activity, Network, HardDrive, Wifi } from 'lucide-react';
import { rpc } from './api.js';
import { createPoller } from '../../server/polling.mjs';
import { storage } from './storage.js';
import { formatBytes } from '../../server/hosted-contracts.mjs';
const rate = n => `${formatBytes(Math.max(0, Number(n) || 0))}/s`;
const limit = n => Number(n) >= 0 ? `${n} KiB/s limit` : 'No limit';

export function DarkhandSwitches({ layout, setLayout }) {
  return <div className="dh-switches">{[['stats', 'Stats', ['above', 'below']], ['details', 'Details', ['right', 'bottom']]].map(([key, label, values]) => <div key={key} role="group" aria-label={`${label} placement`}><span>{label}</span><div>{values.map(value => <button key={value} aria-pressed={layout[key] === value} onClick={() => setLayout(current => ({ ...current, [key]: value }))}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div>)}</div>;
}

export function DarkhandOverview({ stats, counts, onPreferences, fresh, sourceKey }) {
  const [minutes, setMinutes] = useState(() => {
    const n = Number(storage.getItem('deck-darkhand-chart-minutes'));
    return Number.isInteger(n) && n >= 1 && n <= 129600 ? n : 5;
  });
  const [samples, setSamples] = useState([]);
  const [interval, setIntervalValue] = useState(2000);
  const [clock, setClock] = useState(Date.now());
  const [daemonHistory, setDaemonHistory] = useState(false);
  const session = useRef([]);
  const id = useId().replaceAll(':', '');
  useEffect(() => { storage.setItem('deck-darkhand-chart-minutes', minutes); }, [minutes]);
  useEffect(() => { session.current = []; setSamples([]); }, [sourceKey]);
  useEffect(() => {
    if (!fresh) return;
    const now = Date.now();
    session.current = [...session.current, [now, Number(stats.download_rate) || 0, Number(stats.upload_rate) || 0]].filter(row => row[0] >= now - 3600000).slice(-2400);
    if (!daemonHistory) { setSamples(session.current); setClock(now); }
  }, [stats, fresh]);
  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const result = await rpc('delugedeck.get_speed_history', [minutes * 60000, 600]);
        if (!result || !Array.isArray(result.samples) || !Number.isFinite(result.now) || !Number.isFinite(result.interval)) throw new Error('History unavailable');
        if (!alive) return;
        setSamples(result.samples.filter(r => Array.isArray(r) && r.length === 3 && r.every(Number.isFinite)).slice(-1200));
        setIntervalValue(Math.max(2000, result.interval));
        setClock(result.now);
        setDaemonHistory(true);
      } catch {
        if (!alive) return;
        setSamples(session.current.filter(r => r[0] >= Date.now() - minutes * 60000));
        setClock(Date.now());
        setIntervalValue(15000);
        setDaemonHistory(false);
      }
    };
    const poller = createPoller({ refresh: read, visible: () => !document.hidden, delay: () => minutes > 60 ? 60000 : 5000 });
    const wake = () => { void poller.wake(); };
    wake();
    document.addEventListener('visibilitychange', wake);
    return () => { alive = false; poller.stop(); document.removeEventListener('visibilitychange', wake); };
  }, [minutes, sourceKey]);
  const start = clock - minutes * 60000;
  const rows = samples.filter(r => r[0] >= start && r[0] <= clock);
  const max = Math.max(1, ...rows.flatMap(r => [r[1], r[2]])) * 1.2;
  const paths = [1, 2].map(column => {
    let previous;
    return rows.map(row => {
      const command = !previous || row[0] - previous > interval * 2.5 ? 'M' : 'L';
      previous = row[0];
      return `${command}${((row[0] - start) / (minutes * 60000) * 700).toFixed(2)},${(110 - row[column] / max * 100).toFixed(2)}`;
    }).join(' ');
  });
  const area = paths[0].split(/(?=M)/).filter(Boolean).map(path => {
    const xs = [...path.matchAll(/[ML]([\d.]+),/g)].map(match => match[1]);
    return `${path}L${xs.at(-1)},110L${xs[0]},110Z`;
  }).join(' ');
  const fields = [
    [ArrowDown, 'Download', rate(stats.download_rate), limit(stats.max_download), 'down'],
    [ArrowUp, 'Upload', rate(stats.upload_rate), limit(stats.max_upload), 'up'],
    [Activity, 'Active torrents', counts.active, `${counts.downloading} ↓ · ${counts.seeding} ↑`, 'up'],
    [Network, 'Connections', stats.num_connections ?? '—', `of ${Number(stats.max_num_connections) < 0 ? 'unlimited' : stats.max_num_connections ?? '—'} max`, 'purple'],
    [Wifi, 'DHT nodes', stats.dht_nodes ?? '—', stats.has_incoming_connections ? 'Incoming connections OK' : 'No incoming connections', 'neutral'],
    [HardDrive, 'Free space', stats.free_space == null ? 'Checking…' : stats.free_space < 0 ? 'Folder not found' : formatBytes(stats.free_space), stats.free_space < 0 ? <button onClick={onPreferences}>Open Preferences</button> : 'Download folder', 'amber'],
  ];
  return <div className="dh-overview"><section className="dh-stats" aria-label="Live session statistics">{fields.map(([Icon, label, value, caption, tone]) => <div className={`dh-stat ${tone}`} key={label}><i><Icon size={22} /></i><div><span>{label}</span><strong>{value}</strong><small>{caption}</small></div></div>)}</section><section className="dh-chart" aria-label="Transfer speed history"><header><strong>Transfer speed</strong><label><span className="sr-only">Speed chart range</span><select aria-label="Speed chart range" value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{[[5, 'Last 5 minutes'], [60, 'Last hour'], [720, 'Last 12 hours'], [1440, 'Last day'], [43200, 'Last 30 days'], [129600, 'Last 90 days']].map(([n, label]) => <option value={n} key={n}>{label}</option>)}{![5, 60, 720, 1440, 43200, 129600].includes(minutes) && <option value={minutes}>Last {minutes} minutes</option>}</select></label><details><summary>Custom</summary><form onSubmit={e => { e.preventDefault(); const value = Number(new FormData(e.currentTarget).get('minutes')); if (Number.isInteger(value) && value >= 1 && value <= 129600) { setMinutes(value); e.currentTarget.closest('details').open = false; } }}><label>Minutes (up to 90 days)<input name="minutes" type="number" min="1" max="129600" step="1" defaultValue={minutes} required /></label><button>Apply</button></form></details></header><div className="dh-chart-legend"><span>● Download <b>{rate(stats.download_rate)}</b></span><span>● Upload <b>{rate(stats.upload_rate)}</b></span></div><div className="dh-plot"><span>{rate(max)}</span><svg viewBox="0 0 700 125" preserveAspectRatio="none" role="img" aria-label={`${minutes} minutes of download and upload speeds; gaps indicate missing samples`}><defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3ecf8e" stopOpacity=".15" /><stop offset="1" stopColor="#3ecf8e" stopOpacity="0" /></linearGradient></defs>{[10, 60, 110].map(y => <path key={y} d={`M0 ${y}H700`} stroke="#262c37" strokeDasharray="2 5" />)}<path d={area} fill={`url(#${id}-fill)`} />{paths.map((d, i) => <path key={i} d={d} fill="none" stroke={i ? '#5b9dff' : '#3ecf8e'} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />)}</svg><div className="dh-axis">{[start, start + minutes * 30000, clock].map(t => <span key={t}>{minutes >= 1440 ? new Date(t).toLocaleDateString() : new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>)}</div></div><small className="dh-history-note">{daemonHistory ? 'Daemon history · recorded while your browser is closed' : 'Browser session only · enable the Deluge Deck core plugin for persistent history'}{!fresh && ' · connection interrupted'}</small></section></div>;
}

export function DarkhandDetails({ layout, setLayout, children }) {
  const panel = useRef(null);
  const drag = useRef(null);
  const [sideBySide, setSideBySide] = useState(() => window.matchMedia('(min-width:1101px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width:1101px)');
    const update = () => setSideBySide(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const vertical = layout.details === 'bottom' || !sideBySide;
  const resize = value => setLayout(current => ({ ...current, [vertical ? 'height' : 'width']: Math.max(vertical ? 140 : 320, Math.min(vertical ? 600 : 720, Math.round(value))) }));
  return <section ref={panel} className={`dh-details-card ${layout.collapsed ? 'dh-collapsed' : ''}`} aria-label="Torrent details panel">
    {!layout.collapsed && <div className="dh-details-resize" role="separator" aria-label="Resize torrent details" aria-orientation={vertical ? 'horizontal' : 'vertical'} aria-valuemin={vertical ? 140 : 320} aria-valuemax={vertical ? 600 : 720} aria-valuenow={vertical ? layout.height || 250 : layout.width || 400} tabIndex="0"
      onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const r = panel.current.getBoundingClientRect(); drag.current = { x: e.clientX, y: e.clientY, size: vertical ? r.height : r.width }; }}
      onPointerMove={e => { if (drag.current) resize(drag.current.size - (vertical ? e.clientY - drag.current.y : e.clientX - drag.current.x)); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onKeyDown={e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); const r = panel.current.getBoundingClientRect(); resize((vertical ? r.height : r.width) + (['ArrowUp', 'ArrowLeft'].includes(e.key) ? 20 : -20)); } }} />}
    <button className="dh-details-toggle" aria-expanded={!layout.collapsed} onClick={() => setLayout(current => ({ ...current, collapsed: !current.collapsed }))}>{layout.collapsed ? 'Open torrent details' : 'Collapse torrent details'}</button>
    {!layout.collapsed && children}
  </section>;
}
