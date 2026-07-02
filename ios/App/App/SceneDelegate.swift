import UIKit
import Capacitor

@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        // Manually initialize the window and root view controller
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        let rootVC = storyboard.instantiateInitialViewController()
        
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = rootVC
        self.window = window
        window.makeKeyAndVisible()
        
        // Handle launch via deep link or universal link
        if let userActivity = connectionOptions.userActivities.first {
            self.scene(scene, continue: userActivity)
        } else if let urlContext = connectionOptions.urlContexts.first {
            self.scene(scene, openURLContexts: [urlContext])
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        if let urlContext = URLContexts.first {
            let url = urlContext.url
            let options: [UIApplication.OpenURLOptionsKey: Any] = [
                .annotation: urlContext.options.annotation as Any,
                .sourceApplication: urlContext.options.sourceApplication as Any
            ]
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: options)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
