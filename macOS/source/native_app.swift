import AppKit
import AVFoundation
import Foundation
import WebKit

final class AudioLibraryTaggerDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, AVAudioPlayerDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var backend: Process?
    private var inputPipe: Pipe?
    private var outputPipe: Pipe?
    private var audioPlayer: AVAudioPlayer?
    private var playingPath: String?
    private var playbackTimer: Timer?
    private var playbackVolume: Float = 0.8
    private var playbackRepeatsCurrentTrack = false
    private var chromaprintInstaller: Process?
    private let lineQueue = DispatchQueue(label: "local.audiolibrarytagger.backend-output")
    private var pendingOutput = Data()

    func applicationDidFinishLaunching(_ notification: Notification) {
        installBundledAcoustIDKeyIfNeeded()
        installApplicationMenu()

        let content = WKUserContentController()
        content.add(self, name: "backend")
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = content
        webView = WKWebView(frame: .zero, configuration: configuration)

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1240, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "iPod"
        window.minSize = NSSize(width: 900, height: 620)
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        startBackend()
        if let webRoot = Bundle.main.resourceURL?.appendingPathComponent("web", isDirectory: true) {
            webView.loadFileURL(webRoot.appendingPathComponent("index.html"), allowingReadAccessTo: webRoot)
        } else {
            showError("Не найдены файлы интерфейса внутри приложения.")
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

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
        NSApp.mainMenu = menuBar
    }

    func applicationWillTerminate(_ notification: Notification) {
        playbackTimer?.invalidate()
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        backend?.terminate()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let request = message.body as? [String: Any], let action = request["action"] as? String else { return }
        if action == "choose_folder" {
            chooseFolder()
            return
        }
        if action == "toggle_playback" {
            guard let path = request["path"] as? String, !path.isEmpty else { return }
            togglePlayback(path: path)
            return
        }
        if action == "play_track" {
            guard let path = request["path"] as? String, !path.isEmpty else { return }
            playTrack(path: path)
            return
        }
        if action == "seek_playback" {
            guard let path = request["path"] as? String else { return }
            seekPlayback(path: path, currentTime: request["current_time"] as? Double ?? 0)
            return
        }
        if action == "set_volume" {
            setPlaybackVolume(Float(request["volume"] as? Double ?? 0.8))
            return
        }
        if action == "set_repeat" {
            setPlaybackRepeat(request["enabled"] as? Bool ?? false)
            return
        }
        if action == "rebind_playback_path" {
            guard let oldPath = request["old_path"] as? String,
                  let newPath = request["new_path"] as? String else { return }
            if playingPath == oldPath {
                playingPath = newPath
                reportPlayback(path: newPath, playing: audioPlayer?.isPlaying ?? false)
            }
            return
        }
        if action == "load_embedded_cover" {
            guard let path = request["path"] as? String, !path.isEmpty else { return }
            loadEmbeddedCover(path: path, requestId: request["requestId"] as? Int ?? 0)
            return
        }
        if action == "load_player_cover" {
            guard let path = request["path"] as? String, !path.isEmpty else { return }
            loadPlayerCover(path: path)
            return
        }
        if action == "open_acoustid_registration" {
            if let url = URL(string: "https://acoustid.org/new-application") { NSWorkspace.shared.open(url) }
            return
        }
        if action == "install_chromaprint" {
            installChromaprint()
            return
        }
        guard let backend, backend.isRunning, let inputPipe,
              let data = try? JSONSerialization.data(withJSONObject: request, options: [.fragmentsAllowed]) else {
            sendToWeb(["id": request["id"] ?? "", "event": "error", "error": "Модуль обработки не запущен. Закройте приложение и откройте его снова."])
            return
        }
        inputPipe.fileHandleForWriting.write(data)
        inputPipe.fileHandleForWriting.write(Data([0x0A]))
    }

    private func installChromaprint() {
        guard chromaprintInstaller == nil else { return }
        let brewPaths = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"]
        guard let brewPath = brewPaths.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
            sendChromaprintInstallResult(false, "Homebrew не найден. Установите Homebrew, затем нажмите «Установить Chromaprint» ещё раз.")
            return
        }
        sendJavaScript("window.chromaprintInstallStarted();")
        let process = Process()
        process.executableURL = URL(fileURLWithPath: brewPath)
        process.arguments = ["install", "chromaprint"]
        process.currentDirectoryURL = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true)
        process.standardInput = FileHandle.nullDevice
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        process.terminationHandler = { [weak self] process in
            DispatchQueue.main.async {
                self?.chromaprintInstaller = nil
                if process.terminationStatus == 0 {
                    self?.sendChromaprintInstallResult(true, "Chromaprint установлен. Теперь можно искать песни по звучанию.")
                } else {
                    self?.sendChromaprintInstallResult(false, "Homebrew не смог установить Chromaprint. Проверьте подключение к интернету и повторите попытку.")
                }
            }
        }
        do {
            try process.run()
            chromaprintInstaller = process
        } catch {
            chromaprintInstaller = nil
            sendChromaprintInstallResult(false, "Не удалось запустить Homebrew: \(error.localizedDescription)")
        }
    }

    private func sendChromaprintInstallResult(_ success: Bool, _ message: String) {
        let safeMessage = javascriptString(message)
        sendJavaScript("window.chromaprintInstallFinished(\(success), \(safeMessage));")
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

    private func setPlaybackRepeat(_ enabled: Bool) {
        playbackRepeatsCurrentTrack = enabled
        audioPlayer?.numberOfLoops = enabled ? -1 : 0
    }

    private func loadEmbeddedCover(path: String, requestId: Int) {
        let asset = AVURLAsset(url: URL(fileURLWithPath: path))
        asset.loadValuesAsynchronously(forKeys: ["commonMetadata"]) { [weak self] in
            guard let self else { return }
            var error: NSError?
            guard asset.statusOfValue(forKey: "commonMetadata", error: &error) == .loaded else {
                DispatchQueue.main.async { self.sendEmbeddedCover(path: path, requestId: requestId, data: nil, mime: "") }
                return
            }
            let artwork = AVMetadataItem.metadataItems(
                from: asset.commonMetadata,
                filteredByIdentifier: .commonIdentifierArtwork
            ).first
            guard let data = artwork?.dataValue, !data.isEmpty else {
                DispatchQueue.main.async { self.sendEmbeddedCover(path: path, requestId: requestId, data: nil, mime: "") }
                return
            }
            let mime = Self.imageMimeType(data)
            DispatchQueue.main.async { self.sendEmbeddedCover(path: path, requestId: requestId, data: data, mime: mime) }
        }
    }

    private func loadPlayerCover(path: String) {
        let asset = AVURLAsset(url: URL(fileURLWithPath: path))
        asset.loadValuesAsynchronously(forKeys: ["commonMetadata"]) { [weak self] in
            guard let self else { return }
            var error: NSError?
            guard asset.statusOfValue(forKey: "commonMetadata", error: &error) == .loaded else {
                DispatchQueue.main.async {
                    self.sendJavaScript("window.receivePlayerCover(\(self.javascriptString(path)), \"\", \"\");")
                }
                return
            }
            let artwork = AVMetadataItem.metadataItems(
                from: asset.commonMetadata,
                filteredByIdentifier: .commonIdentifierArtwork
            ).first
            guard let data = artwork?.dataValue, !data.isEmpty else {
                DispatchQueue.main.async {
                    self.sendJavaScript("window.receivePlayerCover(\(self.javascriptString(path)), \"\", \"\");")
                }
                return
            }
            let encoded = data.base64EncodedString()
            let mime = Self.imageMimeType(data)
            DispatchQueue.main.async {
                self.sendJavaScript("window.receivePlayerCover(\(self.javascriptString(path)), \(self.javascriptString(encoded)), \(self.javascriptString(mime)));")
            }
        }
    }

    private func sendEmbeddedCover(path: String, requestId: Int, data: Data?, mime: String) {
        let encoded = data?.base64EncodedString() ?? ""
        sendJavaScript("window.receiveEmbeddedCover(\(javascriptString(path)), \(requestId), \(javascriptString(encoded)), \(javascriptString(mime))); ")
    }

    private static func imageMimeType(_ data: Data) -> String {
        let bytes = [UInt8](data.prefix(8))
        if bytes.starts(with: [0x89, 0x50, 0x4E, 0x47]) { return "image/png" }
        if bytes.starts(with: [0xFF, 0xD8, 0xFF]) { return "image/jpeg" }
        if bytes.starts(with: Array("GIF8".utf8)) { return "image/gif" }
        return "image/jpeg"
    }

    private func reportPlayback(path: String, playing: Bool) {
        let safePath = javascriptString(path)
        let currentTime = audioPlayer?.currentTime ?? 0
        let duration = audioPlayer?.duration ?? 0
        sendJavaScript("window.updatePlaybackState(\(safePath), \(playing), \(currentTime), \(duration));")
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        guard let path = playingPath else { return }
        playbackTimer?.invalidate()
        playbackTimer = nil
        playingPath = nil
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.reportPlayback(path: path, playing: false)
            self.sendJavaScript("window.playbackDidFinish(\(self.javascriptString(path))); ")
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
            self?.sendJavaScript("window.setFolderFromDialog(\(self?.javascriptString(path) ?? "\"\""));")
        }
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
                DispatchQueue.main.async { self.sendToWeb(message) }
            }
        }
    }

    private func sendToWeb(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message, options: [.fragmentsAllowed]),
              let json = String(data: data, encoding: .utf8) else { return }
        sendJavaScript("window.receiveBackend(\(json));")
    }

    private func sendJavaScript(_ script: String) {
        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    private func javascriptString(_ value: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: [value]),
              let encoded = String(data: data, encoding: .utf8) else { return "\"\"" }
        return String(encoded.dropFirst().dropLast())
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

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let appDelegate = AudioLibraryTaggerDelegate()
app.delegate = appDelegate
app.run()
