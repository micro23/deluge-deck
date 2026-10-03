import React, { useEffect, useState } from 'react';
import { rpc } from './api.js';
import { formatBytes } from '../../server/hosted-contracts.mjs';
const rate = value => `${formatBytes(Math.max(0, Number(value) || 0))}/s`;
const trackerHost = value => {
  try { return new URL(String(value)).hostname || 'Unknown tracker'; }
  catch { return 'Unknown tracker'; }
};

// Read only, same-origin Deluge RPC. Tracker passkeys and geo-IP requests are
// unnecessary for this view; display hosts and daemon-provided country codes.
export function TorrentNetworkDetails({ hash, kind }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('Loading…');
  useEffect(() => {
    let active = true;
    let timer;
    setRows([]);
    setStatus('Loading…');
    const refresh = async () => {
      try {
        const result = await rpc('web.get_torrent_status', [hash, [kind]]);
        if (!active) return;
        if (!Array.isArray(result?.[kind])) throw new Error(`Deluge did not return ${kind}.`);
        setRows(result[kind].filter(row => row && typeof row === 'object' && !Array.isArray(row)).slice(0, 500));
        setStatus(result[kind].length > 500 ? 'Showing the first 500 entries.' : '');
      } catch (error) {
        if (active) setStatus(error.message || `Unable to load ${kind}.`);
      }
      if (active) timer = window.setTimeout(refresh, 5000);
    };
    refresh();
    return () => { active = false; window.clearTimeout(timer); };
  }, [hash, kind]);
  const peers = kind === 'peers';
  return <div className="drawer-content dh-network-content" id={`drawer-panel-${kind}`} role="tabpanel" aria-labelledby={`drawer-tab-${kind}`}>
    <p role="status">{status || (rows.length ? `${rows.length} ${kind} · updates every 5 seconds` : `No ${kind} reported by Deluge.`)}</p>
    {rows.length > 0 && <div className="dh-network-scroll"><table><thead><tr>{(peers ? ['Address', 'Client', 'Country', 'Progress', 'Download', 'Upload'] : ['Tracker', 'Tier']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{peers ? <><td>{String(row.ip || '—')}</td><td>{String(row.client || 'Unknown')}</td><td>{String(row.country || '—')}</td><td>{(Math.max(0, Math.min(1, Number(row.progress) || 0)) * 100).toFixed(1)}%</td><td>{rate(row.down_speed)}</td><td>{rate(row.up_speed)}</td></> : <><td>{trackerHost(row.url)}</td><td>{Number.isFinite(Number(row.tier)) ? Number(row.tier) : '—'}</td></>}</tr>)}</tbody></table></div>}
  </div>;
}
