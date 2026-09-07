import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, AlertTriangle, ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpFromLine, Check, CirclePause, Clock3, Copy, Download, FileArchive, FolderOpen, HardDriveDownload, Info, Keyboard, LayoutDashboard, ListFilter, Magnet, Menu, MoreHorizontal, Network, Palette, Pause, Play, Plus, RefreshCw, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, Sun, Trash2, UploadCloud, X, Zap } from 'lucide-react';
import { authenticateAndConnectHosted, createRequestGate, formatBytes, normalizeTorrentFiles, serializeRpcRequest } from '../server/hosted-contracts.mjs';
import './styles.css';

const VERSION = '1.0.0';
// Bootstrap and the compiled app are injected as separate Deluge Web scripts.
// Keep this dynamic so an early app evaluation adopts hosted mode once bootstrap
// has installed its globals rather than becoming permanently standalone.
const pluginMode = () => Boolean(window.__DELUGE_DECK_PLUGIN__);
const UI_KEYS = ['queue', 'name', 'state', 'progress', 'total_size', 'total_done', 'total_uploaded', 'download_payload_rate', 'upload_payload_rate', 'eta', 'ratio', 'num_seeds', 'total_seeds', 'num_peers', 'total_peers', 'tracker_host', 'save_path', 'download_location', 'time_added', 'completed_time', 'active_time', 'seeding_time', 'num_files', 'message'];
const hostedUrl = (resource) => new URL(resource, new URL('.', document.baseURI)).toString();
const endpoint = (resource) => pluginMode() ? hostedUrl(resource) : resource;
const mapTorrents = (data) => Object.entries(data?.torrents || {}).map(([hash, torrent]) => ({ ...torrent, hash }));
const stateKey = (state = '') => state.toLowerCase().replaceAll(' ', '-');
const shortHash = (hash = '') => `${hash.slice(0, 7)}…${hash.slice(-5)}`;
const rate = (value = 0) => value ? `${formatBytes(value)}/s` : '—';
const eta = (value = 0) => { const n = Number(value) || 0; if (!n || n >= 8640000) return '—'; return n < 3600 ? `${Math.floor(n / 60)}m` : `${Math.floor(n / 3600)}h ${Math.floor(n % 3600 / 60)}m`; };
const icons = { downloading: ArrowDownToLine, seeding: ArrowUpFromLine, paused: CirclePause, queued: Clock3, checking: RefreshCw, error: AlertTriangle };
const THEMES = [
  ['dark', 'Midnight', 'The original cool, low-light workspace.'],
  ['light', 'Paper', 'High-contrast daylight reading.'],
  ['ocean', 'Ocean', 'Deep navy with clear aqua signals.'],
  ['forest', 'Forest', 'Grounded greens and warm parchment.'],
  ['sunset', 'Sunset', 'Ink blue with coral highlights.'],
  ['christmas', 'Christmas', 'Evergreen, cranberry, and snow.'],
  ['halloween', 'Halloween', 'Night violet and harvest orange.'],
  ['valentine', 'Valentine’s', 'Rose quartz and berry ink.'],
  ['st-patricks', 'St. Patrick’s', 'Clover green and cream.'],
  ['independence', 'Independence', 'Stars, stripes, and midnight blue.'],
  ['new-year', 'New Year', 'Champagne gold over black.'],
];
const REFRESH_OPTIONS = [[1500, 'Every 1.5 seconds'], [3000, 'Every 3 seconds'], [5000, 'Every 5 seconds'], [10000, 'Every 10 seconds']];
const deckModalState = { locked: false };

