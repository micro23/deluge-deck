import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpFromLine,
  Check,
  ChevronRight,
  CirclePause,
  Clock3,
  Copy,
  Download,
  FileArchive,
  FolderOpen,
  Gauge,
  HardDrive,
  HardDriveDownload,
  Info,
  Keyboard,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Magnet,
  Menu,
  MoreHorizontal,
  Network,
  Palette,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import {
  createRequestGate,
  formatBytes,
  normalizeTorrentFiles,
} from '../server/hosted-contracts.mjs';
import { api, pluginMode, rpc } from './app/api.js';
import { decodeTorrentMetadata } from './app/torrent-metadata.js';
import { daemonHostStatus, addedHostId } from '../server/hosted-contracts.mjs';
import { proxyFormValues, proxyConfig } from './app/preferences.js';
import { storage as localStorage } from './app/storage.js';
import { APP_VERSION } from './app/version.js';
import { REFRESH_OPTIONS, THEMES } from './app/themes.js';
import { terminalColumnWidths, terminalColumnLabels, tableStorageKey } from './app/terminal-theme.js';
import { ThemeDetail } from './app/ThemeDetail.jsx';
import './styles.css';
import './theme-gallery.css';
import './dashboard-polish.css';
import './mobile-overrides.css';
import './native-deluge.css';
import './themes/valentine.css';
import './themes/halloween.css';
import './themes/christmas.css';
import './themes/new-year.css';
import './themes/independence.css';
import './themes/core.css';
import './themes/tablet.css';
import './themes/mobile.css';
import './themes/signatures.css';
import './themes/sidebar.css';
import './themes/sizing.css';
// Terminal owns its geometry as well as its palette; load after shared sizing.
import './themes/terminal.css';
import { createPoller } from '../server/polling.mjs';

const VERSION = APP_VERSION;
const queueRank = (torrent) =>
  Number(torrent.queue) >= 0 ? Number(torrent.queue) : Number.MAX_SAFE_INTEGER;
const mapTorrents = (data) =>
  Object.entries(data?.torrents || {})
    .map(([hash, torrent]) => ({ ...torrent, hash }))
    .sort((left, right) => queueRank(left) - queueRank(right));
const stateKey = (state = '') => state.toLowerCase().replaceAll(' ', '-');
const countTorrentStates = (torrents) => torrents.reduce((counts, torrent) => {
  counts.all += 1;
  if (torrent.state === 'Downloading') counts.downloading += 1;
  if (torrent.state === 'Seeding') counts.seeding += 1;
  if (torrent.state === 'Paused') counts.paused += 1;
  if (torrent.state === 'Downloading' || torrent.state === 'Seeding') counts.active += 1;
  return counts;
}, { all: 0, active: 0, downloading: 0, seeding: 0, paused: 0 });
const shortHash = (hash = '') => `${hash.slice(0, 7)}…${hash.slice(-5)}`;
const rate = (value = 0) => (value ? `${formatBytes(value)}/s` : '0');
const eta = (value = 0) => {
  const n = Number(value) || 0;
  if (!n || n >= 8640000) return '—';
  return n < 3600
    ? `${Math.floor(n / 60)}m`
    : `${Math.floor(n / 3600)}h ${Math.floor((n % 3600) / 60)}m`;
};

// Google S2 serves a generic globe whenever it cannot find an icon, which made
// unrelated trackers appear to have the same fake favicon.  Prefer each
// tracker's own icon and keep a curated list of commonly used tracker roots so
// subdomains such as announce.example.org resolve to the right site.
const TRACKER_FAVICON_CATALOG = Object.freeze(
  [
    'torrentleech.org',
    'funfile.org',
    'iptorrents.com',
    'torrentday.com',
    'filelist.io',
    'speedapp.io',
    'alpharatio.cc',
    'myanonamouse.net',
    'redacted.ch',
    'orpheus.network',
    'broadcasthe.net',
    'karagarga.in',
    'avistaz.to',
    'cinemaz.to',
    'animetorrents.me',
    'beyond-hd.me',
    'hd-space.org',
    'hd-torrents.org',
    'blutopia.cc',
    'aither.cc',
    'fearnopeer.com',
    'oldtoons.world',
    'morethantv.me',
    'digitalcore.club',
    'privatehd.to',
    'torrentseeds.org',
    'pretome.net',
    'torrentbytes.net',
    'revolutiontt.me',
    'passthepopcorn.me',
    'thepiratebay.org',
    '1337x.to',
    'yts.mx',
    'nyaa.si',
    'eztv.re',
    'torrentgalaxy.to',
    'limetorrents.lol',
    'torlock.com',
    'zooqle.com',
    'torrentdownloads.pro',
    'solidtorrents.to',
    'magnetdl.com',
    'academictorrents.com',
    'archive.org',
    'opentrackr.org',
    'openbittorrent.com',
    'demonii.com',
    'explodie.org',
    'udp-tracker.org',
    'leechers-paradise.org',
  ].reduce(
    (catalog, domain) => ({
      ...catalog,
      [domain]: `https://${domain}/favicon.ico`,
    }),
    {},
  ),
);

