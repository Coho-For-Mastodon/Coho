package place.coho.app;

import android.os.Build;
import android.view.HapticFeedbackConstants;
import android.view.View;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin that provides rich, hardware-tuned Android system haptic feedback
 * via HapticFeedbackConstants and Linear Resonant Actuators (LRA).
 */
@CapacitorPlugin(name = "RichHapticsBridge")
public class RichHapticsBridge extends Plugin {

    @PluginMethod
    public void perform(PluginCall call) {
        String type = call.getString("type", "click");

        getActivity().runOnUiThread(() -> {
            View view = null;
            if (getBridge() != null && getBridge().getWebView() != null) {
                view = getBridge().getWebView();
            } else if (getActivity() != null && getActivity().getWindow() != null) {
                view = getActivity().getWindow().getDecorView();
            }

            if (view == null) {
                call.resolve();
                return;
            }

            int constant = getHapticConstant(type);
            view.performHapticFeedback(constant, HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING);
            call.resolve();
        });
    }

    private int getHapticConstant(String type) {
        if (type == null) return HapticFeedbackConstants.KEYBOARD_TAP;

        switch (type) {
            case "confirm":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) { // API 30+
                    return HapticFeedbackConstants.CONFIRM;
                }
                return HapticFeedbackConstants.KEYBOARD_TAP;

            case "reject":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) { // API 30+
                    return HapticFeedbackConstants.REJECT;
                }
                return HapticFeedbackConstants.LONG_PRESS;

            case "gestureStart":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) { // API 30+
                    return HapticFeedbackConstants.GESTURE_START;
                }
                return HapticFeedbackConstants.CLOCK_TICK;

            case "gestureThreshold":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // API 34+
                    return HapticFeedbackConstants.GESTURE_THRESHOLD_ACTIVATE;
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    return HapticFeedbackConstants.CONFIRM;
                }
                return HapticFeedbackConstants.VIRTUAL_KEY;

            case "gestureEnd":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) { // API 30+
                    return HapticFeedbackConstants.GESTURE_END;
                }
                return HapticFeedbackConstants.VIRTUAL_KEY;

            case "toggleOn":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // API 34+
                    return HapticFeedbackConstants.TOGGLE_ON;
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    return HapticFeedbackConstants.CONFIRM;
                }
                return HapticFeedbackConstants.KEYBOARD_TAP;

            case "toggleOff":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // API 34+
                    return HapticFeedbackConstants.TOGGLE_OFF;
                }
                return HapticFeedbackConstants.CLOCK_TICK;

            case "segmentTick":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // API 34+
                    return HapticFeedbackConstants.SEGMENT_TICK;
                }
                return HapticFeedbackConstants.CLOCK_TICK;

            case "segmentFrequentTick":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // API 34+
                    return HapticFeedbackConstants.SEGMENT_FREQUENT_TICK;
                }
                return HapticFeedbackConstants.CLOCK_TICK;

            case "longPress":
                return HapticFeedbackConstants.LONG_PRESS;

            case "contextClick":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) { // API 23+
                    return HapticFeedbackConstants.CONTEXT_CLICK;
                }
                return HapticFeedbackConstants.LONG_PRESS;

            case "clockTick":
                return HapticFeedbackConstants.CLOCK_TICK;

            case "click":
            default:
                return HapticFeedbackConstants.KEYBOARD_TAP;
        }
    }
}
