package place.coho.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.mlkit.nl.languageid.LanguageIdentification;
import com.google.mlkit.nl.languageid.LanguageIdentifier;
import com.google.mlkit.nl.translate.TranslateLanguage;
import com.google.mlkit.nl.translate.Translation;
import com.google.mlkit.nl.translate.Translator;
import com.google.mlkit.nl.translate.TranslatorOptions;

import com.google.mlkit.genai.common.FeatureStatus;
import com.google.mlkit.genai.imagedescription.ImageDescriber;
import com.google.mlkit.genai.imagedescription.ImageDescriberOptions;
import com.google.mlkit.genai.imagedescription.ImageDescription;
import com.google.mlkit.genai.imagedescription.ImageDescriptionRequest;
import com.google.mlkit.genai.proofreading.Proofreader;
import com.google.mlkit.genai.proofreading.ProofreaderOptions;
import com.google.mlkit.genai.proofreading.Proofreading;
import com.google.mlkit.genai.proofreading.ProofreadingRequest;
import com.google.mlkit.genai.proofreading.ProofreadingResult;
import com.google.mlkit.genai.proofreading.ProofreadingSuggestion;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Capacitor plugin that exposes Android on-device AI capabilities to the web layer:
 * - Translation via ML Kit
 * - Alt text generation via ML Kit GenAI Image Description (Gemini Nano)
 * - Proofreading via ML Kit GenAI Proofreading (Gemini Nano)
 */
@CapacitorPlugin(name = "AiBridge")
public class AiBridge extends Plugin {

    private static final String TAG = "AiBridge";
    private static final ExecutorService executor = Executors.newCachedThreadPool();

    // ── Language Detection (ML Kit) ─────────────────────────────────────

    @PluginMethod
    public void detectLanguage(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }

