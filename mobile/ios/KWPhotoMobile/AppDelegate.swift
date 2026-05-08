internal import Expo
import React
import ReactAppDependencyProvider
import UIKit

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  private var privacyBlurView: UIVisualEffectView?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    configurePrivacyBlurNotifications()

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }

  private func configurePrivacyBlurNotifications() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(showPrivacyBlur),
      name: UIApplication.willResignActiveNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(hidePrivacyBlur),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
  }

  @objc private func showPrivacyBlur() {
    guard privacyBlurView == nil, let window else {
      return
    }

    // Native blur is added before iOS captures the app switcher snapshot.
    let blurView = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterialLight))
    blurView.backgroundColor = UIColor(white: 1, alpha: 0.32)
    blurView.frame = window.bounds
    blurView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(blurView)
    window.bringSubviewToFront(blurView)
    privacyBlurView = blurView
  }

  @objc private func hidePrivacyBlur() {
    privacyBlurView?.removeFromSuperview()
    privacyBlurView = nil
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