const trackerDomain = (host = '') => {
  const candidate = String(host)
    .trim()
    .toLowerCase()
    .replace(/^udp:\/\//, '')
    .replace(/^https?:\/\//, '');
  try {
    return new URL(`https://${candidate}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
const trackerFaviconCandidates = (host = '') => {
  const domain = trackerDomain(host);
  if (!domain) return [];
  const root = domain.replace(
    /^(?:tracker|announce|open|udp|http|https)\./,
    '',
  );
  // The final cache URL is only attempted after the tracker itself and its
  // registered root fail; it does not replace a valid tracker favicon.
  return [
    ...new Set(
      [
        TRACKER_FAVICON_CATALOG[domain],
        TRACKER_FAVICON_CATALOG[root],
        `https://${domain}/favicon.ico`,
        root !== domain ? `https://${root}/favicon.ico` : '',
        `https://icons.duckduckgo.com/ip3/${encodeURIComponent(root)}.ico`,
      ].filter(Boolean),
    ),
  ];
};
// Existing table renderers share this recovery path.  Browsers do not require
// CORS permission to display an image, so this reaches the actual tracker icon
// even though the tracker API itself is cross-origin.
if (
  typeof document !== 'undefined' &&
  !window.__DELUGE_DECK_TRACKER_FAVICON_RECOVERY__
) {
  window.__DELUGE_DECK_TRACKER_FAVICON_RECOVERY__ = true;
  document.addEventListener(
    'error',
    (event) => {
      const image = event.target;
      if (
        !(image instanceof HTMLImageElement) ||
        !image.classList.contains('tracker-favicon-small') ||
        image.classList.contains('tracker-favicon-controlled')
      )
        return;
      const host = image.alt.replace(/ favicon$/, '');
      const candidates = trackerFaviconCandidates(host);
      const nextIndex = Number(image.dataset.trackerFaviconIndex || 0) + 1;
      if (!candidates[nextIndex]) return;
      image.dataset.trackerFaviconIndex = String(nextIndex);
      image.src = candidates[nextIndex];
    },
    true,
  );
}
function TrackerFavicon({ host }) {
  const candidates = useMemo(() => trackerFaviconCandidates(host), [host]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [host]);
  const src = candidates[candidateIndex];
  if (!src) return <span className="tracker-favicon-small tracker-favicon-fallback" aria-label={`${host} tracker icon`}><Network size={12} /></span>;
  return (
    <img
      className="tracker-favicon-small tracker-favicon-controlled"
      src={src}
      alt={`${host} favicon`}
      onError={() => setCandidateIndex((index) => index + 1)}
    />
  );
}
const fallbackMagnet = (torrent) =>
  `magnet:?xt=${torrent.hash?.length === 64 ? 'urn:btmh:1220' : 'urn:btih:'}${torrent.hash}&dn=${encodeURIComponent(torrent.name || '')}`;
async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {}
  const field = document.createElement('textarea');
  field.value = value;
  field.readOnly = true;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand?.('copy');
  field.remove();
  if (!copied)
    throw new Error('Clipboard access is unavailable in this browser.');
}
const icons = {
  downloading: ArrowDownToLine,
  seeding: ArrowUpFromLine,
  paused: CirclePause,
  queued: Clock3,
  checking: RefreshCw,
  error: AlertTriangle,
};
const deckModalState = { locked: false };

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <span />
        <span />
        <span />
      </div>
      <div>
        <strong>Deluge</strong>
        <small>control center</small>
      </div>
    </div>
  );
}
function Login({ onConnect, mode, sessionMessage = '' }) {
  const [url, setUrl] = useState('http://127.0.0.1:8112');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onConnect(url, password);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login-shell">
      <div className="login-orb orb-one" />
      <div className="login-orb orb-two" />
      <section className="login-card">
        <Brand />
        <div className="login-intro">
          <div className="eyebrow">
            <ShieldCheck size={14} /> PRIVATE BY DEFAULT
          </div>
          <h1>
            Torrent UI,
            <br />
            <em>Modernized</em>
          </h1>
          <p>A focused, modern control center for Deluge.</p>
        </div>
        <form onSubmit={submit} className="login-form">
          {!pluginMode() && (
            <label>
              Deluge Web address
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="http://127.0.0.1:8112"
              />
            </label>
          )}
          <label>
            Web password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your Deluge Web password"
              autoComplete="current-password"
            />
          </label>
          {(error || sessionMessage) && (
            <div className="form-error" role="alert">
              <AlertTriangle size={15} />
              {error || sessionMessage}
            </div>
          )}
          <button className="primary-button wide" disabled={busy}>
            {busy ? (
              <RefreshCw className="spin" size={17} />
            ) : (
              <Zap size={17} />
            )}
            {busy ? 'Connecting…' : 'Connect to Deluge'}
          </button>
        </form>
        <div className="login-foot">
          <span>
            <span className="status-dot live" />{' '}
            {pluginMode() ? 'same-origin Deluge Web' : 'localhost only'}
          </span>
          <span>Deluge {mode === 'demo' ? 'demo' : VERSION}</span>
        </div>
      </section>
    </main>
  );
}
function Sidebar({
  filter,
  setFilter,
  counts,
  stats,
  onAdd,
  onPreferences,
  collapsed,
  setCollapsed,
}) {
  const items = [
    ['all', 'All torrents', LayoutDashboard],
    ['active', 'Active now', Activity],
    ['downloading', 'Downloading', ArrowDownToLine],
    ['seeding', 'Seeding', ArrowUpFromLine],
    ['paused', 'Paused', CirclePause],
  ];
  return (
    <>
      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      >
        <div className="sidebar-command-row">
          <button className="add-button" onClick={onAdd} aria-label="Add torrent" title="Add torrent">
            <Plus size={18} />
            <span>Add torrent</span>
          </button>
        </div>
        <nav aria-label="Torrent filters">
          <div className="nav-label">Library</div>
          {items.map(([key, label, Icon]) => (
            <button
              key={key}
              className={`nav-item ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
              aria-label={`${label}, ${counts[key]} torrents`}
              aria-pressed={filter === key}
              title={label}
            >
              <Icon size={17} />
              <span>{label}</span>
              <b>{counts[key]}</b>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={onPreferences} aria-label="Preferences" title="Preferences">
            <Settings2 size={17} />
            <span>Preferences</span>
          </button>
          <button
            className="icon-button sidebar-toggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <Menu size={20} />
          </button>
        </div>
      </aside>
      <div className="external-ip" title="Public IP address reported by Deluge">
        <Network size={13} />
        <span>
          External IP<strong>{stats?.external_ip || '—'}</strong>
        </span>
      </div>
    </>
  );
}
const signalPopover = (name) =>
  window.dispatchEvent(
    new CustomEvent('deluge-deck:close-popovers', { detail: name }),
  );
function ThemeMenu({ theme, setTheme }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const selected = THEMES.find(([key]) => key === theme) || THEMES[0];
  usePopoverDismiss(open, setOpen, menuRef);
  const restoreTriggerFocus = () => menuRef.current?.querySelector('.theme-trigger')?.focus();
  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[aria-checked="true"]')?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        restoreTriggerFocus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  useEffect(() => {
    const close = (event) => {
      if (event.detail !== 'theme') setOpen(false);
    };
    window.addEventListener('deluge-deck:close-popovers', close);
    return () =>
      window.removeEventListener('deluge-deck:close-popovers', close);
  }, []);
  const navigateMenu = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [
      ...menuRef.current.querySelectorAll(
        '[role="menuitemradio"]',
      ),
    ];
    const current = items.indexOf(event.currentTarget);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : (current + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + items.length) %
            items.length;
    items[next]?.focus();
  };
  return (
    <div className="theme-menu" ref={menuRef}>
      <button
        className="icon-button theme-trigger"
        onClick={() => {
          signalPopover('theme');
          setOpen((value) => !value);
        }}
        aria-label={`Choose color theme; current theme ${selected[1]}`}
        title={`Theme: ${selected[1]}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Palette size={17} />
        <span className="theme-name">{selected[1]}</span>
      </button>
      {open && (
        <div className="theme-popover" role="menu" aria-label="Color themes">
          <div className="theme-gallery-heading" role="presentation">
            <span>MAKE IT YOURS</span>
            <strong>A different atmosphere.</strong>
            <p>Twelve palettes. One familiar workspace.</p>
          </div>
          {THEMES.map(([key, label, description]) => (
            <button
              key={key}
              className={`theme-gallery-option ${theme === key ? 'active' : ''}`}
              onKeyDown={navigateMenu}
              onClick={() => {
                setTheme(key);
                setOpen(false);
                restoreTriggerFocus();
              }}
              role="menuitemradio"
              aria-checked={theme === key}
              aria-label={`${label}: ${description}`}
            >
              <span className={`theme-preview ${key}`} aria-hidden="true" />
              <span className="theme-gallery-caption"><strong>{label}</strong><small>{description}</small></span>
              {theme === key && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function SearchField({ search, setSearch }) {
  return (
    <div className="search-wrap">
      <Search size={17} />
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Search torrents"
      />
      {!search && <kbd className="search-shortcut" aria-hidden="true">/</kbd>}
      {search && (
        <button
          className="clear-search"
          onClick={() => setSearch('')}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
function limitLabel(value, suffix = ' KiB/s') {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? `${number.toLocaleString()}${suffix}`
    : 'Unlimited';
}
function usePopoverDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event) => {
      const insidePortalPopover =
        event.target instanceof Element &&
        event.target.closest?.('.portal-popover');
      if (
        event.key === 'Escape' ||
        (event.type === 'pointerdown' &&
          !ref.current?.contains(event.target) &&
          !insidePortalPopover)
      )
        setOpen(false);
    };
    document.addEventListener('keydown', dismiss, true);
    document.addEventListener('pointerdown', dismiss, true);
    return () => {
      document.removeEventListener('keydown', dismiss, true);
      document.removeEventListener('pointerdown', dismiss, true);
    };
  }, [open, setOpen, ref]);
}
function useDialogDismiss(onClose, ref, blocked = false) {
  useEffect(() => {
    const dismiss = (event) => {
      const escape = event.type === 'keydown' && event.key === 'Escape';
      const outside =
        event.type === 'pointerdown' &&
        ref.current &&
        !ref.current.contains(event.target);
      if (!escape && !outside) return;
      event.preventDefault();
      event.stopPropagation();
      if (!blocked) onClose();
    };
    document.addEventListener('keydown', dismiss, true);
    document.addEventListener('pointerdown', dismiss, true);
    return () => {
      document.removeEventListener('keydown', dismiss, true);
      document.removeEventListener('pointerdown', dismiss, true);
    };
  }, [onClose, ref, blocked]);
}
function ensureViewportOverlayHost() {
  let overlay = document.getElementById('deluge-deck-viewport-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'deluge-deck-viewport-overlay';
    overlay.dataset.delugeDeckOverlay = 'true';
    document.body.appendChild(overlay);
  }
  return overlay;
}
function useViewportOverlayHost() {
  const host = useRef(null);
  if (!host.current) host.current = ensureViewportOverlayHost();
  return host.current;
}
function GlobalControls({ stats, torrents, selectedCount, actionBusy, onTorrentAction, onFeedback, onError, onRefresh, onOpenConnections }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const anchor = useRef();
  const popoverRef = useRef();
  const portalHost = useViewportOverlayHost();
  const [limits, setLimits] = useState({
    down: '-1',
    up: '-1',
    connections: '-1',
  });
  usePopoverDismiss(open, setOpen, anchor);
  useEffect(() => {
    const close = (event) => {
      if (event.detail !== 'global') setOpen(false);
    };
    window.addEventListener('deluge-deck:close-popovers', close);
    return () =>
      window.removeEventListener('deluge-deck:close-popovers', close);
  }, []);
  useEffect(() => {
    anchor.current
      ?.querySelector('.global-trigger')
      ?.setAttribute(
        'aria-label',
        open ? 'Close global session controls' : 'Open global session controls',
      );
  }, [open]);
  useEffect(() => {
    if (open)
      setLimits({
        down: String(stats.max_download ?? -1),
        up: String(stats.max_upload ?? -1),
        connections: String(stats.max_num_connections ?? -1),
      });
  }, [open, stats.max_download, stats.max_upload, stats.max_num_connections]);
  const operate = async (calls, label) => {
    const operations = typeof calls === 'string' ? [[calls, []]] : calls;
    setBusy(operations[0]?.[0] || 'session');
    setError('');
    setMessage('');
    try {
      for (const [method, params = []] of operations) await rpc(method, params);
      setMessage(label);
      if (!open) onFeedback(label);
      await onRefresh();
    } catch (reason) {
      setError(reason.message);
      if (!open) onError(reason.message || 'Deluge could not complete that action.');
    } finally {
      setBusy('');
    }
  };
  const resumeAll = () => {
    const hashes = torrents.map((torrent) => torrent.hash);
    return operate(
      [
        ['core.resume_session', []],
        ...(hashes.length ? [['core.resume_torrents', [hashes]]] : []),
      ],
      'Entire session resumed.',
    );
  };
  const save = async (event) => {
    event.preventDefault();
    const config = {
      max_download_speed: Number(limits.down),
      max_upload_speed: Number(limits.up),
      max_connections_global: Math.trunc(Number(limits.connections)),
    };
    if (
      Object.values(config).some(
        (value) => !Number.isFinite(value) || value < -1,
      )
    ) {
      setError('Use -1 for unlimited, or enter a value of zero or greater.');
      return;
    }
    setBusy('save');
    setError('');
    setMessage('');
    try {
      await rpc('core.set_config', [config]);
      setMessage('Global limits saved.');
      await onRefresh();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy('');
    }
  };
  const popover =
    open &&
    portalHost &&
    createPortal(
      <section
        ref={popoverRef}
        className="global-popover portal-popover"
        role="dialog"
        aria-label="Global session controls"
      >
        <div className="popover-heading">
          <div>
            <span>SESSION COMMAND</span>
            <strong>Global controls</strong>
          </div>
          <Gauge size={20} />
        </div>
        <div className="health-grid">
          <div>
            <HardDrive size={17} />
            <span>Free space</span>
            <strong>
              {stats.free_space == null
                ? 'Checking…'
                : formatBytes(stats.free_space)}
            </strong>
          </div>
          <div>
            <Network size={17} />
            <span>Connections</span>
            <strong>
              {stats.num_connections || 0} /{' '}
              {limitLabel(stats.max_num_connections, '')}
            </strong>
          </div>
        </div>
        <div className="session-operations">
          <button
            className="secondary-button"
            disabled={Boolean(busy)}
            onClick={() => operate('core.pause_session', 'Session paused.')}
          >
            <Pause size={15} /> Pause all
          </button>
          <button
            className="secondary-button"
            disabled={Boolean(busy)}
            onClick={resumeAll}
          >
            <Play size={15} /> Resume all
          </button>
        </div>
        <form className="limit-form" onSubmit={save}>
          <div className="panel-label">
            Global speed &amp; connection limits
          </div>
          <label>
            <span>
              <ArrowDown size={14} /> Download
            </span>
            <div>
              <input
                type="number"
                min="-1"
                step="0.1"
                value={limits.down}
                onChange={(event) =>
                  setLimits({ ...limits, down: event.target.value })
                }
              />
              <small>KiB/s</small>
            </div>
          </label>
          <label>
            <span>
              <ArrowUp size={14} /> Upload
            </span>
            <div>
              <input
                type="number"
                min="-1"
                step="0.1"
                value={limits.up}
                onChange={(event) =>
                  setLimits({ ...limits, up: event.target.value })
                }
              />
              <small>KiB/s</small>
            </div>
          </label>
          <label>
            <span>
              <Network size={14} /> Connections
            </span>
            <div>
              <input
                type="number"
                min="-1"
                step="1"
                value={limits.connections}
                onChange={(event) =>
                  setLimits({ ...limits, connections: event.target.value })
                }
              />
              <small>max</small>
            </div>
          </label>
          <p>Use −1 for unlimited.</p>
          <button className="primary-button" disabled={Boolean(busy)}>
            {busy === 'save' ? (
              <RefreshCw className="spin" size={15} />
            ) : (
              <Save size={15} />
            )}{' '}
            Save limits
          </button>
        </form>
        {error && (
          <div className="control-message error" role="alert">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}
        {message && (
          <div className="control-message success" role="status">
            <Check size={14} />
            {message}
          </div>
        )}
        <div className="manager-links">
          <button
            onClick={() => {
              setOpen(false);
              onOpenConnections();
            }}
          >
            <Server size={16} />
            <span>
              <strong>Connection manager</strong>
              <small>Switch Deluge daemon</small>
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </section>,
      portalHost,
    );
  return (
    <div className="global-controls" ref={anchor}>
      <div
        className="session-quick-actions"
        role="group"
        aria-label={selectedCount ? 'Selected torrent controls' : 'Entire session controls'}
      >
        <button
          type="button"
          disabled={Boolean(busy || actionBusy)}
          onClick={() =>
            selectedCount
              ? onTorrentAction('pause')
              : operate('core.pause_session', 'Entire session paused.')
          }
          title={selectedCount ? `Pause ${selectedCount} selected torrents` : 'Pause every torrent in the session'}
          aria-label={selectedCount ? 'Pause selected torrents' : 'Pause entire session'}
        >
          <Pause size={14} />
          <span>{selectedCount ? `Pause (${selectedCount})` : 'Pause all'}</span>
        </button>
        <button
          type="button"
          disabled={Boolean(busy || actionBusy)}
          onClick={() => selectedCount ? onTorrentAction('resume') : resumeAll()}
          title={selectedCount ? `Resume ${selectedCount} selected torrents` : 'Resume every torrent in the session'}
          aria-label={selectedCount ? 'Resume selected torrents' : 'Resume entire session'}
        >
          <Play size={14} />
          <span>{selectedCount ? `Resume (${selectedCount})` : 'Resume all'}</span>
        </button>
      </div>
      <button
        className="icon-button global-trigger"
        onClick={() => {
          signalPopover('global');
          setOpen((value) => !value);
        }}
        aria-label="Open global session controls"
        aria-expanded={open}
        title="Global session controls"
      >
        <SlidersHorizontal size={18} />
      </button>
      {popover}
    </div>
  );
}
function ConnectionManagerModal({ onClose, onConnected }) {
  useRestoreFocus();
  const modalRef = useRef(null);
  useFocusTrap(modalRef);
  const [hosts, setHosts] = useState([]);
  const [busy, setBusy] = useState('load');
  useDialogDismiss(onClose, modalRef, Boolean(busy));
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingHost, setRemovingHost] = useState(null);
  const [newHost, setNewHost] = useState({
    host: '',
    port: '58846',
    username: '',
    password: '',
  });
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await rpc('web.get_hosts');
        const enriched = await Promise.all(
          (result || []).map(async (host) => {
            const status = await rpc('web.get_host_status', [host[0]]).catch(() => null);
            return {
              id: host[0],
              host: host[1],
              port: host[2],
              status: daemonHostStatus(status, host[0]),
            };
          }),
        );
        if (active) setHosts(enriched);
      } catch (reason) {
        if (active) setError(reason.message);
      } finally {
        if (active) setBusy('');
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);
  const connect = async (host) => {
    setBusy(host.id);
    setError('');
    try {
      const connected = await rpc('web.connected').catch(() => false);
      if (connected) await rpc('web.disconnect');
      const result = await rpc('web.connect', [host.id]);
      if (result === false || !await rpc('web.connected'))
        throw new Error(`Deluge could not connect to ${host.host}.`);
      await onConnected(host);
      onClose();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy('');
    }
  };
  const addHost = async (event) => {
    event.preventDefault();
    const host = newHost.host.trim();
    const port = Number(newHost.port);
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      setError('Enter a host name and a valid port.');
      return;
    }
    setBusy('add');
    setError('');
    try {
      const result = await rpc('web.add_host', [
        host,
        port,
        newHost.username.trim(),
        newHost.password,
      ]);
      const id = addedHostId(result);
      setHosts((current) => [
        ...current,
        { id, host, port, status: 'Offline' },
      ]);
      setNewHost({ host: '', port: '58846', username: '', password: '' });
      setAdding(false);
    } catch (reason) {
      setError(reason.message || 'Deluge could not add this host.');
    } finally {
      setBusy('');
    }
  };
  const removeHost = async (host) => {
    setBusy(`remove:${host.id}`);
    setError('');
    try {
      if (!await rpc('web.remove_host', [host.id]))
        throw new Error('Deluge could not remove this host.');
      setHosts((current) => current.filter((item) => item.id !== host.id));
      setRemovingHost(null);
    } catch (reason) {
      setError(reason.message || 'Deluge could not remove this host.');
    } finally {
      setBusy('');
    }
  };
  return (
    <div
      className="modal-backdrop manager-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !busy && onClose()
      }
    >
      <section
        ref={modalRef}
        className="manager-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connections-title"
      >
        <div className="manager-head">
          <div className="manager-icon">
            <Server size={22} />
          </div>
          <div>
            <span>DAEMON ROUTING</span>
            <h2 id="connections-title">Connection manager</h2>
            <p>Choose which configured Deluge daemon powers this deck.</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={Boolean(busy)}
            aria-label="Close connection manager"
          >
            <X size={20} />
          </button>
        </div>
        <div className="manager-list">
          {busy === 'load' ? (
            <div className="manager-empty">
              <RefreshCw className="spin" size={21} />
              Discovering configured hosts…
            </div>
          ) : hosts.length ? (
            hosts.map((host) => {
              const connected = String(host.status)
                .toLowerCase()
                .includes('connected');
              const removing = removingHost === host.id;
              return (
                <div key={host.id} className="host-card-wrap">
                  <button
                    className={`host-card ${connected ? 'connected' : ''}`}
                    onClick={() => connect(host)}
                    disabled={Boolean(busy) || removing}
                  >
                    <span
                      className={`host-signal ${connected ? 'online' : ''}`}
                    >
                      <Server size={18} />
                    </span>
                    <span>
                      <strong>{host.host}</strong>
                      <small>
                        {host.host}:{host.port}
                      </small>
                    </span>
                    <span className="host-status">
                      <i />
                      {busy === host.id ? 'Connecting…' : host.status}
                    </span>
                  </button>
                  {removing ? (
                    <div className="host-remove-confirm">
                      <span>Remove this host?</span>
                      <button
                        className="secondary-button small"
                        onClick={() => setRemovingHost(null)}
                        disabled={busy === `remove:${host.id}`}
                      >
                        Cancel
                      </button>
                      <button
                        className="danger-button small"
                        onClick={() => removeHost(host)}
                        disabled={busy === `remove:${host.id}`}
                      >
                        {busy === `remove:${host.id}` ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="host-remove-button"
                      onClick={() => setRemovingHost(host.id)}
                      disabled={Boolean(busy) || connected}
                      aria-label={`Remove host ${host.host}`}
                      title={
                        connected
                          ? 'Disconnect before removing this host'
                          : 'Remove host'
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="manager-empty">
              <WifiOff size={22} />
              No daemon hosts are configured in Deluge Web.
            </div>
          )}
          {error && (
            <div className="control-message error" role="alert">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
          {adding && (
            <form className="host-add-form" onSubmit={addHost}>
              <label>
                Host
                <input
                  value={newHost.host}
                  onChange={(event) =>
                    setNewHost({ ...newHost, host: event.target.value })
                  }
                  placeholder="127.0.0.1"
                  autoFocus
                />
              </label>
              <label>
                Port
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={newHost.port}
                  onChange={(event) =>
                    setNewHost({ ...newHost, port: event.target.value })
                  }
                />
              </label>
              <label>
                Username
                <input
                  value={newHost.username}
                  onChange={(event) =>
                    setNewHost({ ...newHost, username: event.target.value })
                  }
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={newHost.password}
                  onChange={(event) =>
                    setNewHost({ ...newHost, password: event.target.value })
                  }
                />
              </label>
              <div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setAdding(false)}
                  disabled={busy === 'add'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy === 'add'}
                >
                  {busy === 'add' ? 'Adding…' : 'Add host'}
                </button>
              </div>
            </form>
          )}
        </div>
        <div className="manager-foot">
          <span>Switching hosts keeps your Web session signed in.</span>
          <div>
            <button
              className="secondary-button"
              onClick={() => setAdding((value) => !value)}
              disabled={Boolean(busy)}
            >
              {adding ? 'Hide form' : 'Add host'}
            </button>
            <button
              className="secondary-button"
              onClick={onClose}
              disabled={Boolean(busy)}
            >
              Done
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
function AccountMenu({ session, onLogout }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const anchor = useRef();
  usePopoverDismiss(open, setOpen, anchor);
  useEffect(() => {
    const close = (event) => {
      if (event.detail !== 'account') setOpen(false);
    };
    window.addEventListener('deluge-deck:close-popovers', close);
    return () =>
      window.removeEventListener('deluge-deck:close-popovers', close);
  }, []);
  const host =
    session?.host?.host ||
    (pluginMode() ? window.location.hostname : session?.delugeUrl) ||
    'Deluge Web';
  const mode =
    session?.mode === 'plugin'
      ? 'Hosted plugin'
      : session?.mode === 'demo'
        ? 'Demo session'
        : 'Companion session';
  const logout = async () => {
    setBusy(true);
    try {
      await onLogout();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };
  return (
    <div className="account-menu" ref={anchor}>
      <button
        className="avatar"
        onClick={() => {
          signalPopover('account');
          setOpen((value) => !value);
        }}
        aria-label="Open account menu"
        aria-expanded={open}
      >
        DD
        <span className="avatar-presence" />
      </button>
      {open && (
        <div className="account-popover" role="menu">
          <div className="account-profile">
            <span className="account-avatar">DD</span>
            <div>
              <strong>Deluge Deck</strong>
              <small>{mode}</small>
            </div>
          </div>
          <div className="account-host">
            <Server size={15} />
            <div>
              <span>Connected daemon</span>
              <strong>{host}</strong>
            </div>
            <span className="status-dot live" />
          </div>
          <button
            className="logout-button"
            onClick={logout}
            disabled={busy}
            role="menuitem"
          >
            <LogOut size={16} />
            {busy ? 'Signing out…' : 'Log out'}
            <span>End Web session</span>
          </button>
        </div>
      )}
    </div>
  );
}
function Topbar({
  search,
  setSearch,
  stats,
  torrents,
  selectedCount,
  actionBusy,
  onTorrentAction,
  onFeedback,
  onError,
  theme,
  setTheme,
  session,
  disconnect,
  onPreferences,
  onRefresh,
  onConnectionChanged,
}) {
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const mobile = useMobileLayout();
  const viewportOverlayHost = useViewportOverlayHost();
  return (
    <>
      <header className="topbar">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="topbar-heading">
          <h1>Deluge</h1>
        </div>
        {theme === 'terminal' && !mobile && <SearchField search={search} setSearch={setSearch} />}
        <div className="top-actions">
          <GlobalControls
            stats={stats}
            torrents={torrents}
            selectedCount={selectedCount}
            actionBusy={actionBusy}
            onTorrentAction={onTorrentAction}
            onFeedback={onFeedback}
            onError={onError}
            onRefresh={onRefresh}
            onOpenConnections={() => setConnectionsOpen(true)}
          />
          <ThemeMenu theme={theme} setTheme={setTheme} />
          <button
            className="icon-button mobile-preferences"
            onClick={onPreferences}
            aria-label="Open Deluge Preferences"
          >
            <Settings2 size={18} />
          </button>
          <AccountMenu session={session} onLogout={disconnect} />
        </div>
        <div className="mobile-stats">
          <span>
            <ArrowDown size={13} />
            {rate(stats.download_rate)}
          </span>
          <span>
            <ArrowUp size={13} />
            {rate(stats.upload_rate)}
          </span>
        </div>
      </header>
      {connectionsOpen && viewportOverlayHost &&
        createPortal(
          <ConnectionManagerModal
            onClose={() => setConnectionsOpen(false)}
            onConnected={onConnectionChanged}
          />,
          viewportOverlayHost,
        )}
    </>
  );
}
function Progress({ value = 0, state }) {
  const progress = Math.max(0, Math.min(100, value));
  const potionId = useId();
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div
          className={`progress-bar ${stateKey(state)}${progress >= 99.95 ? ' complete' : ''}`}
          style={{
            width: `${progress}%`,
          }}
        />
        <svg className="potion-vial" viewBox="0 0 160 32" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <clipPath id={`${potionId}-inside`}>
              <path d="M22 11H133C137 11 138 6 145 6C152 6 156 10 156 16S152 26 145 26C138 26 137 21 133 21H22Z" />
            </clipPath>
            <linearGradient id={`${potionId}-glass`} x2="0" y2="1">
              <stop stopColor="#e0e0e0" stopOpacity=".8" />
              <stop offset=".45" stopColor="#737373" stopOpacity=".7" />
              <stop offset="1" stopColor="#b6b6b6" stopOpacity=".8" />
            </linearGradient>
            <linearGradient id={`${potionId}-liquid`} x2="0" y2="1">
              <stop stopColor="#ffd779" />
              <stop offset=".45" stopColor="#f7a52e" />
              <stop offset="1" stopColor="#ba4f13" />
            </linearGradient>
          </defs>
          <path d="M17 8H132C137 8 137 3 145 3C154 3 159 8 159 16S154 29 145 29C137 29 137 24 132 24H17Z" fill="#252525" stroke={`url(#${potionId}-glass)`} strokeWidth="1.5" />
          <g clipPath={`url(#${potionId}-inside)`}>
            <rect x="22" y="6" width={134 * progress / 100} height="20" fill={`url(#${potionId}-liquid)`} />
            {progress > 0 && <path d={`M22 12H${Math.min(133, 22 + 134 * progress / 100)}`} stroke="#ffe5a1" strokeOpacity=".65" />}
          </g>
          <path d="M23 9H132C138 9 140 5 145 5C149 5 152 7 153 9" fill="none" stroke="#f0f0f0" strokeOpacity=".55" strokeWidth="1" strokeLinecap="round" />
          <path d="M23 23H132C137 23 140 27 145 27" fill="none" stroke="#9c9c9c" strokeOpacity=".5" strokeWidth="1" />
          <rect x="3" y="10" width="12" height="12" rx="2" fill="#805029" stroke="#b88648" strokeWidth="1" />
          <path d="M6 12V20M10 12V20" stroke="#d2a365" strokeOpacity=".35" />
          <rect x="14" y="7" width="7" height="18" rx="2" fill="#353535" stroke={`url(#${potionId}-glass)`} strokeWidth="1.2" />
          <path d="M16 9V22" stroke="#e6e6e6" strokeOpacity=".65" />
        </svg>
        <svg className="candy-cane" viewBox="0 0 160 32" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id={`${potionId}-candy-stripes`} patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(35)">
              <rect width="12" height="12" fill="#fff5e9" />
              <rect width="5" height="12" fill="#d93443" />
            </pattern>
          </defs>
          <path d="M7 23H139C157 23 157 7 143 7H134" fill="none" stroke="#675553" strokeWidth="10" strokeLinecap="round" />
          {progress > 0 && <path
            className="candy-cane-fill"
            d="M7 23H139C157 23 157 7 143 7H134"
            pathLength="100"
            fill="none"
            stroke={`url(#${potionId}-candy-stripes)`}
            strokeWidth="10"
            strokeLinecap={progress >= 100 ? 'round' : 'butt'}
            strokeDasharray={`${progress} 100`}
          />}
          <path d="M7 20H139C152 20 152 8 143 8H135" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
      <span>{Number(value).toFixed(value % 1 ? 1 : 0)}%</span>
    </div>
  );
}
const COLUMN_CHOOSER_COLUMNS = [
  ['state', 'State'],
  ['progress', 'Progress'],
  ['size', 'Size'],
  ['download', 'Download'],
  ['upload', 'Upload'],
  ['eta', 'ETA'],
  ['ratio', 'Ratio'],
  ['seeds', 'Seeds'],
  ['peers', 'Peers'],
  ['added', 'Added'],
  ['seedingTime', 'Seeding time'],
  ['tracker', 'Tracker'],
  ['queue', 'Queue'],
].map(([key, label]) => ({ key, label }));
function ColumnChooser({ columns, visibility, onToggle, onClose }) {
  useRestoreFocus();
  const overlayHost = useViewportOverlayHost();
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef);
  useDialogDismiss(onClose, dialogRef);
  const visibleCount = columns.filter(({ key }) => visibility[key]).length;
  return createPortal(
    <div
      className="modal-backdrop column-chooser-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="column-chooser-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="column-chooser-title"
      >
        <header className="column-chooser-head">
          <div>
            <span>TABLE LAYOUT</span>
            <h2 id="column-chooser-title">Choose columns</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close column chooser"
          >
            <X size={22} />
          </button>
        </header>
        <div className="column-chooser-content">
          <p>
            {visibleCount} of {columns.length} columns shown. Turn columns on or
            off here; drag visible table headers to change their order.
          </p>
          <div
            className="column-chooser-options"
            role="group"
            aria-label="Column visibility"
          >
            {columns.map(({ key, label }) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={visibility[key]}
                  onChange={() => onToggle(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <footer className="column-chooser-foot">
          <span>Changes are saved automatically.</span>
          <button className="primary-button" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>,
    overlayHost,
  );
}
function LegacyTorrentTable({
  torrents,
  selected,
  setSelected,
  onOpen,
  onMenu,
  loading,
  onAdd,
}) {
  const allSelected =
    torrents.length && torrents.every((torrent) => selected.has(torrent.hash));
  const [sort, setSort] = useState({ key: 'queue', direction: 1 });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const tableRef = useRef(null);
  useEffect(() => {
    const close = () => setColumnMenuOpen(false);
    window.addEventListener('deluge-deck:close-popovers', close);
    return () =>
      window.removeEventListener('deluge-deck:close-popovers', close);
  }, []);
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const defaults = {
      state: true,
      progress: true,
      size: true,
      download: true,
      upload: true,
      eta: true,
      ratio: true,
      seeds: true,
      peers: true,
      added: true,
      seedingTime: false,
      tracker: true,
      queue: true,
    };
    try {
      return {
        ...defaults,
        ...JSON.parse(localStorage.getItem('deck-column-visibility') || '{}'),
      };
    } catch {
      return defaults;
    }
  });
  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(tableStorageKey(theme, 'widths')) || '{}');
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem(
      'deck-column-visibility',
      JSON.stringify(columnVisibility),
    );
  }, [columnVisibility]);
  useEffect(() => {
    localStorage.setItem(tableStorageKey(theme, 'widths'), JSON.stringify(columnWidths));
  }, [columnWidths, theme]);
  useEffect(() => {
    const table = tableRef.current;
    if (!table || !window.ResizeObserver) return undefined;
    const headers = [...table.querySelectorAll('th[data-column]')];
    headers.forEach((header) => {
      const savedWidth = Number(columnWidths[header.dataset.column]);
      if (savedWidth > 0) header.style.width = savedWidth + 'px';
    });
    const observer = new ResizeObserver((entries) =>
      setColumnWidths((current) => {
        let changed = false;
        const next = { ...current };
        entries.forEach(({ target, contentRect }) => {
          const key = target.dataset.column;
          const width = Math.round(contentRect.width);
          if (key && width > 0 && next[key] !== width) {
            next[key] = width;
            changed = true;
          }
        });
        return changed ? next : current;
      }),
    );
    headers.forEach((header) => observer.observe(header));
    return () => observer.disconnect();
  }, []);
  const toggleColumn = (key) =>
    setColumnVisibility((current) => ({ ...current, [key]: !current[key] }));
  const toggleColumnMenu = () => {
    if (!columnMenuOpen) signalPopover('columns');
    setColumnMenuOpen((open) => !open);
  };
  const tableClass = Object.entries(columnVisibility)
    .filter(([, visible]) => !visible)
    .map(([key]) => `hide-${key}`)
    .join(' ');
  const toggleSort = (key) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction * -1 }
        : { key, direction: 1 },
    );
  const sortedTorrents = useMemo(
    () =>
      [...torrents].sort((left, right) => {
        const a = left[sort.key] ?? '';
        const b = right[sort.key] ?? '';
        return (
          (typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a).localeCompare(String(b))) * sort.direction
        );
      }),
    [torrents, sort],
  );
  const sortLabel =
    {
      name: 'Torrent',
      state: 'State',
      progress: 'Progress',
      total_size: 'Size',
      download_payload_rate: 'Download',
      upload_payload_rate: 'Upload',
      eta: 'ETA',
      ratio: 'Ratio',
      total_seeds: 'Seeds',
      total_peers: 'Peers',
      time_added: 'Added',
      seeding_time: 'Seeding time',
      tracker_host: 'Tracker',
      queue: 'Queue',
    }[sort.key] || sort.key;
  const sortValue = (key) =>
    sort.key === key
      ? sort.direction === 1
        ? 'ascending'
        : 'descending'
      : 'none';

  return (
    <div className="table-shell">
      <div className="table-tools">
        <span className="sort-announcement" role="status" aria-live="polite">
          Sorted by {sortLabel},{' '}
          {sort.direction === 1 ? 'ascending' : 'descending'}
        </span>
        <button
          className="column-menu-trigger"
          onClick={toggleColumnMenu}
          aria-expanded={columnMenuOpen}
          aria-label="Choose visible columns"
          title="Choose visible columns"
        >
          <Menu size={17} />
        </button>
        {columnMenuOpen && (
          <ColumnChooser
            columns={COLUMN_CHOOSER_COLUMNS}
            visibility={columnVisibility}
            onToggle={toggleColumn}
            onClose={() => setColumnMenuOpen(false)}
          />
        )}
      </div>
      <table ref={tableRef} className={tableClass}>
        <thead>
          <tr>
            <th className="check-cell">
              <input
                type="checkbox"
                checked={Boolean(allSelected)}
                onChange={() =>
                  setSelected(
                    allSelected
                      ? new Set()
                      : new Set(torrents.map((torrent) => torrent.hash)),
                  )
                }
                aria-label="Select all filtered torrents"
              />
            </th>
            <th
              aria-sort={sortValue('name')}
              className="resizable-th"
              data-column="name"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('name')}
              >
                Torrent
              </button>
            </th>
            <th
              aria-sort={sortValue('state')}
              className="resizable-th"
              data-column="state"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('state')}
              >
                State
              </button>
            </th>
            <th
              aria-sort={sortValue('progress')}
              className="resizable-th"
              data-column="progress"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('progress')}
              >
                Progress
              </button>
            </th>
            <th
              aria-sort={sortValue('total_size')}
              className="resizable-th"
              data-column="size"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('total_size')}
              >
                Size
              </button>
            </th>
            <th
              aria-sort={sortValue('download_payload_rate')}
              className="resizable-th"
              data-column="download"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('download_payload_rate')}
              >
                ↓ Download
              </button>
            </th>
            <th
              aria-sort={sortValue('upload_payload_rate')}
              className="resizable-th"
              data-column="upload"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('upload_payload_rate')}
              >
                ↑ Upload
              </button>
            </th>
            <th
              aria-sort={sortValue('eta')}
              className="resizable-th"
              data-column="eta"
            >
              <button className="sort-button" onClick={() => toggleSort('eta')}>
                ETA
              </button>
            </th>
            <th
              aria-sort={sortValue('ratio')}
              className="resizable-th"
              data-column="ratio"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('ratio')}
              >
                Ratio
              </button>
            </th>
            <th
              aria-sort={sortValue('total_seeds')}
              className="resizable-th"
              data-column="seeds"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('total_seeds')}
              >
                Seeds
              </button>
            </th>
            <th
              aria-sort={sortValue('total_peers')}
              className="resizable-th"
              data-column="peers"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('total_peers')}
              >
                Peers
              </button>
            </th>
            <th
              aria-sort={sortValue('time_added')}
              className="resizable-th"
              data-column="added"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('time_added')}
              >
                Added
              </button>
            </th>
            <th
              aria-sort={sortValue('seeding_time')}
              className="resizable-th"
              data-column="seedingTime"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('seeding_time')}
              >
                Seeding time
              </button>
            </th>
            <th
              aria-sort={sortValue('tracker_host')}
              className="resizable-th"
              data-column="tracker"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('tracker_host')}
              >
                Tracker
              </button>
            </th>
            <th
              aria-sort={sortValue('queue')}
              className="resizable-th"
              data-column="queue"
            >
              <button
                className="sort-button"
                onClick={() => toggleSort('queue')}
              >
                Queue
              </button>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="skeleton-row">
                <td />
                <td>
                  <span />
                  <span />
                </td>
                <td>
                  <i />
                </td>
                <td>
                  <span />
                </td>
                <td>
                  <i />
                </td>
                <td>
                  <i />
                </td>
                <td>
                  <i />
                </td>
                <td>
                  <i />
                </td>
                <td>
                  <i />
                </td>
                <td />
              </tr>
            ))
          ) : torrents.length ? (
            sortedTorrents.map((torrent) => {
              const Icon = icons[stateKey(torrent.state)] || Info;
              return (
                <tr
                  key={torrent.hash}
                  className={selected.has(torrent.hash) ? 'selected' : ''}
                  onClick={(event) => {
                    if (event.target.closest('button,input,select,a')) return;
                    onOpen(torrent);
                  }}
                  tabIndex="0"
                  role="button"
                  aria-label={`Open details for ${torrent.name}`}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpen(torrent);
                    }
                  }}
                >
                  <td className="check-cell">
                    <input
                      type="checkbox"
                      checked={selected.has(torrent.hash)}
                      onChange={() =>
                        setSelected((current) => {
                          const next = new Set(current);
                          next.has(torrent.hash)
                            ? next.delete(torrent.hash)
                            : next.add(torrent.hash);
                          return next;
                        })
                      }
                      aria-label={`Select ${torrent.name}`}
                    />
                  </td>
                  <td className="name-cell">
                    <div className="name-content">
                      <div className={`state-icon ${stateKey(torrent.state)}`}>
                        <Icon size={15} />
                      </div>
                      {torrent.tracker_host && <TrackerFavicon host={torrent.tracker_host} />}
                      <div className="torrent-name">
                        <strong title={torrent.name}>{torrent.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`state-badge ${stateKey(torrent.state)}`}>
                      <i />
                      {torrent.state}
                    </span>
                  </td>
                  <td>
                    <Progress value={torrent.progress} state={torrent.state} />
                  </td>
                  <td>{formatBytes(torrent.total_size)}</td>
                  <td className="rate-cell down">
                    {rate(torrent.download_payload_rate)}
                  </td>
                  <td className="rate-cell up">
                    {rate(torrent.upload_payload_rate)}
                  </td>
                  <td>{eta(torrent.eta)}</td>
                  <td className="ratio-cell">
                    {Number(torrent.ratio || 0).toFixed(2)}
                  </td>
                  <td>{`${Number(torrent.num_seeds) || 0} / ${Number(torrent.total_seeds) || 0}`}</td>
                  <td>{`${Number(torrent.num_peers) || 0} / ${Number(torrent.total_peers) || 0}`}</td>
                  <td>{torrentDate(torrent.time_added)}</td>
                  <td>{elapsedTime(torrent.seeding_time)}</td>
                  <td>
                    <span
                      className={`tracker-status ${stateKey(torrent.tracker_status || 'unknown')}`}
                    >
                      {torrent.tracker_status || 'Unknown'}
                    </span>
                    <small className="tracker-host">
                      {torrent.tracker_host || '—'}
                    </small>
                  </td>
                  <td>
                    {queueRank(torrent) === Number.MAX_SAFE_INTEGER
                      ? '—'
                      : queueRank(torrent) + 1}
                  </td>
                  <td>
                    <button
                      className="row-menu"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMenu(torrent, event);
                      }}
                      aria-label={`Actions for ${torrent.name}`}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="16">
                <div className="empty-table">
                  <div className="empty-icon">
                    <ListFilter size={22} />
                  </div>
                  <h3>No torrents here</h3>
                  <p>Try another filter or add a torrent.</p>
                  <button className="secondary-button" onClick={onAdd}>
                    <Plus size={16} /> Add torrent
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
const TABLE_COLUMN_ORDER = [
  'name',
  'state',
  'progress',
  'size',
  'ratio',
  'download',
  'upload',
  'eta',
  'seeds',
  'peers',
  'added',
  'seedingTime',
  'tracker',
  'queue',
];
// Shared defaults remain independent of the palette. Terminal owns a compact
// width preset and separate storage; the other themes retain this layout.
const TABLE_LAYOUT_VERSION = '2026-09-content-aware-columns';
const DEFAULT_COLUMN_VISIBILITY = {
  state: true,
  progress: true,
  size: true,
  ratio: true,
  download: true,
  upload: true,
  eta: true,
  seeds: true,
  peers: true,
  added: false,
  seedingTime: false,
  tracker: false,
  queue: false,
};
// These are only the first-paint fallbacks. Once the table is mounted every
// data column is measured from its real header and cell content. Each column,
// including Torrent, can then be resized and reset independently.
const AUTO_COLUMN_FALLBACKS = {
  name: 360,
  state: 104,
  progress: 154,
  size: 78,
  ratio: 68,
  download: 104,
  upload: 96,
  eta: 68,
  seeds: 88,
  peers: 88,
  added: 104,
  seedingTime: 116,
  tracker: 150,
  queue: 70,
};
const MIN_COLUMN_WIDTHS = {
  name: 220,
  state: 84,
  progress: 142,
  size: 68,
  ratio: 62,
  download: 92,
  upload: 84,
  eta: 58,
  seeds: 72,
  peers: 72,
  added: 88,
  seedingTime: 104,
  tracker: 112,
  queue: 60,
};
const MAX_COLUMN_WIDTHS = {
  name: 720,
  state: 170,
  progress: 188,
  size: 116,
  ratio: 92,
  download: 142,
  upload: 142,
  eta: 118,
  seeds: 132,
  peers: 132,
  added: 142,
  seedingTime: 158,
  tracker: 240,
  queue: 92,
};
const TABLE_FIXED_CHROME_WIDTH = 96;
const clampColumnWidth = (key, width) =>
  Math.min(
    MAX_COLUMN_WIDTHS[key],
    Math.max(MIN_COLUMN_WIDTHS[key], Math.round(width)),
  );
