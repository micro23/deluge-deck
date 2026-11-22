import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Fan, Radio } from 'lucide-react';
import { formatBytes } from '../../server/hosted-contracts.mjs';

const sectors = [
  { name:'Downloading', label:'DL', color:'#87efcc' },
  { name:'Seeding', label:'SEED', color:'#b8d5ff' },
  { name:'Paused', label:'PAUSE', color:'#f9ca79' },
  { name:'Other', label:'OTHER', color:'#eab8d5' },
];
const rate = n => n == null ? '—' : `${formatBytes(n)}/s`;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const polar = (radius, angle) => {
  const radians = (angle - 90) * Math.PI / 180;
  return [100 + radius * Math.cos(radians), 100 + radius * Math.sin(radians)];
};

export function OceanIdentity({ compact = false }) {
  return <div className={`ocean-identity${compact ? ' compact' : ''}`}>
    <span className="ocean-impeller"><Fan aria-hidden="true" strokeWidth={1.55} /></span>
    <span className="ocean-identity-name">Ocean</span>
  </div>;
}

function BandwidthTrace({ history, stats }) {
  const samplesFor = key => (history?.[key] || []).slice(-14).filter(n => finite(n) && n >= 0);
  const down = samplesFor('download');
  const up = samplesFor('upload');
  const samples = Math.max(down.length, up.length);
  const observedPeak = Math.max(0, ...down, ...up);
  const peak = Math.max(1, observedPeak);
  const chartLabel = samples === 1 ? 'Current download and upload rates relative to the higher rate.'
    : samples ? `Download and upload history over ${samples} samples. Peak ${rate(observedPeak)}.` : 'Awaiting download and upload samples';
  const points = values => values.map((v,i) => {
    const x = values.length > 1 ? i * 100 / (values.length - 1) : 100;
    return `${x.toFixed(2)},${(45 - Math.min(1, v / peak) * 40).toFixed(2)}`;
  }).join(' ');
  return <section className="ocean-bandwidth-module" aria-labelledby="ocean-bandwidth-title">
    <div className="ocean-module-label"><h2 id="ocean-bandwidth-title">Bandwidth</h2></div>
    <div className="ocean-trace-case">
      <div className="ocean-rates">
        <div><span><ArrowDown size={13} aria-hidden="true" />Download</span><strong>{rate(stats.download_rate)}</strong></div>
        <div><span><ArrowUp size={13} aria-hidden="true" />Upload</span><strong>{rate(stats.upload_rate)}</strong></div>
      </div>
      <div className="ocean-trace">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label={chartLabel}>
          {samples === 1 ? [down, up].map((series, i) => {
            if (!series.length) return null;
            const y = i ? 35 : 14;
            return <g key={i} className={i ? 'ocean-up' : 'ocean-down'}>
              <line x1="1" x2="99" y1={y} y2={y} opacity=".18" strokeWidth="6" strokeDasharray="3 2" vectorEffect="non-scaling-stroke"/>
              <line x1="1" x2={1 + series[0] / peak * 98} y1={y} y2={y} strokeWidth="6" strokeDasharray="3 2" vectorEffect="non-scaling-stroke"/>
            </g>;
          }) : [down,up].map((values,i) => <g key={i} className={i ? 'ocean-up' : 'ocean-down'}>
            {values.length > 1 && <polyline points={points(values)} fill="none" vectorEffect="non-scaling-stroke" />}
            {values.length > 0 && <line x1="99" x2="100" y1={45-values.at(-1)/peak*40} y2={45-values.at(-1)/peak*40} vectorEffect="non-scaling-stroke" />}
          </g>)}
        </svg>
        <span>{samples === 1 ? 'Current transfer levels' : samples ? `Peak ${rate(observedPeak)} · ${samples} samples` : 'Awaiting transfer samples'}</span>
      </div>
    </div>
  </section>;
}

