// Capacitor Native Plugins Registry & Auto-Sync

export let CapacitorHttp = window.Capacitor?.Plugins?.CapacitorHttp;
export let Filesystem = window.Capacitor?.Plugins?.Filesystem;
export let Toast = window.Capacitor?.Plugins?.Toast;
export let Clipboard = window.Capacitor?.Plugins?.Clipboard;
export let App = window.Capacitor?.Plugins?.App;
export let Share = window.Capacitor?.Plugins?.Share;
export let NativeBiometric = window.Capacitor?.Plugins?.NativeBiometric;
export let Media = window.Capacitor?.Plugins?.Media;
export let Haptics = window.Capacitor?.Plugins?.Haptics;
export let Network = window.Capacitor?.Plugins?.Network;

export function syncCapacitorPlugins() {
  const plugins = window.Capacitor?.Plugins;
  if (!plugins) return;
  if (plugins.CapacitorHttp) CapacitorHttp = plugins.CapacitorHttp;
  if (plugins.Filesystem) Filesystem = plugins.Filesystem;
  if (plugins.Toast) Toast = plugins.Toast;
  if (plugins.Clipboard) Clipboard = plugins.Clipboard;
  if (plugins.App) App = plugins.App;
  if (plugins.Share) Share = plugins.Share;
  if (plugins.NativeBiometric) NativeBiometric = plugins.NativeBiometric;
  if (plugins.Media) Media = plugins.Media;
  if (plugins.Haptics) Haptics = plugins.Haptics;
  if (plugins.Network) Network = plugins.Network;
}

if (typeof window !== "undefined") {
  syncCapacitorPlugins();
  window.addEventListener("DOMContentLoaded", syncCapacitorPlugins);
  document.addEventListener("deviceready", syncCapacitorPlugins);
  setTimeout(syncCapacitorPlugins, 50);
  setTimeout(syncCapacitorPlugins, 200);
  setTimeout(syncCapacitorPlugins, 1000);
}