const normalizeColumnWidths = (savedWidths, clampWidth = clampColumnWidth) =>
  Object.fromEntries(
    Object.entries(AUTO_COLUMN_FALLBACKS).flatMap(([key]) => {
      const width = Number(savedWidths?.[key]);
      return Number.isFinite(width)
        ? [[key, clampWidth(key, width)]]
        : [];
    }),
  );
const hasCurrentTableLayout = (theme) =>
  localStorage.getItem(theme === 'terminal' ? 'deck-terminal-table-layout-version' : 'deck-table-layout-version') === TABLE_LAYOUT_VERSION;
const TABLE_COLUMN_LABELS = {
  name: 'Torrent',
  state: 'State',
  progress: 'Progress',
  size: 'Size',
  download: 'Download',
  upload: 'Upload',
  eta: 'ETA',
  ratio: 'Ratio',
  seeds: 'Seeds',
  peers: 'Peers',
  added: 'Added',
  seedingTime: 'Seeding time',
  tracker: 'Tracker',
  queue: 'Queue',
};
const TABLE_SORT_KEYS = {
  name: 'name',
  state: 'state',
  progress: 'progress',
  size: 'total_size',
  download: 'download_payload_rate',
  upload: 'upload_payload_rate',
  eta: 'eta',
  ratio: 'ratio',
  seeds: 'total_seeds',
  peers: 'total_peers',
  added: 'time_added',
  seedingTime: 'seeding_time',
  tracker: 'tracker_host',
  queue: 'queue',
};

const MOBILE_QUERY = '(max-width:760px), (max-width:950px) and (max-height:540px)';
function useMobileLayout() {
  const [mobile, setMobile] = useState(() => window.matchMedia?.(MOBILE_QUERY)?.matches ?? window.innerWidth <= 760);
  useEffect(() => {
    const query = window.matchMedia?.(MOBILE_QUERY);
    const update = () => setMobile(query?.matches ?? window.innerWidth <= 760);
    if (query?.addEventListener) query.addEventListener('change', update);
    else if (query?.addListener) query.addListener(update);
    else window.addEventListener('resize', update);
    update();
    return () => {
      if (query?.removeEventListener) query.removeEventListener('change', update);
      else if (query?.removeListener) query.removeListener(update);
      else window.removeEventListener('resize', update);
    };
  }, []);
  return mobile;
}

function MobileTorrentList({ torrents, selected, setSelected, onOpen, onMenu, loading, onAdd, sort, setSort }) {
  const allSelected = torrents.length > 0 && torrents.every(t => selected.has(t.hash));
  return (
    <section className="mobile-transfers" aria-label="Torrent list">
      <div className="mobile-list-toolbar">
        <label className="mobile-select-all"><input type="checkbox" aria-label="Select all filtered torrents" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(torrents.map(t => t.hash)))} />{selected.size ? `${selected.size} selected` : `${torrents.length} torrents`}</label>
        <label className="mobile-sort">Sort<select aria-label="Sort torrents" value={sort.key} onChange={e => setSort({ key: e.target.value, direction: 1 })}>
          <option value="queue">Queue</option><option value="name">Name</option><option value="state">State</option><option value="progress">Progress</option><option value="total_size">Size</option><option value="download_payload_rate">Download</option><option value="upload_payload_rate">Upload</option><option value="ratio">Ratio</option>
        </select></label>
        <button className="mobile-sort-direction" aria-label={sort.direction === 1 ? 'Sort descending' : 'Sort ascending'} onClick={() => setSort(s => ({ ...s, direction: -s.direction }))}>{sort.direction === 1 ? <ArrowDown size={16} /> : <ArrowUp size={16} />}</button>
      </div>
      {loading ? <p className="mobile-list-empty" role="status">Loading torrents…</p> : torrents.length ? <ul className="mobile-transfer-list">
        {torrents.map(t => <li key={t.hash} className={`mobile-transfer ${selected.has(t.hash) ? 'selected' : ''}`}>
          <label className="mobile-row-select"><input type="checkbox" aria-label={`Select ${t.name}`} checked={selected.has(t.hash)} onChange={() => setSelected(current => { const next = new Set(current); next.has(t.hash) ? next.delete(t.hash) : next.add(t.hash); return next; })} /></label>
          <button className="mobile-transfer-open" aria-label={`Open details for ${t.name}`} onClick={() => onOpen(t)}>
            <strong className="mobile-transfer-name">{t.name}</strong>
            <span className="mobile-transfer-meta"><span className={`state-badge ${stateKey(t.state)}`}><i />{t.state}</span><span>{formatBytes(t.total_size)}</span><span>Ratio {Number(t.ratio || 0).toFixed(2)}</span></span>
            <Progress value={t.progress} state={t.state} />
            <span className="mobile-transfer-rates"><span><ArrowDown size={12} />{rate(t.download_payload_rate)}</span><span><ArrowUp size={12} />{rate(t.upload_payload_rate)}</span><span>ETA {eta(t.eta)}</span></span>
          </button>
          <button className="row-menu mobile-row-menu" aria-label={`Actions for ${t.name}`} onClick={event => onMenu(t, event)}><MoreHorizontal size={19} /></button>
        </li>)}
      </ul> : <div className="mobile-list-empty"><strong>No torrents here</strong><p>Try another filter or add a torrent.</p><button className="secondary-button" onClick={onAdd}><Plus size={16} />Add torrent</button></div>}
    </section>
  );
}

