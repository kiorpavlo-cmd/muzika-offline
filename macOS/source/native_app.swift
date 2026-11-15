import AppKit
import AVFoundation
import Foundation
import ShazamKit

private struct LibraryTrack {
    var path: String
    var file: String
    var artist: String
    var title: String
    var album: String
    var year: String
    var genre: String
    var status: String

    init(_ value: [String: Any]) {
        path = value["path"] as? String ?? ""
        file = value["file"] as? String ?? URL(fileURLWithPath: path).lastPathComponent
        artist = value["artist"] as? String ?? ""
        title = value["title"] as? String ?? ""
        album = value["album"] as? String ?? ""
        year = value["year"] as? String ?? ""
        genre = value["genre"] as? String ?? ""
        status = value["status"] as? String ?? ""
    }

    var dictionary: [String: Any] {
        ["path": path, "file": file, "artist": artist, "title": title, "album": album, "year": year, "genre": genre, "status": status]
    }
}

private struct BackendFailure: Error, LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

private enum ShazamRecognitionResult {
    case match(SHMatch)
    case noMatch
    case error(Error)
}

private final class ShazamMatchWaiter: NSObject, SHSessionDelegate {
    private var continuation: CheckedContinuation<ShazamRecognitionResult, Never>?

    init(_ continuation: CheckedContinuation<ShazamRecognitionResult, Never>) {
        self.continuation = continuation
    }

    func session(_ session: SHSession, didFind match: SHMatch) {
        finish(.match(match))
    }

    func session(_ session: SHSession, didNotFindMatchFor signature: SHSignature, error: Error?) {
        if let error { finish(.error(error)) } else { finish(.noMatch) }
    }

    private func finish(_ result: ShazamRecognitionResult) {
        continuation?.resume(returning: result)
        continuation = nil
    }
}

