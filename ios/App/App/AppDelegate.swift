import UIKit
import WebKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        DispatchQueue.main.async { [weak self] in
            if let bridgeVC = self?.window?.rootViewController as? CAPBridgeViewController {
                MoriBridgeManager.shared.attach(to: bridgeVC)
            }
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

// MARK: - Mori Native Bridge Manager
final class MoriBridgeManager: NSObject, WKScriptMessageHandler {
    static let shared = MoriBridgeManager()
    private weak var bridgeViewController: CAPBridgeViewController?
    private var hasAttached = false

    func attach(to vc: CAPBridgeViewController) {
        self.bridgeViewController = vc
        _ = vc.view
        guard let webView = vc.webView else { return }
        guard !hasAttached else { return }
        hasAttached = true

        webView.configuration.userContentController.add(self, name: "moriNativeBridge")

        let bridgeScript = """
        (function() {
            window.MoriMainBridge = window.MoriMainBridge || {};
            window.MoriMainBridge.openSnifferBrowser = function(url) {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.moriNativeBridge) {
                    window.webkit.messageHandlers.moriNativeBridge.postMessage({ action: 'openSnifferBrowser', url: String(url || '') });
                }
            };
        })();
        """
        let userScript = WKUserScript(source: bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        webView.configuration.userContentController.addUserScript(userScript)
        webView.evaluateJavaScript(bridgeScript, completionHandler: nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "moriNativeBridge",
              let dict = message.body as? [String: Any],
              let action = dict["action"] as? String else { return }

        if action == "openSnifferBrowser", let url = dict["url"] as? String {
            openSnifferBrowser(initialUrl: url)
        }
    }

    private func openSnifferBrowser(initialUrl: String) {
        guard let rootVC = bridgeViewController else { return }
        let snifferVC = MoriSnifferViewController(initialUrl: initialUrl) { [weak self] resultJson in
            let js = "if (window.__moriLiveSnifferCallback) { window.__moriLiveSnifferCallback(\(resultJson)); }"
            self?.bridgeViewController?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
        snifferVC.modalPresentationStyle = .fullScreen
        rootVC.present(snifferVC, animated: true, completion: nil)
    }
}

// MARK: - In-App Live Browser Sniffer
final class MoriSnifferViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    private let initialUrl: String
    private let onComplete: ((String) -> Void)?

    private var webView: WKWebView!
    private let topBar = UIView()
    private let bottomBar = UIView()
    private let progressView = UIProgressView(progressViewStyle: .bar)
    private let titleLabel = UILabel()
    private let counterBadge = UILabel()
    private let backButton = UIButton(type: .system)
    private let forwardButton = UIButton(type: .system)
    private let reloadButton = UIButton(type: .system)

    private var detectedUrls = Set<String>()
    private var progressObserver: NSKeyValueObservation?

    private let adDomains: [String] = [
        "adtng.com", "trafficjunky", "exoclick", "tsyndicate", "popads",
        "juicyads", "ero-advertising", "propellerads", "adsterra", "clickadu",
        "doubleclick.net", "googlesyndication.com", "adservice.google",
        "a.magsrv.com", "creative.ad", "ad-delivery", "smartadserver"
    ]

    init(initialUrl: String, onComplete: ((String) -> Void)?) {
        self.initialUrl = initialUrl
        self.onComplete = onComplete
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupWebView()
        loadInitialPage()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        webView.stopLoading()
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "moriMediaDetected")
        progressObserver?.invalidate()
    }

    private func setupUI() {
        view.backgroundColor = UIColor(red: 26/255, green: 25/255, blue: 23/255, alpha: 1.0)

        // Top Bar
        topBar.translatesAutoresizingMaskIntoConstraints = false
        topBar.backgroundColor = UIColor(red: 26/255, green: 25/255, blue: 23/255, alpha: 1.0)
        view.addSubview(topBar)

        let closeBtn = UIButton(type: .system)
        closeBtn.translatesAutoresizingMaskIntoConstraints = false
        closeBtn.setTitle("✕", for: .normal)
        closeBtn.setTitleColor(.white, for: .normal)
        closeBtn.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .bold)
        closeBtn.addTarget(self, action: #selector(handleClose), for: .touchUpInside)
        topBar.addSubview(closeBtn)

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.textColor = .white
        titleLabel.font = UIFont.systemFont(ofSize: 13, weight: .semibold)
        titleLabel.text = initialUrl.isEmpty ? "Live Browser" : initialUrl
        titleLabel.lineBreakMode = .byTruncatingTail
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        topBar.addSubview(titleLabel)

        counterBadge.translatesAutoresizingMaskIntoConstraints = false
        counterBadge.backgroundColor = UIColor(red: 229/255, green: 169/255, blue: 60/255, alpha: 1.0)
        counterBadge.textColor = UIColor(red: 26/255, green: 25/255, blue: 23/255, alpha: 1.0)
        counterBadge.font = UIFont.systemFont(ofSize: 11, weight: .bold)
        counterBadge.text = " 0 Media "
        counterBadge.textAlignment = .center
        counterBadge.layer.cornerRadius = 10
        counterBadge.clipsToBounds = true
        counterBadge.setContentCompressionResistancePriority(.required, for: .horizontal)
        topBar.addSubview(counterBadge)

        let doneBtn = UIButton(type: .system)
        doneBtn.translatesAutoresizingMaskIntoConstraints = false
        doneBtn.setTitle(" Done ", for: .normal)
        doneBtn.setTitleColor(UIColor(red: 26/255, green: 25/255, blue: 23/255, alpha: 1.0), for: .normal)
        doneBtn.backgroundColor = UIColor(red: 255/255, green: 251/255, blue: 242/255, alpha: 1.0)
        doneBtn.titleLabel?.font = UIFont.systemFont(ofSize: 12, weight: .bold)
        doneBtn.layer.cornerRadius = 6
        doneBtn.setContentCompressionResistancePriority(.required, for: .horizontal)
        doneBtn.addTarget(self, action: #selector(handleDone), for: .touchUpInside)
        topBar.addSubview(doneBtn)

        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.progressTintColor = UIColor(red: 229/255, green: 169/255, blue: 60/255, alpha: 1.0)
        progressView.trackTintColor = .clear
        view.addSubview(progressView)

        // Bottom Bar
        bottomBar.translatesAutoresizingMaskIntoConstraints = false
        bottomBar.backgroundColor = UIColor(red: 26/255, green: 25/255, blue: 23/255, alpha: 1.0)
        view.addSubview(bottomBar)

        backButton.translatesAutoresizingMaskIntoConstraints = false
        backButton.setTitle("◀", for: .normal)
        backButton.setTitleColor(.white, for: .normal)
        backButton.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .bold)
        backButton.addTarget(self, action: #selector(handleBack), for: .touchUpInside)
        bottomBar.addSubview(backButton)

        forwardButton.translatesAutoresizingMaskIntoConstraints = false
        forwardButton.setTitle("▶", for: .normal)
        forwardButton.setTitleColor(.white, for: .normal)
        forwardButton.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .bold)
        forwardButton.addTarget(self, action: #selector(handleForward), for: .touchUpInside)
        bottomBar.addSubview(forwardButton)

        reloadButton.translatesAutoresizingMaskIntoConstraints = false
        reloadButton.setTitle("↻", for: .normal)
        reloadButton.setTitleColor(.white, for: .normal)
        reloadButton.titleLabel?.font = UIFont.systemFont(ofSize: 20, weight: .bold)
        reloadButton.addTarget(self, action: #selector(handleReload), for: .touchUpInside)
        bottomBar.addSubview(reloadButton)

        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topBar.heightAnchor.constraint(equalToConstant: 44),

            closeBtn.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 12),
            closeBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            closeBtn.widthAnchor.constraint(equalToConstant: 32),

            titleLabel.leadingAnchor.constraint(equalTo: closeBtn.trailingAnchor, constant: 8),
            titleLabel.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),

            counterBadge.leadingAnchor.constraint(equalTo: titleLabel.trailingAnchor, constant: 8),
            counterBadge.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            counterBadge.heightAnchor.constraint(equalToConstant: 20),

            doneBtn.leadingAnchor.constraint(equalTo: counterBadge.trailingAnchor, constant: 8),
            doneBtn.trailingAnchor.constraint(equalTo: topBar.trailingAnchor, constant: -12),
            doneBtn.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),

            progressView.topAnchor.constraint(equalTo: topBar.bottomAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 2),

            bottomBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            bottomBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottomBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bottomBar.heightAnchor.constraint(equalToConstant: 44),

            backButton.leadingAnchor.constraint(equalTo: bottomBar.leadingAnchor, constant: 20),
            backButton.centerYAnchor.constraint(equalTo: bottomBar.centerYAnchor),

            forwardButton.leadingAnchor.constraint(equalTo: backButton.trailingAnchor, constant: 24),
            forwardButton.centerYAnchor.constraint(equalTo: bottomBar.centerYAnchor),

            reloadButton.trailingAnchor.constraint(equalTo: bottomBar.trailingAnchor, constant: -20),
            reloadButton.centerYAnchor.constraint(equalTo: bottomBar.centerYAnchor),
        ])
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        let userContentController = WKUserContentController()
        userContentController.add(self, name: "moriMediaDetected")

        let snifferScriptSource = """
        (function() {
            if (window.__moriSnifferActive) return;
            window.__moriSnifferActive = true;

            function report(u, type) {
                if (!u || typeof u !== 'string') return;
                try {
                    window.webkit.messageHandlers.moriMediaDetected.postMessage({ url: u, type: type || 'MEDIA' });
                } catch(e) {}
            }

            var origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                if (url) report(url.toString(), 'XHR');
                return origOpen.apply(this, arguments);
            };

            var origFetch = window.fetch;
            if (origFetch) {
                window.fetch = function(input, init) {
                    var u = typeof input === 'string' ? input : (input && input.url ? input.url : '');
                    if (u) report(u, 'FETCH');
                    return origFetch.apply(this, arguments);
                };
            }

            function scan() {
                document.querySelectorAll('video, audio').forEach(function(el) {
                    if (el.src) report(el.src, el.tagName);
                    if (el.currentSrc) report(el.currentSrc, el.tagName);
                    el.querySelectorAll('source').forEach(function(s) {
                        if (s.src) report(s.src, 'SOURCE');
                    });
                });
                var bVid = document.querySelector('#gelcomVideoPlayer, video[id*="player"]');
                if (bVid) {
                    if (bVid.src) report(bVid.src, 'VIDEO');
                    if (bVid.currentSrc) report(bVid.currentSrc, 'VIDEO');
                }
                var bImg = document.querySelector('#image, #image-container img');
                if (bImg && bImg.src) report(bImg.src, 'IMAGE');

                var og = document.querySelector('meta[property="og:video"], meta[property="og:video:url"]');
                if (og && og.content) report(og.content, 'OG_VIDEO');
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', scan);
            } else {
                scan();
            }
            setInterval(scan, 1500);

            var obs = new MutationObserver(scan);
            if (document.documentElement) {
                obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
            }
        })();
        """
        let userScript = WKUserScript(source: snifferScriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        userContentController.addUserScript(userScript)
        config.userContentController = userContentController

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: progressView.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: bottomBar.topAnchor)
        ])

        progressObserver = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] wv, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.progressView.progress = Float(wv.estimatedProgress)
                self.progressView.isHidden = wv.estimatedProgress >= 1.0
            }
        }
    }

    private func loadInitialPage() {
        var clean = initialUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        if clean.isEmpty {
            clean = "https://www.google.com"
        } else if !clean.lowercased().hasPrefix("http://") && !clean.lowercased().hasPrefix("https://") {
            clean = "https://" + clean
        }
        if let url = URL(string: clean) {
            webView.load(URLRequest(url: url))
        }
    }

    @objc private func handleClose() {
        dismiss(animated: true, completion: nil)
    }

    @objc private func handleDone() {
        let resultDict: [String: Any] = [
            "pageTitle": webView.title ?? "Live Browser Capture",
            "pageUrl": webView.url?.absoluteString ?? initialUrl,
            "urls": Array(detectedUrls)
        ]
        if let jsonData = try? JSONSerialization.data(withJSONObject: resultDict),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            onComplete?(jsonString)
        }
        dismiss(animated: true, completion: nil)
    }

    @objc private func handleBack() {
        if webView.canGoBack { webView.goBack() }
    }

    @objc private func handleForward() {
        if webView.canGoForward { webView.goForward() }
    }

    @objc private func handleReload() {
        webView.reload()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "moriMediaDetected",
              let dict = message.body as? [String: Any],
              let url = dict["url"] as? String else { return }

        addDetectedUrl(url)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        detectedUrls.removeAll()
        updateBadgeUI()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        titleLabel.text = webView.title ?? webView.url?.host ?? initialUrl
        backButton.isEnabled = webView.canGoBack
        forwardButton.isEnabled = webView.canGoForward
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url {
            let lower = url.absoluteString.lowercased()
            if isSnifferMedia(lower) {
                addDetectedUrl(url.absoluteString)
            }
            if let scheme = url.scheme?.lowercased(), scheme != "http" && scheme != "https" && scheme != "about" {
                decisionHandler(.cancel)
                return
            }
        }
        decisionHandler(.allow)
    }

    private func addDetectedUrl(_ rawUrl: String) {
        guard isSnifferMedia(rawUrl) else { return }
        if !detectedUrls.contains(rawUrl) {
            detectedUrls.insert(rawUrl)
            DispatchQueue.main.async { [weak self] in
                self?.updateBadgeUI()
            }
        }
    }

    private func updateBadgeUI() {
        counterBadge.text = " \(detectedUrls.count) Media "
        UIView.animate(withDuration: 0.15, animations: {
            self.counterBadge.transform = CGAffineTransform(scaleX: 1.15, y: 1.15)
        }) { _ in
            UIView.animate(withDuration: 0.15) {
                self.counterBadge.transform = .identity
            }
        }
    }

    private func isSnifferMedia(_ rawUrl: String) -> Bool {
        let lower = rawUrl.lowercased()

        for ad in adDomains {
            if lower.contains(ad) { return false }
        }

        if lower.contains("preview") || lower.contains("short_preview") || lower.contains("-preview.mp4") || lower.contains("trailer") {
            return false
        }

        let mediaExts = [".mp4", ".webm", ".mov", ".mkv", ".m4v", ".m3u8", ".mpd", ".mp3", ".m4a", ".wav", ".aac", ".flac", ".ogg"]
        for ext in mediaExts {
            if lower.contains(ext) { return true }
        }

        let platforms = [
            "/video/tos/", "tiktokcdn.com", "byteoversea.com", "akamaized.net/video/",
            "googlevideo.com/videoplayback", "video_versions", "player.vimeo.com/video",
            "fbcdn.net/v/", "mime_type=video_mp4", "mime=video"
        ]
        for p in platforms {
            if lower.contains(p) { return true }
        }

        if let r34 = Data(base64Encoded: "cnVsZTM0Lnh4eA==").flatMap({ String(data: $0, encoding: .utf8) }), lower.contains(r34) {
            if lower.contains("/images/") || lower.contains(".mp4") || lower.contains(".webm") {
                return true
            }
        }
        if let phc = Data(base64Encoded: "cGhuY2RuLmNvbQ==").flatMap({ String(data: $0, encoding: .utf8) }), lower.contains(phc) {
            return true
        }
        if let ph = Data(base64Encoded: "cG9ybmh1Yi5jb20=").flatMap({ String(data: $0, encoding: .utf8) }), lower.contains(ph) {
            return true
        }

        if lower.contains("booru") && lower.contains("/images/") {
            let imgExts = [".jpeg", ".jpg", ".png", ".gif", ".webp"]
            for ext in imgExts {
                if lower.contains(ext) { return true }
            }
        }

        return false
    }
}
