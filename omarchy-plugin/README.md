# Healthdash Omarchy plugin

This is a native Omarchy `bar-widget` with a themed `KeyboardPanel` for the
hosted Healthdash application. Clicking the bar item opens the native panel;
the first click also opens `sysbody.stream` for Google login. After pairing,
the panel polls a minimal HTTPS health-summary endpoint once per minute.

The plugin never handles Google OAuth or raw health history. The pairing token
is held in memory by the shell and expires server-side; the native panel shows
`♥ + Connect` until the browser pairing flow is completed.

## Installation

```sh
mkdir -p ~/.config/omarchy/plugins/healthdash.health
cp omarchy-plugin/manifest.json omarchy-plugin/Healthdash.qml ~/.config/omarchy/plugins/healthdash.health/
omarchy-shell shell rescanPlugins
omarchy plugin enable healthdash.health
```

The widget defaults to `https://sysbody.stream`. Override `baseUrl` in the
widget's `shell.json` layout entry only when using another Healthdash host.

## Validation

From the repository root:

```sh
omarchy plugin validate omarchy-plugin
```