private func shazamNetworkError(_ message: String) -> NSError {
    NSError(domain: "AudioLibraryTagger.Shazam", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
}

final class AudioLibraryTaggerDelegate: NSObject, NSApplicationDelegate, NSTableViewDataSource, NSTableViewDelegate, AVAudioPlayerDelegate {
    private var window: NSWindow!
    private var backend: Process?
    private var inputPipe: Pipe?
    private var outputPipe: Pipe?
    private var audioPlayer: AVAudioPlayer?
    private var playingPath: String?
    private var playbackTimer: Timer?
    private var playbackVolume: Float = 0.8
    private var playbackRepeatsCurrentTrack = false
    private var chromaprintInstaller: Process?
    private var syncServerProcess: Process?
    private var syncServerOutputPipe: Pipe?
    private var syncServerOutputBuffer = Data()
    private let syncServerOutputQueue = DispatchQueue(label: "local.audiolibrarytagger.sync-output")
    private let lineQueue = DispatchQueue(label: "local.audiolibrarytagger.backend-output")
    private var pendingOutput = Data()

    private var rootStack: NSStackView!
    private var folderField: NSTextField!
    private var scanButton: NSButton!
    private var syncButton: NSButton!
    private var tableView: NSTableView!
    private var libraryTableScrollView: NSScrollView?
    private var countLabel: NSTextField!
    private var progressIndicator: NSProgressIndicator!
    private var progressLabel: NSTextField!
    private var statusLabel: NSTextField!
    private var artistField: NSTextField!
    private var titleField: NSTextField!
    private var albumField: NSTextField!
    private var yearField: NSTextField!
    private var genreField: NSTextField!
    private var selectedPathLabel: NSTextField!
    private var coverView: NSImageView!
    private var playButton: NSButton!
    private var searchButton: NSButton!
    private var writeButton: NSButton!
    private var autoButton: NSButton!
    private var airDropButton: NSButton!
    private var playerCoverView: NSImageView!
    private var playerTitleLabel: NSTextField!
    private var playerArtistLabel: NSTextField!
    private var playerElapsedLabel: NSTextField!
    private var playerDurationLabel: NSTextField!
    private var playerSeekSlider: NSSlider!
    private var playerVolumeSlider: NSSlider!
    private var playerToggleButton: NSButton!
    private var playerShuffleButton: NSButton!
    private var playerRepeatButton: NSButton!
    private var displayedPlayerCoverPath: String?
    private var shuffleEnabled = false
    private var seeking = false
    private var libraryRows: [LibraryTrack] = []
    private var selectedPath: String?
    private var currentCoverData: Data?
    private var currentCoverMime = "image/jpeg"
    private var acoustidKey = ""
    private var isBusy = false
    private var requestSequence = 0
    private var pendingBackend: [String: (Result<[String: Any], BackendFailure>) -> Void] = [:]
    private var activeSearchRequestID: String?
    private var searchGeneration = 0
    private var coverGeneration = 0
    private var currentCandidate: [String: Any]?
    private var candidateWindow: NSWindow?
    private var candidateTableView: NSTableView?
    private var candidateRows: [[String: Any]] = []
    private var candidateStatusLabel: NSTextField?
    private var candidateWriteButton: NSButton?
    private var candidateRetryButton: NSButton?
    private var syncWindow: NSWindow?
    private var syncStatusLabel: NSTextField?
    private var syncConnectionField: NSTextField?
    private var syncLogView: NSTextView?
    private var syncStartButton: NSButton?
    private var syncStopButton: NSButton?
    private var syncProfileButton: NSButton?
    private var syncEndpoints: [[String: Any]] = []
    private var activeSearchPath: String?
    private var keyboardMonitor: Any?
    private var didInitializeMainWindow = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard !didInitializeMainWindow else { return }
        didInitializeMainWindow = true
        installApplicationMenu()
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1240, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "iPod"
        window.minSize = NSSize(width: 900, height: 620)
        window.collectionBehavior = [.fullScreenPrimary]
        buildNativeInterface()
        installKeyboardShortcuts()
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        window.displayIfNeeded()

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.installBundledAcoustIDKeyIfNeeded()
            self.startBackend()
            self.requestBackend("settings") { [weak self] result in
                guard let self, case .success(let settings) = result else {
                    if case .failure(let error) = result { self?.setStatus(error.message, color: .systemRed) }
                    return
                }
                self.folderField.stringValue = settings["folder"] as? String ?? ""
                self.acoustidKey = settings["api_key"] as? String ?? ""
                self.restoreCache(announce: true)
                self.startSyncServer()
            }
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if let window {
            if !window.isVisible { window.makeKeyAndOrderFront(nil) }
            NSApp.activate(ignoringOtherApps: true)
        }
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    private func buildNativeInterface() {
        let content = NSView()
        content.translatesAutoresizingMaskIntoConstraints = false
        window.contentView = content

        rootStack = NSStackView()
        rootStack.orientation = .vertical
        rootStack.alignment = .leading
        rootStack.distribution = .fill
        rootStack.spacing = 12
        rootStack.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(rootStack)
        NSLayoutConstraint.activate([
            rootStack.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 18),
            rootStack.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -18),
            rootStack.topAnchor.constraint(equalTo: content.topAnchor, constant: 16),
            rootStack.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -16)
        ])

        rootStack.addArrangedSubview(buildPlayerPanel())
        rootStack.addArrangedSubview(buildLibraryToolbar())
        rootStack.addArrangedSubview(buildMainSplitView())
        rootStack.arrangedSubviews.forEach { $0.widthAnchor.constraint(equalTo: rootStack.widthAnchor).isActive = true }
        rootStack.arrangedSubviews[0].setContentHuggingPriority(.defaultHigh, for: .vertical)
        rootStack.arrangedSubviews[1].setContentHuggingPriority(.defaultHigh, for: .vertical)
        rootStack.arrangedSubviews[2].setContentHuggingPriority(.defaultLow, for: .vertical)
    }

    private func buildPlayerPanel() -> NSView {
        let panel = NSBox()
        panel.boxType = .custom
        panel.borderType = .lineBorder
        panel.borderColor = .separatorColor
        panel.fillColor = .controlBackgroundColor
        panel.cornerRadius = 14

        let controls = horizontalStack(spacing: 5)
        playerShuffleButton = controlButton("⇄", action: #selector(toggleShuffle))
        playerShuffleButton.toolTip = "Случайное воспроизведение"
        let previousButton = controlButton("|◀", action: #selector(playPrevious))
        playerToggleButton = controlButton("▶", action: #selector(toggleHeaderPlayback))
        playerToggleButton.font = .systemFont(ofSize: 18, weight: .semibold)
        let nextButton = controlButton("▶|", action: #selector(playNext))
        playerRepeatButton = controlButton("↻", action: #selector(toggleRepeat))
        playerRepeatButton.toolTip = "Повтор текущего трека"
        [playerShuffleButton!, previousButton, playerToggleButton!, nextButton, playerRepeatButton!].forEach(controls.addArrangedSubview)

        playerCoverView = NSImageView()
        playerCoverView.image = NSImage(systemSymbolName: "music.note", accessibilityDescription: "Обложка")
        playerCoverView.contentTintColor = .secondaryLabelColor
        playerCoverView.imageScaling = .scaleProportionallyUpOrDown
        playerCoverView.wantsLayer = true
        playerCoverView.layer?.cornerRadius = 9
        playerCoverView.layer?.backgroundColor = NSColor.quaternaryLabelColor.cgColor
        playerCoverView.widthAnchor.constraint(equalToConstant: 46).isActive = true
        playerCoverView.heightAnchor.constraint(equalToConstant: 46).isActive = true

        playerTitleLabel = makeLabel("Выберите песню", size: 14, weight: .semibold, color: .labelColor)
        playerArtistLabel = makeLabel("Плеер готов", size: 12, weight: .regular, color: .secondaryLabelColor)
        let metadata = verticalStack(spacing: 3)
        metadata.addArrangedSubview(playerTitleLabel)
        metadata.addArrangedSubview(playerArtistLabel)
        metadata.widthAnchor.constraint(greaterThanOrEqualToConstant: 180).isActive = true

        let queueButton = controlButton("☷", action: #selector(scrollToCurrentTrack))
        queueButton.toolTip = "Показать текущий трек в списке"
        let volumeIcon = makeLabel("◖))", size: 15, weight: .medium, color: .secondaryLabelColor)
        playerVolumeSlider = NSSlider(value: 80, minValue: 0, maxValue: 100, target: self, action: #selector(volumeChanged(_:)))
        playerVolumeSlider.widthAnchor.constraint(equalToConstant: 110).isActive = true
        let volumeControls = horizontalStack(spacing: 7)
        volumeControls.addArrangedSubview(queueButton)
        volumeControls.addArrangedSubview(volumeIcon)
        volumeControls.addArrangedSubview(playerVolumeSlider)

        let mainRow = horizontalStack(spacing: 14)
        mainRow.addArrangedSubview(controls)
        mainRow.addArrangedSubview(playerCoverView)
        mainRow.addArrangedSubview(metadata)
        mainRow.addArrangedSubview(NSView())
        mainRow.addArrangedSubview(volumeControls)
        mainRow.heightAnchor.constraint(equalToConstant: 48).isActive = true

        playerElapsedLabel = makeLabel("0:00", size: 10, weight: .regular, color: .secondaryLabelColor)
        playerDurationLabel = makeLabel("0:00", size: 10, weight: .regular, color: .secondaryLabelColor)
        playerSeekSlider = NSSlider(value: 0, minValue: 0, maxValue: 1000, target: self, action: #selector(playerSeekChanged(_:)))
        playerSeekSlider.isContinuous = false
        let timeline = horizontalStack(spacing: 8)
        timeline.addArrangedSubview(playerElapsedLabel)
        timeline.addArrangedSubview(playerSeekSlider)
        timeline.addArrangedSubview(playerDurationLabel)

        let contents = verticalStack(spacing: 8)
        contents.edgeInsets = NSEdgeInsets(top: 9, left: 14, bottom: 8, right: 14)
        contents.addArrangedSubview(mainRow)
        contents.addArrangedSubview(timeline)
        panel.contentView = contents
        panel.heightAnchor.constraint(equalToConstant: 92).isActive = true
        return panel
    }

    private func buildLibraryToolbar() -> NSView {
        let panel = NSBox()
        panel.boxType = .custom
        panel.borderType = .lineBorder
        panel.borderColor = .separatorColor
        panel.fillColor = .controlBackgroundColor
        panel.cornerRadius = 12

        let label = makeLabel("Медиатека", size: 13, weight: .semibold, color: .labelColor)
        folderField = NSTextField(string: "")
        folderField.placeholderString = "Выберите папку с музыкой через меню Файл или ⌘O"
        folderField.target = self
        folderField.action = #selector(folderPathEntered)
        folderField.setContentHuggingPriority(.defaultLow, for: .horizontal)
        folderField.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        scanButton = NSButton(title: "Сканировать", target: self, action: #selector(scanLibrary(_:)))
        scanButton.bezelStyle = .rounded
        syncButton = NSButton(title: "Синхронизация", target: self, action: #selector(openSyncWindow))
        syncButton.bezelStyle = .rounded
        airDropButton = NSButton(title: "AirDrop выбранных", target: self, action: #selector(sendSelectedTracksViaAirDrop))
        airDropButton.bezelStyle = .rounded
        airDropButton.isEnabled = false
        let row = horizontalStack(spacing: 9)
        row.edgeInsets = NSEdgeInsets(top: 11, left: 13, bottom: 11, right: 13)
        row.addArrangedSubview(label)
        row.addArrangedSubview(folderField)
        row.addArrangedSubview(scanButton)
        row.addArrangedSubview(syncButton)
        row.addArrangedSubview(airDropButton)
        panel.contentView = row
        return panel
    }

    private func buildMainSplitView() -> NSView {
        let split = NSSplitView()
        split.isVertical = true
        split.dividerStyle = .thin
        split.translatesAutoresizingMaskIntoConstraints = false

        let listPane = NSView()
        listPane.translatesAutoresizingMaskIntoConstraints = false
        let listStack = verticalStack(spacing: 8)
        listStack.translatesAutoresizingMaskIntoConstraints = false
        listPane.addSubview(listStack)
        NSLayoutConstraint.activate([
            listStack.leadingAnchor.constraint(equalTo: listPane.leadingAnchor, constant: 12),
            listStack.trailingAnchor.constraint(equalTo: listPane.trailingAnchor, constant: -12),
            listStack.topAnchor.constraint(equalTo: listPane.topAnchor, constant: 10),
            listStack.bottomAnchor.constraint(equalTo: listPane.bottomAnchor, constant: -10)
        ])

        let listHeader = horizontalStack(spacing: 10)
        let listTitle = makeLabel("Файлы медиатеки", size: 16, weight: .semibold, color: .labelColor)
        countLabel = makeLabel("Папка не сканировалась", size: 12, weight: .regular, color: .secondaryLabelColor)
        progressLabel = makeLabel("", size: 11, weight: .regular, color: .secondaryLabelColor)
        progressLabel.alignment = .right
        progressIndicator = NSProgressIndicator()
        progressIndicator.style = .bar
        progressIndicator.isIndeterminate = false
        progressIndicator.minValue = 0
        progressIndicator.maxValue = 100
        progressIndicator.doubleValue = 0
        progressIndicator.widthAnchor.constraint(equalToConstant: 180).isActive = true
        listHeader.addArrangedSubview(listTitle)
        listHeader.addArrangedSubview(NSView())
        listHeader.addArrangedSubview(progressLabel)
        listHeader.addArrangedSubview(progressIndicator)
        listHeader.addArrangedSubview(countLabel)

        tableView = NSTableView()
        tableView.delegate = self
        tableView.dataSource = self
        tableView.usesAlternatingRowBackgroundColors = true
        tableView.allowsMultipleSelection = true
        tableView.rowHeight = 34
        tableView.gridColor = .separatorColor
        let columns = [
            ("file", "Файл", 190.0), ("artist", "Исполнитель", 140.0), ("title", "Название", 150.0),
            ("album", "Альбом", 145.0), ("year", "Год", 58.0), ("genre", "Жанр", 100.0)
        ]
        for (identifier, title, width) in columns {
            let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier(identifier))
            column.title = title
            column.width = width
            column.minWidth = identifier == "year" ? 50 : 80
            column.resizingMask = .userResizingMask
            tableView.addTableColumn(column)
        }
        let tableScroll = NSScrollView()
        libraryTableScrollView = tableScroll
        tableView.autoresizingMask = [.width]
        tableView.frame = NSRect(
            origin: .zero,
            size: NSSize(width: tableView.tableColumns.reduce(CGFloat.zero) { $0 + $1.width }, height: 600)
        )
        tableScroll.documentView = tableView
        tableScroll.hasVerticalScroller = true
        tableScroll.hasHorizontalScroller = true
        tableScroll.borderType = .bezelBorder
        tableScroll.setContentHuggingPriority(.defaultLow, for: .vertical)

        listStack.addArrangedSubview(listHeader)
        listStack.addArrangedSubview(tableScroll)
        tableScroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 280).isActive = true
        resizeLibraryTable()

        let inspectorPane = NSScrollView()
        inspectorPane.hasVerticalScroller = true
        inspectorPane.borderType = .bezelBorder
        let inspectorStack = verticalStack(spacing: 10)
        inspectorStack.edgeInsets = NSEdgeInsets(top: 14, left: 14, bottom: 14, right: 14)
        inspectorStack.widthAnchor.constraint(equalToConstant: 280).isActive = true
        inspectorStack.addArrangedSubview(makeLabel("Теги выбранного файла", size: 16, weight: .semibold, color: .labelColor))
        selectedPathLabel = makeLabel("Выберите трек в списке, чтобы проверить и изменить его данные.", size: 11, weight: .regular, color: .secondaryLabelColor)
        selectedPathLabel.maximumNumberOfLines = 3
        selectedPathLabel.lineBreakMode = .byTruncatingMiddle
        inspectorStack.addArrangedSubview(selectedPathLabel)

        artistField = makeInspectorField("ИСПОЛНИТЕЛЬ")
        titleField = makeInspectorField("НАЗВАНИЕ")
        albumField = makeInspectorField("АЛЬБОМ")
        yearField = makeInspectorField("ГОД")
        genreField = makeInspectorField("ЖАНР")
        for (caption, field) in [("ИСПОЛНИТЕЛЬ", artistField!), ("НАЗВАНИЕ", titleField!), ("АЛЬБОМ", albumField!), ("ГОД", yearField!), ("ЖАНР", genreField!)] {
            inspectorStack.addArrangedSubview(fieldSection(caption, field: field))
        }

        coverView = NSImageView()
        coverView.image = NSImage(systemSymbolName: "music.note", accessibilityDescription: "Обложка альбома")
        coverView.contentTintColor = .tertiaryLabelColor
        coverView.imageScaling = .scaleProportionallyUpOrDown
        coverView.wantsLayer = true
        coverView.layer?.cornerRadius = 10
        coverView.layer?.backgroundColor = NSColor.quaternaryLabelColor.cgColor
        coverView.widthAnchor.constraint(equalToConstant: 170).isActive = true
        coverView.heightAnchor.constraint(equalToConstant: 170).isActive = true
        inspectorStack.addArrangedSubview(coverView)
        coverView.alignment = .center

        playButton = NSButton(title: "▶ Воспроизвести · Пробел", target: self, action: #selector(playSelected))
        searchButton = NSButton(title: "Найти совпадение", target: self, action: #selector(searchSelected))
        writeButton = NSButton(title: "Записать теги", target: self, action: #selector(writeTags))
        autoButton = NSButton(title: "Автообработка папки", target: self, action: #selector(autoProcess))
        writeButton.bezelStyle = .rounded
        autoButton.bezelStyle = .rounded
        let actions = verticalStack(spacing: 7)
        actions.alignment = .width
        [playButton!, searchButton!, writeButton!, autoButton!].forEach { button in
            actions.addArrangedSubview(button)
        }
        writeButton.setButtonType(.momentaryPushIn)
        writeButton.contentTintColor = .controlAccentColor
        inspectorStack.addArrangedSubview(actions)
        actions.widthAnchor.constraint(equalTo: inspectorStack.widthAnchor, constant: -28).isActive = true
        statusLabel = makeLabel("", size: 11, weight: .regular, color: .secondaryLabelColor)
        statusLabel.maximumNumberOfLines = 4
        statusLabel.lineBreakMode = .byWordWrapping
        inspectorStack.addArrangedSubview(statusLabel)
        let inspectorFit = inspectorStack.fittingSize
        inspectorStack.frame = NSRect(
            origin: .zero,
            size: NSSize(width: 280, height: max(600, inspectorFit.height))
        )
        inspectorPane.documentView = inspectorStack

        split.addArrangedSubview(listPane)
        split.addArrangedSubview(inspectorPane)
        split.setHoldingPriority(.defaultHigh, forSubviewAt: 0)
        listPane.widthAnchor.constraint(greaterThanOrEqualToConstant: 540).isActive = true
        inspectorPane.widthAnchor.constraint(greaterThanOrEqualToConstant: 270).isActive = true
        return split
    }

    private func makeInspectorField(_ title: String) -> NSTextField {
        let field = NSTextField(string: "")
        field.isEnabled = false
        field.target = self
        field.action = #selector(inspectorFieldChanged(_:))
        field.placeholderString = title.capitalized
        field.tag = title == "ИСПОЛНИТЕЛЬ" ? 0 : title == "НАЗВАНИЕ" ? 1 : title == "АЛЬБОМ" ? 2 : title == "ГОД" ? 3 : 4
        return field
    }

    private func fieldSection(_ title: String, field: NSTextField) -> NSView {
        let stack = verticalStack(spacing: 4)
        stack.addArrangedSubview(makeLabel(title, size: 10, weight: .semibold, color: .secondaryLabelColor))
        stack.addArrangedSubview(field)
        stack.widthAnchor.constraint(equalToConstant: 250).isActive = true
        field.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        return stack
    }

    private func horizontalStack(spacing: CGFloat) -> NSStackView {
        let stack = NSStackView()
        stack.orientation = .horizontal
        stack.alignment = .centerY
        stack.distribution = .fill
        stack.spacing = spacing
        return stack
    }

    private func verticalStack(spacing: CGFloat) -> NSStackView {
        let stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.distribution = .fill
        stack.spacing = spacing
        return stack
    }

    private func makeLabel(_ text: String, size: CGFloat, weight: NSFont.Weight, color: NSColor) -> NSTextField {
        let label = NSTextField(labelWithString: text)
        label.font = .systemFont(ofSize: size, weight: weight)
        label.textColor = color
        label.lineBreakMode = .byTruncatingTail
        return label
    }

    private func controlButton(_ title: String, action: Selector) -> NSButton {
        let button = NSButton(title: title, target: self, action: action)
        button.bezelStyle = .texturedRounded
        button.setContentHuggingPriority(.required, for: .horizontal)
        return button
    }

    private func installBundledAcoustIDKeyIfNeeded() {
        guard let clientKey = Bundle.main.object(forInfoDictionaryKey: "AcoustIDClientKey") as? String,
              !clientKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              let supportDirectory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return
        }

        let settingsURL = supportDirectory
            .appendingPathComponent("Audio Library Tagger", isDirectory: true)
            .appendingPathComponent("settings.json")
        var settings: [String: Any] = [:]
        if let data = try? Data(contentsOf: settingsURL),
           let saved = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            settings = saved
        }
        if let existingKey = settings["acoustid_key"] as? String,
           !existingKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return
        }

        settings["acoustid_key"] = clientKey
        do {
            try FileManager.default.createDirectory(
                at: settingsURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            let data = try JSONSerialization.data(withJSONObject: settings, options: [.prettyPrinted, .sortedKeys])
            try data.write(to: settingsURL, options: .atomic)
        } catch {
            NSLog("Could not save the bundled AcoustID client key: %@", error.localizedDescription)
        }
    }

    private func installApplicationMenu() {
        let menuBar = NSMenu()
        let applicationMenuItem = NSMenuItem()
        let applicationMenu = NSMenu(title: "iPod")
        let quitItem = NSMenuItem(
            title: "Quit iPod",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        )
        quitItem.target = NSApp
        quitItem.keyEquivalentModifierMask = [.command]
        applicationMenu.addItem(quitItem)
        applicationMenuItem.submenu = applicationMenu
        menuBar.addItem(applicationMenuItem)

        let fileMenuItem = NSMenuItem()
        let fileMenu = NSMenu(title: "Файл")
        let openFolderItem = NSMenuItem(
            title: "Выбрать папку…",
            action: #selector(openFolderFromMenu(_:)),
            keyEquivalent: "o"
        )
        openFolderItem.target = self
        openFolderItem.keyEquivalentModifierMask = [.command]
        fileMenu.addItem(openFolderItem)
        fileMenuItem.submenu = fileMenu
        menuBar.addItem(fileMenuItem)

        let windowMenuItem = NSMenuItem()
        let windowMenu = NSMenu(title: "Окно")
        let fullScreenItem = NSMenuItem(
            title: "На весь экран",
            action: #selector(NSWindow.toggleFullScreen(_:)),
            keyEquivalent: "f"
        )
        fullScreenItem.target = window
        fullScreenItem.keyEquivalentModifierMask = [.control, .command]
        windowMenu.addItem(fullScreenItem)
        windowMenuItem.submenu = windowMenu
        menuBar.addItem(windowMenuItem)

        NSApp.mainMenu = menuBar
    }

    @objc private func openFolderFromMenu(_ sender: NSMenuItem) {
        chooseFolder()
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let keyboardMonitor { NSEvent.removeMonitor(keyboardMonitor) }
        playbackTimer?.invalidate()
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        backend?.terminate()
        syncServerOutputPipe?.fileHandleForReading.readabilityHandler = nil
        syncServerProcess?.terminationHandler = nil
        if syncServerProcess?.isRunning == true { syncServerProcess?.terminate() }
    }

    @discardableResult
    private func requestBackend(
        _ action: String,
        payload: [String: Any] = [:],
        completion: @escaping (Result<[String: Any], BackendFailure>) -> Void
    ) -> String {
        requestSequence += 1
        let requestID = String(requestSequence)
        guard let backend, backend.isRunning, let inputPipe else {
            completion(.failure(BackendFailure(message: "Модуль обработки не запущен. Перезапустите iPod.")))
            return requestID
        }
        var request: [String: Any] = ["id": requestID, "action": action]
        payload.forEach { request[$0.key] = $0.value }
        guard let data = try? JSONSerialization.data(withJSONObject: request, options: [.fragmentsAllowed]) else {
            completion(.failure(BackendFailure(message: "Не удалось подготовить запрос к модулю обработки.")))
            return requestID
        }
        pendingBackend[requestID] = completion
        inputPipe.fileHandleForWriting.write(data)
        inputPipe.fileHandleForWriting.write(Data([0x0A]))
        return requestID
    }

    private func handleBackendMessage(_ message: [String: Any]) {
        guard let event = message["event"] as? String else { return }
        let requestID = String(describing: message["id"] ?? "")
        if event == "progress" {
            if requestID == activeSearchRequestID, let data = message["data"] as? [String: Any], data["phase"] as? String == "search" {
                setStatus(data["message"] as? String ?? "Поиск выполняется…", color: .controlAccentColor)
                return
            }
            handleProgress(message["data"] as? [String: Any] ?? [:])
            return
        }
        guard let completion = pendingBackend.removeValue(forKey: requestID) else { return }
        if event == "error" {
            completion(.failure(BackendFailure(message: message["error"] as? String ?? "Ошибка модуля обработки.")))
        } else {
            completion(.success(message["result"] as? [String: Any] ?? [:]))
        }
    }

    private func handleProgress(_ data: [String: Any]) {
        let phase = data["phase"] as? String ?? ""
        if phase == "discover" {
            progressIndicator.isIndeterminate = true
            progressIndicator.startAnimation(nil)
            progressLabel.stringValue = "Найдено: \(data["found"] as? Int ?? 0)"
            setStatus("Ищу аудиофайлы…", color: .controlAccentColor)
            return
        }
        if phase == "read" {
            let total = data["total"] as? Int ?? 0
            let index = data["index"] as? Int ?? 0
            progressIndicator.isIndeterminate = false
            progressIndicator.doubleValue = total > 0 ? Double(index) / Double(total) * 100 : 0
            progressLabel.stringValue = total > 0 ? "\(index) / \(total)" : "0 файлов"
            let file = data["file"] as? String ?? ""
            setStatus(total > 0 ? "Читаю теги: \(index) из \(total) · \(file)" : "Аудиофайлы не найдены.", color: .controlAccentColor)
            return
        }
        if let total = data["total"] as? Int, total > 0 {
            let index = data["index"] as? Int ?? 0
            progressIndicator.isIndeterminate = false
            progressIndicator.doubleValue = Double(index) / Double(total) * 100
            progressLabel.stringValue = "\(index) / \(total)"
            let updated = data["updated"] as? Int ?? 0
            let skipped = data["skipped"] as? Int ?? 0
            let errors = data["errors"] as? Int ?? 0
            setStatus("Обработка \(index)/\(total) · записано: \(updated) · пропущено: \(skipped) · ошибок: \(errors)", color: .controlAccentColor)
        }
        if let path = data["path"] as? String {
            updateTrack(path: path, status: data["status"] as? String ?? "", values: data["values"] as? [String: Any], newPath: data["new_path"] as? String)
        }
    }

    private func setStatus(_ text: String, color: NSColor = .secondaryLabelColor) {
        statusLabel?.stringValue = text
        statusLabel?.textColor = color
    }

    private func setBusy(_ busy: Bool) {
        isBusy = busy
        scanButton?.isEnabled = !busy
        airDropButton?.isEnabled = !busy && (tableView?.selectedRowIndexes.isEmpty == false)
        searchButton?.isEnabled = !busy && selectedPath != nil
        writeButton?.isEnabled = !busy && selectedPath != nil
        playButton?.isEnabled = !busy && selectedPath != nil
        autoButton?.isEnabled = !busy && !libraryRows.isEmpty
        tableView?.isEnabled = !busy || activeSearchPath != nil
    }

    private func updateCount() {
        let selectedCount = tableView?.selectedRowIndexes.count ?? 0
        countLabel?.stringValue = "\(libraryRows.count) файлов\(selectedCount > 0 ? " · выбрано: \(selectedCount)" : "")"
        airDropButton?.isEnabled = selectedCount > 0 && !isBusy
    }

    @objc private func sendSelectedTracksViaAirDrop() {
        let selectedRows = tableView.selectedRowIndexes.filter { libraryRows.indices.contains($0) }
        let files = selectedRows.map { URL(fileURLWithPath: libraryRows[$0].path) }
        guard !files.isEmpty else {
            setStatus("Выберите песни для передачи через AirDrop.")
            return
        }
        guard let sharingService = NSSharingService(named: .sendViaAirDrop) else {
            showError("На этом Mac недоступен AirDrop. Включите AirDrop и Wi‑Fi.")
            return
        }
        sharingService.perform(withItems: files)
        setStatus("Выберите iPhone в окне AirDrop. На iPhone импортируйте полученные файлы через «Медиатека → Добавить музыку».")
    }

    private func resizeLibraryTable() {
        guard let libraryTableScrollView else { return }
        let columnWidth = tableView.tableColumns.reduce(CGFloat.zero) { $0 + $1.width }
        let viewport = libraryTableScrollView.contentView.bounds.size
        let contentHeight = max(viewport.height, max(600, CGFloat(libraryRows.count) * tableView.rowHeight))
        let contentWidth = max(viewport.width, columnWidth)
        tableView.frame = NSRect(origin: .zero, size: NSSize(width: contentWidth, height: contentHeight))
    }

    private func reloadLibraryTable() {
        tableView.reloadData()
        resizeLibraryTable()
    }

    func numberOfRows(in tableView: NSTableView) -> Int {
        tableView === candidateTableView ? candidateRows.count : libraryRows.count
    }

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard let tableColumn else { return nil }
        let value: String
        if tableView === candidateTableView {
            guard candidateRows.indices.contains(row) else { return nil }
            let candidate = candidateRows[row]
            switch tableColumn.identifier.rawValue {
            case "title": value = candidate["title"] as? String ?? "Без названия"
            case "artist": value = candidate["artist"] as? String ?? "Неизвестный исполнитель"
            case "album": value = candidate["album"] as? String ?? ""
            case "year": value = candidate["year"] as? String ?? ""
            case "source": value = candidate["source"] as? String ?? ""
            default: value = "\(candidateConfidencePercent(candidate))%"
            }
        } else {
            guard libraryRows.indices.contains(row) else { return nil }
            let track = libraryRows[row]
            switch tableColumn.identifier.rawValue {
            case "file": value = track.file
            case "artist": value = track.artist
            case "title": value = track.title
            case "album": value = track.album
            case "year": value = track.year
            case "genre": value = track.genre
            default: value = track.status
            }
        }
        let cell = NSTableCellView()
        let text = NSTextField(labelWithString: value)
        text.lineBreakMode = .byTruncatingTail
        text.font = .systemFont(ofSize: 12)
        text.textColor = .controlTextColor
        text.translatesAutoresizingMaskIntoConstraints = false
        cell.addSubview(text)
        cell.textField = text
        NSLayoutConstraint.activate([
            text.leadingAnchor.constraint(equalTo: cell.leadingAnchor, constant: 7),
            text.trailingAnchor.constraint(equalTo: cell.trailingAnchor, constant: -7),
            text.centerYAnchor.constraint(equalTo: cell.centerYAnchor)
        ])
        return cell
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        if let candidateTableView, notification.object as? NSTableView === candidateTableView {
            updateCandidateSelection()
            return
        }
        guard notification.object as? NSTableView === tableView else { return }
        updateCount()
        guard tableView.selectedRow >= 0, libraryRows.indices.contains(tableView.selectedRow) else {
            selectedPath = nil
            setInspectorEnabled(false)
            return
        }
        let track = libraryRows[tableView.selectedRow]
        if selectedPath != track.path { cancelSearchForSelectionChange() }
        selectedPath = track.path
        selectedPathLabel.stringValue = track.path
        artistField.stringValue = track.artist
        titleField.stringValue = track.title
        albumField.stringValue = track.album
        yearField.stringValue = track.year
        genreField.stringValue = track.genre
        currentCandidate = nil
        currentCoverData = nil
        currentCoverMime = "image/jpeg"
        coverView.image = NSImage(systemSymbolName: "music.note", accessibilityDescription: "Обложка альбома")
        setInspectorEnabled(true)
        coverGeneration += 1
        loadEmbeddedCover(path: track.path, generation: coverGeneration)
    }

    private func setInspectorEnabled(_ enabled: Bool) {
        [artistField, titleField, albumField, yearField, genreField].forEach { $0?.isEnabled = enabled && !isBusy }
        searchButton?.isEnabled = enabled && !isBusy
        writeButton?.isEnabled = enabled && !isBusy
        playButton?.isEnabled = enabled && !isBusy
        if enabled, let selectedPath {
            playButton?.title = playingPath == selectedPath && audioPlayer?.isPlaying == true ? "⏸ Пауза · Пробел" : "▶ Воспроизвести · Пробел"
        }
    }

    private func cancelSearchForSelectionChange() {
        let wasSearching = activeSearchPath != nil
        searchGeneration += 1
        activeSearchPath = nil
        if let requestID = activeSearchRequestID {
            requestBackend("cancel_search", payload: ["target_id": requestID]) { _ in }
            activeSearchRequestID = nil
        }
        if wasSearching {
            searchButton?.title = "Найти совпадение"
            setBusy(false)
            setStatus("Поиск остановлен: выбран другой трек.")
        }
    }

    private func updateTrack(path: String, status: String, values: [String: Any]?, newPath: String?) {
        guard let index = libraryRows.firstIndex(where: { $0.path == path }) else { return }
        libraryRows[index].status = status
        if let values {
            libraryRows[index].artist = values["artist"] as? String ?? libraryRows[index].artist
            libraryRows[index].title = values["title"] as? String ?? libraryRows[index].title
            libraryRows[index].album = values["album"] as? String ?? libraryRows[index].album
            libraryRows[index].year = values["year"] as? String ?? libraryRows[index].year
            libraryRows[index].genre = values["genre"] as? String ?? libraryRows[index].genre
        }
        if let newPath, !newPath.isEmpty, newPath != path {
            libraryRows[index].path = newPath
            libraryRows[index].file = URL(fileURLWithPath: newPath).lastPathComponent
            if selectedPath == path { selectedPath = newPath; selectedPathLabel.stringValue = newPath }
            if playingPath == path { playingPath = newPath }
        }
        reloadLibraryTable()
        if let selectedPath, let current = libraryRows.first(where: { $0.path == selectedPath }) {
            artistField.stringValue = current.artist
            titleField.stringValue = current.title
            albumField.stringValue = current.album
            yearField.stringValue = current.year
            genreField.stringValue = current.genre
        }
    }

    private func restoreCache(announce: Bool) {
        let folder = folderField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !folder.isEmpty else { return }
        requestBackend("load_cache", payload: ["folder": folder]) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let value):
                self.libraryRows = (value["rows"] as? [[String: Any]] ?? []).map(LibraryTrack.init)
                self.reloadLibraryTable()
                self.progressIndicator.doubleValue = self.libraryRows.isEmpty ? 0 : 100
                self.progressLabel.stringValue = self.libraryRows.isEmpty ? "" : "\(self.libraryRows.count) файлов"
                self.updateCount()
                if announce {
                    self.setStatus((value["found"] as? Bool == true) ? "Восстановлен сохранённый список. Нажмите «Сканировать», чтобы обновить." : "Для этой папки сохранённого списка нет. Нажмите «Сканировать».")
                }
                if value["found"] as? Bool != true {
                    self.libraryRows = []
                    self.selectedPath = nil
                    self.tableView.deselectAll(nil)
                    self.reloadLibraryTable()
                    self.updateCount()
                }
            case .failure(let error): if announce { self.setStatus(error.message, color: .systemRed) }
            }
        }
    }

    private func scanLibrary() {
        let folder = folderField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !folder.isEmpty else { setStatus("Сначала выберите папку с музыкой.", color: .systemRed); return }
        setBusy(true)
        progressIndicator.isIndeterminate = true
        progressIndicator.startAnimation(nil)
        progressLabel.stringValue = "Подсчёт файлов…"
        setStatus("Ищу аудиофайлы…", color: .controlAccentColor)
        requestBackend("scan", payload: ["folder": folder]) { [weak self] result in
            guard let self else { return }
            self.progressIndicator.stopAnimation(nil)
            self.progressIndicator.isIndeterminate = false
            switch result {
            case .success(let value):
                self.libraryRows = (value["rows"] as? [[String: Any]] ?? []).map(LibraryTrack.init)
                self.selectedPath = nil
                self.tableView.deselectAll(nil)
                self.reloadLibraryTable()
                self.progressIndicator.doubleValue = self.libraryRows.isEmpty ? 0 : 100
                self.progressLabel.stringValue = "\(self.libraryRows.count) файлов"
                self.updateCount()
                if value["cache_saved"] as? Bool == false {
                    self.setStatus("Сканирование завершено: \(self.libraryRows.count) файлов. Кэш не сохранён: \(value["cache_error"] as? String ?? "ошибка записи")", color: .systemOrange)
                } else {
                    self.setStatus("Сканирование завершено. Найдено файлов: \(self.libraryRows.count).", color: .systemGreen)
                }
            case .failure(let error): self.setStatus(error.message, color: .systemRed)
            }
            self.setBusy(false)
            self.autoButton.isEnabled = !self.libraryRows.isEmpty
        }
    }

    private func saveLibraryCache(completion: ((BackendFailure?) -> Void)? = nil) {
        let folder = folderField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        requestBackend("save_cache", payload: ["folder": folder, "rows": libraryRows.map(\.dictionary)]) { result in
            switch result { case .success: completion?(nil); case .failure(let error): completion?(error) }
        }
    }

    @objc private func scanLibrary(_ sender: Any?) { scanLibrary() }

    @objc private func folderPathEntered() {
        let folder = folderField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        folderField.stringValue = folder
        requestBackend("save_settings", payload: ["folder": folder, "api_key": acoustidKey]) { [weak self] _ in
            guard let self else { return }
            self.libraryRows = []
            self.reloadLibraryTable()
            self.tableView.deselectAll(nil)
            self.selectedPath = nil
            self.setInspectorEnabled(false)
            self.restoreCache(announce: true)
        }
    }

    private func installKeyboardShortcuts() {
        keyboardMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard let self else { return event }
            let responder = self.window.firstResponder
            let editingText = responder is NSTextField || (responder as? NSTextView)?.isFieldEditor == true
            if !editingText, !(responder is NSButton), self.window.attachedSheet == nil,
               event.modifierFlags.intersection(.deviceIndependentFlagsMask).contains(.command),
               event.keyCode == 0, !self.libraryRows.isEmpty {
                self.selectAllTracks()
                return nil
            }
            if !editingText, !(responder is NSButton), self.window.attachedSheet == nil,
               event.keyCode == 49, !event.isARepeat, self.selectedPath != nil {
                self.toggleHeaderPlayback()
                return nil
            }
            return event
        }
    }

    @objc private func inspectorFieldChanged(_ sender: NSTextField) {
        guard let selectedPath, let index = libraryRows.firstIndex(where: { $0.path == selectedPath }) else { return }
        switch sender.tag {
        case 0: libraryRows[index].artist = sender.stringValue
        case 1: libraryRows[index].title = sender.stringValue
        case 2: libraryRows[index].album = sender.stringValue
        case 3: libraryRows[index].year = sender.stringValue
        default: libraryRows[index].genre = sender.stringValue
        }
        reloadLibraryTable()
    }

    private func searchWithShazam(path: String, completion: @escaping (Result<[[String: Any]], Error>) -> Void) {
        Task.detached(priority: .userInitiated) {
            do {
                let candidates = try await Self.shazamCandidates(fileURL: URL(fileURLWithPath: path))
                await MainActor.run {
                    completion(.success(candidates))
                }
            } catch {
                await MainActor.run {
                    completion(.failure(error))
                }
            }
        }
    }

    @objc private func searchSelected() {
        guard let path = selectedPath, !isBusy else { return }
        searchGeneration += 1
        let generation = searchGeneration
        activeSearchPath = path
        activeSearchRequestID = nil
        setBusy(true)
        searchButton.title = "Поиск…"
        setStatus("Сначала ищу в каталоге Shazam…", color: .controlAccentColor)
        searchWithShazam(path: path) { [weak self] result in
            guard let self, self.searchGeneration == generation, self.selectedPath == path else { return }
            switch result {
            case .success(let candidates) where !candidates.isEmpty:
                self.finishTrackSearch(path: path, candidates: candidates, warning: "", generation: generation)
            case .success:
                self.searchWithCatalog(path: path, generation: generation, shazamWarning: "")
            case .failure(let error):
                let detail = error.localizedDescription.contains("com.apple.ShazamKit error 202")
                    ? "сервер каталога не ответил (ошибка 202)" : error.localizedDescription
                self.searchWithCatalog(path: path, generation: generation, shazamWarning: "Shazam временно недоступен: \(detail)")
            }
        }
    }

    private func searchWithCatalog(path: String, generation: Int, shazamWarning: String) {
        guard searchGeneration == generation, selectedPath == path else { return }
        setStatus("Shazam не нашёл совпадение. Проверяю AcoustID и музыкальные каталоги…", color: .controlAccentColor)
        let requestID = requestBackend("search", payload: ["path": path, "api_key": acoustidKey]) { [weak self] result in
            guard let self, self.searchGeneration == generation, self.selectedPath == path else { return }
            self.activeSearchRequestID = nil
            switch result {
            case .success(let value):
                let candidates = value["candidates"] as? [[String: Any]] ?? []
                let warning = value["warning"] as? String ?? ""
                self.finishTrackSearch(path: path, candidates: candidates, warning: [shazamWarning, warning].filter { !$0.isEmpty }.joined(separator: " "), generation: generation)
            case .failure(let error):
                self.finishTrackSearch(path: path, candidates: [], warning: [shazamWarning, error.message].filter { !$0.isEmpty }.joined(separator: " "), generation: generation)
            }
        }
        activeSearchRequestID = requestID
    }

    private func finishTrackSearch(path: String, candidates: [[String: Any]], warning: String, generation: Int) {
        guard searchGeneration == generation, selectedPath == path else { return }
        activeSearchPath = nil
        activeSearchRequestID = nil
        searchButton.title = "Найти совпадение"
        setBusy(false)
        showCandidateWindow(candidates: candidates, warning: warning)
    }

    private func showCandidateWindow(candidates: [[String: Any]], warning: String) {
        candidateRows = candidates.map(preparedCandidate)
        currentCandidate = nil
        if let certainCandidate = candidateRows.first(where: isCertainShazam) {
            currentCandidate = certainCandidate
            setStatus("Shazam распознал запись на 100%. Автоматически записываю теги и обложку…", color: .controlAccentColor)
            writeChosenCandidate()
            return
        }

        let sheet = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 790, height: 450),
            styleMask: [.titled, .closable], backing: .buffered, defer: false
        )
        sheet.title = "Результаты поиска"
        sheet.minSize = NSSize(width: 620, height: 340)
        let content = NSView()
        content.translatesAutoresizingMaskIntoConstraints = false
        sheet.contentView = content

        let stack = verticalStack(spacing: 12)
        stack.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 18),
            stack.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -18),
            stack.topAnchor.constraint(equalTo: content.topAnchor, constant: 16),
            stack.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -14)
        ])

        let subtitle = makeLabel(
            "Выберите совпадение. Для записи нужны исполнитель, название, альбом, год и жанр.",
            size: 12, weight: .regular, color: .secondaryLabelColor
        )
        subtitle.maximumNumberOfLines = 2
        stack.addArrangedSubview(subtitle)

        candidateStatusLabel = makeLabel(
            candidates.isEmpty ? (warning.isEmpty ? "Совпадений не найдено." : warning) : "Найдено вариантов: \(candidates.count). Выберите запись.",
            size: 12, weight: .medium, color: warning.isEmpty ? .secondaryLabelColor : .systemRed
        )
        candidateStatusLabel?.maximumNumberOfLines = 3
        stack.addArrangedSubview(candidateStatusLabel!)

        let table = NSTableView()
        table.delegate = self
        table.dataSource = self
        table.usesAlternatingRowBackgroundColors = true
        table.rowHeight = 34
        for (identifier, title, width) in [
            ("title", "Название", 230.0), ("artist", "Исполнитель", 160.0),
            ("album", "Альбом", 150.0), ("year", "Год", 55.0),
            ("source", "Источник", 90.0), ("confidence", "Точность", 75.0)
        ] {
            let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier(identifier))
            column.title = title
            column.width = width
            column.minWidth = 55
            table.addTableColumn(column)
        }
        candidateTableView = table
        let scroll = NSScrollView()
        scroll.documentView = table
        scroll.hasVerticalScroller = true
        scroll.hasHorizontalScroller = true
        scroll.borderType = .bezelBorder
        scroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 180).isActive = true
        stack.addArrangedSubview(scroll)

        let buttons = horizontalStack(spacing: 8)
        buttons.addArrangedSubview(NSView())
        candidateRetryButton = NSButton(title: "Повторить поиск", target: self, action: #selector(retryCandidateSearch))
        candidateRetryButton?.isHidden = !candidates.isEmpty
        let close = NSButton(title: "Закрыть", target: self, action: #selector(closeCandidateWindow))
        candidateWriteButton = NSButton(title: "Записать теги и обложку", target: self, action: #selector(writeChosenCandidate))
        candidateWriteButton?.isEnabled = false
        [candidateRetryButton!, close, candidateWriteButton!].forEach(buttons.addArrangedSubview)
        stack.addArrangedSubview(buttons)

        candidateWindow = sheet
        window.beginSheet(sheet)
        table.reloadData()
        if candidates.isEmpty { setStatus(warning.isEmpty ? "Поиск завершён: совпадений не найдено." : warning, color: warning.isEmpty ? .secondaryLabelColor : .systemRed) }
    }

    private func updateCandidateSelection() {
        guard let table = candidateTableView else { return }
        let row = table.selectedRow
        guard candidateRows.indices.contains(row) else {
            currentCandidate = nil
            candidateWriteButton?.isEnabled = false
            return
        }
        let candidate = candidateRows[row]
        let missing = missingMetadataFields(candidate)
        currentCandidate = candidate
        if isCertainShazam(candidate) {
            candidateStatusLabel?.stringValue = "Shazam распознал запись на 100%. Автоматически записываю теги и обложку…"
            candidateStatusLabel?.textColor = .systemGreen
            writeChosenCandidate()
            return
        }
        candidateWriteButton?.isEnabled = missing.isEmpty
        if missing.isEmpty {
            candidateStatusLabel?.stringValue = "Выбрано: \(candidate["title"] as? String ?? "Без названия") — \(candidate["artist"] as? String ?? "Неизвестный исполнитель"). Все обязательные поля заполнены."
            candidateStatusLabel?.textColor = .systemGreen
        } else {
            candidateStatusLabel?.stringValue = "Для этого совпадения не хватает: \(missing.joined(separator: ", ")). Неполные теги записаны не будут."
            candidateStatusLabel?.textColor = .systemRed
        }
    }

    private func preparedCandidate(_ candidate: [String: Any]) -> [String: Any] {
        var prepared = candidate
        let title = (candidate["title"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let album = (candidate["album"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if album.isEmpty, !title.isEmpty { prepared["album"] = "\(title) - Single" }
        prepared["genre"] = normalizeGenre(candidate["genre"] as? String ?? "")
        return prepared
    }

    private func normalizeGenre(_ value: String) -> String {
        let genre = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if genre.isEmpty { return "None" }
        if genre.lowercased() == "none" { return "None" }
        let translations: [String: String] = [
            "поп": "Pop", "поп-музыка": "Pop", "поп-музика": "Pop",
            "рок": "Rock", "рок-музыка": "Rock", "рок-музика": "Rock",
            "электроника": "Electronic", "електроніка": "Electronic",
            "электронная музыка": "Electronic", "електронна музика": "Electronic",
            "рэп": "Hip-Hop/Rap", "реп": "Hip-Hop/Rap", "хип-хоп": "Hip-Hop/Rap", "хіп-хоп": "Hip-Hop/Rap",
            "рнб": "R&B", "ритм-н-блюз": "R&B", "ритм-енд-блюз": "R&B",
            "джаз": "Jazz", "блюз": "Blues", "классика": "Classical", "классическая": "Classical",
            "класика": "Classical", "класична": "Classical", "народная": "Folk", "народна": "Folk",
            "танцевальная": "Dance", "танцювальна": "Dance", "диско": "Disco", "регги": "Reggae",
            "металл": "Metal", "метал": "Metal", "панк": "Punk", "соул": "Soul", "фанк": "Funk",
            "инди": "Indie", "інді": "Indie", "эмбиент": "Ambient", "техно": "Techno",
            "хаус": "House", "транс": "Trance", "шансон": "Chanson", "саундтрек": "Soundtrack",
            "музыка из фильмов": "Soundtrack", "музика з фільмів": "Soundtrack",
            "госпел": "Gospel", "инструментальная": "Instrumental", "інструментальна": "Instrumental",
            "world": "World", "мировая музыка": "World", "світова музика": "World"
        ]
        if let translated = translations[genre.lowercased()] { return translated }
        return genre.unicodeScalars.allSatisfy { $0.value < 128 } ? genre : "None"
    }

    private func candidateConfidencePercent(_ candidate: [String: Any]) -> Int {
        let confidence: Double
        if let number = candidate["confidence"] as? NSNumber {
            confidence = number.doubleValue
        } else if let text = candidate["confidence"] as? String, let parsed = Double(text) {
            confidence = parsed
        } else if let number = candidate["acoustid_score"] as? NSNumber {
            confidence = number.doubleValue
        } else {
            confidence = 0
        }
        return Int((max(0, min(100, confidence * 100))).rounded())
    }

    private func isCertainShazam(_ candidate: [String: Any]) -> Bool {
        (candidate["source"] as? String) == "Shazam" && candidateConfidencePercent(candidate) == 100
    }

    private func missingMetadataFields(_ candidate: [String: Any]) -> [String] {
        let names: [(String, String)] = [("artist", "исполнитель"), ("title", "название"), ("album", "альбом"), ("year", "год"), ("genre", "жанр")]
        return names.compactMap { key, name in
            let value = (candidate[key] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            return value.isEmpty ? name : nil
        }
    }

    @objc private func closeCandidateWindow() {
        guard let sheet = candidateWindow else { return }
        window.endSheet(sheet)
        candidateWindow = nil
        candidateTableView = nil
    }

    @objc private func retryCandidateSearch() {
        closeCandidateWindow()
        searchSelected()
    }

    @objc private func writeChosenCandidate() {
        guard let candidate = currentCandidate, let path = selectedPath else { return }
        let missing = missingMetadataFields(candidate)
        guard missing.isEmpty || isCertainShazam(candidate) else {
            candidateStatusLabel?.stringValue = "Не удалось получить: \(missing.joined(separator: ", ")). Неполные теги не записаны."
            candidateStatusLabel?.textColor = .systemRed
            return
        }
        closeCandidateWindow()
        setBusy(true)
        setStatus("Получаю теги и обложку выбранной записи…", color: .controlAccentColor)

        let accept: ([String: Any], Data?, String, String) -> Void = { [weak self] values, cover, mime, warning in
            guard let self, self.selectedPath == path else { return }
            let existing = self.libraryRows.first(where: { $0.path == path })
            let existingValues = [
                "artist": existing?.artist ?? "", "title": existing?.title ?? "",
                "album": existing?.album ?? "", "year": existing?.year ?? "",
                "genre": existing?.genre ?? ""
            ]
            let finalValues = Dictionary(uniqueKeysWithValues: ["artist", "title", "album", "year", "genre"].map { key in
                let incoming = (values[key] as? String ?? candidate[key] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                let previous = (existingValues[key] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                let chosen = incoming.isEmpty ? previous : incoming
                return (key, key == "genre" ? self.normalizeGenre(chosen) : chosen)
            })
            let finalMissing = self.missingMetadataFields(finalValues)
            guard finalMissing.isEmpty || self.isCertainShazam(candidate) else {
                self.setBusy(false)
                self.setStatus("Не записываю неполные теги: не удалось получить \(finalMissing.joined(separator: ", ")).", color: .systemRed)
                return
            }
            self.artistField.stringValue = finalValues["artist"] ?? ""
            self.titleField.stringValue = finalValues["title"] ?? ""
            self.albumField.stringValue = finalValues["album"] ?? ""
            self.yearField.stringValue = finalValues["year"] ?? ""
            self.genreField.stringValue = finalValues["genre"] ?? ""
            self.currentCoverData = cover
            self.currentCoverMime = mime
            self.coverView.image = cover.flatMap(NSImage.init(data:)) ?? NSImage(systemSymbolName: "music.note", accessibilityDescription: "Обложка не найдена")
            self.setStatus("Записываю теги в исходный файл…", color: .controlAccentColor)
            self.requestBackend("write", payload: [
                "path": path, "folder": self.folderField.stringValue,
                "values": finalValues, "cover": cover?.base64EncodedString() ?? "",
                "cover_mime": mime, "create_backup": false
            ]) { [weak self] result in
                guard let self else { return }
                switch result {
                case .success(let response):
                    let savedValues = response["values"] as? [String: Any] ?? finalValues
                    self.updateTrack(path: path, status: response["status"] as? String ?? "Записано", values: savedValues, newPath: response["path"] as? String)
                    self.saveLibraryCache { cacheError in
                        self.setBusy(false)
                        let note = [warning, cacheError?.message].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
                        self.setStatus(note.isEmpty ? "Готово" : "Готово. \(note)", color: note.isEmpty ? .systemGreen : .secondaryLabelColor)
                    }
                case .failure(let error):
                    self.setBusy(false)
                    self.setStatus("Не удалось записать выбранную запись: \(error.message)", color: .systemRed)
                }
            }
        }

        if (candidate["source"] as? String) == "Shazam" {
            let urls = [candidate["artwork_url"] as? String ?? "", candidate["apple_artwork_url"] as? String ?? ""].filter { !$0.isEmpty }
            downloadArtwork(from: urls, index: 0) { data, mime, warning in
                let values = Dictionary(uniqueKeysWithValues: ["artist", "title", "album", "year", "genre"].map { ($0, candidate[$0] as? String ?? "") })
                accept(values, data, mime, warning)
            }
        } else {
            requestBackend("select_candidate", payload: ["candidate": candidate]) { result in
                switch result {
                case .success(let response):
                    let values = response["values"] as? [String: Any] ?? candidate
                    let encoded = response["cover"] as? String ?? ""
                    let cover = Data(base64Encoded: encoded)
                    accept(values, cover, response["cover_mime"] as? String ?? "image/jpeg", response["warning"] as? String ?? "")
                case .failure(let error):
                    DispatchQueue.main.async {
                        self.setBusy(false)
                        self.setStatus("Не удалось получить данные записи: \(error.message)", color: .systemRed)
                    }
                }
            }
        }
    }

    private func downloadArtwork(from urls: [String], index: Int, completion: @escaping (Data?, String, String) -> Void) {
        guard urls.indices.contains(index) else { completion(nil, "image/jpeg", "Обложка для записи не найдена."); return }
        let rawURL = urls[index]
        Task.detached(priority: .userInitiated) { [weak self] in
            do {
                guard let url = URL(string: rawURL), url.scheme?.lowercased() == "https",
                      let host = url.host?.lowercased(), host == "mzstatic.com" || host.hasSuffix(".mzstatic.com") || host == "shazam.com" || host.hasSuffix(".shazam.com") else {
                    throw shazamNetworkError("Ссылка на обложку недействительна")
                }
                var request = URLRequest(url: url)
                request.timeoutInterval = 8
                request.setValue("image/*", forHTTPHeaderField: "Accept")
                let (data, response) = try await URLSession.shared.data(for: request)
                guard (response as? HTTPURLResponse)?.statusCode == 200,
                      let mime = response.mimeType, mime.hasPrefix("image/"), !data.isEmpty, data.count <= 12_000_000 else {
                    throw shazamNetworkError("Не удалось загрузить обложку")
                }
                await MainActor.run { completion(data, mime, "") }
            } catch {
                await MainActor.run { [weak self] in
                    guard let self else { completion(nil, "image/jpeg", error.localizedDescription); return }
                    self.downloadArtwork(from: urls, index: index + 1, completion: completion)
                }
            }
        }
    }

    @objc private func writeTags() {
        guard let path = selectedPath else { return }
        let values = ["artist": artistField.stringValue, "title": titleField.stringValue, "album": albumField.stringValue, "year": yearField.stringValue, "genre": normalizeGenre(genreField.stringValue)]
        setBusy(true)
        setStatus("Записываю теги и резервную копию…", color: .controlAccentColor)
        requestBackend("write", payload: ["path": path, "folder": folderField.stringValue, "values": values, "cover": currentCoverData?.base64EncodedString() ?? "", "cover_mime": currentCoverMime]) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let response):
                let savedValues = response["values"] as? [String: Any] ?? values
                self.updateTrack(path: path, status: response["status"] as? String ?? "Записано", values: savedValues, newPath: response["path"] as? String)
                self.saveLibraryCache { error in
                    self.setBusy(false)
                    let backup = (response["backup"] as? String).map { $0.isEmpty ? "" : " · Копия: \($0)" } ?? ""
                    let cache = error.map { " · Кэш не сохранён: \($0.message)" } ?? ""
                    self.setStatus((response["status"] as? String ?? "Записано") + backup + cache, color: cache.isEmpty ? .systemGreen : .systemOrange)
                }
            case .failure(let error):
                self.setBusy(false)
                self.setStatus("Ошибка записи: \(error.message)", color: .systemRed)
            }
        }
    }

    @objc private func autoProcess() {
        guard !libraryRows.isEmpty else { setStatus("Сначала выберите папку и нажмите «Сканировать»."); return }
        let alert = NSAlert()
        alert.messageText = "Обработать папку?"
        alert.informativeText = "Будут заполнены только пустые поля у уверенных совпадений. Перед изменением сохранится копия файла."
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Обработать")
        alert.addButton(withTitle: "Отмена")
        guard alert.runModal() == .alertFirstButtonReturn else { return }
        setBusy(true)
        progressIndicator.doubleValue = 0
        progressLabel.stringValue = "Подготовка…"
        setStatus("Автообработка началась…", color: .controlAccentColor)
        requestBackend("auto", payload: ["folder": folderField.stringValue, "api_key": acoustidKey]) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let response):
                self.saveLibraryCache { cacheError in
                    self.setBusy(false)
                    self.progressIndicator.doubleValue = 100
                    self.progressLabel.stringValue = "Готово"
                    let summary = "Готово. Записано: \(response["updated"] as? Int ?? 0), пропущено: \(response["skipped"] as? Int ?? 0), ошибок: \(response["errors"] as? Int ?? 0)."
                    self.setStatus(summary + (cacheError.map { " Кэш не сохранён: \($0.message)" } ?? ""), color: cacheError == nil ? .systemGreen : .systemOrange)
                }
            case .failure(let error):
                self.setBusy(false)
                self.setStatus("Автообработка остановлена: \(error.message)", color: .systemRed)
            }
        }
    }

    @objc private func selectAllTracks() {
        guard !libraryRows.isEmpty else { return }
        tableView.selectRowIndexes(IndexSet(integersIn: 0..<libraryRows.count), byExtendingSelection: false)
        setStatus("Выбрано треков: \(libraryRows.count)")
    }

    private static func shazamCandidates(fileURL: URL) async throws -> [[String: Any]] {
        let audioFile = try AVAudioFile(forReading: fileURL)
        let sampleRate = audioFile.processingFormat.sampleRate
        guard sampleRate > 0 else { throw shazamError("Не удалось прочитать аудио") }
        let duration = Double(audioFile.length) / sampleRate
        guard duration >= 3 else { throw shazamError("Для распознавания Shazam нужно не менее 3 секунд аудио") }

        let queryDuration = min(12.0, duration)
        let lastStart = max(0, duration - queryDuration)
        let middleStart = lastStart * 0.55
        let starts = middleStart > 0.5 ? [middleStart, 0.0] : [0.0]
        let session = SHSession()

        for start in starts {
            let signature = try shazamSignature(fileURL: fileURL, startSeconds: start, durationSeconds: queryDuration)
            switch await shazamMatchWithRetry(session: session, signature: signature) {
            case .match(let match):
                let items = Array(match.mediaItems.prefix(5))
                let appleMusicMetadata = await lookupAppleMusicMetadata(for: items)
                return items.enumerated().compactMap { index, item in
                    let catalogItemID = appleMusicCatalogID(for: item) ?? ""
                    let catalogItem = appleMusicMetadata[catalogItemID] ?? [:]
                    let shazamTitle = item.title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    let title = shazamTitle.isEmpty ? metadataString(catalogItem["trackName"]) : shazamTitle
                    guard !title.isEmpty else { return nil }
                    let shazamArtist = item.artist?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    let artist = shazamArtist.isEmpty ? metadataString(catalogItem["artistName"]) : shazamArtist
                    let album = metadataString(catalogItem["collectionName"])
                    let releaseDate = metadataString(catalogItem["releaseDate"])
                    let catalogYear = String(releaseDate.prefix(4))
                    let shazamYear: String
                    if #available(macOS 14.0, *), let creationDate = item.creationDate {
                        shazamYear = Calendar(identifier: .gregorian).component(.year, from: creationDate).description
                    } else {
                        shazamYear = ""
                    }
                    let year = catalogYear.count == 4 ? catalogYear : shazamYear
                    let shazamGenre = item.genres.first?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    let genre = shazamGenre.isEmpty ? metadataString(catalogItem["primaryGenreName"]) : shazamGenre
                    let shazamArtworkURL = item.artworkURL?.absoluteString ?? ""
                    let catalogArtworkURL = metadataString(catalogItem["artworkUrl100"])
                    let artworkURL = highResolutionArtworkURL(shazamArtworkURL.isEmpty ? catalogArtworkURL : shazamArtworkURL)
                    let missingFields = [
                        artist.isEmpty ? "исполнитель" : nil,
                        title.isEmpty ? "название" : nil,
                        album.isEmpty ? "альбом" : nil,
                        year.isEmpty ? "год" : nil,
                        genre.isEmpty ? "жанр" : nil
                    ].compactMap { $0 }
                    let confidence: Double
                    if #available(macOS 15.4, *) {
                        let reported = Double(item.confidence)
                        confidence = reported > 0 ? reported : max(0.82, 0.97 - Double(index) * 0.04)
                    } else {
                        confidence = max(0.82, 0.97 - Double(index) * 0.04)
                    }
                    return [
                        "mbid": "",
                        "title": title,
                        "artist": artist,
                        "album": album,
                        "year": year,
                        "genre": genre,
                        "release_id": "",
                        "release_group_id": "",
                        "mb_score": 0.0,
                        "acoustid_score": 0.0,
                        "confidence": confidence,
                        "source": "Shazam",
                        "artwork_url": artworkURL,
                        "apple_artwork_url": highResolutionArtworkURL(catalogArtworkURL),
                        "missing_fields": missingFields
                    ]
                }
            case .noMatch:
                continue
            case .error(let error):
                throw error
            }
        }
        return []
    }

    private static func lookupAppleMusicMetadata(for items: [SHMediaItem]) async -> [String: [String: Any]] {
        let ids = Array(Set(items.compactMap(appleMusicCatalogID))).sorted()
        guard !ids.isEmpty,
              var components = URLComponents(string: "https://itunes.apple.com/lookup") else { return [:] }
        let country = items.compactMap { item -> String? in
            guard let url = item.appleMusicURL else { return nil }
            let code = url.pathComponents.dropFirst().first ?? ""
            return code.range(of: #"^[A-Za-z]{2}$"#, options: .regularExpression) == nil ? nil : code.lowercased()
        }.first ?? "us"
        components.queryItems = [
            URLQueryItem(name: "id", value: ids.joined(separator: ",")),
            URLQueryItem(name: "entity", value: "song"),
            URLQueryItem(name: "country", value: country)
        ]
        guard let url = components.url else { return [:] }
        var request = URLRequest(url: url)
        request.timeoutInterval = 6
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200,
                  let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let results = payload["results"] as? [[String: Any]] else { return [:] }
            var output: [String: [String: Any]] = [:]
            for result in results {
                let id = metadataString(result["trackId"])
                if !id.isEmpty { output[id] = result }
            }
            return output
        } catch {
            return [:]
        }
    }

    private static func appleMusicCatalogID(for item: SHMediaItem) -> String? {
        if let id = item.appleMusicID?.trimmingCharacters(in: .whitespacesAndNewlines),
           !id.isEmpty, id.allSatisfy({ $0.isASCII && $0.isNumber }) {
            return id
        }
        guard let url = item.appleMusicURL,
              let host = url.host?.lowercased(),
              host == "music.apple.com" || host.hasSuffix(".music.apple.com") || host == "itunes.apple.com" else { return nil }
        if let queryID = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "i" })?.value,
           !queryID.isEmpty, queryID.allSatisfy({ $0.isASCII && $0.isNumber }) {
            return queryID
        }
        guard let pathID = url.pathComponents.last,
              !pathID.isEmpty, pathID.allSatisfy({ $0.isASCII && $0.isNumber }) else { return nil }
        return pathID
    }

    private static func metadataString(_ value: Any?) -> String {
        if let string = value as? String { return string.trimmingCharacters(in: .whitespacesAndNewlines) }
        if let number = value as? NSNumber { return number.stringValue }
        return ""
    }

    private static func highResolutionArtworkURL(_ rawURL: String) -> String {
        guard var components = URLComponents(string: rawURL), components.scheme?.lowercased() == "https" else { return rawURL }
        if let range = components.path.range(of: #"\d{2,4}x\d{2,4}(?:bb|-\d+)?(?=\.)"#, options: .regularExpression) {
            components.path.replaceSubrange(range, with: "1200x1200bb")
        }
        return components.url?.absoluteString ?? rawURL
    }

    private static func shazamMatch(session: SHSession, signature: SHSignature) async -> ShazamRecognitionResult {
        var waiter: ShazamMatchWaiter!
        let result = await withCheckedContinuation { continuation in
            waiter = ShazamMatchWaiter(continuation)
            session.delegate = waiter
            session.match(signature)
        }
        _ = waiter
        session.delegate = nil
        return result
    }

    private static func shazamMatchWithRetry(session: SHSession, signature: SHSignature) async -> ShazamRecognitionResult {
        let firstResult = await shazamMatch(session: session, signature: signature)
        guard case .error(let error) = firstResult else { return firstResult }
        let nsError = error as NSError
        guard nsError.domain == SHError.errorDomain,
              nsError.code == SHError.Code.matchAttemptFailed.rawValue else { return firstResult }
        try? await Task.sleep(nanoseconds: 500_000_000)
        return await shazamMatch(session: session, signature: signature)
    }

    private static func shazamSignature(fileURL: URL, startSeconds: Double, durationSeconds: Double) throws -> SHSignature {
        let audioFile = try AVAudioFile(forReading: fileURL)
        let inputFormat = audioFile.processingFormat
        guard let outputFormat = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1),
              let converter = AVAudioConverter(from: inputFormat, to: outputFormat) else {
            throw shazamError("Не удалось подготовить аудио для Shazam")
        }

        audioFile.framePosition = AVAudioFramePosition(max(0, startSeconds) * inputFormat.sampleRate)
        let availableDuration = Double(audioFile.length - audioFile.framePosition) / inputFormat.sampleRate
        let frameLimit = AVAudioFramePosition(min(durationSeconds, availableDuration) * inputFormat.sampleRate)
        var processedFrames: AVAudioFramePosition = 0
        var signatureFrames: AVAudioFramePosition = 0
        let generator = SHSignatureGenerator()

        while processedFrames < frameLimit {
            let requestedFrames = AVAudioFrameCount(min(AVAudioFramePosition(4096), frameLimit - processedFrames))
            guard let inputBuffer = AVAudioPCMBuffer(pcmFormat: inputFormat, frameCapacity: requestedFrames) else {
                throw shazamError("Не удалось выделить аудиобуфер")
            }
            try audioFile.read(into: inputBuffer, frameCount: requestedFrames)
            guard inputBuffer.frameLength > 0 else { break }
            processedFrames += AVAudioFramePosition(inputBuffer.frameLength)

            let scaledCapacity = ceil(Double(inputBuffer.frameLength) * outputFormat.sampleRate / inputFormat.sampleRate) + 64
            guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: AVAudioFrameCount(scaledCapacity)) else {
                throw shazamError("Не удалось подготовить аудиобуфер")
            }
            var didProvideInput = false
            var conversionError: NSError?
            let status = converter.convert(to: outputBuffer, error: &conversionError) { _, inputStatus in
                guard !didProvideInput else {
                    inputStatus.pointee = .noDataNow
                    return nil
                }
                didProvideInput = true
                inputStatus.pointee = .haveData
                return inputBuffer
            }
            if let conversionError { throw conversionError }
            if status == .error { throw shazamError("Не удалось преобразовать аудиофайл") }
            if outputBuffer.frameLength > 0 {
                let audioTime = AVAudioTime(sampleTime: signatureFrames, atRate: outputFormat.sampleRate)
                try generator.append(outputBuffer, at: audioTime)
                signatureFrames += AVAudioFramePosition(outputBuffer.frameLength)
            }
        }
        return generator.signature()
    }

    private static func shazamError(_ message: String) -> NSError {
        NSError(domain: "AudioLibraryTagger.Shazam", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }

    private func togglePlayback(path: String) {
        if playingPath == path, let audioPlayer {
            if audioPlayer.isPlaying {
                audioPlayer.pause()
                playbackTimer?.invalidate()
                playbackTimer = nil
                reportPlayback(path: path, playing: false)
            } else {
                if audioPlayer.duration > 0, audioPlayer.currentTime >= audioPlayer.duration {
                    audioPlayer.currentTime = 0
                }
                if audioPlayer.play() {
                    startPlaybackTimer()
                    reportPlayback(path: path, playing: true)
                }
            }
            return
        }

        startPlayback(path: path)
    }

    private func playTrack(path: String) {
        if playingPath == path, let audioPlayer {
            audioPlayer.currentTime = 0
            if audioPlayer.play() {
                startPlaybackTimer()
                reportPlayback(path: path, playing: true)
            }
            return
        }
        startPlayback(path: path)
    }

    private func startPlayback(path: String) {
        if let oldPath = playingPath {
            audioPlayer?.stop()
            playbackTimer?.invalidate()
            playbackTimer = nil
            reportPlayback(path: oldPath, playing: false)
        }

        do {
            let player = try AVAudioPlayer(contentsOf: URL(fileURLWithPath: path))
            player.delegate = self
            player.volume = playbackVolume
            player.numberOfLoops = playbackRepeatsCurrentTrack ? -1 : 0
            player.prepareToPlay()
            audioPlayer = player
            playingPath = path
            if player.play() {
                startPlaybackTimer()
                reportPlayback(path: path, playing: true)
            } else {
                playingPath = nil
                showError("Не удалось начать воспроизведение этого файла.")
            }
        } catch {
            playingPath = nil
            showError("Не удалось воспроизвести файл: \(error.localizedDescription)")
        }
    }

    private func startPlaybackTimer() {
        playbackTimer?.invalidate()
        let timer = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in
            guard let self, let path = self.playingPath, let player = self.audioPlayer else { return }
            self.reportPlayback(path: path, playing: player.isPlaying)
        }
        playbackTimer = timer
        RunLoop.main.add(timer, forMode: .common)
    }

    private func seekPlayback(path: String, currentTime: Double) {
        guard playingPath == path, let audioPlayer, audioPlayer.duration > 0 else { return }
        audioPlayer.currentTime = min(max(currentTime, 0), audioPlayer.duration)
        reportPlayback(path: path, playing: audioPlayer.isPlaying)
    }

    private func setPlaybackVolume(_ volume: Float) {
        playbackVolume = min(max(volume, 0), 1)
        audioPlayer?.volume = playbackVolume
    }

    @objc private func toggleShuffle() {
        shuffleEnabled.toggle()
        playerShuffleButton.contentTintColor = shuffleEnabled ? .controlAccentColor : .labelColor
        playerShuffleButton.state = shuffleEnabled ? .on : .off
    }

    @objc private func playPrevious() { playAdjacentTrack(direction: -1) }
    @objc private func playNext() { playAdjacentTrack(direction: 1) }

    private func playAdjacentTrack(direction: Int) {
        guard !isBusy, !libraryRows.isEmpty else { return }
        let basePath = playingPath ?? selectedPath
        let baseIndex = libraryRows.firstIndex(where: { $0.path == basePath }) ?? (direction > 0 ? -1 : libraryRows.count)
        let targetIndex: Int
        if direction > 0, shuffleEnabled {
            let choices = libraryRows.indices.filter { $0 != baseIndex }
            guard let choice = choices.randomElement() else { return }
            targetIndex = choice
        } else {
            targetIndex = baseIndex + direction
        }
        guard libraryRows.indices.contains(targetIndex) else { return }
        let track = libraryRows[targetIndex]
        tableView.selectRowIndexes(IndexSet(integer: targetIndex), byExtendingSelection: false)
        tableView.scrollRowToVisible(targetIndex)
        playTrack(path: track.path)
    }

    @objc private func toggleHeaderPlayback() {
        guard let path = playingPath ?? selectedPath else { return }
        togglePlayback(path: path)
    }

    @objc private func playSelected() {
        guard let selectedPath else { return }
        togglePlayback(path: selectedPath)
    }

    @objc private func playerSeekChanged(_ sender: NSSlider) {
        guard let path = playingPath, let player = audioPlayer, player.duration > 0 else { return }
        seekPlayback(path: path, currentTime: player.duration * sender.doubleValue / 1000)
    }

    @objc private func volumeChanged(_ sender: NSSlider) {
        setPlaybackVolume(Float(sender.doubleValue / 100))
    }

    @objc private func toggleRepeat() {
        playbackRepeatsCurrentTrack.toggle()
        setPlaybackRepeat(playbackRepeatsCurrentTrack)
        playerRepeatButton.contentTintColor = playbackRepeatsCurrentTrack ? .controlAccentColor : .labelColor
    }

    @objc private func scrollToCurrentTrack() {
        guard let path = playingPath ?? selectedPath,
              let index = libraryRows.firstIndex(where: { $0.path == path }) else { return }
        tableView.scrollRowToVisible(index)
        tableView.selectRowIndexes(IndexSet(integer: index), byExtendingSelection: false)
    }

    private func formatTime(_ value: Double) -> String {
        guard value.isFinite, value >= 0 else { return "0:00" }
        let seconds = Int(value)
        return "\(seconds / 60):\(String(format: "%02d", seconds % 60))"
    }

    private func setPlaybackRepeat(_ enabled: Bool) {
        playbackRepeatsCurrentTrack = enabled
        audioPlayer?.numberOfLoops = enabled ? -1 : 0
    }

    private func loadEmbeddedCover(path: String, generation: Int) {
        let asset = AVURLAsset(url: URL(fileURLWithPath: path))
        asset.loadValuesAsynchronously(forKeys: ["commonMetadata"]) { [weak self] in
            guard let self else { return }
            var error: NSError?
            guard asset.statusOfValue(forKey: "commonMetadata", error: &error) == .loaded else {
                DispatchQueue.main.async { self.showCover(data: nil, path: path, generation: generation) }
                return
            }
            let artwork = AVMetadataItem.metadataItems(
                from: asset.commonMetadata,
                filteredByIdentifier: .commonIdentifierArtwork
            ).first
            guard let data = artwork?.dataValue, !data.isEmpty else {
                DispatchQueue.main.async { self.showCover(data: nil, path: path, generation: generation) }
                return
            }
            DispatchQueue.main.async { self.showCover(data: data, path: path, generation: generation) }
        }
    }

    private func showCover(data: Data?, path: String, generation: Int) {
        guard generation == coverGeneration, path == selectedPath else { return }
        if let data, let image = NSImage(data: data) {
            currentCoverData = data
            currentCoverMime = Self.imageMimeType(data)
            coverView.image = image
            return
        }
        currentCoverData = nil
        coverView.image = NSImage(systemSymbolName: "music.note", accessibilityDescription: "Обложка альбома")
        lookupCover(path: path, generation: generation)
    }

    private func lookupCover(path: String, generation: Int) {
        requestBackend("search", payload: ["path": path, "api_key": acoustidKey]) { [weak self] result in
            guard let self, self.coverGeneration == generation, self.selectedPath == path,
                  case .success(let response) = result else { return }
            let candidates = response["candidates"] as? [[String: Any]] ?? []
            guard let candidate = candidates.first(where: {
                (($0["acoustid_score"] as? Double) ?? 0) >= 0.78 || (($0["confidence"] as? Double) ?? 0) >= 0.90
            }) else { return }
            self.requestBackend("select_candidate", payload: ["candidate": candidate]) { [weak self] coverResult in
                guard let self, self.coverGeneration == generation, self.selectedPath == path,
                      case .success(let value) = coverResult,
                      let encoded = value["cover"] as? String, let data = Data(base64Encoded: encoded),
                      let image = NSImage(data: data) else { return }
                self.currentCoverData = data
                self.currentCoverMime = value["cover_mime"] as? String ?? Self.imageMimeType(data)
                self.coverView.image = image
            }
        }
    }

    private func loadPlayerCover(path: String) {
        let asset = AVURLAsset(url: URL(fileURLWithPath: path))
        asset.loadValuesAsynchronously(forKeys: ["commonMetadata"]) { [weak self] in
            guard let self else { return }
            var error: NSError?
            guard asset.statusOfValue(forKey: "commonMetadata", error: &error) == .loaded else {
                DispatchQueue.main.async {
                    if self.playingPath == path { self.playerCoverView.image = NSImage(systemSymbolName: "music.note", accessibilityDescription: "Обложка") }
                }
                return
            }
            let artwork = AVMetadataItem.metadataItems(
                from: asset.commonMetadata,
                filteredByIdentifier: .commonIdentifierArtwork
            ).first
            guard let data = artwork?.dataValue, !data.isEmpty else {
                DispatchQueue.main.async {
                    if self.playingPath == path { self.playerCoverView.image = NSImage(systemSymbolName: "music.note", accessibilityDescription: "Обложка") }
                }
                return
            }
            DispatchQueue.main.async {
                if self.playingPath == path { self.playerCoverView.image = NSImage(data: data) }
            }
        }
    }

    private static func imageMimeType(_ data: Data) -> String {
        let bytes = [UInt8](data.prefix(8))
        if bytes.starts(with: [0x89, 0x50, 0x4E, 0x47]) { return "image/png" }
        if bytes.starts(with: [0xFF, 0xD8, 0xFF]) { return "image/jpeg" }
        if bytes.starts(with: Array("GIF8".utf8)) { return "image/gif" }
        return "image/jpeg"
    }

    private func reportPlayback(path: String, playing: Bool) {
        let currentTime = audioPlayer?.currentTime ?? 0
        let duration = audioPlayer?.duration ?? 0
        if let track = libraryRows.first(where: { $0.path == path }) {
            playerTitleLabel.stringValue = track.title.isEmpty ? track.file : track.title
            playerArtistLabel.stringValue = track.artist.isEmpty ? "Неизвестный исполнитель" : track.artist
        } else {
            playerTitleLabel.stringValue = URL(fileURLWithPath: path).lastPathComponent
            playerArtistLabel.stringValue = ""
        }
        playerToggleButton.title = playing ? "Ⅱ" : "▶"
        playerElapsedLabel.stringValue = formatTime(currentTime)
        playerDurationLabel.stringValue = formatTime(duration)
        if !seeking, duration > 0 { playerSeekSlider.doubleValue = currentTime / duration * 1000 }
        if playingPath != path { playingPath = path }
        if displayedPlayerCoverPath != path {
            displayedPlayerCoverPath = path
            playerCoverView.image = NSImage(systemSymbolName: "music.note", accessibilityDescription: "Обложка")
            loadPlayerCover(path: path)
        }
        playButton?.title = playing && selectedPath == path ? "⏸ Пауза · Пробел" : "▶ Воспроизвести · Пробел"
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        guard let path = playingPath else { return }
        playbackTimer?.invalidate()
        playbackTimer = nil
        playingPath = nil
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.reportPlayback(path: path, playing: false)
            if self.shuffleEnabled { self.playAdjacentTrack(direction: 1) }
        }
    }

    private func chooseFolder() {
        let panel = NSOpenPanel()
        panel.title = "Выберите папку с музыкой"
        panel.prompt = "Выбрать папку"
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.begin { [weak self] response in
            guard response == .OK, let path = panel.url?.path else { return }
            guard let self else { return }
            self.folderField.stringValue = path
            self.requestBackend("save_settings", payload: ["folder": path, "api_key": self.acoustidKey]) { [weak self] _ in
                self?.libraryRows = []
                self?.selectedPath = nil
                self?.tableView.deselectAll(nil)
                self?.reloadLibraryTable()
                self?.restoreCache(announce: true)
            }
        }
    }

    @objc private func openSyncWindow() {
        if let syncWindow {
            syncWindow.makeKeyAndOrderFront(nil)
            return
        }
        let dialog = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 620, height: 430), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        dialog.title = "Синхронизация с iPod"
        dialog.center()
        let content = NSView()
        content.translatesAutoresizingMaskIntoConstraints = false
        dialog.contentView = content
        let stack = verticalStack(spacing: 12)
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.edgeInsets = NSEdgeInsets(top: 18, left: 18, bottom: 18, right: 18)
        content.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: content.leadingAnchor), stack.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            stack.topAnchor.constraint(equalTo: content.topAnchor), stack.bottomAnchor.constraint(equalTo: content.bottomAnchor)
        ])
        stack.addArrangedSubview(makeLabel("Один сервер запускается вместе с iPod. Настройте iPhone один раз через AirDrop — дальше ссылка сохранится.", size: 12, weight: .regular, color: .secondaryLabelColor))
        syncStatusLabel = makeLabel("Запускаю сервер…", size: 12, weight: .medium, color: .secondaryLabelColor)
        stack.addArrangedSubview(syncStatusLabel!)
        syncConnectionField = NSTextField(string: "")
        syncConnectionField?.isEditable = false
        syncConnectionField?.isSelectable = true
        syncConnectionField?.placeholderString = "Ссылка для приложения iPod на iPhone"
        let connectionRow = horizontalStack(spacing: 8)
        connectionRow.addArrangedSubview(syncConnectionField!)
        let copyButton = NSButton(title: "Копировать", target: self, action: #selector(copySyncConnection))
        connectionRow.addArrangedSubview(copyButton)
        let connectionSection = verticalStack(spacing: 4)
        connectionSection.addArrangedSubview(makeLabel("ССЫЛКА ДЛЯ ПОДКЛЮЧЕНИЯ", size: 10, weight: .semibold, color: .secondaryLabelColor))
        connectionSection.addArrangedSubview(connectionRow)
        stack.addArrangedSubview(connectionSection)
        let actions = horizontalStack(spacing: 8)
        syncProfileButton = NSButton(title: "Настроить iPhone через AirDrop", target: self, action: #selector(shareSyncSetupViaAirDrop))
        syncProfileButton?.isEnabled = false
        actions.addArrangedSubview(syncProfileButton!)
        syncStartButton = NSButton(title: "Запустить сервер", target: self, action: #selector(startSyncFromWindow))
        syncStopButton = NSButton(title: "Остановить сервер", target: self, action: #selector(stopSyncFromWindow))
        syncStopButton?.isEnabled = false
        actions.addArrangedSubview(syncStartButton!)
        actions.addArrangedSubview(syncStopButton!)
        stack.addArrangedSubview(actions)
        let log = NSTextView()
        log.isEditable = false
        log.font = .monospacedSystemFont(ofSize: 10, weight: .regular)
        log.textColor = .secondaryLabelColor
        syncLogView = log
        let logScroll = NSScrollView()
        logScroll.documentView = log
        logScroll.hasVerticalScroller = true
        logScroll.borderType = .bezelBorder
        logScroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 140).isActive = true
        stack.addArrangedSubview(logScroll)
        syncWindow = dialog
        updateSyncEndpointFields()
        dialog.makeKeyAndOrderFront(nil)
        if syncServerProcess?.isRunning != true { startSyncServer() }
        if syncServerProcess?.isRunning == true {
            syncStatusLabel?.stringValue = "Сервер работает. Для первого подключения отправьте профиль через AirDrop."
            syncStartButton?.isEnabled = false
            syncStopButton?.isEnabled = true
        }
    }

    @objc private func startSyncFromWindow() { startSyncServer() }
    @objc private func stopSyncFromWindow() { stopSyncServer() }

    @objc private func copySyncConnection() {
        guard let value = syncConnectionField?.stringValue, !value.isEmpty else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(value, forType: .string)
        syncStatusLabel?.stringValue = "Ссылка скопирована. Откройте её на iPhone, если AirDrop недоступен."
    }

    private func updateSyncEndpointFields() {
        guard let endpoint = syncEndpoints.first else { return }
        syncConnectionField?.stringValue = endpoint["connection"] as? String ?? ""
        syncProfileButton?.isEnabled = syncServerProcess?.isRunning == true
    }

    @objc private func shareSyncSetupViaAirDrop() {
        guard let supportURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            syncStatusLabel?.stringValue = "Не удалось найти папку данных iPod."
            return
        }
        let profileURL = supportURL.appendingPathComponent("iPod Sync/.local-certs/install-ca.mobileconfig")
        guard FileManager.default.fileExists(atPath: profileURL.path) else {
            syncStatusLabel?.stringValue = "Профиль ещё готовится. Подождите пару секунд и попробуйте снова."
            return
        }
        guard let sharingService = NSSharingService(named: .sendViaAirDrop) else {
            syncStatusLabel?.stringValue = "AirDrop недоступен. Включите AirDrop на Mac и iPhone."
            return
        }
        sharingService.perform(withItems: [profileURL])
        syncStatusLabel?.stringValue = "Выберите свой iPhone. После получения установите профиль iPod один раз."
    }

    private func startSyncServer() {
        if syncServerProcess?.isRunning == true {
            syncStatusLabel?.stringValue = "Сервер уже запущен."
            return
        }
        guard let resourceURL = Bundle.main.resourceURL else {
            syncStatusLabel?.stringValue = "Не найдены ресурсы приложения."
            return
        }
        let serverURL = resourceURL.appendingPathComponent("server.js")
        guard FileManager.default.fileExists(atPath: serverURL.path) else {
            syncStatusLabel?.stringValue = "В приложении не найден сервер синхронизации."
            return
        }
        let nodeCandidates = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"]
            + (ProcessInfo.processInfo.environment["PATH"] ?? "").split(separator: ":").map { String($0) + "/node" }
        guard let nodePath = nodeCandidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
            syncStatusLabel?.stringValue = "Для синхронизации нужен Node.js. Установите его с nodejs.org или через Homebrew."
            return
        }
        guard let supportURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            syncStatusLabel?.stringValue = "Не удалось найти папку Application Support."
            return
        }
        let dataURL = supportURL.appendingPathComponent("iPod Sync", isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: dataURL, withIntermediateDirectories: true)
            let process = Process()
            let pipe = Pipe()
            var environment = ProcessInfo.processInfo.environment
            environment["MUZIKA_DATA_DIR"] = dataURL.path
            process.executableURL = URL(fileURLWithPath: nodePath)
            process.arguments = [serverURL.path]
            process.currentDirectoryURL = resourceURL
            process.environment = environment
            process.standardOutput = pipe
            process.standardError = pipe
            syncServerOutputBuffer.removeAll(keepingCapacity: true)
            syncServerProcess = process
            syncServerOutputPipe = pipe
            pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
                let data = handle.availableData
                if data.isEmpty {
                    handle.readabilityHandler = nil
                    return
                }
                self?.syncServerOutputQueue.async { [weak self] in self?.consumeSyncServerOutput(data) }
            }
            process.terminationHandler = { [weak self] endedProcess in
                DispatchQueue.main.async {
                    guard let self, self.syncServerProcess === endedProcess else { return }
                    self.syncServerProcess = nil
                    self.syncServerOutputPipe?.fileHandleForReading.readabilityHandler = nil
                    self.syncServerOutputPipe = nil
                    let message = endedProcess.terminationStatus == 0 ? "Сервер остановлен." : "Сервер завершился с ошибкой."
                    self.syncStatusLabel?.stringValue = message
                    self.syncStartButton?.isEnabled = true
                    self.syncStopButton?.isEnabled = false
                    self.syncProfileButton?.isEnabled = false
                }
            }
            try process.run()
            syncStatusLabel?.stringValue = "Запускаю сервер…"
            syncStartButton?.isEnabled = false
            syncStopButton?.isEnabled = true
            syncProfileButton?.isEnabled = false
        } catch {
            syncServerProcess = nil
            syncServerOutputPipe?.fileHandleForReading.readabilityHandler = nil
            syncServerOutputPipe = nil
            syncStatusLabel?.stringValue = "Не удалось запустить сервер синхронизации: \(error.localizedDescription)"
            syncStartButton?.isEnabled = true
            syncStopButton?.isEnabled = false
            syncProfileButton?.isEnabled = false
        }
    }

    private func stopSyncServer() {
        guard let process = syncServerProcess, process.isRunning else {
            syncServerProcess = nil
            syncStatusLabel?.stringValue = "Сервер остановлен."
            syncStartButton?.isEnabled = true
            syncStopButton?.isEnabled = false
            syncProfileButton?.isEnabled = false
            return
        }
        process.terminate()
        syncStatusLabel?.stringValue = "Останавливаю сервер…"
        syncStopButton?.isEnabled = false
    }

    private func consumeSyncServerOutput(_ data: Data) {
        syncServerOutputBuffer.append(data)
        while let newlineIndex = syncServerOutputBuffer.firstIndex(of: 0x0A) {
            let lineData = syncServerOutputBuffer[..<newlineIndex]
            syncServerOutputBuffer.removeSubrange(...newlineIndex)
            let line = String(decoding: lineData, as: UTF8.self)
            DispatchQueue.main.async { [weak self] in self?.processSyncServerLine(line) }
        }
    }

    private func processSyncServerLine(_ line: String) {
        if let storage = syncLogView?.textStorage {
            storage.append(NSAttributedString(string: line + "\n"))
            syncLogView?.scrollToEndOfDocument(nil)
        }
        if line.hasPrefix("IPOD_SYNC_ERROR:") {
            syncStatusLabel?.stringValue = String(line.dropFirst("IPOD_SYNC_ERROR:".count))
        }
        let prefix = "IPOD_SYNC_READY:"
        guard line.hasPrefix(prefix),
              let data = String(line.dropFirst(prefix.count)).data(using: .utf8),
              let payload = try? JSONSerialization.jsonObject(with: data),
              let endpoints = payload as? [[String: Any]] else { return }
        syncEndpoints = endpoints
        updateSyncEndpointFields()
        syncStatusLabel?.stringValue = "Сервер работает. Первое подключение — профиль через AirDrop; дальше телефон запомнит сервер."
    }

    private func startBackend() {
        guard let resourceRoot = Bundle.main.resourceURL else {
            showError("Не найдена папка ресурсов приложения.")
            return
        }
        let backendPath = resourceRoot.appendingPathComponent("backend/AudioTaggerBackend")
        guard FileManager.default.isExecutableFile(atPath: backendPath.path) else {
            showError("Не найден модуль обработки аудиофайлов.")
            return
        }
        let process = Process()
        let input = Pipe()
        let output = Pipe()
        let errorPipe = Pipe()
        process.executableURL = backendPath
        process.currentDirectoryURL = resourceRoot
        process.standardInput = input
        process.standardOutput = output
        process.standardError = errorPipe
        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            self?.consumeBackendData(data)
        }
        errorPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if !data.isEmpty, let text = String(data: data, encoding: .utf8) {
                FileHandle.standardError.write(Data(text.utf8))
            }
        }
        process.terminationHandler = { [weak self] process in
            DispatchQueue.main.async {
                if process.terminationStatus != 0 {
                    self?.showError("Модуль обработки завершился с ошибкой. Закройте приложение и запустите его снова.")
                }
            }
        }
        do {
            try process.run()
            backend = process
            inputPipe = input
            outputPipe = output
        } catch {
            showError("Не удалось запустить обработчик тегов: \(error.localizedDescription)")
        }
    }

    private func consumeBackendData(_ data: Data) {
        lineQueue.async { [weak self] in
            guard let self else { return }
            self.pendingOutput.append(data)
            while let newline = self.pendingOutput.range(of: Data([0x0A])) {
                let line = self.pendingOutput.subdata(in: self.pendingOutput.startIndex..<newline.lowerBound)
                self.pendingOutput.removeSubrange(self.pendingOutput.startIndex..<newline.upperBound)
                guard let object = try? JSONSerialization.jsonObject(with: line),
                      let message = object as? [String: Any] else { continue }
                DispatchQueue.main.async { self.handleBackendMessage(message) }
            }
        }
    }

    private func showError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "iPod"
        alert.informativeText = message
        alert.alertStyle = .warning
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}

@main
enum iPodApplication {
    private static var delegate: AudioLibraryTaggerDelegate?

    static func main() {
        let application = NSApplication.shared
        application.setActivationPolicy(.regular)

        let applicationDelegate = AudioLibraryTaggerDelegate()
        delegate = applicationDelegate
        application.delegate = applicationDelegate
        application.finishLaunching()
        applicationDelegate.applicationDidFinishLaunching(
            Notification(name: NSApplication.didFinishLaunchingNotification)
        )
        application.run()
    }
}
