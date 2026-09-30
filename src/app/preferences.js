const PROXY_TYPES = ['NONE', 'SOCKS4', 'SOCKS5', 'SOCKS5_AUTH', 'HTTP', 'HTTP_AUTH', 'I2P'];

export function proxyFormValues(proxy = {}) {
  const type = Number(proxy.type) || 0;
  return {
    proxyEnabled: type !== 0,
    proxyHost: proxy.hostname || '',
    proxyPort: String(proxy.port ?? 8080),
    proxyType: PROXY_TYPES[type] && type ? PROXY_TYPES[type] : 'HTTP',
  };
}

export function proxyConfig(previous, form) {
  if (!previous) throw new Error('Wait for Deluge proxy settings to load before saving.');
  return {
    ...previous,
    hostname: form.proxyHost.trim(),
    port: Number(form.proxyPort) || Number(previous.port) || 8080,
    type: !form.proxyEnabled ? 0 : PROXY_TYPES.indexOf(form.proxyType),
  };
}
