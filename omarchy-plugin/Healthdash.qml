import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "healthdash.health"

  property string baseUrl: "https://sysbody.stream"
  property string pluginToken: ""
  property string pairingCode: ""
  property bool available: false
  property bool pairing: false
  property bool loading: false
  property var snapshot: ({})

  function configuredBaseUrl() {
    return String(setting("baseUrl", root.baseUrl)).replace(/\/$/, "")
  }

  function metricValue(metric) {
    if (!metric || metric.state !== "available" || metric.value === undefined) return "—"
    return String(Math.round(Number(metric.value)))
  }

  function startPairing() {
    if (pairingProcess.running) return
    root.pairing = true
    pairingProcess.running = true
  }

  function beginPairing(raw) {
    root.pairingCode = String(raw || "").trim()
    if (!root.pairingCode) {
      root.pairing = false
      return
    }
    Quickshell.execDetached(["xdg-open", configuredBaseUrl() + "/plugin/connect?pair=" + root.pairingCode])
    pairingPoll.start()
  }

  function applyPairing(raw) {
    try {
      var parsed = JSON.parse(String(raw || "{}"))
      if (parsed.status === "authorized" && parsed.token) {
        root.pluginToken = String(parsed.token)
        root.pairing = false
        pairingPoll.stop()
        root.refresh()
      }
    } catch (error) {
      // The next poll will retry; response contents are never logged.
    }
  }

  function applySnapshot(raw) {
    try {
      var parsed = JSON.parse(String(raw || "{}"))
      if (!parsed || typeof parsed !== "object") throw new Error("invalid-summary")
      if (parsed.error) {
        root.available = false
        if (parsed.error === "plugin-auth-expired") root.pluginToken = ""
        return
      }
      root.snapshot = parsed
      root.available = true
    } catch (error) {
      root.available = false
    }
    root.loading = false
  }

  function refresh() {
    if (!root.pluginToken || summaryRequest.running) return
    root.loading = true
    summaryRequest.command = ["curl", "--silent", "--show-error", "--max-time", "5", "-H", "Authorization: Bearer " + root.pluginToken, configuredBaseUrl() + "/api/plugin/health/summary"]
    summaryRequest.running = true
  }

  function openHealthdash() {
    Quickshell.execDetached(["xdg-open", configuredBaseUrl() + "/"])
  }

  visible: !vertical
  implicitWidth: content.implicitWidth + Style.space(16)
  implicitHeight: barSize

  IpcHandler {
    target: "healthdash.health"

    function refresh(): void {
      root.broadcast("refresh")
    }
  }

  Process {
    id: pairingProcess
    command: ["openssl", "rand", "-hex", "24"]
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.beginPairing(text)
    }
    onExited: function(exitCode) {
      if (exitCode !== 0) root.pairing = false
    }
  }

  Process {
    id: pairingRequest
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.applyPairing(text)
    }
  }

  Process {
    id: summaryRequest
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.applySnapshot(text)
    }
    onExited: function(exitCode) {
      if (exitCode !== 0) root.loading = false
    }
  }

  Timer {
    id: pairingPoll
    interval: 4000
    repeat: true
    onTriggered: {
      if (pairingRequest.running) return
      pairingRequest.command = ["curl", "--silent", "--show-error", "--max-time", "5", configuredBaseUrl() + "/api/plugin/pair/status?pair=" + root.pairingCode]
      pairingRequest.running = true
    }
  }

  Timer {
    interval: 60000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  Row {
    id: content
    anchors.verticalCenter: parent.verticalCenter
    spacing: Style.space(6)

    Text {
      text: root.pairing ? "♥ …" : root.available ? "♥ " + root.metricValue(root.snapshot.restingHeartRate) : "♥ +"
      color: root.bar ? root.bar.barForeground : Color.foreground
      font.family: root.bar ? root.bar.fontFamily : Style.font.family
      font.pixelSize: Style.font.caption
    }

    Text {
      text: root.pairing ? "Login" : root.available ? "· " + root.metricValue(root.snapshot.steps) : "Connect"
      color: root.bar ? root.bar.barForeground : Color.foreground
      font.family: root.bar ? root.bar.fontFamily : Style.font.family
      font.pixelSize: Style.font.caption
      opacity: 0.8
    }
  }

  MouseArea {
    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onClicked: root.pluginToken ? root.openHealthdash() : root.startPairing()
    onEntered: if (root.bar) root.bar.showTooltip(root, root.pluginToken ? "Healthdash · click to open" : "Healthdash · connect in browser")
    onExited: if (root.bar) root.bar.hideTooltip(root)
  }
}
