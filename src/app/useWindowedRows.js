import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { rowOffsets, rowAt, windowSlots } from './window-range.js';

function scrollParent(element) {
  for (let parent = element?.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return window;
}
export function useWindowedRows(items, { listRef, scrollRef, enabled = true, estimate = 48, uniform = false, resetKey = '' }) {
  const active = enabled && items.length > 200;
  const heights = useRef(new Map());
  const scroller = useRef(null);
  const pendingFocus = useRef(null);
  const [version, setVersion] = useState(0);
  const [rowHeight, setRowHeight] = useState(estimate);
  const [focused, setFocused] = useState(null);
  const [viewport, setViewport] = useState({ top: 0, height: 800 });
  const offsets = useMemo(() => rowOffsets(items, uniform ? new Map() : heights.current, rowHeight), [items, version, rowHeight, uniform]);
  const slots = useMemo(() => active ? windowSlots(offsets, viewport.top, viewport.height, focused) : items.map((_, index) => ({ type: 'row', index, key: index })), [active, items, offsets, viewport, focused]);
  const latest = useRef(null);
  latest.current = { offsets, items, viewport, uniform, rowHeight };

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!active || !list) return;
    const container = scrollRef?.current || scrollParent(list);
    scroller.current = container;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = list.getBoundingClientRect();
      const containerRect = container === window ? { top: 0, bottom: innerHeight } : container.getBoundingClientRect();
      // Desktop's sticky table header covers the top of the scrolling viewport.
      const header = uniform ? list.closest('table')?.tHead?.getBoundingClientRect().height || 0 : 0;
      const top = Math.max(0, containerRect.top + header - rect.top);
      const height = Math.max(1, containerRect.bottom - Math.max(rect.top, containerRect.top + header));
      setViewport(current => Math.abs(current.top - top) < .5 && Math.abs(current.height - height) < .5 ? current : { top, height });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const focus = event => {
      const row = event.target.closest?.('[data-virtual-index]');
      if (row && list.contains(row)) setFocused(Number(row.dataset.virtualIndex));
    };
    const blur = event => { if (event.relatedTarget && !list.contains(event.relatedTarget)) setFocused(null); };
    container.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    list.addEventListener('focusin', focus); list.addEventListener('focusout', blur);
    const resize = new ResizeObserver(schedule);
    resize.observe(container === window ? document.documentElement : container);
    measure();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      container.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      list.removeEventListener('focusin', focus); list.removeEventListener('focusout', blur);
    };
  }, [active, listRef, scrollRef, uniform, resetKey]);

  useLayoutEffect(() => {
    if (!active || !listRef.current) return;
    const list = listRef.current;
    let frame = 0;
    const observer = new ResizeObserver(entries => {
      let changed = false;
      if (uniform) {
        const height = entries[0]?.target.getBoundingClientRect().height;
        if (height > 0) setRowHeight(current => Math.abs(current - height) < .5 ? current : height);
      } else {
        for (const entry of entries) {
          const index = Number(entry.target.dataset.virtualIndex);
          const hash = latest.current.items[index]?.hash;
          const height = entry.target.getBoundingClientRect().height;
          if (hash && height > 0 && Math.abs((heights.current.get(hash) || 0) - height) > .5) { heights.current.set(hash, height); changed = true; }
        }
        if (changed && !frame) frame = requestAnimationFrame(() => { frame = 0; setVersion(value => value + 1); });
      }
    });
    list.querySelectorAll('[data-virtual-index]').forEach(row => observer.observe(row));
    if (pendingFocus.current) {
      const { index, selector } = pendingFocus.current;
      const row = list.querySelector(`[data-virtual-index="${index}"]`);
      if (row) { (selector ? row.querySelector(selector) : row)?.focus({ preventScroll: true }); pendingFocus.current = null; }
    }
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [active, slots, uniform, listRef]);

  useLayoutEffect(() => {
    heights.current.clear(); setFocused(null); setRowHeight(estimate);
    const container = scroller.current;
    if (active && uniform && container) container.scrollTop = 0;
    setViewport(current => ({ ...current, top: 0 })); setVersion(value => value + 1);
  }, [resetKey, estimate, uniform]);

  const focusRow = (index, selector = '') => {
    if (!items.length) return;
    index = Math.max(0, Math.min(items.length - 1, index));
    pendingFocus.current = { index, selector }; setFocused(index);
    const list = listRef.current;
    const container = scroller.current || scrollRef?.current || scrollParent(list);
    if (!list || !container) return;
    const position = offsets[index];
    const rect = list.getBoundingClientRect();
    const delta = position - viewport.top;
    if (container === window) window.scrollBy({ top: delta, behavior: 'instant' });
    else container.scrollTop += delta;
    setViewport(current => ({ ...current, top: position }));
    if (!active) {
      const row = list.querySelector(`[data-virtual-index="${index}"]`);
      (selector ? row?.querySelector(selector) : row)?.focus(); pendingFocus.current = null;
    }
  };
  const navigate = (event, index, selector = '') => {
    if (!active || event.altKey || event.metaKey || event.ctrlKey) return false;
    const page = Math.max(1, rowAt(offsets, viewport.top + viewport.height) - rowAt(offsets, viewport.top));
    const targets = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1, PageDown: index + page, PageUp: index - page };
    if (!Object.hasOwn(targets, event.key)) return false;
    event.preventDefault(); event.stopPropagation(); focusRow(targets[event.key], selector); return true;
  };
  const tabAcrossBoundary = (event, index, lastSelector, firstSelector = '') => {
    if (!active || event.key !== 'Tab') return;
    const row = event.currentTarget;
    const target = event.shiftKey ? index - 1 : index + 1;
    const atBoundary = event.shiftKey ? event.target === (firstSelector ? row.querySelector(firstSelector) : row) : event.target === row.querySelector(lastSelector);
    if (!atBoundary || target < 0 || target >= items.length || slots.some(slot => slot.type === 'row' && slot.index === target)) return;
    event.preventDefault(); focusRow(target, event.shiftKey ? lastSelector : firstSelector);
  };
  return { active, slots, navigate, tabAcrossBoundary, focusRow };
}