// One point per occupied state/progress bin keeps the display legible even
// in libraries with thousands of transfers; radius is mean completion.
function summarize(torrents) {
  const counts = [0,0,0,0];
  const bins = new Map();
  for (const torrent of torrents) {
    const index = sectors.findIndex(s => s.name === torrent.state);
    const sector = index < 0 ? 3 : index;
    counts[sector]++;
    if (!finite(torrent.progress)) continue;
    const progress = Math.max(0, Math.min(100,torrent.progress));
    const bucket = Math.min(9, Math.floor(progress / 10));
    const key = sector * 10 + bucket;
    if (!bins.has(key)) bins.set(key, { key, sector, bucket, count:0, sum:0, traffic:0 });
    const bin = bins.get(key);
    bin.count++;
    bin.sum += progress;
    for (const speed of [torrent.download_payload_rate, torrent.upload_payload_rate]) {
      if (finite(speed) && speed > 0) bin.traffic += speed;
    }
  }
  const contacts = [...bins.values()].map(bin => {
    const progress = bin.sum / bin.count;
    const angle = bin.sector * 90 + 23 + (bin.bucket * 29) % 44;
    const [x, y] = polar(progress * 0.81, angle);
    return { ...bin, progress, angle, x, y };
  });
  const busiest = contacts.reduce((best, item) => item.traffic > (best?.traffic || 0) ? item : best, null);
  return { counts, contacts, busiest };
}

function MiniSonar({ contacts, busiest }) {
  return <svg className="ocean-mini-sonar" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="93" fill="#0a2a2c" stroke="#9edbcc" strokeWidth="6" />
    {busiest && <g transform={`rotate(${busiest.angle} 100 100)`}>
      <path d="M100 100 62 22A87 87 0 0 1 100 13Z" fill="#65cbbd" opacity=".4"/>
      <path d="M100 100V13" stroke="#b1ffeb" strokeWidth="4"/>
    </g>}
    <g fill="none" stroke="#5d9e93" strokeWidth="4"><circle cx="100" cy="100" r="58" /><path d="M100 12v176M12 100h176" /></g>
    {contacts.map(({key, sector, x, y}) => <circle key={key} cx={x} cy={y} r="11" fill={sectors[sector].color}/>)}
  </svg>;
}

function LibrarySonar({ total, counts, contacts, busiest, filter, onFilter }) {
  return <section id="ocean-sonar-module" className="ocean-sonar-module" aria-labelledby="ocean-sonar-title">
    <div className="ocean-module-label"><h2 id="ocean-sonar-title">Library sonar</h2><span>{total}</span></div>
    <div className="ocean-porthole">
      <svg className="ocean-sonar" viewBox="0 0 200 200" role="img" aria-label={`Library sonar, ${total} transfers. Angle groups state. Distance from center shows completion, and larger contacts represent more transfers.${busiest ? ' The beam marks the group with the highest transfer rate.' : ''}`}>
        <circle cx="100" cy="100" r="95" className="ocean-sonar-face" />
        {busiest && <g transform={`rotate(${busiest.angle} 100 100)`}>
          <defs><linearGradient id="ocean-sonar-beam"><stop stopColor="#70ebd9" stopOpacity="0"/><stop offset="1" stopColor="#70ebd9" stopOpacity=".4"/></linearGradient></defs>
          <path d="M100 100 62.4 19.3A89 89 0 0 1 100 11Z" fill="url(#ocean-sonar-beam)"/>
          <path d="M100 100V11" stroke="#9af1df" strokeWidth="1.25" opacity=".85"/>
        </g>}
        <g fill="none" className="ocean-graticule">
          {[22,42,62,81].map(r => <circle key={r} cx="100" cy="100" r={r} />)}
          {Array.from({length:24},(_,i) => { const a=polar(i%3 === 0 ? 82 : 87,i*15),b=polar(91,i*15); return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />; })}
          <path d="M100 12v176M12 100h176M38 38l124 124M38 162 162 38" strokeDasharray="2 4"/>
        </g>
        <g className="ocean-sector-labels" textAnchor="middle">{sectors.map((s,i) => {
          const [x,y] = polar(88, i*90+45);
          return <text key={s.name} x={x} y={y+3}>{s.label}</text>;
        })}</g>
        <path d="M95 100h10m-5-5v10" stroke="#c3f7de" strokeWidth="1"/>
        {contacts.map(({key, count, sector, progress, x, y}) => {
          const radius = Math.min(7,2.8 + Math.log2(count));
          return <g key={key} fill={sectors[sector].color}>
            <title>{count} {sectors[sector].name.toLowerCase()} · {Math.round(progress)}% complete</title>
            <circle cx={x} cy={y} r={radius+3.2} opacity=".22" /><circle cx={x} cy={y} r={radius} />
          </g>;
        })}
      </svg>
    </div>
    <div className="ocean-legend">{sectors.map((s,i) => {
      const key = s.name.toLowerCase();
      const label = <><i style={{background:s.color}} /><span>{s.name}</span><b>{counts[i]}</b></>;
      return i < 3 && onFilter
        ? <button type="button" key={key} aria-label={`Filter ${key} torrents`} aria-pressed={filter === key} onClick={()=>onFilter(filter === key ? 'all' : key)}>{label}</button>
        : <span key={key} className="ocean-legend-count">{label}</span>;
    })}</div>
    <p className="ocean-sonar-key">Radius · <span>0–100% complete</span>{busiest && <><br/>Peak traffic beam · <span>{rate(busiest.traffic)}</span></>}</p>
  </section>;
}

