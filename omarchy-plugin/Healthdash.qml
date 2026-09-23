import QtQuick
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "healthdash.health"

  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool available: panelLoader.item ? panelLoader.item.available === true : false
  readonly property bool connected: panelLoader.item ? panelLoader.item.pluginToken !== "" : false
  readonly property bool pairing: panelLoader.item ? panelLoader.item.pairing === true : false
  readonly property var snapshot: panelLoader.item ? panelLoader.item.snapshot : ({})

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = content
    if ("hostWidget" in target) target.hostWidget = root
  }

  function open() {
    if (panelLoader.item && panelLoader.item.open) panelLoader.item.open()
  }

  function close() {
    if (panelLoader.item && panelLoader.item.close) panelLoader.item.close()
  }

  function togglePanel() {
    if (panelLoader.item && panelLoader.item.toggle) panelLoader.item.toggle()
  }

  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false

  function closeForPopoutSwitch() {
    if (panelLoader.item && panelLoader.item.closeForPopoutSwitch) panelLoader.item.closeForPopoutSwitch()
  }

  visible: true
  implicitWidth: content.implicitWidth + Style.space(16)
  implicitHeight: barSize

  onBarChanged: Qt.callLater(root.injectPanel)
  onSettingsChanged: Qt.callLater(root.injectPanel)

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      Qt.callLater(root.injectPanel)
    }
  }

  Row {
    id: content
    anchors.verticalCenter: parent.verticalCenter
    spacing: Style.space(6)

    Text {
      text: root.pairing ? "♥ …" : root.available ? "♥ " + String(Math.round(Number(root.snapshot.restingHeartRate?.value ?? 0))) : root.connected ? "♥ —" : "♥ +"
      color: root.bar ? root.bar.barForeground : Color.foreground
      font.family: root.bar ? root.bar.fontFamily : Style.font.family
      font.pixelSize: Style.font.caption
    }

    Text {
      text: root.pairing ? "Login" : root.available ? "· " + String(Math.round(Number(root.snapshot.steps?.value ?? 0))) : root.connected ? "Sync" : "Connect"
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
    onClicked: root.togglePanel()
    onEntered: if (root.bar) root.bar.showTooltip(root, "SYSBODY · open panel")
    onExited: if (root.bar) root.bar.hideTooltip(root)
  }
}
