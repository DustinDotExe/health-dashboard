import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

Panel {
  id: root
  moduleName: "healthdash.health"
  ipcTarget: "healthdash.health"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root
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

  function metricText(metric, digits) {
    if (!metric || metric.state !== "available" || metric.value === undefined) return "—"
    return Number(metric.value).toLocaleString(Qt.locale("en_US"), "f", digits || 0)
  }

  function recoveryText() {
    if (!root.available) return "—"
    var hrv = root.snapshot.hrv && root.snapshot.hrv.state === "available"
    var resting = root.snapshot.restingHeartRate && root.snapshot.restingHeartRate.state === "available"
    return hrv || resting ? "SIGNALS" : "—"
  }

  function startPairing() {
    if (pairing || pluginToken || pairingProcess.running) return
    pairing = true
    pairingProcess.running = true
  }

  function beginPairing(raw) {
    pairingCode = String(raw || "").trim()
    if (!pairingCode) {
      pairing = false
      return
    }
    Quickshell.execDetached(["xdg-open", configuredBaseUrl() + "/plugin/connect?pair=" + pairingCode])
    pollPairing()
    pairingPoll.start()
  }

  function pollPairing() {
    if (pairingRequest.running || !pairingCode) return
    pairingRequest.command = ["curl", "--silent", "--show-error", "--max-time", "5", configuredBaseUrl() + "/api/plugin/pair/status?pair=" + pairingCode]
    pairingRequest.running = true
  }

  function applyPairing(raw) {
    try {
      var parsed = JSON.parse(String(raw || "{}"))
      if (parsed.status === "authorized" && parsed.token) {
        pluginToken = String(parsed.token)
        pairing = false
        pairingPoll.stop()
        controller.show()
        refresh()
      }
    } catch (error) {
      // Keep polling without logging health or pairing responses.
    }
  }

  function applySnapshot(raw) {
    try {
      var parsed = JSON.parse(String(raw || "{}"))
      if (!parsed || typeof parsed !== "object") throw new Error("invalid-summary")
      if (parsed.error) {
        available = false
        if (parsed.error === "plugin-auth-expired") pluginToken = ""
        loading = false
        return
      }
      snapshot = parsed
      available = true
    } catch (error) {
      available = false
    }
    loading = false
  }

  function refresh() {
    if (!pluginToken || summaryRequest.running) return
    loading = true
    summaryRequest.command = ["curl", "--silent", "--show-error", "--max-time", "5", "-H", "Authorization: Bearer " + pluginToken, configuredBaseUrl() + "/api/plugin/health/summary"]
    summaryRequest.running = true
  }

  function open() {
    if (!pluginToken) {
      startPairing()
      return
    }
    controller.show()
    refresh()
    Qt.callLater(function() { if (opened) keyCatcher.forceActiveFocus() })
  }

  function close() {
    pairingPoll.stop()
    controller.hide()
  }

  function toggle() {
    if (opened) close()
    else open()
  }

  Process {
    id: pairingProcess
    command: ["openssl", "rand", "-hex", "24"]
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.beginPairing(text)
    }
    onExited: function(exitCode) { if (exitCode !== 0) root.pairing = false }
  }

  Process {
    id: pairingRequest
    stdout: StdioCollector { waitForEnd: true; onStreamFinished: root.applyPairing(text) }
  }

  Process {
    id: summaryRequest
    stdout: StdioCollector { waitForEnd: true; onStreamFinished: root.applySnapshot(text) }
    onExited: function(exitCode) { if (exitCode !== 0) root.loading = false }
  }

  Timer {
    id: pairingPoll
    interval: 4000
    repeat: true
    onTriggered: root.pollPairing()
  }

  Timer {
    interval: 60000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    centerOnBar: false
    contentWidth: panel.fittedContentWidth(Style.space(430))
    contentHeight: panel.fittedContentHeight(contentColumn.implicitHeight)
    focusTarget: keyCatcher

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }

      Flickable {
        anchors.fill: parent
        contentWidth: width
        contentHeight: contentColumn.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        interactive: contentHeight > height

        Column {
          id: contentColumn
          width: parent.width
          spacing: Style.space(14)

          Row {
            width: parent.width
            spacing: Style.space(10)

            Text {
              text: "SYSBODY"
              color: root.bar ? root.bar.foreground : Color.foreground
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.title
              font.bold: true
              font.letterSpacing: 1
            }
            Text {
              text: root.available ? "LIVE" : root.pairing ? "LOGIN" : "NOT CONNECTED"
              color: root.available ? Color.accent : Qt.darker(root.bar ? root.bar.foreground : Color.foreground, 1.5)
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.bodySmall
              anchors.baseline: parent.baseline
            }
          }

          Text {
            width: parent.width
            wrapMode: Text.WordWrap
            text: root.pairing ? "Complete Google login in the browser window. This panel will update automatically." : root.available ? "Signals from Google Health · synced " + String(root.snapshot.syncedAt || "").replace("T", " ").slice(0, 16) : root.pluginToken ? "Connected to Google Health, but the latest summary is unavailable." : "Click the bar item again to start Google login."
            color: Qt.darker(root.bar ? root.bar.foreground : Color.foreground, 1.35)
            font.family: root.bar ? root.bar.fontFamily : Style.font.family
            font.pixelSize: Style.font.bodySmall
          }

          GridLayout {
            width: parent.width
            columns: 2
            columnSpacing: Style.space(10)
            rowSpacing: Style.space(10)

            Repeater {
              model: [
                { label: "STEPS", value: root.metricText(root.snapshot.steps, 0), unit: "today" },
                { label: "RESTING HR", value: root.metricText(root.snapshot.restingHeartRate, 0), unit: "bpm" },
                { label: "HRV", value: root.metricText(root.snapshot.hrv, 0), unit: "ms" },
                { label: "SLEEP", value: root.metricText(root.snapshot.sleep, 1), unit: "hours" },
                { label: "ZONE MINUTES", value: root.metricText(root.snapshot.activeZoneMinutes, 0), unit: "min" },
                { label: "RECOVERY SIGNALS", value: root.recoveryText(), unit: "only" }
              ]

              Rectangle {
                required property var modelData
                Layout.fillWidth: true
                implicitHeight: Style.space(82)
                radius: Style.cornerRadius
                color: "transparent"
                border.color: root.bar ? root.bar.foreground : Color.foreground
                border.width: 1

                ColumnLayout {
                  anchors.fill: parent
                  anchors.margins: Style.space(10)
                  spacing: Style.space(4)
                  Text {
                    text: modelData.label
                    Layout.fillWidth: true
                    elide: Text.ElideRight
                    maximumLineCount: 1
                    color: Qt.darker(root.bar ? root.bar.foreground : Color.foreground, 1.45)
                    font.family: root.bar ? root.bar.fontFamily : Style.font.family
                    font.pixelSize: Style.font.bodySmall
                    font.letterSpacing: 0.8
                  }
                  RowLayout {
                    Layout.fillWidth: true
                    spacing: Style.space(5)
                    Text {
                      text: root.available ? modelData.value : "—"
                      Layout.fillWidth: true
                      elide: Text.ElideRight
                      maximumLineCount: 1
                      color: root.bar ? root.bar.foreground : Color.foreground
                      font.family: root.bar ? root.bar.fontFamily : Style.font.family
                      font.pixelSize: Style.font.title
                      font.bold: true
                    }
                    Text {
                      text: modelData.unit
                      Layout.alignment: Qt.AlignBottom
                      color: Qt.darker(root.bar ? root.bar.foreground : Color.foreground, 1.35)
                      font.family: root.bar ? root.bar.fontFamily : Style.font.family
                      font.pixelSize: Style.font.bodySmall
                    }
                  }
                }
              }
            }
          }

          Row {
            visible: root.available
            spacing: Style.space(18)
            Text {
              text: "SpO₂ " + root.metricText(root.snapshot.oxygenSaturation, 0) + "%"
              color: Qt.darker(root.bar ? root.bar.foreground : Color.foreground, 1.35)
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.bodySmall
            }
            Text {
              text: "RESP " + root.metricText(root.snapshot.respiratoryRate, 1) + " brpm"
              color: Qt.darker(root.bar ? root.bar.foreground : Color.foreground, 1.35)
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.bodySmall
            }
          }

          Text {
            visible: root.available && root.snapshot.source
            text: "SOURCE // " + String(root.snapshot.source).toUpperCase()
            color: Qt.darker(root.bar ? root.bar.foreground : Color.foreground, 1.5)
            font.family: root.bar ? root.bar.fontFamily : Style.font.family
            font.pixelSize: Style.font.bodySmall
            font.letterSpacing: 1
          }
        }
      }
    }
  }
}
