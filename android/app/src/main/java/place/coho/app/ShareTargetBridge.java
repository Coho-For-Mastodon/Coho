package place.coho.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Capacitor plugin that extracts data from Android ACTION_SEND intents
 * so the web layer can process shared text, URLs, images, and videos.
 */
@CapacitorPlugin(name = "ShareTargetBridge")
public class ShareTargetBridge extends Plugin {

    @PluginMethod
    public void getSharedContent(PluginCall call) {
        Intent intent = getActivity().getIntent();
        JSObject result = new JSObject();

        if (intent == null) {
            result.put("hasShare", false);
            call.resolve(result);
            return;
        }

        String action = intent.getAction();
        String type = intent.getType();

        if (action == null || type == null) {
            result.put("hasShare", false);
            call.resolve(result);
            return;
        }

        boolean isSend = Intent.ACTION_SEND.equals(action);
        boolean isSendMultiple = Intent.ACTION_SEND_MULTIPLE.equals(action);

        if (!isSend && !isSendMultiple) {
            result.put("hasShare", false);
            call.resolve(result);
            return;
        }

        result.put("hasShare", true);

        // Extract shared text (often a URL)
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (text != null) {
            result.put("text", text);
        }
        if (subject != null) {
            result.put("subject", subject);
        }

        // Extract shared media files
        JSArray filesArray = new JSArray();
        List<Uri> uris = new ArrayList<>();

        if (isSend) {
            Uri singleUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (singleUri != null) {
                uris.add(singleUri);
            }
        } else if (isSendMultiple) {
            List<Uri> multiUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (multiUris != null) {
                uris.addAll(multiUris);
            }
        }

        ContentResolver resolver = getContext().getContentResolver();
        File cacheDir = new File(getContext().getCacheDir(), "share_target");
        if (!cacheDir.exists()) {
            cacheDir.mkdirs();
        }

        for (Uri uri : uris) {
            try {
                String mimeType = resolver.getType(uri);
                String fileName = getFileName(resolver, uri);
                if (fileName == null) {
                    // Generate a name from MIME type
                    String ext = MimeTypeMap.getSingleton()
                            .getExtensionFromMimeType(mimeType);
                    fileName = UUID.randomUUID().toString() + (ext != null ? "." + ext : "");
                }

                // Copy to internal cache
                File destFile = new File(cacheDir, fileName);
                try (InputStream in = resolver.openInputStream(uri);
                     FileOutputStream out = new FileOutputStream(destFile)) {
                    if (in == null) continue;
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                }

                JSObject fileObj = new JSObject();
                fileObj.put("name", fileName);
                fileObj.put("type", mimeType != null ? mimeType : "application/octet-stream");
                fileObj.put("path", destFile.getAbsolutePath());
                fileObj.put("size", destFile.length());
                filesArray.put(fileObj);
            } catch (IOException e) {
                // Skip files that fail to copy
                System.err.println("[ShareTargetBridge] Failed to copy shared file: " + e.getMessage());
            }
        }

        if (filesArray.length() > 0) {
            result.put("files", filesArray);
        }

        call.resolve(result);
    }

    @PluginMethod
    public void clearSharedContent(PluginCall call) {
        // Clear the intent so re-opening the app doesn't re-trigger the share
        Intent intent = getActivity().getIntent();
        if (intent != null) {
            intent.setAction(null);
            intent.removeExtra(Intent.EXTRA_TEXT);
            intent.removeExtra(Intent.EXTRA_SUBJECT);
            intent.removeExtra(Intent.EXTRA_STREAM);
        }

        // Clean up cached files
        File cacheDir = new File(getContext().getCacheDir(), "share_target");
        if (cacheDir.exists()) {
            File[] files = cacheDir.listFiles();
            if (files != null) {
                for (File file : files) {
                    file.delete();
                }
            }
        }

        call.resolve();
    }

    /**
     * Notify the web layer that a new share intent arrived while the app
     * was already running (via onNewIntent in MainActivity).
     */
    public void notifyShareIntent() {
        notifyListeners("shareIntent", new JSObject());
    }

    private static String getFileName(ContentResolver resolver, Uri uri) {
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0) {
                        return cursor.getString(idx);
                    }
                }
            }
        }
        // Fall back to last path segment
        String path = uri.getLastPathSegment();
        return path;
    }
}
