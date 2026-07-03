import UIKit
import Capacitor

@objc(ViewController)
class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Enable native back/forward swipe gestures in the web view
        self.webView?.allowsBackForwardNavigationGestures = true
    }
}