async function rpc(method, params = []) {
  const response = await fetch(endpoint(pluginMode() ? 'json' : '/api/rpc'), { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: serializeRpcRequest({ method, params, id: Date.now() }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error?.message || payload.error || 'Deluge request failed.');
  return payload.result;
}
const api = {
  session: async () => {
    if (!pluginMode()) return fetch('/api/session').then((response) => response.json());
    const authenticated = await rpc('auth.check_session').catch(() => false);
    const connected = authenticated ? await rpc('web.connected').catch(() => false) : false;
    return { mode: 'plugin', authenticated, connected, delugeUrl: window.location.origin };
  },
  torrents: () => pluginMode() ? rpc('web.update_ui', [UI_KEYS, {}]).then((result) => ({ ...result, fetchedAt: Date.now() })) : fetch('/api/torrents').then((response) => { if (!response.ok) throw new Error('Session expired'); return response.json(); }),
  connect: async (url, password) => {
    if (pluginMode()) {
      await authenticateAndConnectHosted(rpc, password);
      const result = await api.session();
      if (!result.connected) throw new Error('Deluge Web is authenticated but has not connected to a daemon host.');
      return result;
    }
    const response = await fetch('/api/session/connect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, password }) });
    const result = await response.json();
    if (!response.ok || !result.authenticated || !result.connected) throw new Error(result.error || 'Unable to connect to Deluge.');
    return result;
  },
  disconnect: () => pluginMode() ? rpc('auth.delete_session').catch(() => undefined) : fetch('/api/session/disconnect', { method: 'POST' }),
  upload: async (files) => {
    const form = new FormData(); files.forEach((file) => form.append('file', file));
    const response = await fetch(endpoint(pluginMode() ? 'upload' : '/api/upload'), { method: 'POST', credentials: 'same-origin', body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.files?.length) throw new Error(result.error || 'Deluge did not accept those torrent files.');
    return result.files;
  },
};

function Brand() { return <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><strong>Deluge</strong><small>control center</small></div></div>; }
function Login({ onConnect, mode }) {
  const [url, setUrl] = useState('http://127.0.0.1:8112'); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await onConnect(url, password); } catch (reason) { setError(reason.message); } finally { setBusy(false); } };
  return <main className="login-shell"><div className="login-orb orb-one" /><div className="login-orb orb-two" /><section className="login-card"><Brand /><div className="login-intro"><div className="eyebrow"><ShieldCheck size={14} /> PRIVATE BY DEFAULT</div><h1>Torrent UI,<br /><em>Modernized</em></h1><p>A focused, modern control center for Deluge.</p></div><form onSubmit={submit} className="login-form">{!pluginMode() && <label>Deluge Web address<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="http://127.0.0.1:8112" /></label>}<label>Web password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your Deluge Web password" autoFocus /></label>{error && <div className="form-error"><AlertTriangle size={15} />{error}</div>}<button className="primary-button wide" disabled={busy}>{busy ? <RefreshCw className="spin" size={17} /> : <Zap size={17} />}{busy ? 'Connecting…' : 'Connect to Deluge'}</button></form><div className="login-foot"><span><span className="status-dot live" /> {pluginMode() ? 'same-origin Deluge Web' : 'localhost only'}</span><span>Deluge {mode === 'demo' ? 'demo' : VERSION}</span></div></section></main>;
}
function Sidebar({ filter, setFilter, torrents, onAdd, onPreferences, collapsed, setCollapsed }) {
  const counts = useMemo(() => ({ all: torrents.length, active: torrents.filter((torrent) => ['Downloading', 'Seeding'].includes(torrent.state)).length, downloading: torrents.filter((torrent) => torrent.state === 'Downloading').length, seeding: torrents.filter((torrent) => torrent.state === 'Seeding').length, paused: torrents.filter((torrent) => torrent.state === 'Paused').length }), [torrents]);
  const items = [['all', 'All torrents', LayoutDashboard], ['active', 'Active now', Activity], ['downloading', 'Downloading', ArrowDownToLine], ['seeding', 'Seeding', ArrowUpFromLine], ['paused', 'Paused', CirclePause]];
  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}><div className="sidebar-top"><Brand /><button className="icon-button collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed}><Menu size={18} /></button></div><button className="add-button" onClick={onAdd}><Plus size={18} /><span>Add torrent</span></button><nav aria-label="Torrent filters"><div className="nav-label">Library</div>{items.map(([key, label, Icon]) => <button key={key} className={`nav-item ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}><Icon size={17} /><span>{label}</span><b>{counts[key]}</b></button>)}</nav><div className="sidebar-spacer" /><div className="sidebar-bottom"><button className="nav-item" onClick={onPreferences}><Settings2 size={17} /><span>Preferences</span></button></div></aside>;
}
function ThemeMenu({ theme, setTheme }) {
  const [open, setOpen] = useState(false);
  const selected = THEMES.find(([key]) => key === theme) || THEMES[0];
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  return <div className="theme-menu"><button className="icon-button theme-trigger" onClick={() => setOpen((value) => !value)} aria-label={`Choose color theme; current theme ${selected[1]}`} title={`Theme: ${selected[1]}`} aria-expanded={open}><Palette size={17} /><span className="theme-name">{selected[1]}</span></button>{open && <div className="theme-popover" role="menu" aria-label="Color themes">{THEMES.map(([key, label]) => <button key={key} className={theme === key ? 'active' : ''} onClick={() => { setTheme(key); setOpen(false); }} role="menuitemradio" aria-checked={theme === key}><span className={`theme-swatch ${key}`} />{label}{theme === key && <Check size={14} />}</button>)}</div>}</div>;
}
function SearchField({ search, setSearch }) { return <div className="search-wrap"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search torrents, trackers, labels…" aria-label="Search torrents" />{search && <button className="clear-search" onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}</div>; }
function Topbar({ stats, theme, setTheme, disconnect, onPreferences }) { return <header className="topbar"><div className="mobile-brand"><Brand /></div><div className="topbar-heading"><h1>Deluge</h1></div><div className="top-actions"><ThemeMenu theme={theme} setTheme={setTheme} /><button className="icon-button mobile-preferences" onClick={onPreferences} aria-label="Open Deluge Preferences"><Settings2 size={18} /></button><button className="avatar" onClick={disconnect} title="Disconnect">DD</button></div><div className="mobile-stats"><span><ArrowDown size={13} />{rate(stats.download_rate)}</span><span><ArrowUp size={13} />{rate(stats.upload_rate)}</span></div></header>; }
function Progress({ value = 0, state }) { return <div className="progress-wrap"><div className="progress-track"><div className={`progress-bar ${stateKey(state)}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div><span>{Number(value).toFixed(value % 1 ? 1 : 0)}%</span></div>; }
function TorrentTable({ torrents, selected, setSelected, onOpen, onMenu, loading, onAdd }) {
  const allSelected = torrents.length && torrents.every((torrent) => selected.has(torrent.hash));
  return <div className="table-shell"><table><thead><tr><th className="check-cell"><input type="checkbox" checked={Boolean(allSelected)} onChange={() => setSelected(allSelected ? new Set() : new Set(torrents.map((torrent) => torrent.hash)))} aria-label="Select all filtered torrents" /></th><th>Torrent</th><th>State</th><th>Progress</th><th>Size</th><th>↓ Download</th><th>↑ Upload</th><th>ETA</th><th>Ratio</th><th /></tr></thead><tbody>{loading ? Array.from({ length: 5 }).map((_, index) => <tr key={index} className="skeleton-row"><td /><td><span /><span /></td><td><i /></td><td><span /></td><td><i /></td><td><i /></td><td><i /></td><td><i /></td><td><i /></td><td /></tr>) : torrents.length ? torrents.map((torrent) => { const Icon = icons[stateKey(torrent.state)] || Info; return <tr key={torrent.hash} className={selected.has(torrent.hash) ? 'selected' : ''} onDoubleClick={() => onOpen(torrent)}><td className="check-cell"><input type="checkbox" checked={selected.has(torrent.hash)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(torrent.hash) ? next.delete(torrent.hash) : next.add(torrent.hash); return next; })} aria-label={`Select ${torrent.name}`} /></td><td className="name-cell"><div className="name-content"><div className={`state-icon ${stateKey(torrent.state)}`}><Icon size={15} /></div><div className="torrent-name"><strong title={torrent.name}>{torrent.name}</strong><span>{torrent.label || torrent.tracker_host || shortHash(torrent.hash)}</span></div></div></td><td><span className={`state-badge ${stateKey(torrent.state)}`}><i />{torrent.state}</span></td><td><Progress value={torrent.progress} state={torrent.state} /></td><td>{formatBytes(torrent.total_size)}</td><td className="rate-cell down">{rate(torrent.download_payload_rate)}</td><td className="rate-cell up">{rate(torrent.upload_payload_rate)}</td><td>{eta(torrent.eta)}</td><td className="ratio-cell">{Number(torrent.ratio || 0).toFixed(2)}</td><td><button className="row-menu" onClick={(event) => { event.stopPropagation(); onMenu(torrent, event); }} aria-label={`Actions for ${torrent.name}`}><MoreHorizontal size={17} /></button></td></tr>; }) : <tr><td colSpan="10"><div className="empty-table"><div className="empty-icon"><ListFilter size={22} /></div><h3>No torrents here</h3><p>Try another filter or add a torrent.</p><button className="secondary-button" onClick={onAdd}><Plus size={16} /> Add torrent</button></div></td></tr>}</tbody></table></div>;
}
function Detail({ label, value }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>; }
function DetailDrawer({ torrent, onClose, onAction }) {
  const [tab, setTab] = useState('overview'); const [files, setFiles] = useState([]); const [fileState, setFileState] = useState({ status: 'idle', error: '' }); const gate = useRef(createRequestGate());
  const loadFiles = async () => { const token = gate.current.begin(); setFileState({ status: 'loading', error: '' }); setFiles([]); let failure; for (let attempt = 0; attempt < 2; attempt += 1) { try { const result = normalizeTorrentFiles(await rpc('web.get_torrent_files', [torrent.hash])); if (!gate.current.isCurrent(token)) return; setFiles(result); setFileState({ status: 'ready', error: '' }); return; } catch (error) { failure = error; } } if (gate.current.isCurrent(token)) setFileState({ status: 'error', error: failure?.message || 'Deluge did not return file details.' }); };
  useEffect(() => { setTab('overview'); loadFiles(); return () => gate.current.cancel(); }, [torrent.hash]);
  return <aside className="detail-drawer" aria-label="Torrent details"><div className="drawer-head"><div><span className="drawer-eyebrow">TORRENT DETAILS</span><h2>{torrent.name}</h2><button className="hash-button" onClick={() => navigator.clipboard?.writeText(torrent.hash)}><Copy size={12} />{shortHash(torrent.hash)}</button></div><button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18} /></button></div><div className="drawer-tabs" role="tablist">{['overview', 'files'].map((name) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)} role="tab" aria-selected={tab === name}>{name}</button>)}</div>{tab === 'overview' ? <div className="drawer-content"><div className="drawer-progress"><div><span>Progress</span><strong>{Number(torrent.progress).toFixed(1)}%</strong></div><Progress value={torrent.progress} state={torrent.state} /></div><div className="detail-grid"><Detail label="Status" value={torrent.state} /><Detail label="Size" value={formatBytes(torrent.total_size)} /><Detail label="Downloaded" value={formatBytes(torrent.total_done)} /><Detail label="Uploaded" value={formatBytes(torrent.total_uploaded)} /><Detail label="Download" value={rate(torrent.download_payload_rate)} /><Detail label="Upload" value={rate(torrent.upload_payload_rate)} /><Detail label="ETA" value={eta(torrent.eta)} /><Detail label="Ratio" value={Number(torrent.ratio || 0).toFixed(2)} /></div><div className="detail-section"><span className="section-label">Storage</span><div className="path-box"><FolderOpen size={15} /><span>{torrent.save_path || torrent.download_location || 'Not reported by Deluge'}</span></div></div></div> : <div className="drawer-content"><div className="files-toolbar"><span>{fileState.status === 'loading' ? 'Loading file details…' : `${files.length || torrent.num_files || 0} files`}</span>{fileState.status === 'error' && <button className="secondary-button small" onClick={loadFiles}>Retry</button>}</div>{fileState.status === 'error' ? <div className="muted-empty"><AlertTriangle size={22} /><h3>File details unavailable</h3><p>{fileState.error}</p><button className="secondary-button" onClick={loadFiles}>Retry details</button></div> : <div className="file-list">{files.length ? files.map((file, index) => <div className="file-row" key={`${file.path}-${index}`}><FileArchive size={15} /><span>{file.path}</span><small>{formatBytes(file.size)}</small><i style={{ width: `${file.progress || 0}%` }} /></div>) : <div className="muted-empty"><FileArchive size={22} /><p>{fileState.status === 'loading' ? 'Asking Deluge for file details…' : 'Deluge reports no file details for this torrent.'}</p></div>}</div>}</div>}<div className="drawer-footer"><button className="secondary-button" onClick={() => onAction(torrent.state === 'Paused' ? 'resume' : 'pause')}>{torrent.state === 'Paused' ? <Play size={15} /> : <Pause size={15} />}{torrent.state === 'Paused' ? 'Resume' : 'Pause'}</button><button className="secondary-button" onClick={() => onAction('recheck')}><RotateCcw size={15} /> Recheck</button></div></aside>;
}
function RemoveModal({ targets, onClose, onRemove, onModalState }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { const locked = busy || Boolean(error); deckModalState.locked = locked; onModalState?.(locked); return () => { deckModalState.locked = false; onModalState?.(false); }; }, [busy, error, onModalState]);
  const remove = async (removeData) => { deckModalState.locked = true; setBusy(true); setError(''); try { await onRemove(removeData); } catch (reason) { setError(reason.message || 'Deluge could not remove the selected torrent.'); } finally { setBusy(false); } };
  const label = `${targets.length} torrent${targets.length === 1 ? '' : 's'}`;
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}><section className="remove-modal" role="dialog" aria-modal="true" aria-labelledby="remove-title"><div className="modal-head"><div><span className="drawer-eyebrow">REMOVE TRANSFER</span><h2 id="remove-title">Remove {label}?</h2></div><button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close remove options"><X size={18} /></button></div><div className="remove-body"><AlertTriangle size={24} /><div><p>Choose exactly what Deluge should remove. This cannot be undone.</p>{error && <div className="form-error" role="alert"><AlertTriangle size={15} />{error}</div>}</div></div><div className="remove-choices"><button className="remove-choice" onClick={() => remove(false)} disabled={busy}><div><strong>Remove torrent only</strong><span>Keep downloaded data on disk.</span></div><Trash2 size={18} /></button><button className="remove-choice destructive" onClick={() => remove(true)} disabled={busy}><div><strong>Remove torrent and data</strong><span>Delete downloaded data from Deluge’s storage.</span></div><Trash2 size={18} /></button></div><div className="modal-foot"><span>Deluge performs the selected operation.</span><button className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button></div></section></div>;
}
function PreferencesModal({ refreshMs, setRefreshMs, onClose, onOpenNative }) {
  const nativeAvailable = pluginMode() && typeof window.deluge?.preferences?.show === 'function';
  return <div className="modal-backdrop preferences-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="preferences-modal" role="dialog" aria-modal="true" aria-labelledby="preferences-title"><div className="preferences-head"><div className="preferences-heading"><div className="preferences-logo" aria-hidden="true"><div className="brand-mark"><span /><span /><span /></div></div><h2 id="preferences-title">Deluge Preferences</h2><Settings2 size={17} aria-hidden="true" /></div><button className="icon-button" onClick={onClose} aria-label="Close preferences"><X size={24} /></button></div><div className="preferences-content"><section className="preferences-card refresh-preference"><div className="preferences-card-icon"><RefreshCw size={22} /></div><div className="preferences-card-copy"><strong>Auto-Refresh Interval</strong><span>Adjust frequency of dashboard updates.</span></div><label className="preferences-select"><span>Interval</span><select value={refreshMs} onChange={(event) => setRefreshMs(Number(event.target.value))} aria-label="Dashboard refresh interval">{REFRESH_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label.replace(' seconds', 's').replace(' second', 's')}</option>)}</select></label></section><section className="preferences-card keyboard-help"><div className="preferences-card-icon"><Keyboard size={22} /></div><div className="preferences-card-copy"><strong>Keyboard Shortcuts</strong><span>Access quick controls with these keys.</span></div><div className="shortcut-keys" aria-label="Keyboard shortcuts"><kbd title="Add torrent">A</kbd><kbd title="Focus search">/</kbd><kbd title="Cycle themes">T</kbd><kbd title="Close panels">Esc</kbd></div><span className="shortcut-summary"><kbd>T</kbd> cycles themes</span></section><section className="preferences-card native-preferences"><div className="preferences-card-icon"><Settings2 size={22} /></div><div className="preferences-card-copy"><strong>Native Application Preferences</strong><span>Open the core Deluge application settings panel.</span></div><button className="secondary-button" onClick={onOpenNative} disabled={!nativeAvailable} aria-label="Open native Deluge Preferences"><Settings2 size={16} />{nativeAvailable ? 'Open Native Panel' : 'Native Panel Unavailable'}</button></section></div><div className="preferences-footer"><span>Settings are saved locally in your browser.</span><button className="primary-button" onClick={onClose}>Done</button></div></section></div>;
}
function DeckPreferences({ onClose }) {
  const [refreshMs, setRefreshMs] = useState(() => Number(localStorage.getItem('deck-refresh-ms')) || 1500);
  useEffect(() => { localStorage.setItem('deck-refresh-ms', String(refreshMs)); window.dispatchEvent(new CustomEvent('deck-settings', { detail: { refreshMs } })); }, [refreshMs]);
  const openNative = () => {
    const preferences = window.deluge?.preferences;
    if (pluginMode() && typeof preferences?.show === 'function') {
      onClose();
      requestAnimationFrame(() => {
        if (typeof window.__DELUGE_DECK_SHOW_NATIVE_PREFERENCES__ === 'function') window.__DELUGE_DECK_SHOW_NATIVE_PREFERENCES__();
        else preferences.show();
      });
    }
  };
  return <PreferencesModal refreshMs={refreshMs} setRefreshMs={setRefreshMs} onClose={onClose} onOpenNative={openNative} />;
}
function AddModal({ initialFiles = [], onClose, onAdded, onModalState }) {
  if (initialFiles?.kind === 'remove') return <RemoveModal targets={initialFiles.targets} onClose={onClose} onModalState={onModalState} onRemove={async (removeData) => { await rpc('core.remove_torrents', [initialFiles.targets, removeData]); await onAdded(); onClose(); }} />;
  if (initialFiles?.kind === 'preferences') return <DeckPreferences onClose={onClose} />;
  return <AddTorrentModal initialFiles={initialFiles} onClose={onClose} onAdded={onAdded} onModalState={onModalState} />;
}
function AddTorrentModal({ initialFiles = [], onClose, onAdded, onModalState }) {
  const [tab, setTab] = useState('files'); const [files, setFiles] = useState(initialFiles); const [magnet, setMagnet] = useState(''); const [url, setUrl] = useState(''); const [path, setPath] = useState(''); const [paused, setPaused] = useState(false); const [sequential, setSequential] = useState(false); const [busy, setBusy] = useState(false); const [dragging, setDragging] = useState(false); const [error, setError] = useState(''); const input = useRef();
  useEffect(() => { const locked = busy || Boolean(error); deckModalState.locked = locked; onModalState?.(locked); return () => { deckModalState.locked = false; onModalState?.(false); }; }, [busy, error, onModalState]);
  const addFiles = (items) => { const next = Array.from(items || []).filter((file) => file.name?.toLowerCase().endsWith('.torrent')); setFiles((current) => [...current, ...next]); setDragging(false); };
  const submit = async () => { deckModalState.locked = true; setBusy(true); setError(''); try { if (tab === 'magnet' && magnet.trim()) await rpc('core.add_torrent_magnet', [magnet.trim(), { download_location: path, add_paused: paused, sequential_download: sequential }]); else if (tab === 'url' && url.trim()) await rpc('core.add_torrent_url', [url.trim(), { download_location: path, add_paused: paused, sequential_download: sequential }]); else if (files.length) { const uploaded = await api.upload(files); await rpc('web.add_torrents', [uploaded.map((file) => ({ path: file, options: { download_location: path, add_paused: paused, sequential_download: sequential } }))]); } else throw new Error('Choose a .torrent file, magnet link, or URL first.'); onAdded(); onClose(); } catch (reason) { setError(reason.message || 'Deluge could not add this torrent.'); } finally { setBusy(false); } };
  if (error) return <div className="modal-backdrop"><section className="add-modal modal-message" role="dialog" aria-modal="true" aria-labelledby="add-error-title"><div className="modal-head"><div><span className="drawer-eyebrow">ADD TRANSFER</span><h2 id="add-error-title">Deluge could not add this torrent</h2></div><button className="icon-button" onClick={onClose} aria-label="Close add error"><X size={18} /></button></div><div className="modal-message-body"><AlertTriangle size={24} /><p>{error}</p></div><div className="modal-foot"><span>Your review details are still available.</span><button className="primary-button" onClick={() => setError('')}>Return to review</button></div></section></div>;
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><div className="modal-head"><div><span className="drawer-eyebrow">NEW TRANSFER</span><h2 id="add-title">Review torrent</h2></div><button className="icon-button" onClick={onClose} aria-label="Close add torrent"><X size={18} /></button></div><div className="add-tabs">{[['files', FileArchive, 'Torrent files'], ['magnet', Magnet, 'Magnet link'], ['url', Download, 'Torrent URL']].map(([key, Icon, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={16} />{label}</button>)}</div>{tab === 'files' && <div className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }} onClick={() => input.current?.click()}><input ref={input} type="file" accept=".torrent" multiple hidden onChange={(event) => addFiles(event.target.files)} /><div className="drop-icon"><UploadCloud size={25} /></div><strong>Drop .torrent files here</strong><span>They will be reviewed before anything is sent to Deluge.</span>{files.length > 0 && <div className="file-chips">{files.map((file, index) => <span key={`${file.name}-${index}`}><FileArchive size={13} />{file.name}<button onClick={(event) => { event.stopPropagation(); setFiles((current) => current.filter((_, item) => item !== index)); }} aria-label={`Remove ${file.name}`}><X size={12} /></button></span>)}</div>}</div>}{tab === 'magnet' && <div className="link-panel"><Magnet size={21} /><label>Magnet URI<textarea value={magnet} onChange={(event) => setMagnet(event.target.value)} placeholder="magnet:?xt=urn:btih:…" autoFocus /></label><span>Deluge fetches metadata only after you confirm.</span></div>}{tab === 'url' && <div className="link-panel"><Download size={21} /><label>Torrent URL<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/file.torrent" autoFocus /></label><span>Only the torrent metadata is downloaded.</span></div>}<div className="add-options"><label className="path-label"><FolderOpen size={15} /> Download to<input value={path} onChange={(event) => setPath(event.target.value)} placeholder="Use Deluge default" /></label><label className="toggle-row"><input type="checkbox" checked={paused} onChange={(event) => setPaused(event.target.checked)} /><span className="toggle" />Add paused</label><label className="toggle-row"><input type="checkbox" checked={sequential} onChange={(event) => setSequential(event.target.checked)} /><span className="toggle" />Sequential download</label></div><div className="modal-foot"><span><ShieldCheck size={14} /> Nothing is added until you confirm</span><button className="primary-button" onClick={submit} disabled={busy}>{busy ? <RefreshCw className="spin" size={16} /> : <Plus size={16} />}{busy ? 'Adding…' : 'Add to Deluge'}</button></div></section></div>;
}
function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('deck-sidebar-collapsed') === 'true');
  useEffect(() => {
    if (!pluginMode()) return;
    document.documentElement.classList.add('deluge-deck-ready');
    document.documentElement.classList.remove('deluge-deck-loading');
  }, []);
  useEffect(() => { localStorage.setItem('deck-sidebar-collapsed', String(sidebarCollapsed)); }, [sidebarCollapsed]);
  const [connected, setConnected] = useState(false); const [sessionData, setSessionData] = useState(null); const [sessionReady, setSessionReady] = useState(false); const [torrents, setTorrents] = useState([]); const [stats, setStats] = useState({}); const [loading, setLoading] = useState(true); const [stale, setStale] = useState(false); const [filter, setFilter] = useState(() => localStorage.getItem('deck-filter') || 'all'); const [search, setSearch] = useState(''); const [selected, setSelected] = useState(new Set()); const [detail, setDetail] = useState(null); const [addFiles, setAddFiles] = useState(null); const [menuTorrent, setMenuTorrent] = useState(null); const [menuPosition, setMenuPosition] = useState(null); const [theme, setTheme] = useState(() => localStorage.getItem('deck-theme') || 'dark'); const [refreshMs, setRefreshMs] = useState(() => Number(localStorage.getItem('deck-refresh-ms')) || 1500); const [notice, setNotice] = useState('');
  const refresh = async () => { try { const data = await api.torrents(); const next = mapTorrents(data); setTorrents(next); setStats(data.stats || {}); setDetail((current) => current && (next.find((torrent) => torrent.hash === current.hash) || null)); setStale(false); } catch { setStale(true); } finally { setLoading(false); } };
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('deck-theme', theme); }, [theme]);
  useEffect(() => { api.session().then((result) => { setSessionData(result); setConnected(Boolean(result.authenticated && (result.connected || result.mode === 'demo'))); result.authenticated ? refresh() : setLoading(false); }).catch(() => setLoading(false)).finally(() => setSessionReady(true)); }, []);
  useEffect(() => { if (!connected) return undefined; const timer = setInterval(refresh, refreshMs); return () => clearInterval(timer); }, [connected, refreshMs]);
  useEffect(() => { const syncSettings = (event) => { if (event.detail?.theme) setTheme(event.detail.theme); if (event.detail?.refreshMs) setRefreshMs(event.detail.refreshMs); }; window.addEventListener('deck-settings', syncSettings); return () => window.removeEventListener('deck-settings', syncSettings); }, []);
  useEffect(() => { localStorage.setItem('deck-filter', filter); setSelected(new Set()); }, [filter]);
  const filtered = useMemo(() => torrents.filter((torrent) => { const allowed = filter === 'all' || (filter === 'active' ? ['Downloading', 'Seeding'].includes(torrent.state) : stateKey(torrent.state) === filter); return allowed && (!search || `${torrent.name} ${torrent.hash} ${torrent.tracker_host || ''}`.toLowerCase().includes(search.toLowerCase())); }), [torrents, filter, search]);
  useEffect(() => {
    const keys = (event) => {
      const panelOpen = Boolean(addFiles || detail || menuTorrent);
      if (event.key === 'Escape') {
        if (!deckModalState.locked) {
          event.preventDefault();
          setAddFiles(null);
          setDetail(null);
          setMenuTorrent(null);
        }
        return;
      }
      const selector = 'input,textarea,select,button,a,[contenteditable="true"],[role="button"],[role="menuitem"],[tabindex]:not([tabindex="-1"])';
      const active = document.activeElement;
      const target = event.target instanceof Element ? event.target : null;
      if (active?.matches?.(selector) || target?.closest?.(selector) || panelOpen) return;
      if (event.key === '/') { event.preventDefault(); document.querySelector('.search-wrap input')?.focus(); }
      if (event.key.toLowerCase() === 'a') { event.preventDefault(); setAddFiles([]); }
      if (event.key.toLowerCase() === 't' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat) {
        event.preventDefault();
        setTheme((current) => {
          const index = THEMES.findIndex(([key]) => key === current);
          return THEMES[(index + 1 + THEMES.length) % THEMES.length][0];
        });
      }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [addFiles, detail, menuTorrent]);
  const act = async (action, target = [...selected]) => { if (!target.length) return; if (action === 'remove') { setMenuTorrent(null); setAddFiles({ kind: 'remove', targets: target }); return; } const methods = { pause: 'core.pause_torrents', resume: 'core.resume_torrents', recheck: 'core.force_recheck' }; try { if (methods[action]) await rpc(methods[action], [target]); setSelected(new Set()); setMenuTorrent(null); await refresh(); } catch (reason) { setNotice(reason.message || 'Deluge could not complete that action.'); } };
  const openPreferences = () => setAddFiles({ kind: 'preferences' });
  const drop = (event) => { const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.name?.toLowerCase().endsWith('.torrent')); if (!files.length) return; event.preventDefault(); setAddFiles(files); };
  if (!sessionReady) return <div className="deck-boot-splash">Deluge</div>;
  if (!connected) return <Login mode={sessionData?.mode} onConnect={async (url, password) => { const result = await api.connect(url, password); setSessionData(result); setConnected(result.connected); await refresh(); }} />;
  return <div className="app-shell" onDragOver={(event) => { if (Array.from(event.dataTransfer?.types || []).includes('Files')) event.preventDefault(); }} onDrop={drop}><Sidebar filter={filter} setFilter={setFilter} torrents={torrents} onAdd={() => setAddFiles([])} onPreferences={openPreferences} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} /><main className="main-content"><Topbar stats={stats} theme={theme} setTheme={setTheme} onPreferences={openPreferences} disconnect={async () => { await api.disconnect(); setConnected(false); }} /><section className="workspace">{notice && <div className="form-error" role="status"><AlertTriangle size={15} />{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={14} /></button></div>}<SearchField search={search} setSearch={setSearch} /><div className="page-heading"><div><h1>Your <em>torrent deck.</em></h1><p>Drop a .torrent anywhere  to open a review dialog.</p></div><button className="primary-button" onClick={() => setAddFiles([])}><Plus size={17} /> Add torrent</button></div><div className="stats-grid"><Stat icon={Download} label="Download" value={rate(stats.download_rate)} detail="Current rate" /><Stat icon={UploadCloud} label="Upload" value={rate(stats.upload_rate)} detail="Current rate" tone="violet" /><Stat icon={Network} label="Connections" value={stats.num_connections || 0} detail={`${stats.dht_nodes || 0} DHT nodes`} tone="amber" /><Stat icon={HardDriveDownload} label="Library" value={torrents.length} detail={`${torrents.filter((torrent) => torrent.state === 'Seeding').length} seeding`} tone="green" /></div><div className="list-heading"><div><h2>Torrents <span>{filtered.length}</span></h2></div></div>{search && <div className="search-note"><Search size={14} /> Showing results for <strong>“{search}”</strong><button onClick={() => setSearch('')}>Clear</button></div>}<TorrentTable torrents={filtered} selected={selected} setSelected={setSelected} onOpen={setDetail} onMenu={(torrent, event) => { const rect = event.currentTarget.getBoundingClientRect(); const width = 205; const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width)); setMenuPosition({ top: rect.bottom + 8, left }); setMenuTorrent(menuTorrent?.hash === torrent.hash ? null : torrent); }} loading={loading} onAdd={() => setAddFiles([])} /></section></main>{selected.size > 0 && <div className="bulk-bar"><div className="bulk-count"><span>{selected.size}</span> selected</div><div className="bulk-actions"><button onClick={() => act('resume')}><Play size={15} /> Resume</button><button onClick={() => act('pause')}><Pause size={15} /> Pause</button><button onClick={() => act('recheck')}><RotateCcw size={15} /> Recheck</button><button className="danger" onClick={() => act('remove')}><Trash2 size={15} /> Remove</button></div></div>}{detail && <DetailDrawer torrent={detail} onClose={() => setDetail(null)} onAction={(action) => act(action, [detail.hash])} />}{menuTorrent && <div className="context-menu" style={menuPosition || {}}><strong>{menuTorrent.name}</strong><button onClick={() => { setDetail(menuTorrent); setMenuTorrent(null); }}><Info size={15} /> View details</button><button onClick={() => act(menuTorrent.state === 'Paused' ? 'resume' : 'pause', [menuTorrent.hash])}>{menuTorrent.state === 'Paused' ? <Play size={15} /> : <Pause size={15} />}{menuTorrent.state === 'Paused' ? 'Resume' : 'Pause'}</button><hr /><button className="danger" onClick={() => act('remove', [menuTorrent.hash])}><Trash2 size={15} /> Remove…</button></div>}{addFiles && <AddModal initialFiles={addFiles} onClose={() => setAddFiles(null)} onAdded={refresh} />}</div>;
}
function Stat({ icon: Icon, label, value, detail, tone = '' }) { return <div className={`stat-card ${tone}`}><div className="stat-icon"><Icon size={17} /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }
let mounted = false;
const resolveMountRoot = () => {
  const hostedRootId = window.__DELUGE_DECK_ROOT_ID__;
  if (hostedRootId) return document.getElementById(hostedRootId) || null;
  return document.getElementById('root');
};
const mount = () => {
  if (mounted) return;
  const root = resolveMountRoot();
  if (!root) {
    // A concurrent hosted bundle waits for bootstrap to create its dedicated
    // root instead of accidentally mounting into (or creating) legacy DOM.
    window.addEventListener('deluge-deck-bootstrap-ready', mount, { once: true });
    return;
  }
  mounted = true;
  createRoot(root).render(<App />);
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