function Connections({ stats }) {
  const value = stats.num_connections, cap = stats.max_num_connections;
  const limited = finite(cap) && cap > 0;
  const gauge = finite(value) && limited ? Math.max(0, Math.min(1, value/cap)) : null;
  return <section id="ocean-systems-module" className="ocean-systems-module" aria-labelledby="ocean-systems-title">
    <div className="ocean-module-label"><h2 id="ocean-systems-title">Connections</h2></div>
    <div className="ocean-gauge-row">
      <svg viewBox="0 0 112 61" className="ocean-gauge" aria-hidden="true">
        <path d="M10 54a46 46 0 0 1 92 0" fill="none" stroke="currentColor" strokeWidth="5" opacity=".25"/>
        {gauge != null && <path d="M10 54a46 46 0 0 1 92 0" pathLength="100" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray={`${gauge*100} 100`}/>}
        {Array.from({length:11},(_,i)=><line key={i} x1="15" x2={i%5===0?'22':'19'} y1="54" y2="54" stroke="currentColor" transform={`rotate(${i*18} 56 54)`} />)}
        {gauge != null && <g transform={`rotate(${gauge*180} 56 54)`}><path d="m56 51-39 3 39 2Z" fill="#ffcc8d"/><circle cx="56" cy="54" r="4" fill="#c8d7cb"/></g>}
      </svg>
      <div><strong>{value ?? '—'}</strong><small>{limited ? `of ${cap} max` : finite(cap) && cap <= 0 ? 'Unlimited' : 'Limit unavailable'}</small></div>
    </div>
    <dl className="ocean-readouts"><div><dt>DHT nodes</dt><dd>{stats.dht_nodes ?? '—'}</dd></div><div><dt>Free space</dt><dd>{finite(stats.free_space) && stats.free_space >= 0 ? formatBytes(stats.free_space) : '—'}</dd></div></dl>
  </section>;
}

export function OceanMasthead({ stats = {}, torrents = [], telemetryHistory, filter, onFilter }) {
  const [expanded,setExpanded] = useState(false);
  const summary = useMemo(() => summarize(torrents), [torrents]);
  return <>
    <header className="ocean-monitor-heading">
      <div className="ocean-monitor-top"><Radio aria-hidden="true"/><h1>Transfer monitor</h1></div>
      <span className="ocean-library-size"><b>{torrents.length}</b> {torrents.length === 1 ? 'torrent' : 'torrents'} in library</span>
    </header>
    <aside className={`ocean-instruments${expanded ? ' expanded' : ''}`} aria-label="Transfer instruments">
      <button type="button" className="ocean-instrument-toggle" aria-expanded={expanded} aria-controls="ocean-sonar-module ocean-systems-module" onClick={()=>setExpanded(!expanded)}>
        <MiniSonar contacts={summary.contacts} busiest={summary.busiest}/><span>Instruments</span><span>{torrents.length} {torrents.length === 1 ? 'torrent' : 'torrents'}</span><ChevronsUpDown size={14} aria-hidden="true"/>
      </button>
      <div className="ocean-instrument-body" id="ocean-instrument-body">
        <LibrarySonar total={torrents.length} {...summary} filter={filter} onFilter={onFilter}/>
        <BandwidthTrace history={telemetryHistory} stats={stats}/>
        <Connections stats={stats}/>
      </div>
    </aside>
  </>;
}
