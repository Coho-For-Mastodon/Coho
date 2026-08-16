package place.coho.app

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.common.audio.AudioSource
import com.google.mlkit.genai.speechrecognition.SpeechRecognition
import com.google.mlkit.genai.speechrecognition.SpeechRecognizer
import com.google.mlkit.genai.speechrecognition.SpeechRecognizerOptions
import com.google.mlkit.genai.speechrecognition.SpeechRecognizerRequest
import com.google.mlkit.genai.speechrecognition.SpeechRecognizerResponse
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.cancel
import java.util.Locale

/**
 * Capacitor plugin that exposes ML Kit GenAI Speech Recognition to the web layer.
 * Uses MODE_ADVANCED (Gemini Nano) when available, automatically falls back to
 * MODE_BASIC (traditional on-device model, API 31+).
 */
@CapacitorPlugin(
    name = "SpeechBridge",
    permissions = [
        Permission(
            alias = "microphone",
            strings = [Manifest.permission.RECORD_AUDIO]
        )
    ]
)
class SpeechBridge : Plugin() {

    companion object {
        private const val TAG = "SpeechBridge"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var speechRecognizer: SpeechRecognizer? = null

    override fun handleOnDestroy() {
        speechRecognizer?.close()
        speechRecognizer = null
        scope.cancel()
    }

    private fun buildOptions(locale: Locale, mode: Int): SpeechRecognizerOptions {
        val builder = SpeechRecognizerOptions.Builder()
        builder.locale = locale
        builder.preferredMode = mode
        return builder.build()
    }

    private fun isAiCoreInstalled(): Boolean {
        return try {
            context.packageManager.getPackageInfo("com.google.android.aicore", 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    /**
     * Check whether speech recognition is available on this device.
     * Returns { available: boolean, mode: "advanced" | "basic" | "unavailable" }
     */
    @PluginMethod
    fun checkSpeechStatus(call: PluginCall) {
        if (!isAiCoreInstalled()) {
            call.resolve(JSObject().apply {
                put("available", false)
                put("mode", "unavailable")
            })
            return
        }

        scope.launch {
            try {
                // Try Advanced first
                val advancedRecognizer = SpeechRecognition.getClient(
                    buildOptions(Locale.US, SpeechRecognizerOptions.Mode.MODE_ADVANCED)
                )
                val advancedStatus = advancedRecognizer.checkStatus()
                advancedRecognizer.close()

                if (advancedStatus == FeatureStatus.AVAILABLE || advancedStatus == FeatureStatus.DOWNLOADABLE) {
                    call.resolve(JSObject().apply {
                        put("available", true)
                        put("mode", "advanced")
                    })
                    return@launch
                }

                // Try Basic
                val basicRecognizer = SpeechRecognition.getClient(
                    buildOptions(Locale.US, SpeechRecognizerOptions.Mode.MODE_BASIC)
                )
                val basicStatus = basicRecognizer.checkStatus()
                basicRecognizer.close()

                if (basicStatus == FeatureStatus.AVAILABLE || basicStatus == FeatureStatus.DOWNLOADABLE) {
                    call.resolve(JSObject().apply {
                        put("available", true)
                        put("mode", "basic")
                    })
                    return@launch
                }

                call.resolve(JSObject().apply {
                    put("available", false)
                    put("mode", "unavailable")
                })
            } catch (t: Throwable) {
                Log.e(TAG, "checkSpeechStatus failed", t)
                call.resolve(JSObject().apply {
                    put("available", false)
                    put("mode", "unavailable")
                })
            }
        }
    }

    /**
     * Start speech recognition from the microphone.
     * The call is kept alive and resolved with the final transcribed text
     * when stopSpeechRecognition is called or recognition ends naturally.
     */
    @PluginMethod
    fun startSpeechRecognition(call: PluginCall) {
        if (!isAiCoreInstalled()) {
            call.reject("Speech recognition is not available on this device")
            return
        }

        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micPermissionCallback")
            return
        }
        doStartRecognition(call)
    }

    @com.getcapacitor.annotation.PermissionCallback
    private fun micPermissionCallback(call: PluginCall) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            doStartRecognition(call)
        } else {
            call.reject("Microphone permission is required for speech recognition")
        }
    }

    private fun doStartRecognition(call: PluginCall) {
        call.setKeepAlive(true)

        val localeTag = call.getString("locale", "en-US") ?: "en-US"
        val locale = Locale.forLanguageTag(localeTag)

        scope.launch {
            try {
                val options = buildOptions(locale, SpeechRecognizerOptions.Mode.MODE_ADVANCED)
                val recognizer = SpeechRecognition.getClient(options)

                // Download model if needed — collect() completes when download finishes
                val status = recognizer.checkStatus()
                if (status == FeatureStatus.DOWNLOADABLE) {
                    recognizer.download().collect { /* wait for flow to complete */ }
                    // Re-check after download
                    val postDownloadStatus = recognizer.checkStatus()
                    if (postDownloadStatus != FeatureStatus.AVAILABLE) {
                        recognizer.close()
                        call.reject("Speech recognition model unavailable after download")
                        return@launch
                    }
                } else if (status != FeatureStatus.AVAILABLE) {
                    recognizer.close()
                    call.reject("Speech recognition is not available on this device")
                    return@launch
                }

                speechRecognizer = recognizer

                val reqBuilder = SpeechRecognizerRequest.Builder()
                reqBuilder.audioSource = AudioSource.fromMic()
                val request = reqBuilder.build()

                val resultBuilder = StringBuilder()
                var lastPartialText = ""

                recognizer.startRecognition(request).collect { response ->
                    when (response) {
                        is SpeechRecognizerResponse.FinalTextResponse -> {
                            resultBuilder.append(response.text).append(" ")
                            lastPartialText = ""
                        }
                        is SpeechRecognizerResponse.PartialTextResponse -> {
                            lastPartialText = response.text
                            // Send accumulated finals + current partial so JS always
                            // has the full in-progress text, not just the latest fragment
                            val fullText = (resultBuilder.toString() + response.text).trim()
                            val event = JSObject()
                            event.put("text", fullText)
                            notifyListeners("partialSpeech", event)
                        }
                        is SpeechRecognizerResponse.CompletedResponse -> {
                            // If the model emitted only partials (common with Gemini Nano),
                            // use the last partial as the final result
                            if (resultBuilder.isEmpty() && lastPartialText.isNotEmpty()) {
                                resultBuilder.append(lastPartialText)
                            }
                        }
                        is SpeechRecognizerResponse.ErrorResponse -> {
                            Log.w(TAG, "Speech recognition error response")
                        }
                    }
                }

                // Second fallback: if flow ended without CompletedResponse
                if (resultBuilder.isEmpty() && lastPartialText.isNotEmpty()) {
                    resultBuilder.append(lastPartialText)
                }

                val finalText = resultBuilder.toString().trim()
                call.resolve(JSObject().apply { put("text", finalText) })

                recognizer.close()
                speechRecognizer = null
            } catch (t: Throwable) {
                Log.e(TAG, "Speech recognition failed", t)
                call.reject("Speech recognition failed: ${t.message}")
                speechRecognizer?.close()
                speechRecognizer = null
            }
        }
    }

    /**
     * Stop an active speech recognition session.
     * The kept-alive startSpeechRecognition call will resolve with the final text.
     */
    @PluginMethod
    fun stopSpeechRecognition(call: PluginCall) {
        scope.launch {
            try {
                speechRecognizer?.stopRecognition()
                call.resolve(JSObject().apply { put("stopped", true) })
            } catch (t: Throwable) {
                Log.e(TAG, "stopSpeechRecognition failed", t)
                call.reject("Failed to stop recognition: ${t.message}")
            }
        }
    }
}
