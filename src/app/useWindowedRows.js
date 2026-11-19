import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { rowOffsets, rowAt, windowSlots } from './window-range.js';

function scrollParent(element) {
  for (let parent = element?.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return window;
}

export function useWindowedRows(items, { listRef, scrollRef, enabled = true, estimate = 48, resetKey = '' }) {
  const active = enabled && items.length > 200;
  const heights = useRef(new Map());
  const scroller = useRef(null);
  const pendingFocus = useRef(null);
  const [version, setVersion] = useState(0);
  const [focusedHash, setFocusedHash] = useState(null);
  const [viewport, setViewport] = useState({ top: 0, height: 800, atEnd: false });
  const offsets = useMemo(() => rowOffsets(items, heights.current, estimate), [items, version, estimate]);
  const focused = useMemo(() => focusedHash ? items.findIndex(item => item.hash === focusedHash) : -1, [items, focusedHash]);
  const slots = useMemo(() => {
    if (!active) return items.map((_, index) => ({ type: 'row', index, key: index }));
    const top = viewport.atEnd ? Math.max(0, offsets.at(-1) - viewport.height) : viewport.top;
    return windowSlots(offsets, top, viewport.height, focused);
  }, [active, items, offsets, viewport, focused]);

  useLayoutEffect(() => {
    heights.current.clear();
    pendingFocus.current = null;
    setFocusedHash(null);
    if (scrollRef?.current) scrollRef.current.scrollTop = 0;
    setViewport(current => ({ ...current, top: 0, atEnd: false }));
    setVersion(value => value + 1);
  }, [resetKey, estimate, scrollRef]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!active || !list) return;
    const container = scrollRef?.current || scrollParent(list);
    scroller.current = container;
    const scrollElement = container === window ? document.scrollingElement : container;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = list.getBoundingClientRect();
      const containerRect = container === window ? { top: 0, bottom: innerHeight } : container.getBoundingClientRect();
      const header = list.closest('table')?.tHead?.querySelector('th')?.getBoundingClientRect();
      const start = Math.max(rect.top, containerRect.top, header?.bottom ?? 0);
      const top = Math.max(0, start - rect.top);
      const height = Math.max(1, containerRect.bottom - start);
      const atEnd = scrollElement.scrollTop > 0 && rect.bottom <= containerRect.bottom + 2;
      setViewport(current =>
        current.atEnd === atEnd && Math.abs(current.top - top) < .5 && Math.abs(current.height - height) < .5
          ? current : { top, height, atEnd });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const focus = event => {
      const row = event.target.closest?.('[data-virtual-hash]');
      if (row && list.contains(row)) setFocusedHash(row.dataset.virtualHash);
    };
    const blur = event => { if (event.relatedTarget && !list.contains(event.relatedTarget)) setFocusedHash(null); };
    container.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    list.addEventListener('focusin', focus);
    list.addEventListener('focusout', blur);
    const resize = new ResizeObserver(schedule);
    resize.observe(list);
    resize.observe(container === window ? document.documentElement : container);
    measure();
    return () => {
      scroller.current = null;
      cancelAnimationFrame(frame);
      resize.disconnect();
      container.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      list.removeEventListener('focusin', focus);
      list.removeEventListener('focusout', blur);
    };
  }, [active, listRef, scrollRef, resetKey]);

  useLayoutEffect(() => {
    if (!active || !listRef.current) return;
    const list = listRef.current;
    let frame = 0;
    const observer = new ResizeObserver(entries => {
      let changed = false;
      for (const { target } of entries) {
        const hash = target.dataset.virtualHash;
        const height = target.getBoundingClientRect().height;
        if (hash && height > 0 && Math.abs((heights.current.get(hash) || 0) - height) > .5) {
          heights.current.set(hash, height);
          changed = true;
        }
      }
      if (changed && !frame) frame = requestAnimationFrame(() => {
        frame = 0;
        setVersion(value => value + 1);
      });
    });
    list.querySelectorAll('[data-virtual-index]').forEach(row => observer.observe(row));
    if (pendingFocus.current) {
      const { index, selector } = pendingFocus.current;
      const row = list.querySelector(`[data-virtual-index="${index}"]`);
      if (row) {
        (selector ? row.querySelector(selector) : row)?.focus({ preventScroll: true });
        pendingFocus.current = null;
      }
    }
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [active, slots, listRef]);

  const focusRow = (index, selector = '') => {
    if (!items.length) return;
    index = Math.max(0, Math.min(items.length - 1, index));
    const list = listRef.current;
    if (!list) return;
    if (!active) {
      const row = list.querySelector(`[data-virtual-index="${index}"]`);
      (selector ? row?.querySelector(selector) : row)?.focus();
      return;
    }
    pendingFocus.current = { index, selector };
    setFocusedHash(items[index].hash);
    const container = scroller.current || scrollParent(list);
    const position = offsets[index];
    const delta = position - viewport.top;
    if (container === window) window.scrollBy({ top: delta, behavior: 'instant' });
    else container.scrollTop += delta;
    setViewport(current => ({ ...current, top: position, atEnd: index === items.length - 1 }));
  };

  const navigate = (event, index, selector = '') => {
    if (!active || event.altKey || event.metaKey || event.ctrlKey) return false;
    const page = Math.max(1, rowAt(offsets, viewport.top + viewport.height) - rowAt(offsets, viewport.top));
    const targets = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1, PageDown: index + page, PageUp: index - page };
    if (!Object.hasOwn(targets, event.key)) return false;
    event.preventDefault();
    event.stopPropagation();
    focusRow(targets[event.key], selector);
    return true;
  };

  const tabAcrossBoundary = (event, index, lastSelector, firstSelector = '') => {
    if (!active || event.key !== 'Tab') return;
    const row = event.currentTarget;
    const target = event.shiftKey ? index - 1 : index + 1;
    const atBoundary = event.shiftKey ? event.target === (firstSelector ? row.querySelector(firstSelector) : row) : event.target === row.querySelector(lastSelector);
    if (!atBoundary || target < 0 || target >= items.length || slots.some(slot => slot.type === 'row' && slot.index === target)) return;
    event.preventDefault();
    focusRow(target, event.shiftKey ? lastSelector : firstSelector);
  };

  return { slots, navigate, tabAcrossBoundary };
}
