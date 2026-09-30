// Bound every read: an unterminated collection must never loop on EOF.
export function decodeTorrentMetadata(buffer) {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder();
  let offset = 0;
  const invalid = () => { throw new Error('This torrent contains invalid or truncated metadata.'); };
  const read = (depth = 0) => {
    if (depth > 64 || offset >= bytes.length) return invalid();
    const marker = bytes[offset];
    if (marker === 105) {
      const start = ++offset;
      const end = bytes.indexOf(101, start);
      if (end < 0) return invalid();
      const raw = text.decode(bytes.subarray(start, end));
      if (!/^(0|-?[1-9]\d*)$/.test(raw)) return invalid();
      const value = Number(raw);
      if (!Number.isSafeInteger(value)) return invalid();
      offset = end + 1;
      return value;
    }
    if (marker === 108 || marker === 100) {
      offset += 1;
      const value = marker === 108 ? [] : Object.create(null);
      while (bytes[offset] !== 101) {
        if (marker === 108) value.push(read(depth + 1));
        else {
          // Dictionary keys are byte strings, never collections or numbers.
          if (bytes[offset] < 48 || bytes[offset] > 57) return invalid();
          const key = read(depth + 1);
          if (Object.hasOwn(value, key)) return invalid();
          value[key] = read(depth + 1);
        }
      }
      offset += 1;
      return value;
    }
    if (marker < 48 || marker > 57) return invalid();
    const colon = bytes.indexOf(58, offset);
    if (colon < 0) return invalid();
    const raw = text.decode(bytes.subarray(offset, colon));
    if (!/^(0|[1-9]\d*)$/.test(raw)) return invalid();
    const length = Number(raw);
    offset = colon + 1;
    if (!Number.isSafeInteger(length) || length > bytes.length - offset) return invalid();
    const value = text.decode(bytes.subarray(offset, offset + length));
    offset += length;
    return value;
  };
  const metadata = read();
  if (offset !== bytes.length) return invalid();
  const info = metadata?.info;
  if (!info || typeof info !== 'object' || Array.isArray(info))
    throw new Error('This torrent is missing its info metadata.');
  const size = (value) => {
    if (!Number.isSafeInteger(value) || value < 0) return invalid();
    return value;
  };
  if (Array.isArray(info.files)) {
    if (!info.files.length) return invalid();
    return info.files.map((entry, index) => {
      const parts = entry?.['path.utf-8'] || entry?.path;
      if (!Array.isArray(parts) || !parts.length || parts.some((part) => typeof part !== 'string' || !part)) return invalid();
      return { index, path: parts.join('/'), size: size(entry.length) };
    });
  }
  // Pure v2 file trees require libtorrent's file/padding index mapping before
  // applying priorities. Do not invent one zero-byte payload for these files.
  if (info['meta version'] === 2)
    throw new Error('Pure BitTorrent v2 files cannot be previewed here yet. Use a magnet link or torrent URL.');
  const name = info['name.utf-8'] || info.name;
  if (typeof name !== 'string' || !name) return invalid();
  return [{ index: 0, path: name, size: size(info.length) }];
}