function TorrentTable({
  torrents,
  theme,
  selected,
  setSelected,
  onOpen,
  onMenu,
  loading,
  onAdd,
}) {
  const allSelected =
    torrents.length && torrents.every((torrent) => selected.has(torrent.hash));
  const [sort, setSort] = useState({ key: 'queue', direction: 1 });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [draggingColumn, setDraggingColumn] = useState(null);
  const mobile = useMobileLayout();
  const clampWidth = (key, width) => theme === 'terminal'
    ? Math.min(MAX_COLUMN_WIDTHS[key], Math.max(key === 'name' ? 180 : Math.min(terminalColumnWidths[key], MIN_COLUMN_WIDTHS[key]), Math.round(width)))
    : clampColumnWidth(key, width);
  const columnResizeStart = useRef(null);
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const scopedTheme = theme === 'terminal' || theme === 'valentine' || theme === 'halloween';
    const visibilityKey = scopedTheme
      ? `deck-${theme}-column-visibility`
      : 'deck-column-visibility';
    const themeColumns = theme === 'terminal'
      ? { progress: true }
      : theme === 'valentine'
        ? { progress: true, seedingTime: true }
        : theme === 'halloween'
          ? { progress: true, seedingTime: true }
          : {};
    if (!hasCurrentTableLayout(theme))
      return { ...DEFAULT_COLUMN_VISIBILITY, ...themeColumns };
    try {
      const saved = JSON.parse(localStorage.getItem(visibilityKey) || '{}');
      return {
        ...DEFAULT_COLUMN_VISIBILITY,
        ...themeColumns,
        ...saved,
      };
    } catch {
      return { ...DEFAULT_COLUMN_VISIBILITY, ...themeColumns };
    }
  });
  const tableRef = useRef(null);
  const [autoColumnWidths, setAutoColumnWidths] = useState(
    AUTO_COLUMN_FALLBACKS,
  );
  const [columnWidths, setColumnWidths] = useState(() => {
    if (!hasCurrentTableLayout(theme)) return {};
    try {
      return normalizeColumnWidths(
        JSON.parse(localStorage.getItem(tableStorageKey(theme, 'widths')) || '{}'),
        clampWidth,
      );
    } catch {
      return {};
    }
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    if (!hasCurrentTableLayout(theme)) return TABLE_COLUMN_ORDER;
    try {
      const stored = JSON.parse(
        localStorage.getItem(tableStorageKey(theme, 'order')) || '[]',
      );
      const valid = stored.filter(
        (key, index) =>
          TABLE_COLUMN_ORDER.includes(key) && stored.indexOf(key) === index,
      );
      return [
        ...valid,
        ...TABLE_COLUMN_ORDER.filter((key) => !valid.includes(key)),
      ];
    } catch {
      return TABLE_COLUMN_ORDER;
    }
  });
  useEffect(() => {
    localStorage.setItem(
      theme === 'terminal' || theme === 'valentine' || theme === 'halloween'
        ? `deck-${theme}-column-visibility`
        : 'deck-column-visibility',
      JSON.stringify(columnVisibility),
    );
  }, [columnVisibility, theme]);
  useEffect(() => {
    localStorage.setItem(tableStorageKey(theme, 'widths'), JSON.stringify(columnWidths));
  }, [columnWidths, theme]);
  useEffect(() => {
    localStorage.setItem(tableStorageKey(theme, 'order'), JSON.stringify(columnOrder));
  }, [columnOrder, theme]);
  useEffect(() => {
    localStorage.setItem(theme === 'terminal' ? 'deck-terminal-table-layout-version' : 'deck-table-layout-version', TABLE_LAYOUT_VERSION);
  }, [theme]);
  useEffect(() => {
    const close = () => setColumnMenuOpen(false);
    window.addEventListener('deluge-deck:close-popovers', close);
    return () =>
      window.removeEventListener('deluge-deck:close-popovers', close);
  }, []);
  useEffect(() => {
    const updateManualResize = (event) => {
      const resize = columnResizeStart.current;
      if (!resize) return;
      const width = clampWidth(
        resize.key,
        resize.startWidth + event.clientX - resize.startX,
      );
      setColumnWidths((current) =>
        current[resize.key] === width
          ? current
          : { ...current, [resize.key]: width },
      );
    };
    const finishManualResize = () => {
      if (!columnResizeStart.current) return;
      columnResizeStart.current = null;
      document.body.classList.remove('resizing-table-column');
    };
    const cancelManualResize = () => {
      columnResizeStart.current = null;
      document.body.classList.remove('resizing-table-column');
    };
    window.addEventListener('pointermove', updateManualResize);
    window.addEventListener('pointerup', finishManualResize);
    window.addEventListener('pointercancel', cancelManualResize);
    return () => {
      window.removeEventListener('pointermove', updateManualResize);
      window.removeEventListener('pointerup', finishManualResize);
      window.removeEventListener('pointercancel', cancelManualResize);
      document.body.classList.remove('resizing-table-column');
    };
  }, []);
  const toggleSort = (key) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction * -1 }
        : { key, direction: 1 },
    );
  const toggleColumn = (key) =>
    setColumnVisibility((current) => ({ ...current, [key]: !current[key] }));
  const moveColumn = (source, target) => {
    if (!source || source === 'name' || source === target) return;
    setColumnOrder((current) => {
      const next = current.filter((key) => key !== source);
      const targetIndex = Math.max(1, next.indexOf(target));
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, source);
      return next;
    });
  };
  const toggleColumnMenu = () => {
    if (!columnMenuOpen) signalPopover('columns');
    setColumnMenuOpen((open) => !open);
  };
  const visibleColumns = columnOrder.filter(
    (key) => key === 'name' || columnVisibility[key],
  );
  const sortedTorrents = useMemo(
    () =>
      [...torrents].sort((left, right) => {
        const a = left[sort.key] ?? '';
        const b = right[sort.key] ?? '';
        return (
          (typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a).localeCompare(String(b))) * sort.direction
        );
      }),
    [torrents, sort],
  );
  const resolvedColumnWidths = useMemo(
    () => ({ ...(theme === 'terminal' ? terminalColumnWidths : autoColumnWidths), ...columnWidths }),
    [autoColumnWidths, columnWidths, theme],
  );
  const tableMinimumWidth = useMemo(
    () =>
      (theme === 'terminal' ? 47 : TABLE_FIXED_CHROME_WIDTH) +
      visibleColumns
        .reduce((total, key) => total + resolvedColumnWidths[key], 0),
    [resolvedColumnWidths, visibleColumns, theme],
  );

  // Measure an unconstrained clone so auto widths can both grow and shrink as
  // data changes. Measuring the live fixed-layout table would only ever report
  // its already assigned width and would slowly ratchet columns larger.
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table || loading || theme === 'terminal') return undefined;
    let cancelled = false;
    let frame = 0;
    const measure = () => {
      if (cancelled || !table.isConnected) return;
      const clone = table.cloneNode(true);
      clone.removeAttribute('style');
      clone.classList.add('column-measure-table');
      clone.querySelectorAll('th[data-column]').forEach((header) => {
        header.style.width = 'auto';
      });
      table.parentElement.appendChild(clone);
      const measured = {};
      visibleColumns.forEach((key) => {
        const header = clone.querySelector(`th[data-column="${key}"]`);
        if (header) {
          measured[key] = clampColumnWidth(
            key,
            Math.ceil(header.getBoundingClientRect().width) + 2,
          );
        }
      });
      clone.remove();
      setAutoColumnWidths((current) => {
        const changed = Object.entries(measured).some(
          ([key, width]) => current[key] !== width,
        );
        return changed ? { ...current, ...measured } : current;
      });
    };
    frame = requestAnimationFrame(measure);
    document.fonts?.ready.then(() => {
      if (!cancelled) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(measure);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [loading, sortedTorrents, visibleColumns, mobile, theme]);
  const sortLabel =
    (Object.entries(TABLE_SORT_KEYS).find(
      ([, sortKey]) => sortKey === sort.key,
    )?.[0] === 'name'
      ? 'Torrent'
      : TABLE_COLUMN_LABELS[
          Object.entries(TABLE_SORT_KEYS).find(
            ([, sortKey]) => sortKey === sort.key,
          )?.[0]
        ]) || sort.key;
  const sortValue = (key) =>
    sort.key === key
      ? sort.direction === 1
        ? 'ascending'
        : 'descending'
      : 'none';
  if (mobile) return <MobileTorrentList torrents={sortedTorrents} selected={selected} setSelected={setSelected} onOpen={onOpen} onMenu={onMenu} loading={loading} onAdd={onAdd} sort={sort} setSort={setSort} />;
  const renderCell = (key, torrent, Icon) => {
    if (key === 'name')
      return (
        <td key={key} className="name-cell" data-column={key}>
          <div className="name-content">
            <div className={`state-icon ${stateKey(torrent.state)}`}>
              <Icon size={15} />
            </div>
            {torrent.tracker_host && <TrackerFavicon host={torrent.tracker_host} />}
            <div className="torrent-name">
              <strong title={torrent.name}>{torrent.name}</strong>
            </div>
          </div>
        </td>
      );
    if (key === 'state')
      return (
        <td key={key} data-column={key}>
          <span className={`state-badge ${stateKey(torrent.state)}`}>
            <i />
            {torrent.state}
          </span>
        </td>
      );
    if (key === 'progress')
      return (
        <td key={key} data-column={key}>
          <Progress value={torrent.progress} state={torrent.state} />
        </td>
      );
    if (key === 'size')
      return <td key={key} data-column={key}>{formatBytes(torrent.total_size)}</td>;
    if (key === 'download')
      return (
        <td key={key} className="rate-cell down" data-column={key}>
          {rate(torrent.download_payload_rate)}
        </td>
      );
    if (key === 'upload')
      return (
        <td key={key} className="rate-cell up" data-column={key}>
          {rate(torrent.upload_payload_rate)}
        </td>
      );
    if (key === 'eta') return <td key={key} data-column={key}>{eta(torrent.eta)}</td>;
    if (key === 'ratio')
      return (
        <td key={key} className="ratio-cell" data-column={key}>
          {Number(torrent.ratio || 0).toFixed(2)}
        </td>
      );
    if (key === 'seeds')
      return (
        <td
          key={key}
          data-column={key}
        >{`${Number(torrent.num_seeds) || 0} / ${Number(torrent.total_seeds) || 0}`}</td>
      );
    if (key === 'peers')
      return (
        <td
          key={key}
          data-column={key}
        >{`${Number(torrent.num_peers) || 0} / ${Number(torrent.total_peers) || 0}`}</td>
      );
    if (key === 'added')
      return <td key={key} data-column={key}>{torrentDate(torrent.time_added)}</td>;
    if (key === 'seedingTime')
      return <td key={key} data-column={key}>{elapsedTime(torrent.seeding_time)}</td>;
    if (key === 'tracker')
      return (
        <td key={key} data-column={key}>
          <span
            className={`tracker-status ${stateKey(torrent.tracker_status || 'unknown')}`}
          >
            {torrent.tracker_status || 'Unknown'}
          </span>
          <small className="tracker-host">{torrent.tracker_host || '—'}</small>
        </td>
      );
    return (
      <td key={key} data-column={key}>
        {queueRank(torrent) === Number.MAX_SAFE_INTEGER
          ? '—'
          : queueRank(torrent) + 1}
      </td>
    );
  };
  return (
    <div className="table-shell">
      <div className="table-tools">
        <span className="sort-announcement" role="status" aria-live="polite">
          Sorted by {sortLabel},{' '}
          {sort.direction === 1 ? 'ascending' : 'descending'}
        </span>
        <button
          className="column-menu-trigger"
          onClick={toggleColumnMenu}
          aria-expanded={columnMenuOpen}
          aria-label="Choose visible columns"
          title="Choose visible columns"
        >
          <Menu size={17} />
        </button>
        {columnMenuOpen && (
          <ColumnChooser
            columns={columnOrder
              .filter((key) => key !== 'name')
              .map((key) => ({ key, label: TABLE_COLUMN_LABELS[key] }))}
            visibility={columnVisibility}
            onToggle={toggleColumn}
            onClose={() => setColumnMenuOpen(false)}
          />
        )}
      </div>
      <table
        ref={tableRef}
        className="auto-sized-table"
        style={{ minWidth: `${tableMinimumWidth}px` }}
      >
        <thead>
          <tr>
            <th className="check-cell">
              <input
                type="checkbox"
                checked={Boolean(allSelected)}
                onChange={() =>
                  setSelected(
                    allSelected
                      ? new Set()
                      : new Set(torrents.map((torrent) => torrent.hash)),
                  )
                }
                aria-label="Select all filtered torrents"
              />
            </th>
            {visibleColumns.map((key) => (
              <th
                key={key}
                aria-sort={sortValue(TABLE_SORT_KEYS[key])}
                className={`resizable-th ${draggingColumn === key ? 'column-dragging' : ''}`}
                data-column={key}
                style={{ width: `${resolvedColumnWidths[key]}px` }}
                draggable={key !== 'name'}
                onDragStart={(event) => {
                  if (key === 'name') return;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', key);
                  setDraggingColumn(key);
                }}
                onDragOver={(event) => {
                  if (draggingColumn && key !== draggingColumn)
                    event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  moveColumn(
                    event.dataTransfer.getData('text/plain') || draggingColumn,
                    key,
                  );
                  setDraggingColumn(null);
                }}
                onDragEnd={() => setDraggingColumn(null)}
                title={
                  key === 'name' ? 'Torrent column' : 'Drag to move this column'
                }
              >
                <button
                  className="sort-button"
                  onClick={() => toggleSort(TABLE_SORT_KEYS[key])}
                >
                  {theme === 'terminal' && terminalColumnLabels[key]
                    ? terminalColumnLabels[key]
                    : key === 'download'
                    ? '↓ Download'
                    : key === 'upload'
                      ? '↑ Upload'
                      : key === 'name'
                        ? 'Torrent'
                        : TABLE_COLUMN_LABELS[key]}
                </button>
                <span
                  className="column-resize-handle"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${TABLE_COLUMN_LABELS[key]} column`}
                  aria-valuemin={MIN_COLUMN_WIDTHS[key]}
                  aria-valuemax={MAX_COLUMN_WIDTHS[key]}
                  aria-valuenow={resolvedColumnWidths[key]}
                  tabIndex="0"
                  title="Drag to resize · Double-click to auto-size"
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    columnResizeStart.current = {
                      key,
                      startX: event.clientX,
                      startWidth: resolvedColumnWidths[key],
                    };
                    document.body.classList.add('resizing-table-column');
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    setColumnWidths((current) => {
                      const next = { ...current };
                      delete next[key];
                      return next;
                    });
                  }}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key))
                      return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.key === 'Home') {
                      setColumnWidths((current) => {
                        const next = { ...current };
                        delete next[key];
                        return next;
                      });
                      return;
                    }
                    const delta = (event.shiftKey ? 24 : 8) *
                      (event.key === 'ArrowRight' ? 1 : -1);
                    setColumnWidths((current) => ({
                      ...current,
                      [key]: clampWidth(
                        key,
                        (current[key] ?? resolvedColumnWidths[key]) + delta,
                      ),
                    }));
                  }}
                />
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="skeleton-row">
                <td />
                {visibleColumns.map((key) => (
                  <td key={key} data-column={key}>
                    <i />
                  </td>
                ))}
                <td />
              </tr>
            ))
          ) : torrents.length ? (
            sortedTorrents.map((torrent) => {
              const Icon = icons[stateKey(torrent.state)] || Info;
              return (
                <tr
                  key={torrent.hash}
                  className={selected.has(torrent.hash) ? 'selected' : ''}
                  onClick={(event) => {
                    if (event.target.closest('button,input,select,a')) return;
                    onOpen(torrent);
                  }}
                  tabIndex="0"
                  role="button"
                  aria-label={`Open details for ${torrent.name}`}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpen(torrent);
                    }
                  }}
                >
                  <td className="check-cell">
                    <input
                      type="checkbox"
                      checked={selected.has(torrent.hash)}
                      onChange={() =>
                        setSelected((current) => {
                          const next = new Set(current);
                          next.has(torrent.hash)
                            ? next.delete(torrent.hash)
                            : next.add(torrent.hash);
                          return next;
                        })
                      }
                      aria-label={`Select ${torrent.name}`}
                    />
                  </td>
                  {visibleColumns.map((key) => renderCell(key, torrent, Icon))}
                  <td>
                    <button
                      className="row-menu"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMenu(torrent, event);
                      }}
                      aria-label={`Actions for ${torrent.name}`}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={visibleColumns.length + 2}>
                <div className="empty-table">
                  <div className="empty-icon">
                    <ListFilter size={22} />
                  </div>
                  <h3>No torrents here</h3>
                  <p>Try another filter or add a torrent.</p>
                  <button className="secondary-button" onClick={onAdd}>
                    <Plus size={16} /> Add torrent
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function CommandPalette({
  onClose,
  onAdd,
  onPreferences,
  onRefresh,
  onSearch,
}) {
  useRestoreFocus();
  const input = useRef(null);
  const paletteRef = useRef(null);
  useFocusTrap(paletteRef);
  useEffect(() => {
    input.current?.focus();
    const dismiss = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [onClose]);
  const commands = [
    ['Add torrent', onAdd, Plus],
    ['Open Preferences', onPreferences, Settings2],
    ['Refresh torrents', onRefresh, RefreshCw],
    ['Focus search', onSearch, Search],
  ];
  return (
    <div
      className="modal-backdrop command-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={paletteRef}
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="command-search">
          <Search size={17} />
          <input
            ref={input}
            placeholder="Type a command…"
            aria-label="Command search"
          />
        </div>
        <div className="command-list">
          {commands.map(([label, action, Icon]) => (
            <button
              key={label}
              onClick={() => {
                action();
                onClose();
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="command-hint">
          <kbd>Esc</kbd> close
        </div>
      </section>
    </div>
  );
}
function swarmCount(connected, total) {
  return `${Number(connected) || 0} connected · ${Number(total) || 0} total`;
}
function pieceCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count.toLocaleString() : '—';
}
function pieceSize(value) {
  return Number(value) > 0 ? formatBytes(value) : '—';
}
function elapsedTime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return '< 1m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
function torrentDate(value, emptyLabel = '—') {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return emptyLabel;
  const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
function fileTreeRows(files) {
  const rows = [];
  const seenFolders = new Set();
  files.forEach((file, index) => {
    const parts = String(file.path || '')
      .split('/')
      .filter(Boolean);
    const folderParts = parts.length > 1 ? parts.slice(0, -1) : ['Files'];
    for (let depth = 1; depth <= folderParts.length; depth += 1) {
      const folder = folderParts.slice(0, depth).join('/');
      if (!seenFolders.has(folder)) {
        rows.push({ type: 'folder', folder, depth });
        seenFolders.add(folder);
      }
    }
    rows.push({ type: 'file', file, index, depth: folderParts.length });
  });
  return rows;
}
function InlineRename({ initialName, onSave, onCancel, busy = false }) {
  const [name, setName] = useState(initialName);
  const input = useRef(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  return (
    <span className="inline-rename">
      <input
        ref={input}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSave(name);
          }
          if (event.key === 'Escape') onCancel();
        }}
        aria-label={`New name for ${initialName}`}
        disabled={busy}
      />
      <button
        className="icon-button"
        onClick={() => onSave(name)}
        disabled={busy}
        aria-label={`Save name for ${initialName}`}
      >
        <Check size={13} />
      </button>
      <button
        className="icon-button"
        onClick={onCancel}
        disabled={busy}
        aria-label="Cancel rename"
      >
        <X size={13} />
      </button>
    </span>
  );
}
function DetailDrawer({ torrent, onClose, onAction }) {
  useRestoreFocus();
  const drawerRef = useRef(null);
  useFocusTrap(drawerRef);
  useDialogDismiss(onClose, drawerRef);
  const [tab, setTab] = useState('overview');
  const [files, setFiles] = useState([]);
  const [fileState, setFileState] = useState({ status: 'idle', error: '' });
  const [fileAction, setFileAction] = useState({ index: null, error: '' });
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [editingPath, setEditingPath] = useState('');
  const [renameState, setRenameState] = useState({ busy: false, error: '' });
  const [options, setOptions] = useState({
    sequential_download: Boolean(torrent.sequential_download),
    prioritize_first_last: Boolean(torrent.prioritize_first_last),
    is_auto_managed: torrent.is_auto_managed !== false,
  });
  const [optionsState, setOptionsState] = useState({
    busy: false,
    message: '',
    error: '',
  });
  const gate = useRef(createRequestGate());
  const loadFiles = async () => {
    const token = gate.current.begin();
    setFileState({ status: 'loading', error: '' });
    setFiles([]);
    let failure;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = normalizeTorrentFiles(
          await rpc('web.get_torrent_files', [torrent.hash]),
        );
        if (!gate.current.isCurrent(token)) return;
        setFiles(result);
        setFileState({ status: 'ready', error: '' });
        return;
      } catch (error) {
        failure = error;
      }
    }
    if (gate.current.isCurrent(token))
      setFileState({
        status: 'error',
        error: failure?.message || 'Deluge did not return file details.',
      });
  };
  const setFilePriority = async (position, priority) => {
    const next = files.map((file, index) =>
      index === position ? { ...file, priority: Number(priority) } : file,
    );
    const priorities = [];
    next.forEach((file, index) => {
      priorities[
        Number.isInteger(Number(file.index)) ? Number(file.index) : index
      ] = Number(file.priority ?? 4);
    });
    setFileAction({ index: position, error: '' });
    try {
      await rpc('core.set_torrent_file_priorities', [torrent.hash, priorities]);
      setFiles(next);
      setFileAction({ index: null, error: '' });
    } catch (reason) {
      setFileAction({
        index: null,
        error: reason.message || 'Deluge could not update this file.',
      });
    }
  };
  const setFileWanted = async (position) =>
    setFilePriority(position, Number(files[position]?.priority) === 0 ? 4 : 0);
  const setSelectedPriority = async (priority) => {
    if (!selectedFiles.size) return;
    const value = Number(priority);
    const next = files.map((file, index) =>
      selectedFiles.has(index) ? { ...file, priority: value } : file,
    );
    const priorities = [];
    next.forEach((file, index) => {
      priorities[
        Number.isInteger(Number(file.index)) ? Number(file.index) : index
      ] = Number(file.priority ?? 4);
    });
    setFileAction({ index: 'selection', error: '' });
    try {
      await rpc('core.set_torrent_file_priorities', [torrent.hash, priorities]);
      setFiles(next);
      setFileAction({ index: null, error: '' });
    } catch (reason) {
      setFileAction({
        index: null,
        error: reason.message || 'Deluge could not update the selected files.',
      });
    }
  };
  const folderFiles = (folder) =>
    folder === 'Files'
      ? files
      : files.filter((file) => file.path.startsWith(`${folder}/`));
  const setFolderPriority = async (folder, priority) => {
    const next = files.map((file) =>
      folderFiles(folder).includes(file)
        ? { ...file, priority: Number(priority) }
        : file,
    );
    const priorities = [];
    next.forEach((file, index) => {
      priorities[
        Number.isInteger(Number(file.index)) ? Number(file.index) : index
      ] = Number(file.priority ?? 4);
    });
    setFileAction({ index: `folder:${folder}`, error: '' });
    try {
      await rpc('core.set_torrent_file_priorities', [torrent.hash, priorities]);
      setFiles(next);
      setFileAction({ index: null, error: '' });
    } catch (reason) {
      setFileAction({
        index: null,
        error: reason.message || 'Deluge could not update this folder.',
      });
    }
  };
  const toggleFileSelection = (position) =>
    setSelectedFiles((current) => {
      const next = new Set(current);
      if (next.has(position)) next.delete(position);
      else next.add(position);
      return next;
    });
  const renameEntry = async (entry, nextName) => {
    const trimmed = String(nextName || '').trim();
    if (!trimmed || trimmed.includes('/') || trimmed.includes('\\')) {
      setRenameState({
        busy: false,
        error: 'Use a name only, without folder separators.',
      });
      return;
    }
    setRenameState({ busy: true, error: '' });
    try {
      if (entry.type === 'folder')
        await rpc('core.rename_folder', [
          torrent.hash, entry.folder,
          `${entry.folder.slice(0, entry.folder.lastIndexOf('/') + 1)}${trimmed}`,
        ]);
      else {
        const path = entry.file.path;
        const parent = path.includes('/')
          ? `${path.slice(0, path.lastIndexOf('/') + 1)}`
          : '';
        await rpc('core.rename_files', [
          torrent.hash,
          [[Number(entry.file.index ?? entry.index), `${parent}${trimmed}`]],
        ]);
      }
      await loadFiles();
      setEditingPath('');
      setRenameState({ busy: false, error: '' });
    } catch (reason) {
      setRenameState({
        busy: false,
        error: reason.message || 'Deluge could not rename this item.',
      });
    }
  };
  const saveOptions = async () => {
    setOptionsState({ busy: true, message: '', error: '' });
    try {
      await rpc('core.set_torrent_options', [torrent.hash, options]);
      setOptionsState({ busy: false, message: 'Options saved.', error: '' });
    } catch (reason) {
      setOptionsState({
        busy: false,
        message: '',
        error: reason.message || 'Deluge could not save torrent options.',
      });
    }
  };
  useEffect(() => {
    setTab('overview');
    setFileAction({ index: null, error: '' });
    setSelectedFiles(new Set());
    setEditingPath('');
    setRenameState({ busy: false, error: '' });
    setOptions({
      sequential_download: Boolean(torrent.sequential_download),
      prioritize_first_last: Boolean(torrent.prioritize_first_last),
      is_auto_managed: torrent.is_auto_managed !== false,
    });
    setOptionsState({ busy: false, message: '', error: '' });
    loadFiles();
    return () => gate.current.cancel();
  }, [torrent.hash]);
  return (
    <>
      <div
        className="detail-backdrop"
        onMouseDown={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        className="detail-drawer"
        aria-label="Torrent details"
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-head">
          <h2>{torrent.name}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>
        <div className="drawer-tabs" role="tablist">
          {['overview', 'files'].map((name) => (
            <button
              key={name}
              id={`drawer-tab-${name}`}
              onClick={() => setTab(name)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault();
                  const next =
                    event.key === 'ArrowRight'
                      ? name === 'overview'
                        ? 'files'
                        : 'overview'
                      : name === 'files'
                        ? 'overview'
                        : 'files';
                  setTab(next);
                  document.getElementById(`drawer-tab-${next}`)?.focus();
                }
              }}
              role="tab"
              aria-selected={tab === name}
              aria-controls={`drawer-panel-${name}`}
            >
              {name}
            </button>
          ))}
        </div>
        {tab === 'overview' ? (
          <div
            className="drawer-content"
            id="drawer-panel-overview"
            role="tabpanel"
            aria-labelledby="drawer-tab-overview"
          >
            <div className="detail-grid">
              <Detail label="Status" value={torrent.state} />
              <Detail
                label="Seeds"
                value={swarmCount(torrent.num_seeds, torrent.total_seeds)}
              />
              <Detail
                label="Peers"
                value={swarmCount(torrent.num_peers, torrent.total_peers)}
              />
              <Detail label="Pieces" value={pieceCount(torrent.num_pieces)} />
              <Detail
                label="Piece size"
                value={pieceSize(torrent.piece_length)}
              />
              <Detail
                label="Uploaded"
                value={formatBytes(torrent.total_uploaded)}
              />
              <Detail
                label="Active time"
                value={elapsedTime(torrent.active_time)}
              />
              <Detail
                label="Seeding time"
                value={elapsedTime(torrent.seeding_time)}
              />
              <Detail label="Added" value={torrentDate(torrent.time_added)} />
              <Detail
                label="Completed"
                value={torrentDate(torrent.completed_time, 'Not completed')}
              />
              <Detail
                label="Tracker"
                value={`${torrent.tracker_status || 'Unknown'} · ${torrent.tracker_host || '—'}`}
              />
              <Detail
                label="Download path"
                value={torrent.save_path || torrent.download_location || '—'}
              />
            </div>
            <section
              className="torrent-options"
              aria-labelledby="torrent-options-title"
            >
              <div className="torrent-options-head">
                <div>
                  <span className="drawer-eyebrow">TORRENT OPTIONS</span>
                  <h3 id="torrent-options-title">Transfer behavior</h3>
                </div>
                <button
                  className="primary-button small"
                  onClick={saveOptions}
                  disabled={optionsState.busy}
                >
                  {optionsState.busy ? 'Saving…' : 'Save options'}
                </button>
              </div>
              <label className="option-toggle">
                <input
                  type="checkbox"
                  checked={options.is_auto_managed}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      is_auto_managed: event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>Auto-managed queue</strong>
                  <small>
                    Let Deluge place this torrent in the active queue.
                  </small>
                </span>
              </label>
              <label className="option-toggle">
                <input
                  type="checkbox"
                  checked={options.sequential_download}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      sequential_download: event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>Sequential download</strong>
                  <small>Request pieces in file order when possible.</small>
                </span>
              </label>
              <label className="option-toggle">
                <input
                  type="checkbox"
                  checked={options.prioritize_first_last}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      prioritize_first_last: event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>Prioritize first and last pieces</strong>
                  <small>Make media previews available sooner.</small>
                </span>
              </label>
              {optionsState.error && (
                <div className="file-action-error" role="alert">
                  {optionsState.error}
                </div>
              )}
              {optionsState.message && (
                <div
                  className="option-save-message"
                  role="status"
                  aria-live="polite"
                >
                  {optionsState.message}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div
            className="drawer-content"
            id="drawer-panel-files"
            role="tabpanel"
            aria-labelledby="drawer-tab-files"
          >
            <div className="files-selection-bar">
              <span>
                {selectedFiles.size
                  ? `${selectedFiles.size} selected`
                  : 'Select files'}
              </span>
              <div className="folder-actions">
                {selectedFiles.size > 0 && (
                  <>
                    <select
                      className="file-priority bulk-file-priority"
                      value=""
                      onChange={(event) =>
                        setSelectedPriority(event.target.value)
                      }
                      disabled={fileAction.index !== null}
                      aria-label="Priority for selected files"
                    >
                      <option value="" disabled>
                        Set priority…
                      </option>
                      <option value="0">Skip selected</option>
                      <option value="1">Low selected</option>
                      <option value="4">Normal selected</option>
                      <option value="7">High selected</option>
                    </select>
                    <button
                      className="secondary-button small"
                      onClick={() => setSelectedFiles(new Set())}
                    >
                      Clear selection
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="file-list">
              {fileTreeRows(files).map((entry) =>
                entry.type === 'folder' ? (
                  <div
                    className="file-folder-row"
                    key={`folder-${entry.folder}`}
                    style={{ paddingLeft: `${10 + (entry.depth || 1) * 16}px` }}
                  >
                    {editingPath === entry.folder ? (
                      <InlineRename
                        initialName={
                          entry.folder.split('/').pop() || entry.folder
                        }
                        onSave={(name) => renameEntry(entry, name)}
                        onCancel={() => setEditingPath('')}
                        busy={renameState.busy}
                      />
                    ) : (
                      <>
                        <FolderOpen size={14} />
                        <strong>{entry.folder}</strong>
                        <button
                          className="folder-priority-button"
                          onClick={() =>
                            setFolderPriority(
                              entry.folder,
                              folderFiles(entry.folder).every(
                                (file) => Number(file.priority) === 0,
                              )
                                ? 4
                                : 0,
                            )
                          }
                          disabled={fileAction.index !== null}
                          aria-label={`${folderFiles(entry.folder).every((file) => Number(file.priority) === 0) ? 'Download' : 'Skip'} folder ${entry.folder}`}
                        >
                          {folderFiles(entry.folder).every(
                            (file) => Number(file.priority) === 0,
                          )
                            ? 'Download'
                            : 'Skip'}
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => setEditingPath(entry.folder)}
                          disabled={renameState.busy}
                          aria-label={`Rename folder ${entry.folder}`}
                        >
                          <Pencil size={13} />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    className="file-row"
                    key={`${entry.file.path}-${entry.index}`}
                    style={{ paddingLeft: `${10 + (entry.depth || 0) * 16}px` }}
                  >
                    <input
                      className="file-select"
                      type="checkbox"
                      checked={selectedFiles.has(entry.index)}
                      onChange={() => toggleFileSelection(entry.index)}
                      aria-label={`Select ${entry.file.path}`}
                    />
                    {editingPath === entry.file.path ? (
                      <InlineRename
                        initialName={
                          entry.file.path.split('/').pop() || entry.file.path
                        }
                        onSave={(name) => renameEntry(entry, name)}
                        onCancel={() => setEditingPath('')}
                        busy={renameState.busy}
                      />
                    ) : (
                      <>
                        <FileArchive size={15} />
                        <span>{entry.file.path}</span>
                        <button
                          className="icon-button"
                          onClick={() => setEditingPath(entry.file.path)}
                          disabled={renameState.busy}
                          aria-label={`Rename file ${entry.file.path}`}
                        >
                          <Pencil size={13} />
                        </button>
                      </>
                    )}
                    <select
                      className="file-priority"
                      value={Number(entry.file.priority ?? 4)}
                      onChange={(event) =>
                        setFilePriority(entry.index, event.target.value)
                      }
                      disabled={fileAction.index !== null || renameState.busy}
                      aria-label={`Priority for ${entry.file.path}`}
                    >
                      <option value="0">Skip</option>
                      <option value="1">Low</option>
                      <option value="4">Normal</option>
                      <option value="7">High</option>
                    </select>
                    <button
                      className="file-wanted-toggle"
                      onClick={() => setFileWanted(entry.index)}
                      disabled={fileAction.index !== null || renameState.busy}
                      aria-pressed={Number(entry.file.priority) !== 0}
                      aria-label={
                        Number(entry.file.priority) === 0
                          ? 'Download file'
                          : 'Skip file'
                      }
                    >
                      {fileAction.index === entry.index ? (
                        <RefreshCw className="spin" size={12} />
                      ) : Number(entry.file.priority) === 0 ? (
                        'Skipped'
                      ) : (
                        'Download'
                      )}
                    </button>
                    <small>
                      {formatBytes(entry.file.size)} ·{' '}
                      {Number(entry.file.progress ?? 0).toFixed(0)}% complete ·{' '}
                      {entry.file.availability == null
                        ? 'Availability —'
                        : `Availability ${Number(entry.file.availability).toFixed(2)}`}
                    </small>
                  </div>
                ),
              )}
            </div>
            {renameState.error && (
              <div className="file-action-error" role="alert">
                {renameState.error}
              </div>
            )}
            {fileAction.error && (
              <div className="file-action-error" role="alert">
                {fileAction.error}
              </div>
            )}
          </div>
        )}
        <div className="drawer-footer">
          <button
            className="secondary-button"
            onClick={() =>
              onAction(torrent.state === 'Paused' ? 'resume' : 'pause')
            }
          >
            {torrent.state === 'Paused' ? 'Resume' : 'Pause'}
          </button>
        </div>
      </aside>
    </>
  );
}
function RemoveModal({ targets, onClose, onRemove, onModalState }) {
  useRestoreFocus();
  const modalRef = useRef(null);
  useFocusTrap(modalRef);
  const [busy, setBusy] = useState(false);
  useDialogDismiss(onClose, modalRef, Boolean(busy));
  const [error, setError] = useState('');
  useEffect(() => {
    const locked = busy || Boolean(error);
    deckModalState.locked = locked;
    onModalState?.(locked);
    return () => {
      deckModalState.locked = false;
      onModalState?.(false);
    };
  }, [busy, error, onModalState]);
  const remove = async (removeData) => {
    deckModalState.locked = true;
    setBusy(true);
    setError('');
    try {
      await onRemove(removeData);
    } catch (reason) {
      setError(
        reason.message || 'Deluge could not remove the selected torrent.',
      );
    } finally {
      setBusy(false);
    }
  };
  const label = `${targets.length} torrent${targets.length === 1 ? '' : 's'}`;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !busy && onClose()
      }
    >
      <section
        ref={modalRef}
        className="remove-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-title"
      >
        <div className="modal-head">
          <div>
            <span className="drawer-eyebrow">REMOVE TRANSFER</span>
            <h2 id="remove-title">Remove {label}?</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close remove options"
          >
            <X size={18} />
          </button>
        </div>
        <div className="remove-body">
          <AlertTriangle size={24} />
          <div>
            <p>
              Choose exactly what Deluge should remove. This cannot be undone.
            </p>
            {error && (
              <div className="form-error" role="alert">
                <AlertTriangle size={15} />
                {error}
              </div>
            )}
          </div>
        </div>
        <div className="remove-choices">
          <button
            className="remove-choice"
            onClick={() => remove(false)}
            disabled={busy}
          >
            <div>
              <strong>Remove torrent only</strong>
              <span>Keep downloaded data on disk.</span>
            </div>
            <Trash2 size={18} />
          </button>
          <button
            className="remove-choice destructive"
            onClick={() => remove(true)}
            disabled={busy}
          >
            <div>
              <strong>Remove torrent and data</strong>
              <span>Delete downloaded data from Deluge’s storage.</span>
            </div>
            <Trash2 size={18} />
          </button>
        </div>
        <div className="modal-foot">
          <span>Deluge performs the selected operation.</span>
          <button
            className="secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
function MoveStorageModal({ torrent, onClose, onMoved, onModalState }) {
  useRestoreFocus();
  const modalRef = useRef(null);
  useFocusTrap(modalRef);
  const [destination, setDestination] = useState(
    torrent.save_path || torrent.download_location || '',
  );
  const [busy, setBusy] = useState(false);
  useDialogDismiss(onClose, modalRef, Boolean(busy));
  const [error, setError] = useState('');
  useEffect(() => {
    deckModalState.locked = busy;
    onModalState?.(busy);
    return () => {
      deckModalState.locked = false;
      onModalState?.(false);
    };
  }, [busy, onModalState]);
  const submit = async (event) => {
    event.preventDefault();
    const path = destination.trim();
    if (!path) {
      setError('Enter a destination folder on the Deluge host.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await rpc('core.move_storage', [[torrent.hash], path]);
      await onMoved();
      onClose();
    } catch (reason) {
      setError(reason.message || 'Deluge could not move this torrent.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !busy && onClose()
      }
    >
      <section
        ref={modalRef}
        className="add-modal move-storage-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-storage-title"
      >
        <div className="modal-head">
          <div>
            <span className="drawer-eyebrow">TORRENT STORAGE</span>
            <h2 id="move-storage-title">Move downloaded files</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close move storage"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="move-storage-body">
            <div className="move-storage-icon">
              <HardDrive size={23} />
            </div>
            <div>
              <strong>{torrent.name}</strong>
              <span>Deluge will move the torrent data on its host.</span>
            </div>
            <label>
              <span>Destination folder</span>
              <div className="move-path-input">
                <FolderOpen size={16} />
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  onFocus={(event) => event.target.select()}
                  placeholder="/path/on/deluge/host"
                  autoFocus
                />
              </div>
            </label>
            {error && (
              <div className="form-error" role="alert">
                <AlertTriangle size={15} />
                {error}
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? (
                <RefreshCw className="spin" size={16} />
              ) : (
                <HardDrive size={16} />
              )}
              {busy ? 'Moving…' : 'Move files'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function RenameTorrentModal({ torrent, onClose, onRenamed, onModalState }) {
  useRestoreFocus();
  const modalRef = useRef(null);
  useFocusTrap(modalRef);
  const [target, setTarget] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useDialogDismiss(onClose, modalRef, Boolean(busy));
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    rpc('web.get_torrent_files', [torrent.hash])
      .then((payload) => {
        if (!current) return;
        const files = normalizeTorrentFiles(payload);
        if (!files.length)
          throw new Error('Deluge did not return any files to rename.');
        if (files.length === 1) {
          const path = files[0].path;
          setTarget({ kind: 'file', path, index: Number(files[0].index ?? 0) });
          setName(path.split('/').pop() || torrent.name);
          return;
        }
        const roots = new Set(
          files.map((file) => file.path.split('/')[0]).filter(Boolean),
        );
        if (roots.size !== 1)
          throw new Error(
            'This torrent has no single top-level folder to rename.',
          );
        const path = [...roots][0];
        setTarget({ kind: 'folder', path });
        setName(path);
      })
      .catch(
        (reason) =>
          current &&
          setError(reason.message || 'Deluge could not inspect this torrent.'),
      );
    return () => {
      current = false;
    };
  }, [torrent.hash]);
  useEffect(() => {
    deckModalState.locked = busy;
    onModalState?.(busy);
    return () => {
      deckModalState.locked = false;
      onModalState?.(false);
    };
  }, [busy, onModalState]);
  const submit = async (event) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!target || !nextName) {
      setError(
        target
          ? 'Enter a new file or folder name.'
          : 'File information is still loading.',
      );
      return;
    }
    if (nextName.includes('/') || nextName.includes('\\')) {
      setError('Use a name only, without folder separators.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (target.kind === 'folder')
        await rpc('core.rename_folder', [torrent.hash, target.path, nextName]);
      else {
        const parent = target.path.includes('/')
          ? `${target.path.slice(0, target.path.lastIndexOf('/') + 1)}`
          : '';
        await rpc('core.rename_files', [
          torrent.hash,
          [[target.index, `${parent}${nextName}`]],
        ]);
      }
      await onRenamed();
      onClose();
    } catch (reason) {
      setError(reason.message || 'Deluge could not rename this torrent data.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !busy && onClose()
      }
    >
      <section
        ref={modalRef}
        className="add-modal move-storage-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-torrent-title"
      >
        <div className="modal-head">
          <div>
            <span className="drawer-eyebrow">TORRENT DATA</span>
            <h2 id="rename-torrent-title">
              Rename {target?.kind || 'torrent'}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close rename torrent"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="move-storage-body">
            <div className="move-storage-icon">
              <Pencil size={22} />
            </div>
            <div>
              <strong>{torrent.name}</strong>
              <span>
                {target
                  ? `Renaming its top-level ${target.kind} on the Deluge host.`
                  : 'Inspecting torrent files…'}
              </span>
            </div>
            <label>
              <span>New {target?.kind || 'file or folder'} name</span>
              <div className="move-path-input">
                <Pencil size={15} />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onFocus={(event) => event.target.select()}
                  placeholder="New name"
                  disabled={!target || busy}
                  autoFocus
                />
              </div>
            </label>
            {error && (
              <div className="form-error" role="alert">
                <AlertTriangle size={15} />
                {error}
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!target || busy}
            >
              {busy ? (
                <RefreshCw className="spin" size={16} />
              ) : (
                <Pencil size={16} />
              )}
              {busy ? 'Renaming…' : 'Rename'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function useRestoreFocus() {
  const previous = useRef(null);
  useEffect(() => {
    previous.current = document.activeElement;
    return () => {
      if (previous.current && typeof previous.current.focus === 'function')
        previous.current.focus();
    };
  }, []);
}
function useFocusTrap(ref) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Tab' || !ref.current) return;
      const focusable = [
        ...ref.current.querySelectorAll(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]',
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [ref]);
}
function PreferencesModal({
  refreshMs,
  setRefreshMs,
  downloadLocation,
  completedPath,
  moveCompleted,
  networkPort,
  randomPort,
  proxyEnabled,
  proxyHost,
  proxyPort,
  proxyType,
  cacheSize,
  cacheExpiry,
  plugins,
  celebrateCompletions,
  onPathChange,
  onSavePaths,
  onSaveNetwork,
  onSaveProxy,
  onSaveCache,
  pathsBusy,
  pathsMessage,
  networkBusy,
  networkMessage,
  proxyBusy,
  proxyMessage,
  cacheBusy,
  cacheMessage,
  onClose,
  onOpenNative,
}) {
  useRestoreFocus();
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef);
  useDialogDismiss(onClose, dialogRef);
  const nativeAvailable =
    pluginMode() && typeof window.deluge?.preferences?.show === 'function';
  return (
    <div
      className="modal-backdrop preferences-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="preferences-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preferences-title"
      >
        <div className="preferences-head">
          <div className="preferences-heading">
            <div className="preferences-logo" aria-hidden="true">
              <div className="brand-mark">
                <span />
                <span />
                <span />
              </div>
            </div>
            <h2 id="preferences-title">Deluge Preferences</h2>
            <Settings2 size={17} aria-hidden="true" />
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close preferences"
          >
            <X size={24} />
          </button>
        </div>
        <div className="preferences-content">
          <section className="preferences-card refresh-preference">
            <div className="preferences-card-icon">
              <RefreshCw size={22} />
            </div>
            <div className="preferences-card-copy">
              <strong>Auto-Refresh Interval</strong>
              <span>Adjust frequency of dashboard updates.</span>
            </div>
            <label className="preferences-select">
              <span>Interval</span>
              <select
                value={refreshMs}
                onChange={(event) => setRefreshMs(Number(event.target.value))}
                aria-label="Dashboard refresh interval"
              >
                {REFRESH_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label.replace(' seconds', 's').replace(' second', 's')}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="preferences-card path-preference">
            <div className="preferences-card-icon">
              <FolderOpen size={22} />
            </div>
            <div className="preferences-card-copy">
              <strong>Download locations</strong>
              <span>Choose where new and completed torrents are stored.</span>
              <label className="path-setting">
                <span>Download to</span>
                <input
                  value={downloadLocation}
                  onChange={(event) =>
                    onPathChange('downloadLocation', event.target.value)
                  }
                  placeholder="D:\\Torrents"
                  aria-label="Download location"
                />
              </label>
              <label className="path-setting">
                <span>Move completed to</span>
                <input
                  value={completedPath}
                  onChange={(event) =>
                    onPathChange('completedPath', event.target.value)
                  }
                  placeholder="D:\\Completed"
                  aria-label="Completed download location"
                />
              </label>
              <label className="path-check">
                <input
                  type="checkbox"
                  checked={moveCompleted}
                  onChange={(event) =>
                    onPathChange('moveCompleted', event.target.checked)
                  }
                />{' '}
                Move completed torrents automatically
              </label>
              {pathsMessage && (
                <span className="path-message" role="status">
                  {pathsMessage}
                </span>
              )}
            </div>
            <button
              className="secondary-button"
              onClick={onSavePaths}
              disabled={pathsBusy || !downloadLocation.trim()}
            >
              {pathsBusy ? 'Saving…' : 'Save paths'}
            </button>
          </section>
          <section className="preferences-card network-preference">
            <div className="preferences-card-icon">
              <Network size={22} />
            </div>
            <div className="preferences-card-copy">
              <strong>Network listening</strong>
              <span>Configure the incoming port used by Deluge.</span>
              <label className="path-setting">
                <span>Listen port</span>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={networkPort}
                  onChange={(event) =>
                    onPathChange('networkPort', event.target.value)
                  }
                  aria-label="Listen port"
                />
              </label>
              <label className="path-check">
                <input
                  type="checkbox"
                  checked={randomPort}
                  onChange={(event) =>
                    onPathChange('randomPort', event.target.checked)
                  }
                />{' '}
                Randomize port on startup
              </label>
              {networkMessage && (
                <span className="path-message" role="status">
                  {networkMessage}
                </span>
              )}
            </div>
            <button
              className="secondary-button"
              onClick={onSaveNetwork}
              disabled={networkBusy}
            >
              {networkBusy ? 'Saving…' : 'Save network'}
            </button>
          </section>
          <section className="preferences-card proxy-preference">
            <div className="preferences-card-icon">
              <ShieldCheck size={22} />
            </div>
            <div className="preferences-card-copy">
              <strong>Proxy</strong>
              <span>Route tracker and peer connections through a proxy.</span>
              <label className="path-check">
                <input
                  type="checkbox"
                  checked={proxyEnabled}
                  onChange={(event) =>
                    onPathChange('proxyEnabled', event.target.checked)
                  }
                />{' '}
                Enable proxy
              </label>
              <label className="path-setting">
                <span>Type</span>
                <select
                  value={proxyType}
                  onChange={(event) =>
                    onPathChange('proxyType', event.target.value)
                  }
                  aria-label="Proxy type"
                >
                  <option value="HTTP">HTTP</option>
                  <option value="SOCKS5">SOCKS5</option>
                  <option value="SOCKS4">SOCKS4</option>
                  <option value="SOCKS5_AUTH">SOCKS5 with authentication</option>
                  <option value="HTTP_AUTH">HTTP with authentication</option>
                  <option value="I2P">I2P</option>
                </select>
              </label>
              <label className="path-setting">
                <span>Host</span>
                <input
                  value={proxyHost}
                  onChange={(event) =>
                    onPathChange('proxyHost', event.target.value)
                  }
                  placeholder="proxy.example.com"
                  aria-label="Proxy host"
                />
              </label>
              <label className="path-setting">
                <span>Port</span>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={proxyPort}
                  onChange={(event) =>
                    onPathChange('proxyPort', event.target.value)
                  }
                  aria-label="Proxy port"
                />
              </label>
              {proxyMessage && (
                <span className="path-message" role="status">
                  {proxyMessage}
                </span>
              )}
            </div>
            <button
              className="secondary-button"
              onClick={onSaveProxy}
              disabled={proxyBusy}
            >
              {proxyBusy ? 'Saving…' : 'Save proxy'}
            </button>
          </section>
          <section className="preferences-card cache-preference">
            <div className="preferences-card-icon">
              <HardDrive size={22} />
            </div>
            <div className="preferences-card-copy">
              <strong>Disk cache</strong>
              <span>Control the cache size and expiry used by Deluge.</span>
              <label className="path-setting">
                <span>Cache size (MiB)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={cacheSize}
                  onChange={(event) =>
                    onPathChange('cacheSize', event.target.value)
                  }
                  aria-label="Cache size in MiB"
                />
              </label>
              <label className="path-setting">
                <span>Expiry (seconds)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={cacheExpiry}
                  onChange={(event) =>
                    onPathChange('cacheExpiry', event.target.value)
                  }
                  aria-label="Cache expiry in seconds"
                />
              </label>
              {cacheMessage && (
                <span className="path-message" role="status">
                  {cacheMessage}
                </span>
              )}
            </div>
            <button
              className="secondary-button"
              onClick={onSaveCache}
              disabled={cacheBusy}
            >
              {cacheBusy ? 'Saving…' : 'Save cache'}
            </button>
          </section>
          <section className="preferences-card plugin-preference">
            <div className="preferences-card-icon">
              <Zap size={22} />
            </div>
            <div className="preferences-card-copy">
              <strong>Plugins</strong>
              <span>
                {plugins.enabled.length} enabled · {plugins.available.length}{' '}
                available
              </span>
              <div className="plugin-list">
                {plugins.enabled.map((name) => (
                  <span key={name} className="plugin-chip enabled">
                    {name}
                    <b>Enabled</b>
                  </span>
                ))}
                {plugins.available
                  .filter((name) => !plugins.enabled.includes(name))
                  .map((name) => (
                    <span key={name} className="plugin-chip">
                      {name}
                      <b>Available</b>
                    </span>
                  ))}
              </div>
            </div>
          </section>
          <section className="preferences-card celebration-preference">
            <div className="preferences-card-icon">
              <Sparkles size={22} />
            </div>
            <div className="preferences-card-copy">
              <strong>Completion celebrations</strong>
              <span>Show a small celebration when a torrent finishes.</span>
              <label className="path-check">
                <input
                  type="checkbox"
                  checked={celebrateCompletions}
                  onChange={(event) =>
                    onPathChange('celebrateCompletions', event.target.checked)
                  }
                />{' '}
                Enable celebrations
              </label>
            </div>
          </section>
          <section className="preferences-card keyboard-help">
            <div className="preferences-card-icon">
              <Keyboard size={22} />
            </div>
            <div className="preferences-card-copy">
              <strong>Keyboard Shortcuts</strong>
              <span>Access quick controls with these keys.</span>
            </div>
            <div className="shortcut-keys" aria-label="Keyboard shortcuts">
              <kbd title="Add torrent">A</kbd>
              <kbd title="Focus search">/</kbd>
              <kbd title="Cycle themes">T</kbd>
              <kbd title="Close panels">Esc</kbd>
            </div>
            <span className="shortcut-summary">
              <kbd>T</kbd> cycles themes
            </span>
          </section>
          <section className="preferences-card native-preferences">
            <div className="preferences-card-icon">
              <Settings2 size={22} />
            </div>
            <div className="preferences-card-copy">
              <strong>Native Application Preferences</strong>
              <span>Open the core Deluge application settings panel.</span>
            </div>
            <button
              className="secondary-button"
              onClick={onOpenNative}
              disabled={!nativeAvailable}
              aria-label="Open native Deluge Preferences"
            >
              <Settings2 size={16} />
              {nativeAvailable
                ? 'Open Native Panel'
                : 'Native Panel Unavailable'}
            </button>
          </section>
        </div>
        <div className="preferences-footer">
          <span>Settings are saved locally in your browser.</span>
          <button className="primary-button" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
function DeckPreferences({ onClose }) {
  const [refreshMs, setRefreshMs] = useState(
    () => {
      const saved = Number(localStorage.getItem('deck-refresh-ms'));
      return REFRESH_OPTIONS.some(([value]) => value === saved) ? saved : 1500;
    },
  );
  const [plugins, setPlugins] = useState({ enabled: [], available: [] });
  const proxySettings = useRef(null);
  const [celebrateCompletions, setCelebrateCompletions] = useState(
    () => localStorage.getItem('deck-celebrations') === 'true',
  );
  const [paths, setPaths] = useState({
    downloadLocation: '',
    completedPath: '',
    moveCompleted: false,
    networkPort: '6881',
    randomPort: false,
    proxyEnabled: false,
    proxyHost: '',
    proxyPort: '8080',
    proxyType: 'HTTP',
    cacheSize: '512',
    cacheExpiry: '60',
  });
  const [pathsBusy, setPathsBusy] = useState(false);
  const [networkBusy, setNetworkBusy] = useState(false);
  const [proxyBusy, setProxyBusy] = useState(false);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [pathsMessage, setPathsMessage] = useState('');
  const [proxyMessage, setProxyMessage] = useState('');
  const [cacheMessage, setCacheMessage] = useState('');
  const [networkMessage, setNetworkMessage] = useState('');
  useEffect(() => {
    let active = true;
    rpc('web.get_plugins')
      .then((result) => {
        if (active)
          setPlugins({
            enabled: result?.enabled_plugins || [],
            available: result?.available_plugins || [],
          });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    rpc('core.get_config')
      .then((config) => {
        if (active) {
          proxySettings.current = config?.proxy || {};
          setPaths({
            downloadLocation: config?.download_location || '',
            completedPath: config?.move_completed_path || '',
            moveCompleted: Boolean(config?.move_completed),
            networkPort: String(config?.listen_ports?.[0] || 6881),
            randomPort: Boolean(config?.random_port),
            ...proxyFormValues(config?.proxy),
            cacheSize: String(config?.cache_size ?? 512),
            cacheExpiry: String(config?.cache_expiry ?? 60),
          });
        }
      })
      .catch(() => {
        if (active) setPathsMessage('Unable to load Deluge paths.');
      });
    return () => {
      active = false;
    };
  }, []);
  const onPathChange = (key, value) => {
    if (key === 'celebrateCompletions') {
      setCelebrateCompletions(Boolean(value));
      localStorage.setItem('deck-celebrations', String(value));
      window.dispatchEvent(
        new CustomEvent('deck-settings', {
          detail: { celebrateCompletions: Boolean(value) },
        }),
      );
      return;
    }
    setPaths((current) => ({ ...current, [key]: value }));
    setPathsMessage('');
    setNetworkMessage('');
    setProxyMessage('');
    setCacheMessage('');
  };
  const onSavePaths = async () => {
    setPathsBusy(true);
    setPathsMessage('');
    try {
      await rpc('core.set_config', [
        {
          download_location: paths.downloadLocation.trim(),
          move_completed_path: paths.completedPath.trim(),
          move_completed: paths.moveCompleted,
        },
      ]);
      setPathsMessage('Paths saved.');
    } catch (reason) {
      setPathsMessage(reason.message || 'Unable to save paths.');
    } finally {
      setPathsBusy(false);
    }
  };
  const onSaveCache = async () => {
    const size = Number(paths.cacheSize);
    const expiry = Number(paths.cacheExpiry);
    if (
      !Number.isInteger(size) ||
      size < 0 ||
      !Number.isInteger(expiry) ||
      expiry < 0
    ) {
      setCacheMessage('Enter non-negative whole numbers for cache settings.');
      return;
    }
    setCacheBusy(true);
    setCacheMessage('');
    try {
      await rpc('core.set_config', [
        { cache_size: size, cache_expiry: expiry },
      ]);
      setCacheMessage('Cache settings saved.');
    } catch (reason) {
      setCacheMessage(reason.message || 'Unable to save cache settings.');
    } finally {
      setCacheBusy(false);
    }
  };
  const onSaveProxy = async () => {
    const port = Number(paths.proxyPort);
    if (
      paths.proxyEnabled &&
      (!Number.isInteger(port) ||
        port < 1 ||
        port > 65535 ||
        !paths.proxyHost.trim())
    ) {
      setProxyMessage('Enter a proxy host and port from 1 to 65535.');
      return;
    }
    setProxyBusy(true);
    setProxyMessage('');
    try {
      await rpc('core.set_config', [
        {
          proxy: proxyConfig(proxySettings.current, paths),
        },
      ]);
      setProxyMessage('Proxy settings saved.');
    } catch (reason) {
      setProxyMessage(reason.message || 'Unable to save proxy settings.');
    } finally {
      setProxyBusy(false);
    }
  };
  const onSaveNetwork = async () => {
    const port = Number(paths.networkPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      setNetworkMessage('Enter a port from 1 to 65535.');
      return;
    }
    setNetworkBusy(true);
    setNetworkMessage('');
    try {
      await rpc('core.set_config', [
        { listen_ports: [port, port], random_port: paths.randomPort },
      ]);
      setNetworkMessage('Network settings saved.');
    } catch (reason) {
      setNetworkMessage(reason.message || 'Unable to save network settings.');
    } finally {
      setNetworkBusy(false);
    }
  };
  useEffect(() => {
    localStorage.setItem('deck-refresh-ms', String(refreshMs));
    window.dispatchEvent(
      new CustomEvent('deck-settings', { detail: { refreshMs } }),
    );
  }, [refreshMs]);
  const openNative = () => {
    const preferences = window.deluge?.preferences;
    if (pluginMode() && typeof preferences?.show === 'function') {
      onClose();
      requestAnimationFrame(() => {
        if (
          typeof window.__DELUGE_DECK_SHOW_NATIVE_PREFERENCES__ === 'function'
        )
          window.__DELUGE_DECK_SHOW_NATIVE_PREFERENCES__();
        else preferences.show();
      });
    }
  };
  return (
    <PreferencesModal
      refreshMs={refreshMs}
      setRefreshMs={setRefreshMs}
      plugins={plugins}
      celebrateCompletions={celebrateCompletions}
      {...paths}
      onPathChange={onPathChange}
      onSavePaths={onSavePaths}
      onSaveNetwork={onSaveNetwork}
      pathsBusy={pathsBusy}
      pathsMessage={pathsMessage}
      networkBusy={networkBusy}
      networkMessage={networkMessage}
      onSaveProxy={onSaveProxy}
      proxyBusy={proxyBusy}
      proxyMessage={proxyMessage}
      onSaveCache={onSaveCache}
      cacheBusy={cacheBusy}
      cacheMessage={cacheMessage}
      onClose={onClose}
      onOpenNative={openNative}
    />
  );
}
function AddModal({
  initialFiles = [],
  existingNames = [],
  onClose,
  onAdded,
  onModalState,
}) {
  const preferencesOverlayHost = useViewportOverlayHost();
  if (initialFiles?.kind === 'remove')
    return (
      <RemoveModal
        targets={initialFiles.targets}
        onClose={onClose}
        onModalState={onModalState}
        onRemove={async (removeData) => {
          await rpc('core.remove_torrents', [initialFiles.targets, removeData]);
          await onAdded();
          onClose();
        }}
      />
    );
  if (initialFiles?.kind === 'move')
    return (
      <MoveStorageModal
        torrent={initialFiles.torrent}
        onClose={onClose}
        onModalState={onModalState}
        onMoved={onAdded}
      />
    );
  if (initialFiles?.kind === 'rename')
    return (
      <RenameTorrentModal
        torrent={initialFiles.torrent}
        onClose={onClose}
        onModalState={onModalState}
        onRenamed={onAdded}
      />
    );
  if (initialFiles?.kind === 'preferences')
    return preferencesOverlayHost
      ? createPortal(<DeckPreferences onClose={onClose} />, preferencesOverlayHost)
      : null;
  return (
    <AddTorrentModal
      initialFiles={initialFiles}
      existingNames={existingNames}
      onClose={onClose}
      onAdded={onAdded}
      onModalState={onModalState}
    />
  );
}
function AddTorrentModal({
  initialFiles = [],
  existingNames = [],
  onClose,
  onAdded,
  onModalState,
}) {
  useRestoreFocus();
  const modalRef = useRef(null);
  useFocusTrap(modalRef);
  const [tab, setTab] = useState('files');
  const [files, setFiles] = useState(initialFiles);
  const [selectedAddFiles, setSelectedAddFiles] = useState(
    () => new Set(initialFiles.map((file) => file.name)),
  );
  const [addFilePriorities, setAddFilePriorities] = useState(() =>
    Object.fromEntries(initialFiles.map((file) => [file.name, 4])),
  );
  const [torrentPayloads, setTorrentPayloads] = useState(() =>
    Object.fromEntries(initialFiles.map((file) => [file.name, { status: 'loading', files: [] }])),
  );
  const [selectedPayloadFiles, setSelectedPayloadFiles] = useState(() =>
    Object.fromEntries(initialFiles.map((file) => [file.name, new Set()])),
  );
  const [activeTorrentName, setActiveTorrentName] = useState(
    () => initialFiles[0]?.name || '',
  );
  const [allocation, setAllocation] = useState('full');
  const [freeSpace, setFreeSpace] = useState(null);
  const [magnet, setMagnet] = useState('');
  const [url, setUrl] = useState('');
  const [path, setPath] = useState('');
  const [paused, setPaused] = useState(false);
  const [sequential, setSequential] = useState(false);
  const [busy, setBusy] = useState(false);
  useDialogDismiss(onClose, modalRef, Boolean(busy));
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const input = useRef();
  useEffect(() => {
    const locked = busy || Boolean(error);
    deckModalState.locked = locked;
    onModalState?.(locked);
    return () => {
      deckModalState.locked = false;
      onModalState?.(false);
    };
  }, [busy, error, onModalState]);
  const inspectTorrentFiles = (items) => {
    Array.from(items || []).forEach(async (file) => {
      setTorrentPayloads((current) => ({
        ...current,
        [file.name]: { status: 'loading', files: [] },
      }));
      try {
        if (file.size > 64 * 1024 * 1024) throw new Error('This torrent metadata file is too large.');
        const payloadFiles = decodeTorrentMetadata(await file.arrayBuffer());
        setTorrentPayloads((current) => ({
          ...current,
          [file.name]: { status: 'ready', files: payloadFiles },
        }));
        setSelectedPayloadFiles((current) => ({
          ...current,
          [file.name]: new Set(payloadFiles.map((entry) => entry.index)),
        }));
      } catch (reason) {
        setTorrentPayloads((current) => ({
          ...current,
          [file.name]: {
            status: 'error',
            files: [],
            error: reason.message || 'Could not read torrent contents.',
          },
        }));
      }
    });
  };
  useEffect(() => {
    if (initialFiles.length) inspectTorrentFiles(initialFiles);
  }, []);
  const addFiles = (items) => {
    const names = new Set(files.map((file) => file.name));
    const next = Array.from(items || []).filter((file) => {
      if (!file.name?.toLowerCase().endsWith('.torrent') || names.has(file.name)) return false;
      names.add(file.name);
      return true;
    });
    setFiles((current) => [...current, ...next]);
    setSelectedAddFiles(
      (current) => new Set([...current, ...next.map((file) => file.name)]),
    );
    setAddFilePriorities((current) => ({
      ...current,
      ...Object.fromEntries(next.map((file) => [file.name, 4])),
    }));
    setActiveTorrentName((current) => current || next[0]?.name || '');
    inspectTorrentFiles(next);
    setDragging(false);
  };
  const activeTorrent =
    files.find((file) => file.name === activeTorrentName) || files[0] || null;
  const activePayload = activeTorrent
    ? torrentPayloads[activeTorrent.name]
    : null;
  const activePayloadSelection = activeTorrent
    ? selectedPayloadFiles[activeTorrent.name] || new Set()
    : new Set();
  const activeSelectedBytes = (activePayload?.files || [])
    .filter((entry) => activePayloadSelection.has(entry.index))
    .reduce((total, entry) => total + Number(entry.size || 0), 0);
  const selectedTorrentCount = files.filter((file) =>
    selectedAddFiles.has(file.name),
  ).length;
  const selectedPayloadCount = files.reduce(
    (total, file) =>
      total +
      (selectedAddFiles.has(file.name)
        ? selectedPayloadFiles[file.name]?.size || 0
        : 0),
    0,
  );
  const duplicateNames = files
    .filter((file) =>
      existingNames.some(
        (name) =>
          String(name).toLowerCase() ===
          file.name.replace(/\.torrent$/i, '').toLowerCase(),
      ),
    )
    .map((file) => file.name);
  const magnetPreview = (() => {
    try {
      const parsed = new URL(magnet.trim());
      const hash = parsed.searchParams
        .get('xt')
        ?.replace(/^urn:(btih|btmh):/i, '');
      const name = parsed.searchParams.get('dn');
      return hash
        ? {
            hash,
            name: name
              ? decodeURIComponent(name)
              : 'Name will be fetched from metadata',
          }
        : null;
    } catch {
      return null;
    }
  })();
  const submit = async () => {
    deckModalState.locked = true;
    setBusy(true);
    setError('');
    try {
      if (tab === 'magnet' && magnet.trim())
        await rpc('core.add_torrent_magnet', [
          magnet.trim(),
          {
            download_location: path,
            add_paused: paused,
            sequential_download: sequential,
            compact_allocation: allocation === 'compact',
          },
        ]);
      else if (tab === 'url' && url.trim())
        await rpc('core.add_torrent_url', [
          url.trim(),
          {
            download_location: path,
            add_paused: paused,
            sequential_download: sequential,
            compact_allocation: allocation === 'compact',
          },
        ]);
      else if (tab === 'files' && files.length && selectedAddFiles.size) {
        const selected = files.filter((file) =>
          selectedAddFiles.has(file.name),
        );
        if (selected.some((file) => torrentPayloads[file.name]?.status === 'loading'))
          throw new Error('Still reading torrent contents. Please wait a moment.');
        const unreadable = selected.find(
          (file) => torrentPayloads[file.name]?.status !== 'ready',
        );
        if (unreadable)
          throw new Error(
            torrentPayloads[unreadable.name]?.error ||
              `Could not read the files inside ${unreadable.name}.`,
          );
        if (!selected.some((file) => selectedPayloadFiles[file.name]?.size))
          throw new Error('Select at least one payload file to download.');
        const requiredBytes = selected.reduce(
          (total, file) =>
            total +
            (torrentPayloads[file.name]?.files || [])
              .filter((entry) => selectedPayloadFiles[file.name]?.has(entry.index))
              .reduce((bytes, entry) => bytes + Number(entry.size || 0), 0),
          0,
        );
        const availableBytes = Number(
          await rpc('core.get_free_space', [path || '']),
        );
        setFreeSpace(availableBytes);
        if (Number.isFinite(availableBytes) && availableBytes < requiredBytes)
          throw new Error(
            `Not enough free space. ${formatBytes(availableBytes)} available, ${formatBytes(requiredBytes)} required.`,
          );
        const uploaded = await api.upload(selected);
        await rpc('web.add_torrents', [
          uploaded.map((file, index) => ({
            path: file,
            options: {
              download_location: path,
              add_paused: paused,
              sequential_download: sequential,
              compact_allocation: allocation === 'compact',
              file_priorities: selected[index]
                ? torrentPayloads[selected[index].name]?.files.map((entry) =>
                    (selectedPayloadFiles[selected[index].name]?.has(entry.index)
                      ? Number(addFilePriorities[selected[index].name] ?? 4)
                      : 0),
                  )
                : undefined,
            },
          })),
        ]);
      } else if (files.length)
        throw new Error('Select at least one torrent file to add.');
      else
        throw new Error('Choose a .torrent file, magnet link, or URL first.');
      onAdded();
      onClose();
    } catch (reason) {
      setError(reason.message || 'Deluge could not add this torrent.');
    } finally {
      setBusy(false);
    }
  };
  if (error)
    return (
      <div className="modal-backdrop">
        <section
          ref={modalRef}
          className="add-modal modal-message"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-error-title"
        >
          <div className="modal-head">
            <div>
              <span className="drawer-eyebrow">ADD TRANSFER</span>
              <h2 id="add-error-title">Deluge could not add this torrent</h2>
            </div>
            <button
              className="icon-button"
              onClick={onClose}
              aria-label="Close add error"
            >
              <X size={18} />
            </button>
          </div>
          <div className="modal-message-body">
            <AlertTriangle size={24} />
            <p>{error}</p>
          </div>
          <div className="modal-foot">
            <span>Your review details are still available.</span>
            <button className="primary-button" onClick={() => setError('')}>
              Return to review
            </button>
          </div>
        </section>
      </div>
    );
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <section
        ref={modalRef}
        className="add-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
      >
        <div className="modal-head">
          <div>
            <span className="drawer-eyebrow">NEW TRANSFER</span>
            <h2 id="add-title">Review torrent</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close add torrent"
            disabled={busy}
          >
            <X size={18} />
          </button>
        </div>
        <div className="add-tabs">
          {[
            ['files', FileArchive, 'Torrent files'],
            ['magnet', Magnet, 'Magnet link'],
            ['url', Download, 'Torrent URL'],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        {tab === 'files' && (
          <div
            className={`drop-zone add-files-panel ${dragging ? 'dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              addFiles(event.dataTransfer.files);
            }}
          >
            <input
              ref={input}
              type="file"
              accept=".torrent"
              multiple
              hidden
              onChange={(event) => addFiles(event.target.files)}
            />
            <div className="add-review-toolbar">
              <div className="drop-icon">
                <UploadCloud size={20} />
              </div>
              <div className="add-review-intro">
                <strong>
                  {files.length ? 'Add more torrents' : 'Choose torrent files'}
                </strong>
                <span>Drop .torrent files anywhere in this panel</span>
              </div>
              {files.length > 0 && (
                <span className="add-review-summary">
                  {selectedTorrentCount} of {files.length} torrents · {selectedPayloadCount} files selected
                </span>
              )}
              <button
                type="button"
                className="secondary-button choose-torrent-button"
                onClick={() => input.current?.click()}
              >
                <Plus size={15} /> Browse
              </button>
            </div>

            {files.length === 0 ? (
              <button
                type="button"
                className="empty-torrent-drop"
                onClick={() => input.current?.click()}
              >
                <FileArchive size={28} />
                <strong>Drop .torrent files here</strong>
                <span>You can review every file before anything is added.</span>
              </button>
            ) : (
              <div className="add-review-grid">
                <aside className="torrent-review-queue" aria-label="Torrents to add">
                  <div className="review-pane-heading">
                    <div>
                      <span>TORRENTS</span>
                      <strong>{files.length} queued</strong>
                    </div>
                    <div className="review-bulk-actions">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAddFiles(new Set(files.map((file) => file.name)))
                        }
                      >
                        All
                      </button>
                      <button type="button" onClick={() => setSelectedAddFiles(new Set())}>
                        None
                      </button>
                    </div>
                  </div>
                  <div className="torrent-review-list">
                    {files.map((file, index) => {
                      const payload = torrentPayloads[file.name];
                      const selectedCount = selectedPayloadFiles[file.name]?.size || 0;
                      const isActive = activeTorrent?.name === file.name;
                      return (
                        <div
                          key={`${file.name}-${index}`}
                          className={`torrent-review-card ${isActive ? 'active' : ''} ${selectedAddFiles.has(file.name) ? '' : 'excluded'}`}
                          onClick={() => setActiveTorrentName(file.name)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAddFiles.has(file.name)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() =>
                              setSelectedAddFiles((current) => {
                                const next = new Set(current);
                                if (next.has(file.name)) next.delete(file.name);
                                else next.add(file.name);
                                return next;
                              })
                            }
                            aria-label={`Select ${file.name} for adding`}
                          />
                          <button
                            type="button"
                            className="torrent-review-name"
                            title={file.name}
                            onClick={() => setActiveTorrentName(file.name)}
                          >
                            <FileArchive size={14} />
                            <span>
                              <strong>{file.name}</strong>
                              <small>
                                {payload?.status === 'loading'
                                  ? 'Reading contents…'
                                  : payload?.status === 'error'
                                    ? 'Could not read'
                                    : `${selectedCount} of ${payload?.files.length || 0} files`}
                              </small>
                            </span>
                          </button>
                          <select
                            className="add-file-priority"
                            value={Number(addFilePriorities[file.name] ?? 4)}
                            onChange={(event) =>
                              setAddFilePriorities((current) => ({
                                ...current,
                                [file.name]: Number(event.target.value),
                              }))
                            }
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Priority for ${file.name}`}
                          >
                            <option value="0">Skip</option>
                            <option value="1">Low</option>
                            <option value="4">Normal</option>
                            <option value="7">High</option>
                          </select>
                          <button
                            type="button"
                            className="remove-review-torrent"
                            onClick={(event) => {
                              event.stopPropagation();
                              const remaining = files.filter((_, item) => item !== index);
                              setFiles(remaining);
                              setSelectedAddFiles((current) => {
                                const next = new Set(current);
                                next.delete(file.name);
                                return next;
                              });
                              if (activeTorrent?.name === file.name)
                                setActiveTorrentName(remaining[0]?.name || '');
                            }}
                            aria-label={`Remove ${file.name}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {duplicateNames.length > 0 && (
                    <div className="duplicate-warning" role="alert">
                      <AlertTriangle size={14} />
                      <span>Duplicate torrent name{duplicateNames.length === 1 ? '' : 's'}: {duplicateNames.length}</span>
                    </div>
                  )}
                </aside>

                <section className="torrent-payload-review" aria-label="Files to download">
                  <div className="review-pane-heading payload-review-heading">
                    <div>
                      <span>FILES TO DOWNLOAD</span>
                      <strong title={activeTorrent?.name}>{activeTorrent?.name}</strong>
                      <small>
                        {activePayload?.status === 'ready'
                          ? `${activePayloadSelection.size} of ${activePayload.files.length} selected · ${formatBytes(activeSelectedBytes)}`
                          : 'Reviewing torrent metadata'}
                      </small>
                    </div>
                    {activePayload?.status === 'ready' && (
                      <div className="review-bulk-actions">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPayloadFiles((current) => ({
                              ...current,
                              [activeTorrent.name]: new Set(
                                activePayload.files.map((entry) => entry.index),
                              ),
                            }))
                          }
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPayloadFiles((current) => ({
                              ...current,
                              [activeTorrent.name]: new Set(),
                            }))
                          }
                        >
                          Select none
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="payload-file-list">
                    {activePayload?.status === 'loading' && (
                      <div className="payload-state"><RefreshCw className="spin" size={18} /> Reading torrent contents…</div>
                    )}
                    {activePayload?.status === 'error' && (
                      <div className="payload-state payload-error">
                        <AlertTriangle size={18} /> {activePayload.error}
                      </div>
                    )}
                    {activePayload?.files.map((entry) => (
                      <label className="payload-file-row" key={`${activeTorrent.name}-${entry.index}`}>
                        <input
                          type="checkbox"
                          checked={activePayloadSelection.has(entry.index)}
                          onChange={() =>
                            setSelectedPayloadFiles((current) => {
                              const next = new Set(current[activeTorrent.name] || []);
                              if (next.has(entry.index)) next.delete(entry.index);
                              else next.add(entry.index);
                              return { ...current, [activeTorrent.name]: next };
                            })
                          }
                          aria-label={`Download ${entry.path}`}
                        />
                        <FileArchive size={14} />
                        <span title={entry.path}>{entry.path}</span>
                        <small>{formatBytes(entry.size)}</small>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        )}
        {tab === 'magnet' && (
          <div className="link-panel">
            <Magnet size={21} />
            <label>
              Magnet URI
              <textarea
                value={magnet}
                onChange={(event) => setMagnet(event.target.value)}
                placeholder="magnet:?xt=urn:btih:…"
                autoFocus
              />
            </label>
            <span>Deluge fetches metadata only after you confirm.</span>
            {magnetPreview && (
              <div
                className="magnet-preview"
                aria-label="Magnet metadata preview"
              >
                <strong>{magnetPreview.name}</strong>
                <span>Info-hash: {magnetPreview.hash}</span>
              </div>
            )}
          </div>
        )}
        {tab === 'url' && (
          <div className="link-panel">
            <Download size={21} />
            <label>
              Torrent URL
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/file.torrent"
                autoFocus
              />
            </label>
            <span>Only the torrent metadata is downloaded.</span>
          </div>
        )}
        <div className="add-options">
          <label className="path-label">
            <FolderOpen size={15} /> Download to
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="Use Deluge default"
            />
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={paused}
              onChange={(event) => setPaused(event.target.checked)}
            />
            <span className="toggle" />
            Add paused
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={sequential}
              onChange={(event) => setSequential(event.target.checked)}
            />
            <span className="toggle" />
            Sequential download
          </label>
          <div className="free-space-status" role="status">
            {freeSpace == null
              ? 'Free space is checked before adding'
              : `Free space: ${formatBytes(freeSpace)}`}
          </div>
          <label className="allocation-label">
            Storage allocation
            <select
              value={allocation}
              onChange={(event) => setAllocation(event.target.value)}
              aria-label="Storage allocation mode"
            >
              <option value="full">Full allocation</option>
              <option value="compact">Compact allocation</option>
            </select>
          </label>
        </div>
        <div className="modal-foot">
          <span>
            <ShieldCheck size={14} /> Nothing is added until you confirm
          </span>
          <button className="primary-button" onClick={submit} disabled={busy}>
            {busy ? (
              <RefreshCw className="spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            {busy ? 'Adding…' : 'Add to Deluge'}
          </button>
        </div>
      </section>
    </div>
  );
}
function App() {
  const mobileLayout = useMobileLayout();
  const mobileOverlayHost = useViewportOverlayHost();
  const mobileOverlay = children => mobileLayout ? createPortal(children, mobileOverlayHost) : children;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('deck-sidebar-collapsed') === 'true',
  );
  useEffect(() => {
    if (!pluginMode()) return;
    document.documentElement.classList.add('deluge-deck-ready');
    document.documentElement.classList.remove('deluge-deck-loading');
  }, []);
  useEffect(() => {
    localStorage.setItem('deck-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [torrents, setTorrents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(
    () => localStorage.getItem('deck-filter') || 'all',
  );
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [actionBusy, setActionBusy] = useState('');
  const [detail, setDetail] = useState(null);
  const [addFiles, setAddFiles] = useState(null);
  const [menuTorrent, setMenuTorrent] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [theme, setTheme] = useState(
    () => {
      const saved = localStorage.getItem('deck-theme');
      return THEMES.some(([key]) => key === saved) ? saved : 'dark';
    },
  );
  const [refreshMs, setRefreshMs] = useState(
    () => {
      const saved = Number(localStorage.getItem('deck-refresh-ms'));
      return REFRESH_OPTIONS.some(([value]) => value === saved) ? saved : 1500;
    },
  );
  const [notice, setNotice] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [copied, setCopied] = useState('');
  const [celebrateCompletions, setCelebrateCompletions] = useState(
    () => localStorage.getItem('deck-celebrations') === 'true',
  );
  const [celebration, setCelebration] = useState('');
  const previousStates = useRef(new Map());
  const refreshFailures = useRef(0);
  const refreshGate = useRef(createRequestGate());
  const removalFocusPending = useRef(false);
  useEffect(() => {
    if (!menuTorrent) return undefined;
    const dismiss = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.type === 'keydown' && event.key === 'Escape')
        setMenuTorrent(null);
      if (
        event.type === 'pointerdown' &&
        !target?.closest('.context-menu, .row-menu')
      )
        setMenuTorrent(null);
    };
    document.addEventListener('keydown', dismiss, true);
    document.addEventListener('pointerdown', dismiss, true);
    return () => {
      document.removeEventListener('keydown', dismiss, true);
      document.removeEventListener('pointerdown', dismiss, true);
    };
  }, [menuTorrent]);
  const refresh = async () => {
    const token = refreshGate.current.begin();
    try {
      const data = await api.torrents();
      if (!refreshGate.current.isCurrent(token)) return;
      if (data.connected === false) throw new Error('Deluge daemon is disconnected. Open the connection manager to reconnect.');
      refreshFailures.current = 0;
      const next = mapTorrents(data);
      setRefreshError('');
      if (
        celebrateCompletions &&
        !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      ) {
        const completed = next.find(
          (torrent) =>
            torrent.state === 'Seeding' &&
            previousStates.current.get(torrent.hash) &&
            previousStates.current.get(torrent.hash) !== 'Seeding',
        );
        if (completed) {
          setCelebration(`${completed.name} completed! 🎉`);
          setTimeout(() => setCelebration(''), 4500);
        }
      }
      previousStates.current = new Map(
        next.map((torrent) => [torrent.hash, torrent.state]),
      );
      setTorrents(next);
      const liveHashes = new Set(next.map((torrent) => torrent.hash));
      setSelected((current) => new Set([...current].filter((hash) => liveHashes.has(hash))));
      setStats(data.stats || {});
      setDetail(
        (current) =>
          current &&
          (next.find((torrent) => torrent.hash === current.hash) || null),
      );
    } catch (reason) {
      if (!refreshGate.current.isCurrent(token)) return;
      refreshFailures.current = Math.min(refreshFailures.current + 1, 5);
      setRefreshError(reason?.message || 'Unable to reach Deluge.');
      if (
        /(session expired|not authenticated|unauthorized|authentication)/i.test(
          reason?.message || '',
        )
      ) {
        setSessionData((current) => ({
          ...(current || {}),
          authenticated: false,
          connected: false,
          sessionMessage: 'Your session expired. Sign in again to continue.',
        }));
        setConnected(false);
      }
    } finally {
      if (refreshGate.current.isCurrent(token)) setLoading(false);
    }
  };
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('deck-theme', theme);
  }, [theme]);
  useEffect(() => {
    api
      .session()
      .then((result) => {
        setSessionData(result);
        setConnected(
          Boolean(
            result.authenticated &&
            (result.connected || result.mode === 'demo'),
          ),
        );
        result.authenticated ? refresh() : setLoading(false);
      })
      .catch(() => setLoading(false))
      .finally(() => setSessionReady(true));
  }, []);
  const pollState = useRef(null);
  pollState.current = { refresh, torrents };
  useEffect(() => {
    if (!connected) return undefined;
    const poller = createPoller({
      refresh: () => pollState.current.refresh(),
      visible: () => !document.hidden,
      delay: () => {
        const base = pollState.current.torrents.some((torrent) =>
        ['Downloading', 'Seeding'].includes(torrent.state),
        ) ? refreshMs : Math.max(refreshMs * 2, 5000);
        return refreshFailures.current ? Math.min(base * 2 ** refreshFailures.current, 30000) : base;
      },
    });
    const onVisibility = () => { void poller.wake(); };
    void poller.wake();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      poller.stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [connected, refreshMs]);
  useEffect(() => {
    const syncSettings = (event) => {
      if (event.detail?.theme) setTheme(event.detail.theme);
      if (event.detail?.refreshMs) setRefreshMs(event.detail.refreshMs);
      if (typeof event.detail?.celebrateCompletions === 'boolean')
        setCelebrateCompletions(event.detail.celebrateCompletions);
    };
    window.addEventListener('deck-settings', syncSettings);
    return () => window.removeEventListener('deck-settings', syncSettings);
  }, []);
  useEffect(() => {
    localStorage.setItem('deck-filter', filter);
    setSelected(new Set());
  }, [filter]);
  useEffect(() => {
    if (!removalFocusPending.current) return;
    removalFocusPending.current = false;
    requestAnimationFrame(() =>
      document.querySelector('tbody tr[role="button"]')?.focus(),
    );
  }, [torrents]);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(''), 3500);
    return () => clearTimeout(timer);
  }, [copied]);
  const filtered = useMemo(
    () =>
      torrents.filter((torrent) => {
        const allowed =
          filter === 'all' ||
          (filter === 'active'
            ? ['Downloading', 'Seeding'].includes(torrent.state)
            : stateKey(torrent.state) === filter);
        return (
          allowed &&
          (!search ||
            `${torrent.name} ${torrent.hash} ${torrent.tracker_host || ''}`
              .toLowerCase()
              .includes(search.toLowerCase()))
        );
      }),
    [torrents, filter, search],
  );
  const torrentCounts = useMemo(() => countTorrentStates(torrents), [torrents]);
  const [telemetryHistory, setTelemetryHistory] = useState({
    download: [], upload: [], connections: [], library: [],
  });
  useEffect(() => {
    setTelemetryHistory((current) => ({
      download: [...current.download, Number(stats.download_rate) || 0].slice(-14),
      upload: [...current.upload, Number(stats.upload_rate) || 0].slice(-14),
      connections: [...current.connections, Number(stats.num_connections) || 0].slice(-14),
      library: [...current.library, torrents.length].slice(-14),
    }));
  }, [stats, torrents.length]);
  useEffect(() => {
    const keys = (event) => {
      const panelOpen = Boolean(addFiles || detail || menuTorrent);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (event.key === 'Escape') {
        if (!deckModalState.locked) {
          event.preventDefault();
          setAddFiles(null);
          setDetail(null);
          setMenuTorrent(null);
        }
        return;
      }
      const selector =
        'input,textarea,select,button,a,[contenteditable="true"],[role="button"],[role="menuitem"],[tabindex]:not([tabindex="-1"])';
      const active = document.activeElement;
      const target = event.target instanceof Element ? event.target : null;
      if (
        active?.matches?.(selector) ||
        target?.closest?.(selector) ||
        panelOpen
      )
        return;
      if (event.key === '/') {
        event.preventDefault();
        document.querySelector('.search-wrap input')?.focus();
      }
      if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setAddFiles([]);
      }
      if (
        event.key.toLowerCase() === 't' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.repeat
      ) {
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
  const copyMagnet = async (torrent) => {
    setMenuTorrent(null);
    try {
      const status = await rpc('web.get_torrent_status', [
        torrent.hash,
        ['magnet_uri'],
      ]);
      const magnet = status?.magnet_uri || fallbackMagnet(torrent);
      await copyText(magnet);
      setCopied(`Magnet link copied for ${torrent.name}`);
    } catch (reason) {
      setNotice(reason.message || 'Deluge could not provide a magnet link.');
    }
  };
  const act = async (action, target = [...selected]) => {
    if (!target.length || actionBusy) return;
    if (action === 'remove') {
      removalFocusPending.current = true;
      setMenuTorrent(null);
      setAddFiles({ kind: 'remove', targets: target });
      return;
    }
    const methods = {
      pause: 'core.pause_torrents',
      resume: 'core.resume_torrents',
      recheck: 'core.force_recheck',
      reannounce: 'core.force_reannounce',
      queueTop: 'core.queue_top',
      queueUp: 'core.queue_up',
      queueDown: 'core.queue_down',
      queueBottom: 'core.queue_bottom',
    };
    const labels = {
      pause: 'Paused',
      resume: 'Resumed',
      recheck: 'Recheck started',
      reannounce: 'Reannounce sent',
      queueTop: 'Moved to top',
      queueUp: 'Moved up',
      queueDown: 'Moved down',
      queueBottom: 'Moved to bottom',
    };
    setActionBusy(action);
    setNotice('');
    try {
      if (methods[action]) await rpc(methods[action], [target]);
      setSelected(new Set());
      setMenuTorrent(null);
      await refresh();
      setCopied(
        `${labels[action] || 'Action'} ${target.length === 1 ? 'torrent' : `${target.length} torrents`}.`,
      );
    } catch (reason) {
      setNotice(reason.message || 'Deluge could not complete that action.');
    } finally {
      setActionBusy('');
    }
  };
  const openPreferences = () => setAddFiles({ kind: 'preferences' });
  const drop = (event) => {
    const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
      file.name?.toLowerCase().endsWith('.torrent'),
    );
    if (!files.length) return;
    event.preventDefault();
    setAddFiles(files);
  };
  if (!sessionReady) return <div className="deck-boot-splash">Deluge</div>;
  if (!connected)
    return (
      <Login
        mode={sessionData?.mode}
        sessionMessage={sessionData?.sessionMessage}
        onConnect={async (url, password) => {
          const result = await api.connect(url, password);
          setSessionData(result);
          setConnected(result.connected);
          await refresh();
        }}
      />
    );
  return (
    <div
      className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      onContextMenuCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragOver={(event) => {
        if (Array.from(event.dataTransfer?.types || []).includes('Files'))
          event.preventDefault();
      }}
      onDrop={drop}
    >
      <Sidebar
        filter={filter}
        setFilter={setFilter}
        torrents={torrents}
        stats={stats}
        counts={torrentCounts}
        onAdd={() => setAddFiles([])}
        onPreferences={openPreferences}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      <main className="main-content">
        <Topbar
          search={search}
          setSearch={setSearch}
          stats={stats}
          torrents={torrents}
          selectedCount={selected.size}
          actionBusy={actionBusy}
          onTorrentAction={act}
          onFeedback={setCopied}
          onError={setNotice}
          theme={theme}
          setTheme={setTheme}
          session={sessionData}
          onPreferences={openPreferences}
          onRefresh={refresh}
          onConnectionChanged={async (host) => {
            setSessionData((current) => ({
              ...current,
              connected: true,
              host,
            }));
            await refresh();
          }}
          disconnect={async () => {
            await api.disconnect();
            refreshGate.current.cancel();
            setSessionData(null);
            setConnected(false);
            setTorrents([]);
            setStats({});
            setSelected(new Set());
            setDetail(null);
            setAddFiles(null);
            setMenuTorrent(null);
            setCommandPaletteOpen(false);
            setRefreshError('');
            setNotice('');
            previousStates.current.clear();
          }}
        />
        <section className="workspace">
          {refreshError && (
            <div className="connection-recovery" role="status">
              <WifiOff size={18} aria-hidden="true" />
              <div><strong>Reconnecting to Deluge</strong><span>Showing the last received data. {refreshError}</span></div>
              <button className="secondary-button" onClick={refresh}><RefreshCw size={14} />Retry now</button>
            </div>
          )}
          {notice && (
            <div className="form-error" role="status">
              <AlertTriangle size={15} />
              {notice}
              <button
                className="icon-button"
                onClick={() => setNotice('')}
                aria-label="Dismiss notice"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {(theme !== 'terminal' || mobileLayout) && <SearchField search={search} setSearch={setSearch} />}
          <div className="page-heading">
            <div>
              <h1>
                Your <em>torrent deck.</em>
              </h1>
              <p>Drop a .torrent anywhere to open a review dialog.</p>
            </div>
            <button className="primary-button" onClick={() => setAddFiles([])}>
              <Plus size={17} /> Add torrent
            </button>
          </div>
          {theme === 'terminal' && <button className="terminal-add-command" onClick={() => setAddFiles([])}><span aria-hidden="true">&gt;</span> [Add torrent]<i aria-hidden="true" /></button>}
          <div className="stats-grid">
            <Stat
              theme={theme}
              icon={Download}
              label="Download"
              value={rate(stats.download_rate)}
              detail="Current payload"
              trend={telemetryHistory.download}
            />
            <Stat
              theme={theme}
              icon={UploadCloud}
              label="Upload"
              value={rate(stats.upload_rate)}
              detail="Current payload"
              tone="violet"
              trend={telemetryHistory.upload}
            />
            <Stat
              theme={theme}
              icon={Network}
              label="Connections"
              value={stats.num_connections || 0}
              detail={Number(stats.dht_nodes) > 0 ? `${stats.dht_nodes} DHT nodes` : ''}
              tone="amber"
              trend={telemetryHistory.connections}
            />
            <Stat
              theme={theme}
              icon={HardDriveDownload}
              label="Library"
              value={torrents.length}
              detail={`${torrentCounts.seeding} seeding`}
              tone="green"
              trend={telemetryHistory.library}
            />
          </div>
          <div className="library-mobile-controls">
            <div className="list-heading">
              <div>
                <h2>
                  {{ all: 'Torrents', active: 'Active now', downloading: 'Downloading', seeding: 'Seeding', paused: 'Paused' }[filter] || 'Torrents'} <span>{filtered.length}</span>
                </h2>
                <p className="library-caption">{search ? 'Matching torrents in this view' : 'Your transfers, at a glance'}</p>
              </div>
              <button className="primary-button mobile-add-torrent" onClick={() => setAddFiles([])}><Plus size={17} />Add torrent</button>
            </div>
            <nav className="mobile-library-filters" aria-label="Torrent filters">
              {[
                ['all', 'All'], ['active', 'Active'], ['downloading', 'Downloading'],
                ['seeding', 'Seeding'], ['paused', 'Paused'],
              ].map(([key, label]) => (
                <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                  <span>{label}</span>
                  <b>{torrentCounts[key]}</b>
                </button>
              ))}
              <span className="deck-filter-summary">
                <span className="status-dot live" />
                {filtered.length} visible · live data
              </span>
            </nav>
          </div>
          {search && (
            <div className="search-note">
              <Search size={14} /> Showing results for{' '}
              <strong>“{search}”</strong>
              <button onClick={() => setSearch('')}>Clear</button>
            </div>
          )}
          <TorrentTable
            key={theme}
            torrents={filtered}
            theme={theme}
            selected={selected}
            setSelected={setSelected}
            onOpen={setDetail}
            onMenu={(torrent, event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const width = 224;
              const height = 420;
              const left = Math.max(
                12,
                Math.min(window.innerWidth - width - 12, rect.right - width),
              );
              const top = Math.max(
                12,
                Math.min(window.innerHeight - height - 12, rect.bottom + 8),
              );
              setMenuPosition({ top, left });
              setMenuTorrent(
                menuTorrent?.hash === torrent.hash ? null : torrent,
              );
            }}
            loading={loading}
            onAdd={() => setAddFiles([])}
          />
          <footer className="deck-status-rail" aria-label="Session status">
            <span
              className="status-free-space"
              title="Available free space on the Deluge server"
            >
              <HardDrive size={13} />
              <span>Free</span>
              <strong>
                {stats.free_space == null
                  ? 'Checking…'
                  : formatBytes(stats.free_space)}
              </strong>
            </span>
            <span><i className={refreshError ? 'status-dot' : 'status-dot live'} />{refreshError ? 'Connection interrupted' : 'Live sync'}</span>
            {Number(stats.dht_nodes) > 0 && <span><Network size={13} />{stats.dht_nodes} DHT nodes</span>}
            <span className="status-rail-spacer" />
            <span><ArrowDown size={13} />{rate(stats.download_rate)}</span>
            <span><ArrowUp size={13} />{rate(stats.upload_rate)}</span>
            <span className="status-ip"><Wifi size={13} />{stats.external_ip || 'IP unavailable'}</span>
          </footer>
        </section>
      </main>
      {selected.size > 0 && (
        <div className="bulk-bar" aria-busy={Boolean(actionBusy)}>
          <div className="bulk-count">
            <span>{selected.size}</span> selected
          </div>
          <div className="bulk-actions">
            <button disabled={Boolean(actionBusy)} onClick={() => act('resume')}>
              <Play size={15} /> Resume
            </button>
            <button disabled={Boolean(actionBusy)} onClick={() => act('pause')}>
              <Pause size={15} /> Pause
            </button>
            <button disabled={Boolean(actionBusy)} onClick={() => act('recheck')}>
              <RotateCcw size={15} /> Recheck
            </button>
            <button className="danger" disabled={Boolean(actionBusy)} onClick={() => act('remove')}>
              <Trash2 size={15} /> Remove
            </button>
          </div>
        </div>
      )}
      {detail && mobileOverlay(
        <DetailDrawer
          key={detail.hash}
          torrent={detail}
          onClose={() => setDetail(null)}
          onAction={(action) => act(action, [detail.hash])}
        />
      )}
      {menuTorrent && mobileOverlay(
        <>
        {mobileLayout && <div className="mobile-menu-backdrop" onClick={() => setMenuTorrent(null)} />}
        <div className="context-menu" style={menuPosition || {}}>
          {mobileLayout && <button className="mobile-menu-close" onClick={() => setMenuTorrent(null)} aria-label="Close torrent actions"><X size={18} />Close</button>}
          <strong>{menuTorrent.name}</strong>
          <button
            onClick={() => {
              setDetail(menuTorrent);
              setMenuTorrent(null);
            }}
          >
            <Info size={15} /> View details
          </button>
          <button
            onClick={() =>
              act(menuTorrent.state === 'Paused' ? 'resume' : 'pause', [
                menuTorrent.hash,
              ])
            }
          >
            {menuTorrent.state === 'Paused' ? (
              <Play size={15} />
            ) : (
              <Pause size={15} />
            )}
            {menuTorrent.state === 'Paused' ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => {
              setAddFiles({ kind: 'move', torrent: menuTorrent });
              setMenuTorrent(null);
            }}
          >
            <HardDrive size={15} /> Move storage…
          </button>
          <button
            onClick={() => {
              setAddFiles({ kind: 'rename', torrent: menuTorrent });
              setMenuTorrent(null);
            }}
          >
            <Pencil size={15} /> Rename…
          </button>
          <button onClick={() => copyMagnet(menuTorrent)}>
            <Magnet size={15} /> Copy magnet link
          </button>
          <button onClick={() => act('reannounce', [menuTorrent.hash])}>
            <Wifi size={15} /> Reannounce
          </button>
          <hr />
          <div className="queue-section">
            <span>QUEUE POSITION</span>
            <div
              className="queue-action-grid"
              role="group"
              aria-label="Move torrent in queue"
            >
              <button
                onClick={() => act('queueTop', [menuTorrent.hash])}
                title="Move to top"
              >
                <ArrowUpFromLine size={14} /> Top
              </button>
              <button
                onClick={() => act('queueUp', [menuTorrent.hash])}
                title="Move up"
              >
                <ArrowUp size={14} /> Up
              </button>
              <button
                onClick={() => act('queueDown', [menuTorrent.hash])}
                title="Move down"
              >
                <ArrowDown size={14} /> Down
              </button>
              <button
                onClick={() => act('queueBottom', [menuTorrent.hash])}
                title="Move to bottom"
              >
                <ArrowDownToLine size={14} /> Bottom
              </button>
            </div>
          </div>
          <hr />
          <button
            className="danger"
            onClick={() => act('remove', [menuTorrent.hash])}
          >
            <Trash2 size={15} /> Remove…
          </button>
        </div>
        </>
      )}
      {celebration && (
        <div className="celebration-toast" role="status" aria-live="polite">
          <Sparkles size={17} />
          {celebration}
        </div>
      )}
      {copied && (
        <div className="action-toast" role="status" aria-live="polite">
          <Check size={16} />
          {copied}
        </div>
      )}
      {commandPaletteOpen && (
        <CommandPalette
          onClose={() => setCommandPaletteOpen(false)}
          onAdd={() => setAddFiles([])}
          onPreferences={openPreferences}
          onRefresh={refresh}
          onSearch={() => document.querySelector('.search-wrap input')?.focus()}
        />
      )}
      {addFiles && mobileOverlay(
        <AddModal
          initialFiles={addFiles}
          existingNames={torrents.map((torrent) => torrent.name)}
          onClose={() => setAddFiles(null)}
          onAdded={refresh}
        />
      )}
    </div>
  );
}
function Stat({ theme, icon: Icon, label, value, detail, tone = '', trend = [] }) {
  const values = trend.length > 1 ? trend : [trend[0] || 0, trend[0] || 0];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = Math.max(1, high - low);
  const hasBalancedConnectionSpark = tone === 'amber'
    && ['halloween', 'valentine', 'christmas', 'new-year', 'independence'].includes(theme);
  const sparkValues = hasBalancedConnectionSpark ? Array.from({ length: 9 }, (_, index) => index) : values;
  const points = sparkValues.map((sample, index) => {
    const x = (index / (sparkValues.length - 1)) * 100;
    // Keep the seasonal connection trace balanced when the real history is
    // mostly zero with one recent connection.
    const y = hasBalancedConnectionSpark
      ? 16 - Math.sin((index / (sparkValues.length - 1)) * Math.PI * 4) * 5
      : high === low ? 16 : 27 - ((sample - low) / range) * 21;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">
        <Icon size={17} />
      </div>
      <div>
        <span>{theme === 'terminal' ? ({ Connections: 'Conns', Library: 'Lib' }[label] || label) : label}</span>
        <strong>{value}</strong>
        {(detail || theme === 'terminal') && <small>{theme === 'terminal' ? (label === 'Connections' ? 'Active' : label === 'Library' ? detail.replace(/(\d+) seeding/, 'Seeding:$1') : 'Payload') : detail}</small>}
      </div>
      <svg className="stat-spark" aria-hidden="true" viewBox="0 0 100 30" preserveAspectRatio="none">
        <polygon points={`0,30 ${points} 100,30`} />
        <polyline points={points} />
      </svg>
      {theme === 'terminal' && <div className="terminal-stat-trace" aria-hidden="true">{label === 'Connections' ? '[---/\\---]' : '[------------]'}</div>}
      <ThemeDetail theme={theme} />
    </div>
  );
}
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
    window.addEventListener('deluge-deck-bootstrap-ready', mount, {
      once: true,
    });
    return;
  }
  mounted = true;
  createRoot(root).render(<App />);
};
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
