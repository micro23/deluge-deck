import React, { useLayoutEffect } from 'react';

export function PaperIdentity({ compact = false }) {
  return (
    <div className={compact ? 'notebook-brand compact' : 'notebook-brand'}>
      <span className="notebook-brand-word">{compact ? 'Deluge' : 'Library'}</span>
    </div>
  );
}

// The same column boundaries continue down the unfilled part of the ledger.
// Reading headers keeps the rules aligned with dragged and hidden columns.
export function PaperRuling({ tableRef, columns }) {
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table?.tHead) return undefined;
    const page = table.parentElement;
    const headers = Array.from(table.tHead.rows[0].cells).slice(0, -1);
    let lastLines = '';
    const align = () => {
      const left = table.getBoundingClientRect().left;
      const rules = headers.map((header, index) => {
        const x = Math.round(header.getBoundingClientRect().right - left);
        const ink = index === 0 ? 'var(--book-margin)' : 'var(--book-rule)';
        return `transparent ${x - 1}px,${ink} ${x - 1}px ${x}px,transparent ${x}px`;
      });
      const lines = `linear-gradient(90deg,${rules.join(',')})`;
      if (lines !== lastLines) {
        page.style.setProperty('--paper-column-lines', lines);
        lastLines = lines;
      }
    };
    const observer = new ResizeObserver(align);
    headers.forEach(header => observer.observe(header));
    align();
    return () => {
      observer.disconnect();
      page.style.removeProperty('--paper-column-lines');
    };
  }, [tableRef, columns]);
  return null;
}
