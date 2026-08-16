package place.coho.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.util.Log;
import android.content.pm.PackageManager;

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
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private boolean isAiCoreInstalled() {
        try {
            getContext().getPackageManager().getPackageInfo("com.google.android.aicore", 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    // ── Translation ───────────────────────────────────────────────────────

    @PluginMethod
    public void translate(PluginCall call) {
        String text = call.getString("text");
        String targetLang = call.getString("targetLanguage", "en");

        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }

        executor.execute(() -> {
            LanguageIdentifier languageIdentifier = LanguageIdentification.getClient();
            languageIdentifier.identifyLanguage(text)
                .addOnSuccessListener(sourceLang -> {
                    if (sourceLang.equals("und")) {
                        call.reject("Could not identify source language");
                        return;
                    }

                    TranslatorOptions options = new TranslatorOptions.Builder()
                            .setSourceLanguage(TranslateLanguage.fromLanguageTag(sourceLang))
                            .setTargetLanguage(TranslateLanguage.fromLanguageTag(targetLang))
                            .build();

                    Translator translator = Translation.getClient(options);

                    // Ensure models are downloaded, then translate
                    translator.downloadModelIfNeeded()
                        .addOnSuccessListener(v -> {
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
                                });
                        })
                        .addOnFailureListener(e -> {
                            Log.e(TAG, "Model download failed", e);
                            call.reject("Failed to download translation model");
                            translator.close();
                        });
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Language identification failed", e);
                    call.reject("Language identification failed");
                });
        });
    }

    // ── Alt Text Generation (ML Kit GenAI Image Description) ─────────────

    @PluginMethod
    public void generateAltText(PluginCall call) {
        if (!isAiCoreInstalled()) {
            call.reject("Image description not available on this device");
            return;
        }

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
                } catch (Throwable t) {
                    Log.e(TAG, "Alt text generation failed", t);
                    call.reject("Alt text generation failed: " + t.getMessage());
                } finally {
                    if (describer != null) describer.close();
                }
            });

        } catch (Throwable t) {
            Log.e(TAG, "Alt text generation error", t);
            call.reject("Alt text generation error: " + t.getMessage());
        }
    }

    // ── Proofreading (ML Kit GenAI) ───────────────────────────────────────

    @PluginMethod
    public void proofread(PluginCall call) {
        if (!isAiCoreInstalled()) {
            call.reject("Proofreading not available on this device");
            return;
        }

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
            } catch (Throwable t) {
                Log.e(TAG, "Proofreading failed", t);
                call.reject("Proofreading failed: " + t.getMessage());
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

            if (isAiCoreInstalled()) {
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
                } catch (Throwable t) {
                    Log.e(TAG, "Image description check failed", t);
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
                } catch (Throwable t) {
                    Log.e(TAG, "Proofreading check failed", t);
                } finally {
                    if (proofreader != null) proofreader.close();
                }
            } else {
                Log.i(TAG, "AICore not installed, skipping GenAI availability checks");
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
}