        LanguageIdentifier identifier = LanguageIdentification.getClient();
        identifier.identifyLanguage(text)
                .addOnSuccessListener(languageCode -> {
                    JSObject result = new JSObject();
                    // ML Kit returns "und" for undetermined
                    result.put("language", "und".equals(languageCode) ? "en" : languageCode);
                    call.resolve(result);
                    identifier.close();
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Language detection failed", e);
                    JSObject result = new JSObject();
                    result.put("language", "en");
                    call.resolve(result);
                    identifier.close();
                });
    }

    // ── Translation (ML Kit) ──────────────────────────────────────────────

    @PluginMethod
    public void translate(PluginCall call) {
        String text = call.getString("text");
        String sourceLang = call.getString("sourceLanguage", "en");
        String targetLang = call.getString("targetLanguage", "en");

        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }

        String sourceTag = mapToMlKitLanguage(sourceLang);
        String targetTag = mapToMlKitLanguage(targetLang);

        if (sourceTag == null || targetTag == null) {
            call.reject("Unsupported language pair: " + sourceLang + " -> " + targetLang);
            return;
        }

        TranslatorOptions options = new TranslatorOptions.Builder()
                .setSourceLanguage(sourceTag)
                .setTargetLanguage(targetTag)
                .build();

        Translator translator = Translation.getClient(options);

        // Ensure models are downloaded, then translate
        translator.downloadModelIfNeeded()
                .addOnSuccessListener(unused ->
                        translator.translate(text)
                                .addOnSuccessListener(translatedText -> {
                                    JSObject result = new JSObject();
                                    result.put("translatedText", translatedText);
                                    call.resolve(result);
                                    translator.close();
                                })
                                .addOnFailureListener(e -> {
                                    Log.e(TAG, "Translation failed", e);
                                    call.reject("Translation failed: " + e.getMessage());
                                    translator.close();
                                })
                )
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Model download failed", e);
                    call.reject("Translation model download failed: " + e.getMessage());
                    translator.close();
                });
    }

    // ── Alt Text Generation (ML Kit GenAI Image Description) ─────────────

    @PluginMethod
    public void generateAltText(PluginCall call) {
        String imageBase64 = call.getString("imageBase64");

        if (imageBase64 == null || imageBase64.isEmpty()) {
            call.reject("imageBase64 is required");
            return;
        }

        try {
            // Strip data URI prefix if present
            String base64Data = imageBase64;
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }

            byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);

            if (bitmap == null) {
                call.reject("Failed to decode image from base64");
                return;
            }

            executor.execute(() -> {
                ImageDescriber describer = null;
                try {
                    ImageDescriberOptions options = ImageDescriberOptions.builder(getContext()).build();
                    describer = ImageDescription.getClient(options);

                    int status = describer.checkFeatureStatus().get();
                    if (status == FeatureStatus.UNAVAILABLE) {
                        call.reject("Image description not available on this device");
                        return;
                    }

                    ImageDescriptionRequest request = ImageDescriptionRequest.builder(bitmap).build();
                    String description = describer.runInference(request).get().getDescription();

                    JSObject result = new JSObject();
                    result.put("altText", description != null ? description.trim() : "");
                    call.resolve(result);
                } catch (Exception e) {
                    Log.e(TAG, "Alt text generation failed", e);
                    call.reject("Alt text generation failed: " + e.getMessage());
                } finally {
                    if (describer != null) describer.close();
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "Alt text generation error", e);
            call.reject("Alt text generation error: " + e.getMessage());
        }
    }

    // ── Proofreading (ML Kit GenAI) ───────────────────────────────────────

    @PluginMethod
    public void proofread(PluginCall call) {
        String text = call.getString("text");

        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }

        executor.execute(() -> {
            Proofreader proofreader = null;
            try {
                ProofreaderOptions options = ProofreaderOptions.builder(getContext())
                        .setInputType(ProofreaderOptions.InputType.KEYBOARD)
                        .setLanguage(ProofreaderOptions.Language.ENGLISH)
                        .build();
                proofreader = Proofreading.getClient(options);

                int status = proofreader.checkFeatureStatus().get();
                if (status == FeatureStatus.UNAVAILABLE) {
                    call.reject("Proofreading not available on this device");
                    return;
                }

                ProofreadingRequest request = ProofreadingRequest.builder(text).build();
                ProofreadingResult proofResult = proofreader.runInference(request).get();
                List<ProofreadingSuggestion> suggestions = proofResult.getResults();

                JSObject result = new JSObject();
                if (suggestions != null && !suggestions.isEmpty()) {
                    // Top suggestion is sorted by highest confidence
                    result.put("correctedInput", suggestions.get(0).getText());
                } else {
                    result.put("correctedInput", text);
                }
                // ML Kit returns whole-text suggestions, not granular corrections
                result.put("corrections", new JSArray());
                call.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Proofreading failed", e);
                call.reject("Proofreading failed: " + e.getMessage());
            } finally {
                if (proofreader != null) proofreader.close();
            }
        });
    }

    // ── Availability Check ────────────────────────────────────────────────

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        executor.execute(() -> {
            boolean altTextAvailable = false;
            boolean proofreadingAvailable = false;

            // Check image description availability
            ImageDescriber describer = null;
            try {
                ImageDescriberOptions idOptions = ImageDescriberOptions.builder(getContext()).build();
                describer = ImageDescription.getClient(idOptions);
                int status = describer.checkFeatureStatus().get();
                Log.i(TAG, "Image description feature status: " + status
                        + " (AVAILABLE=" + FeatureStatus.AVAILABLE
                        + ", DOWNLOADABLE=" + FeatureStatus.DOWNLOADABLE
                        + ", DOWNLOADING=" + FeatureStatus.DOWNLOADING
                        + ", UNAVAILABLE=" + FeatureStatus.UNAVAILABLE + ")");
                altTextAvailable = (status != FeatureStatus.UNAVAILABLE);
            } catch (Exception e) {
                Log.e(TAG, "Image description check failed", e);
            } finally {
                if (describer != null) describer.close();
            }

            // Check proofreading availability
            Proofreader proofreader = null;
            try {
                ProofreaderOptions prOptions = ProofreaderOptions.builder(getContext())
                        .setInputType(ProofreaderOptions.InputType.KEYBOARD)
                        .setLanguage(ProofreaderOptions.Language.ENGLISH)
                        .build();
                proofreader = Proofreading.getClient(prOptions);
                int status = proofreader.checkFeatureStatus().get();
                Log.i(TAG, "Proofreading feature status: " + status
                        + " (AVAILABLE=" + FeatureStatus.AVAILABLE
                        + ", DOWNLOADABLE=" + FeatureStatus.DOWNLOADABLE
                        + ", DOWNLOADING=" + FeatureStatus.DOWNLOADING
                        + ", UNAVAILABLE=" + FeatureStatus.UNAVAILABLE + ")");
                proofreadingAvailable = (status != FeatureStatus.UNAVAILABLE);
            } catch (Exception e) {
                Log.e(TAG, "Proofreading check failed", e);
            } finally {
                if (proofreader != null) proofreader.close();
            }

            Log.i(TAG, "AI capabilities: translation=true, altText=" + altTextAvailable
                    + ", proofreading=" + proofreadingAvailable);

            JSObject result = new JSObject();
            result.put("translation", true);
            result.put("altText", altTextAvailable);
            result.put("proofreading", proofreadingAvailable);
            call.resolve(result);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    /**
     * Map a BCP-47 language tag (or common shorthand) to an ML Kit
     * TranslateLanguage constant. Returns null if unsupported.
     */
    private String mapToMlKitLanguage(String langCode) {
        if (langCode == null) return null;
        // Normalize: take first segment, lowercase
        String code = langCode.split("-")[0].toLowerCase();
        switch (code) {
            case "af": return TranslateLanguage.AFRIKAANS;
            case "ar": return TranslateLanguage.ARABIC;
            case "be": return TranslateLanguage.BELARUSIAN;
            case "bg": return TranslateLanguage.BULGARIAN;
            case "bn": return TranslateLanguage.BENGALI;
            case "ca": return TranslateLanguage.CATALAN;
            case "cs": return TranslateLanguage.CZECH;
            case "cy": return TranslateLanguage.WELSH;
            case "da": return TranslateLanguage.DANISH;
            case "de": return TranslateLanguage.GERMAN;
            case "el": return TranslateLanguage.GREEK;
            case "en": return TranslateLanguage.ENGLISH;
            case "eo": return TranslateLanguage.ESPERANTO;
            case "es": return TranslateLanguage.SPANISH;
            case "et": return TranslateLanguage.ESTONIAN;
            case "fa": return TranslateLanguage.PERSIAN;
            case "fi": return TranslateLanguage.FINNISH;
            case "fr": return TranslateLanguage.FRENCH;
            case "ga": return TranslateLanguage.IRISH;
            case "gl": return TranslateLanguage.GALICIAN;
            case "gu": return TranslateLanguage.GUJARATI;
            case "he": return TranslateLanguage.HEBREW;
            case "hi": return TranslateLanguage.HINDI;
            case "hr": return TranslateLanguage.CROATIAN;
            case "hu": return TranslateLanguage.HUNGARIAN;
            case "id": return TranslateLanguage.INDONESIAN;
            case "is": return TranslateLanguage.ICELANDIC;
            case "it": return TranslateLanguage.ITALIAN;
            case "ja": return TranslateLanguage.JAPANESE;
            case "ka": return TranslateLanguage.GEORGIAN;
            case "kn": return TranslateLanguage.KANNADA;
            case "ko": return TranslateLanguage.KOREAN;
            case "lt": return TranslateLanguage.LITHUANIAN;
            case "lv": return TranslateLanguage.LATVIAN;
            case "mk": return TranslateLanguage.MACEDONIAN;
            case "mr": return TranslateLanguage.MARATHI;
            case "ms": return TranslateLanguage.MALAY;
            case "mt": return TranslateLanguage.MALTESE;
            case "nl": return TranslateLanguage.DUTCH;
            case "no": return TranslateLanguage.NORWEGIAN;
            case "pl": return TranslateLanguage.POLISH;
            case "pt": return TranslateLanguage.PORTUGUESE;
            case "ro": return TranslateLanguage.ROMANIAN;
            case "ru": return TranslateLanguage.RUSSIAN;
            case "sk": return TranslateLanguage.SLOVAK;
            case "sl": return TranslateLanguage.SLOVENIAN;
            case "sq": return TranslateLanguage.ALBANIAN;
            case "sv": return TranslateLanguage.SWEDISH;
            case "sw": return TranslateLanguage.SWAHILI;
            case "ta": return TranslateLanguage.TAMIL;
            case "te": return TranslateLanguage.TELUGU;
            case "th": return TranslateLanguage.THAI;
            case "tl": return TranslateLanguage.TAGALOG;
            case "tr": return TranslateLanguage.TURKISH;
            case "uk": return TranslateLanguage.UKRAINIAN;
            case "ur": return TranslateLanguage.URDU;
            case "vi": return TranslateLanguage.VIETNAMESE;
            case "zh": return TranslateLanguage.CHINESE;
            default: return null;
        }
    }
}
