package com.mori.downloader;
 
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.File;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.net.URLDecoder;
import android.os.Environment;
import android.media.MediaScannerConnection;
import android.media.MediaMetadataRetriever;
import android.media.ThumbnailUtils;
import android.util.Size;
import android.provider.MediaStore;
import android.graphics.Matrix;
import androidx.core.content.FileProvider;
import android.graphics.Bitmap;
import android.util.Base64;
import android.Manifest;
import android.content.pm.PackageManager;
import android.provider.Settings;
import android.provider.DocumentsContract;
import androidx.core.content.ContextCompat;
import androidx.core.app.ActivityCompat;
import android.util.Log;
import android.webkit.MimeTypeMap;
import android.app.Dialog;
import android.widget.LinearLayout;
import android.widget.EditText;
import android.widget.Button;
import android.widget.TextView;
import android.view.ViewGroup;
import android.view.Gravity;
import android.graphics.Color;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceResponse;
import android.view.inputmethod.EditorInfo;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.Collections;
import org.json.JSONArray;
 
import okhttp3.Cookie;
import okhttp3.CookieJar;
import okhttp3.Headers;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import android.os.Handler;
import android.os.Looper;

public class MainActivity extends BridgeActivity {

    static {
        try {
            System.loadLibrary("morisec");
        } catch (Throwable ignored) {}
    }

    public static native String getEngineSecurityKeyNative(Context context, String challenge);

    private static final CookieJar memoryCookieJar = new CookieJar() {
        private final HashMap<String, List<Cookie>> cookieStore = new HashMap<>();

        @Override
        public synchronized void saveFromResponse(HttpUrl url, List<Cookie> cookies) {
            List<Cookie> existing = cookieStore.get(url.host());
            HashMap<String, Cookie> map = new HashMap<>();
            if (existing != null) {
                for (Cookie c : existing) {
                    map.put(c.name(), c);
                }
            }
            for (Cookie c : cookies) {
                map.put(c.name(), c);
            }
            cookieStore.put(url.host(), new ArrayList<>(map.values()));
        }

        @Override
        public synchronized List<Cookie> loadForRequest(HttpUrl url) {
            List<Cookie> cookies = cookieStore.get(url.host());
            return cookies != null ? new ArrayList<>(cookies) : new ArrayList<>();
        }
    };

    private static final OkHttpClient sharedClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .cookieJar(memoryCookieJar)
            .build();

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String pendingFolderCallbackId = null;

    private void sendFolderCallback(String callbackId, String path) {
        mainHandler.post(() -> {
            try {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    String js = "if (window.__moriFolderCallback && window.__moriFolderCallback['" + callbackId + "']) { " +
                                "  window.__moriFolderCallback['" + callbackId + "'](" + JSONObject.quote(path != null ? path : "") + "); " +
                                "  delete window.__moriFolderCallback['" + callbackId + "']; " +
                                "}";
                    webView.evaluateJavascript(js, null);
                }
            } catch (Exception e) {
                Log.e("MoriMain", "sendFolderCallback error: " + e.getMessage());
            }
        });
    }

    private String getPathFromTreeUri(Uri uri) {
        if (uri == null) return "";
        try {
            String docId = DocumentsContract.getTreeDocumentId(uri);
            if (docId != null) {
                String[] parts = docId.split(":");
                if (parts.length >= 2) {
                    return parts[1];
                } else if (parts.length == 1 && !"primary".equalsIgnoreCase(parts[0])) {
                    return parts[0];
                }
            }
        } catch (Exception e) {
            try {
                String path = Uri.decode(uri.toString());
                int treeIdx = path.indexOf("/tree/");
                if (treeIdx != -1) {
                    String sub = path.substring(treeIdx + 6);
                    if (sub.contains(":")) {
                        return sub.substring(sub.indexOf(":") + 1);
                    }
                }
            } catch (Exception ignored) {}
        }
        return "";
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 201) {
            String selectedPath = "";
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                Uri treeUri = data.getData();
                try {
                    getContentResolver().takePersistableUriPermission(
                        treeUri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    );
                } catch (Exception ignored) {}
                selectedPath = getPathFromTreeUri(treeUri);
            }
            if (pendingFolderCallbackId != null) {
                sendFolderCallback(pendingFolderCallbackId, selectedPath);
                pendingFolderCallbackId = null;
            }
        }
    }

    public class MoriMainBridge {
        @JavascriptInterface
        public String getEngineSecurityKey(String challenge) {
            try {
                return getEngineSecurityKeyNative(MainActivity.this, challenge);
            } catch (Throwable e) {
                return "UNAUTHORIZED_CLONE";
            }
        }

        @JavascriptInterface
        public String getScrapersBinaryBase64() {
            try (InputStream is = getAssets().open("public/js/scrapers.bin")) {
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                int nRead;
                byte[] data = new byte[16384];
                while ((nRead = is.read(data, 0, data.length)) != -1) {
                    buffer.write(data, 0, nRead);
                }
                return Base64.encodeToString(buffer.toByteArray(), Base64.NO_WRAP);
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void httpRequestAsync(String optionsJson, String reqId) {
            executor.execute(() -> {
                String result;
                try {
                    result = httpRequest(optionsJson);
                } catch (Throwable t) {
                    String msg = t.getMessage() != null ? t.getMessage().replace("\"", "'") : t.getClass().getSimpleName();
                    result = "{\"status\":0,\"data\":\"\",\"error\":\"" + msg + "\"}";
                }
                final String finalResult = result;
                mainHandler.post(() -> {
                    try {
                        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                        if (webView != null) {
                            String js = "if (window.__moriNativeCallbacks && window.__moriNativeCallbacks['" + reqId + "']) { " +
                                        "  window.__moriNativeCallbacks['" + reqId + "'](" + JSONObject.quote(finalResult) + "); " +
                                        "  delete window.__moriNativeCallbacks['" + reqId + "']; " +
                                        "} else if (window.__moriShareCallbacks && window.__moriShareCallbacks['" + reqId + "']) { " +
                                        "  window.__moriShareCallbacks['" + reqId + "'](" + JSONObject.quote(finalResult) + "); " +
                                        "  delete window.__moriShareCallbacks['" + reqId + "']; " +
                                        "}";
                            webView.evaluateJavascript(js, null);
                        }
                    } catch (Exception e) {
                        Log.e("MoriMain", "httpRequestAsync callback error: " + e.getMessage());
                    }
                });
            });
        }

        @JavascriptInterface
        public String httpRequest(String optionsJson) {
            try {
                JSONObject opts = new JSONObject(optionsJson);
                String url        = opts.getString("url");
                String method     = opts.optString("method", "GET").toUpperCase();
                JSONObject hdrsIn = opts.optJSONObject("headers");
                String body       = opts.optString("data", null);
                JSONObject params = opts.optJSONObject("params");
                String respType   = opts.optString("responseType", "text");

                if (params != null && params.length() > 0) {
                    StringBuilder sb = new StringBuilder(url.contains("?") ? url + "&" : url + "?");
                    Iterator<String> keys = params.keys();
                    while (keys.hasNext()) {
                        String k = keys.next();
                        sb.append(Uri.encode(k)).append("=").append(Uri.encode(params.getString(k)));
                        if (keys.hasNext()) sb.append("&");
                    }
                    url = sb.toString();
                }

                OkHttpClient client = sharedClient;

                Headers.Builder hb = new Headers.Builder();
                if (hdrsIn != null) {
                    Iterator<String> keys = hdrsIn.keys();
                    while (keys.hasNext()) {
                        String k = keys.next();
                        String v = hdrsIn.optString(k, "");
                        try {
                            hb.set(k, v);
                        } catch (Exception ignored) {}
                    }
                }

                Request.Builder rb = new Request.Builder().url(url).headers(hb.build());
                if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method)) {
                    String ct = hdrsIn != null ? hdrsIn.optString("Content-Type", "") : "";
                    if (ct.isEmpty() && hdrsIn != null) {
                        ct = hdrsIn.optString("content-type", "");
                    }
                    if (ct.isEmpty()) {
                        ct = (body != null && (body.trim().startsWith("{") || body.trim().startsWith("[")))
                                ? "application/json; charset=utf-8"
                                : "application/x-www-form-urlencoded; charset=utf-8";
                    }
                    RequestBody rb2 = body != null
                            ? RequestBody.create(body, MediaType.parse(ct))
                            : RequestBody.create("", MediaType.parse(ct));
                    if ("PUT".equals(method)) rb = rb.put(rb2);
                    else if ("PATCH".equals(method)) rb = rb.patch(rb2);
                    else rb = rb.post(rb2);
                } else if ("DELETE".equals(method)) {
                    rb = rb.delete();
                } else if ("HEAD".equals(method)) {
                    rb = rb.head();
                } else {
                    rb = rb.get();
                }

                Response res = client.newCall(rb.build()).execute();

                JSONObject resHeaders = new JSONObject();
                for (String name : res.headers().names()) {
                    String lower = name.toLowerCase();
                    if ("set-cookie".equals(lower)) {
                        List<String> values = res.headers().values(name);
                        StringBuilder sb = new StringBuilder();
                        for (String v : values) {
                            if (sb.length() > 0) sb.append("\n");
                            sb.append(v);
                        }
                        resHeaders.put("set-cookie", sb.toString());
                    } else {
                        resHeaders.put(lower, res.header(name));
                    }
                }

                String resData;
                if ("arraybuffer".equals(respType) || "blob".equals(respType)) {
                    byte[] bytes = res.body() != null ? res.body().bytes() : new byte[0];
                    resData = Base64.encodeToString(bytes, Base64.NO_WRAP);
                } else {
                    resData = res.body() != null ? res.body().string() : "";
                }

                JSONObject result = new JSONObject();
                result.put("status", res.code());
                result.put("headers", resHeaders);
                result.put("data", resData);
                result.put("url", res.request().url().toString());
                return result.toString();

            } catch (Throwable e) {
                Log.e("MoriMain", "httpRequest error: " + e.getMessage());
                String msg = e.getMessage() != null ? e.getMessage().replace("\"", "'") : e.getClass().getSimpleName();
                return "{\"status\":0,\"data\":\"\",\"error\":\"" + msg + "\"}";
            }
        }

        @JavascriptInterface
        public String getCookiesForUrl(String urlStr) {
            try {
                String webViewCookies = android.webkit.CookieManager.getInstance().getCookie(urlStr);
                if (webViewCookies != null && !webViewCookies.isEmpty()) {
                    return webViewCookies;
                }
            } catch (Exception ignored) {}
            try {
                HttpUrl hu = HttpUrl.parse(urlStr);
                if (hu != null) {
                    List<Cookie> cookies = memoryCookieJar.loadForRequest(hu);
                    StringBuilder sb = new StringBuilder();
                    for (Cookie c : cookies) {
                        if (sb.length() > 0) sb.append("; ");
                        sb.append(c.name()).append("=").append(c.value());
                    }
                    return sb.toString();
                }
            } catch (Exception ignored) {}
            return "";
        }

        @JavascriptInterface
        public boolean saveBase64File(String base64Data, String folder, String fileName) {
            try {
                if (base64Data == null || fileName == null || base64Data.isEmpty() || fileName.isEmpty()) return false;
                byte[] bytes = Base64.decode(base64Data, Base64.NO_WRAP);
                
                File dir = null;
                boolean hasAllFiles = hasAllFilesPermission();
                if (hasAllFiles && folder != null && !folder.isEmpty()) {
                    dir = new File(Environment.getExternalStorageDirectory(), folder.replaceFirst("^/+", ""));
                }
                
                if (dir == null || !dir.exists()) {
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    String sub = "Mori";
                    if (folder != null && !folder.isEmpty()) {
                        String clean = folder.replaceFirst("^/+", "");
                        if (clean.toLowerCase().startsWith("download/")) {
                            sub = clean.substring(9).replaceFirst("^/+", "");
                        } else if (clean.equalsIgnoreCase("download")) {
                            sub = "Mori";
                        } else {
                            sub = "Mori/" + clean;
                        }
                    }
                    dir = new File(downloadsDir, sub);
                }
                
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                
                File targetFile = new File(dir, fileName);
                try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                    fos.write(bytes);
                    fos.flush();
                }
                
                MediaScannerConnection.scanFile(MainActivity.this, new String[]{targetFile.getAbsolutePath()}, null, null);
                return true;
            } catch (Exception e) {
                Log.e("MoriMain", "saveBase64File error: " + e.getMessage());
                return false;
            }
        }

        @JavascriptInterface
        public String getPendingHistoryList() {
            try {
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                return prefs.getString("mori_pending_share_history_list", "[]");
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public void clearPendingHistoryList() {
            try {
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                prefs.edit().remove("mori_pending_share_history_list").commit();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void saveSetting(String key, String value) {
            try {
                if (key == null || value == null) return;
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                prefs.edit().putString(key, value).commit();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void startDownloadService(String title) {
            try {
                Intent intent = new Intent(MainActivity.this, DownloadForegroundService.class);
                intent.putExtra("title", title != null ? title : getString(R.string.notif_downloading));
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    startForegroundService(intent);
                } else {
                    startService(intent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void stopDownloadService() {
            try {
                Intent intent = new Intent(MainActivity.this, DownloadForegroundService.class);
                stopService(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void showCompleteNotification(String title, String path) {
            try {
                android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm == null) return;
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    android.app.NotificationChannel ch = new android.app.NotificationChannel(
                            "mori_download_complete", getString(R.string.notif_channel_complete), android.app.NotificationManager.IMPORTANCE_DEFAULT);
                    ch.setDescription(getString(R.string.notif_channel_complete_desc));
                    nm.createNotificationChannel(ch);
                }
                androidx.core.app.NotificationCompat.Builder b = new androidx.core.app.NotificationCompat.Builder(MainActivity.this, "mori_download_complete")
                        .setSmallIcon(android.R.drawable.stat_sys_download_done)
                        .setContentTitle(getString(R.string.notif_complete))
                        .setContentText((title != null ? title : getString(R.string.notif_media)) + (path != null ? " · " + path : ""))
                        .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
                        .setAutoCancel(true);
                nm.notify((int) System.currentTimeMillis(), b.build());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void showFailedNotification(String title, String error) {
            try {
                android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm == null) return;
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    android.app.NotificationChannel ch = new android.app.NotificationChannel(
                            "mori_download_complete", getString(R.string.notif_channel_complete), android.app.NotificationManager.IMPORTANCE_DEFAULT);
                    ch.setDescription(getString(R.string.notif_channel_complete_desc));
                    nm.createNotificationChannel(ch);
                }
                androidx.core.app.NotificationCompat.Builder b = new androidx.core.app.NotificationCompat.Builder(MainActivity.this, "mori_download_complete")
                        .setSmallIcon(android.R.drawable.stat_notify_error)
                        .setContentTitle(getString(R.string.notif_failed))
                        .setContentText((title != null ? title : getString(R.string.notif_media)) + ": " + (error != null ? error : getString(R.string.notif_failed_reason)))
                        .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
                        .setAutoCancel(true);
                nm.notify((int) System.currentTimeMillis(), b.build());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void scanMediaFile(String rawPath) {
            try {
                if (rawPath == null || rawPath.isEmpty()) return;
                String cleanPath = rawPath;
                if (cleanPath.startsWith("file://")) {
                    cleanPath = cleanPath.substring(7);
                }
                cleanPath = URLDecoder.decode(cleanPath, "UTF-8");
                File f = new File(cleanPath);
                if (!f.isAbsolute() || !f.exists()) {
                    String rel = cleanPath.replaceFirst("^/+", "");
                    File test = new File(Environment.getExternalStorageDirectory(), rel);
                    if (test.exists()) {
                        f = test;
                    } else {
                        String strippedRel = rel.replaceFirst("^(?i)(download|documents|pictures|movies|music)/+", "");
                        File[] baseDirs = new File[] {
                            Environment.getExternalStorageDirectory(),
                            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES),
                            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS),
                            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC)
                        };
                        for (File baseDir : baseDirs) {
                            if (baseDir == null) continue;
                            File cand1 = new File(baseDir, rel);
                            if (cand1.exists()) { f = cand1; break; }
                            File cand2 = new File(baseDir, strippedRel);
                            if (cand2.exists()) { f = cand2; break; }
                        }
                    }
                }
                if (f.exists()) {
                    f.setLastModified(System.currentTimeMillis());
                    String name = f.getName().toLowerCase();
                    String mimeType = null;
                    int dot = name.lastIndexOf('.');
                    if (dot > 0 && dot < name.length() - 1) {
                        mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substring(dot + 1));
                    }
                    if (mimeType == null) {
                        if (name.endsWith(".mp4") || name.endsWith(".mov") || name.endsWith(".webm") || name.endsWith(".mkv")) mimeType = "video/mp4";
                        else if (name.endsWith(".mp3") || name.endsWith(".m4a") || name.endsWith(".wav") || name.endsWith(".flac")) mimeType = "audio/mpeg";
                        else if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp")) mimeType = "image/jpeg";
                        else if (name.endsWith(".pdf")) mimeType = "application/pdf";
                    }
                    final String finalMime = mimeType;
                    MediaScannerConnection.scanFile(
                        MainActivity.this.getApplicationContext(),
                        new String[]{ f.getAbsolutePath() },
                        finalMime != null ? new String[]{ finalMime } : null,
                        (scannedPath, uri) -> {
                            Log.d("MoriMainBridge", "MediaScanner indexed: " + scannedPath + " -> " + uri);
                            if (uri != null) {
                                try {
                                    android.content.ContentValues values = new android.content.ContentValues();
                                    long nowSec = System.currentTimeMillis() / 1000;
                                    long nowMs = System.currentTimeMillis();
                                    values.put(MediaStore.MediaColumns.DATE_MODIFIED, nowSec);
                                    values.put(MediaStore.MediaColumns.DATE_ADDED, nowSec);
                                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                                        values.put(MediaStore.MediaColumns.DATE_TAKEN, nowMs);
                                    }
                                    values.put(MediaStore.Video.VideoColumns.DATE_TAKEN, nowMs);
                                    values.put(MediaStore.Images.ImageColumns.DATE_TAKEN, nowMs);
                                    MainActivity.this.getContentResolver().update(uri, values, null, null);
                                } catch (Exception e) {
                                    Log.e("MoriMainBridge", "Failed to update MediaStore timestamp: " + e.getMessage());
                                }
                            }
                        }
                    );
                    try {
                        Intent mediaScanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                        mediaScanIntent.setData(Uri.fromFile(f));
                        MainActivity.this.sendBroadcast(mediaScanIntent);
                    } catch (Exception ignored) {}
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void installApk(String rawPath) {
            try {
                if (rawPath == null || rawPath.isEmpty()) return;
                String cleanPath = rawPath;
                if (cleanPath.startsWith("file://")) {
                    cleanPath = cleanPath.substring(7);
                }
                cleanPath = URLDecoder.decode(cleanPath, "UTF-8");
                File file = new File(cleanPath);
                if (!file.isAbsolute() || !file.exists()) {
                    String rel = cleanPath.replaceFirst("^/+", "");
                    File test = new File(Environment.getExternalStorageDirectory(), rel);
                    if (test.exists()) {
                        file = test;
                    } else {
                        String strippedRel = rel.replaceFirst("^(?i)(download|documents)/+", "");
                        File d1 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), strippedRel);
                        if (d1.exists()) file = d1;
                    }
                }
                if (!file.exists()) {
                    Log.e("MoriMainBridge", "APK file not found for install: " + cleanPath);
                    return;
                }

                Intent intent = new Intent(Intent.ACTION_VIEW);
                Uri apkUri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".fileprovider",
                    file
                );
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                MainActivity.this.startActivity(intent);
            } catch (Exception e) {
                Log.e("MoriMainBridge", "Failed to launch package installer", e);
            }
        }

        private Bitmap extractBestFrame(MediaMetadataRetriever retriever) {
            Bitmap bitmap = null;
            long timeUs = 2000000;
            try {
                String durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
                if (durStr != null) {
                    long durMs = Long.parseLong(durStr);
                    if (durMs > 0) {
                        timeUs = (durMs / 2) * 1000;
                    }
                }
            } catch (Throwable ignored) {}

            int videoWidth = 0;
            int videoHeight = 0;
            int rotation = 0;
            try {
                String wStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH);
                String hStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT);
                String rotStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);
                if (wStr != null) videoWidth = Integer.parseInt(wStr);
                if (hStr != null) videoHeight = Integer.parseInt(hStr);
                if (rotStr != null) rotation = Integer.parseInt(rotStr);
            } catch (Throwable ignored) {}

            boolean isTargetPortrait;
            if (rotation == 90 || rotation == 270) {
                isTargetPortrait = (videoWidth >= videoHeight);
            } else {
                isTargetPortrait = (videoHeight >= videoWidth);
            }

            int dstWidth = 640;
            int dstHeight = 640;
            if (videoWidth > 0 && videoHeight > 0) {
                int maxDim = 640;
                if (videoWidth >= videoHeight) {
                    dstWidth = maxDim;
                    dstHeight = Math.max(1, (videoHeight * maxDim) / videoWidth);
                } else {
                    dstHeight = maxDim;
                    dstWidth = Math.max(1, (videoWidth * maxDim) / videoHeight);
                }
            }

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
                try {
                    bitmap = retriever.getScaledFrameAtTime(timeUs, MediaMetadataRetriever.OPTION_CLOSEST, dstWidth, dstHeight);
                } catch (Throwable ignored) {}
            }
            if (bitmap == null) {
                try {
                    bitmap = retriever.getFrameAtTime(timeUs, MediaMetadataRetriever.OPTION_CLOSEST);
                } catch (Throwable ignored) {}
            }
            if (bitmap == null) {
                try {
                    bitmap = retriever.getFrameAtTime();
                } catch (Throwable ignored) {}
            }

            if (bitmap != null) {
                boolean isBitmapPortrait = bitmap.getHeight() >= bitmap.getWidth();

                if (isTargetPortrait != isBitmapPortrait) {
                    int rotToApply = (rotation != 0) ? rotation : 90;
                    try {
                        Matrix matrix = new Matrix();
                        matrix.postRotate(rotToApply);
                        Bitmap rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
                        if (rotated != bitmap) {
                            bitmap.recycle();
                            bitmap = rotated;
                        }
                    } catch (Throwable ignored) {}
                } else if (rotation == 180) {
                    try {
                        Matrix matrix = new Matrix();
                        matrix.postRotate(180);
                        Bitmap rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
                        if (rotated != bitmap) {
                            bitmap.recycle();
                            bitmap = rotated;
                        }
                    } catch (Throwable ignored) {}
                }

                if (bitmap.getWidth() > 640 || bitmap.getHeight() > 640) {
                    int bw = bitmap.getWidth();
                    int bh = bitmap.getHeight();
                    int scaledW, scaledH;
                    if (bw >= bh) {
                        scaledW = 640;
                        scaledH = Math.max(1, (bh * 640) / bw);
                    } else {
                        scaledH = 640;
                        scaledW = Math.max(1, (bw * 640) / bh);
                    }
                    try {
                        Bitmap scaled = Bitmap.createScaledBitmap(bitmap, scaledW, scaledH, true);
                        if (scaled != bitmap) {
                            bitmap.recycle();
                            bitmap = scaled;
                        }
                    } catch (Throwable ignored) {}
                }
            }
            return bitmap;
        }

        @JavascriptInterface
        public String getVideoThumbnail(String rawPath) {
            try {
                if (rawPath == null || rawPath.isEmpty()) return null;
                Bitmap bitmap = null;

                if (rawPath.startsWith("content://")) {
                    Uri contentUri = Uri.parse(rawPath);
                    MediaMetadataRetriever retriever = new MediaMetadataRetriever();
                    try {
                        retriever.setDataSource(getApplicationContext(), contentUri);
                        bitmap = extractBestFrame(retriever);
                    } catch (Throwable ignored) {
                        bitmap = null;
                    } finally {
                        try { retriever.release(); } catch (Throwable ignored) {}
                    }

                    if (bitmap == null && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                        try {
                            bitmap = getApplicationContext().getContentResolver().loadThumbnail(
                                contentUri, new Size(640, 640), null);
                        } catch (Throwable ignored) {}
                    }
                } else {
                    String cleanPath = rawPath;
                    if (cleanPath.startsWith("file://")) {
                        cleanPath = cleanPath.substring(7);
                    }
                    cleanPath = URLDecoder.decode(cleanPath, "UTF-8");
                    File f = new File(cleanPath);
                    if (!f.isAbsolute()) {
                        f = new File(Environment.getExternalStorageDirectory(), cleanPath.replaceFirst("^/+", ""));
                    }
                    if (!f.exists()) {
                        File d1 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), cleanPath.replaceFirst("^/+", ""));
                        if (d1.exists()) f = d1;
                    }
                    if (!f.exists()) {
                        File d2 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), cleanPath.replaceFirst("^/+", ""));
                        if (d2.exists()) f = d2;
                    }
                    if (!f.exists()) {
                        File d3 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), cleanPath.replaceFirst("^/+", ""));
                        if (d3.exists()) f = d3;
                    }

                    if (f.exists()) {
                        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
                        try {
                            retriever.setDataSource(f.getAbsolutePath());
                            bitmap = extractBestFrame(retriever);
                        } catch (Throwable ignored) {
                            bitmap = null;
                        } finally {
                            try { retriever.release(); } catch (Throwable ignored) {}
                        }

                        if (bitmap == null) {
                            try {
                                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                                    bitmap = ThumbnailUtils.createVideoThumbnail(f, new Size(640, 640), null);
                                } else {
                                    bitmap = ThumbnailUtils.createVideoThumbnail(f.getAbsolutePath(), MediaStore.Images.Thumbnails.MINI_KIND);
                                }
                            } catch (Throwable ignored) {
                                bitmap = null;
                            }
                        }
                    }
                }

                if (bitmap != null) {
                    if (bitmap.getWidth() > 640 || bitmap.getHeight() > 640) {
                        float scale = 640.0f / Math.max(bitmap.getWidth(), bitmap.getHeight());
                        int sw = Math.max(1, Math.round(bitmap.getWidth() * scale));
                        int sh = Math.max(1, Math.round(bitmap.getHeight() * scale));
                        Bitmap scaled = Bitmap.createScaledBitmap(bitmap, sw, sh, true);
                        if (scaled != bitmap) {
                            bitmap.recycle();
                            bitmap = scaled;
                        }
                    }
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 85, baos);
                    byte[] bytes = baos.toByteArray();
                    bitmap.recycle();
                    return "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return null;
        }

        @JavascriptInterface
        public boolean openFile(String rawPath) {
            try {
                if (rawPath == null || rawPath.isEmpty()) return false;
                String cleanPath = rawPath;
                if (cleanPath.startsWith("file://")) {
                    cleanPath = cleanPath.substring(7);
                }
                cleanPath = URLDecoder.decode(cleanPath, "UTF-8");
                File f = new File(cleanPath);
                if (!f.isAbsolute()) {
                    f = new File(Environment.getExternalStorageDirectory(), cleanPath.replaceFirst("^/+", ""));
                }
                if (!f.exists()) {
                    File d1 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), cleanPath.replaceFirst("^/+", ""));
                    if (d1.exists()) f = d1;
                }
                if (!f.exists()) {
                    File d2 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), cleanPath.replaceFirst("^/+", ""));
                    if (d2.exists()) f = d2;
                }
                if (!f.exists()) {
                    File d3 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), cleanPath.replaceFirst("^/+", ""));
                    if (d3.exists()) f = d3;
                }
                if (f.exists()) {
                    Uri fileUri;
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                        fileUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getApplicationContext().getPackageName() + ".fileprovider",
                            f
                        );
                    } else {
                        fileUri = Uri.fromFile(f);
                    }
                    String mime = null;
                    String name = f.getName().toLowerCase();
                    int dot = name.lastIndexOf('.');
                    if (dot > 0 && dot < name.length() - 1) {
                        mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substring(dot + 1));
                    }
                    if (mime == null) {
                        if (name.endsWith(".mp4") || name.endsWith(".mov") || name.endsWith(".webm") || name.endsWith(".mkv")) mime = "video/mp4";
                        else if (name.endsWith(".mp3") || name.endsWith(".m4a")) mime = "audio/mpeg";
                        else if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp")) mime = "image/jpeg";
                        else mime = "*/*";
                    }
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(fileUri, mime);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    return true;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return false;
        }

        @JavascriptInterface
        public boolean deleteFile(String rawPath) {
            try {
                if (rawPath == null || rawPath.isEmpty()) return false;
                String cleanPath = rawPath;
                if (cleanPath.startsWith("file://")) {
                    cleanPath = cleanPath.substring(7);
                }
                cleanPath = URLDecoder.decode(cleanPath, "UTF-8");
                File f = new File(cleanPath);
                if (!f.isAbsolute()) {
                    f = new File(Environment.getExternalStorageDirectory(), cleanPath.replaceFirst("^/+", ""));
                }
                if (!f.exists()) {
                    File d1 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), cleanPath.replaceFirst("^/+", ""));
                    if (d1.exists()) f = d1;
                }
                if (!f.exists()) {
                    File d2 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), cleanPath.replaceFirst("^/+", ""));
                    if (d2.exists()) f = d2;
                }
                if (!f.exists()) {
                    File d3 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), cleanPath.replaceFirst("^/+", ""));
                    if (d3.exists()) f = d3;
                }
                if (!f.exists()) {
                    File d4 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), cleanPath.replaceFirst("^/+", ""));
                    if (d4.exists()) f = d4;
                }
                if (!f.exists()) {
                    File d5 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC), cleanPath.replaceFirst("^/+", ""));
                    if (d5.exists()) f = d5;
                }
                if (f.exists()) {
                    String abs = f.getAbsolutePath();
                    boolean ok = f.delete();
                    try {
                        MediaScannerConnection.scanFile(MainActivity.this, new String[]{abs}, null, null);
                    } catch (Throwable ignored) {}
                    return ok;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return false;
        }

        @JavascriptInterface
        public boolean hasAllFilesPermission() {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                return Environment.isExternalStorageManager();
            }
            return ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void requestAllFilesPermission() {
            mainHandler.post(() -> {
                try {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                        try {
                            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                            startActivity(intent);
                        } catch (Exception e) {
                            Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                            startActivity(intent);
                        }
                    } else {
                        ActivityCompat.requestPermissions(MainActivity.this, new String[]{
                            Manifest.permission.READ_EXTERNAL_STORAGE,
                            Manifest.permission.WRITE_EXTERNAL_STORAGE
                        }, 102);
                    }
                } catch (Exception e) {
                    Log.e("MoriMain", "requestAllFilesPermission error: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void pickFolder(String callbackId) {
            pendingFolderCallbackId = callbackId;
            mainHandler.post(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                    startActivityForResult(intent, 201);
                } catch (Exception e) {
                    Log.e("MoriMain", "pickFolder error: " + e.getMessage());
                    sendFolderCallback(callbackId, "");
                    pendingFolderCallbackId = null;
                }
            });
        }

        @JavascriptInterface
        public boolean openFolder(String rawPath) {
            try {
                if (rawPath == null || rawPath.isEmpty()) return false;
                String cleanPath = rawPath.replaceFirst("^file://", "");
                cleanPath = URLDecoder.decode(cleanPath, "UTF-8");
                File dir = new File(cleanPath);
                if (!dir.isAbsolute()) {
                    dir = new File(Environment.getExternalStorageDirectory(), cleanPath.replaceFirst("^/+", ""));
                }
                if (dir.isFile()) {
                    dir = dir.getParentFile();
                }
                if (dir != null && dir.exists()) {
                    Uri uri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getApplicationContext().getPackageName() + ".fileprovider",
                        dir
                    );
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(uri, "resource/folder");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    try {
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Intent alt = new Intent(Intent.ACTION_GET_CONTENT);
                        alt.setDataAndType(uri, "*/*");
                        alt.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(alt);
                        return true;
                    }
                }
            } catch (Exception ignored) {}
            return false;
        }

        @JavascriptInterface
        public void openSnifferBrowser(String initialUrl) {
            mainHandler.post(() -> {
                try {
                    showSnifferBrowserDialog(initialUrl);
                } catch (Exception e) {
                    Log.e("MoriSniffer", "Error opening sniffer browser: " + e.getMessage());
                }
            });
        }
    }

    private static boolean isSnifferMedia(String url) {
        if (url == null || url.isEmpty()) return false;
        String lower = url.toLowerCase();
        if (lower.startsWith("data:") || lower.startsWith("javascript:")) return false;

        // Discard web assets, ads, trackers, thumbnails, and preview clips
        if (lower.contains(".css") || lower.contains(".woff") || lower.contains(".ttf") ||
            lower.contains(".ico") || lower.contains("favicon") || lower.contains("analytics") ||
            lower.contains("google-analytics") || lower.contains("doubleclick") ||
            lower.contains("googlesyndication") || lower.contains("adservice") ||
            lower.contains("scorecardresearch") || lower.contains("telemetry") ||
            lower.contains("/thumbnails/") || lower.contains("thumbnail_") ||
            lower.contains("preview.mp4") || lower.contains("short_preview") ||
            lower.contains("storyboard") || lower.contains("trafficjunky") ||
            lower.contains("exoclick") || lower.contains("juicyads") ||
            lower.contains("tsyndicate") || lower.contains("ero-advertising") ||
            lower.contains("popads") || lower.contains("adnxs") ||
            lower.contains("stripchat") || lower.contains("chaturbate") ||
            lower.contains("cam4") || lower.contains("livejasmin") ||
            lower.contains("bongacams") || lower.contains("banner") ||
            lower.contains("adtng") || lower.contains("adtng.com")) {
            return false;
        }

        // Discard fragmented HLS chunks (.ts segments like seg-1.ts, frag-1.ts, /hls/*.ts)
        if (lower.contains(".ts") && (lower.contains("seg-") || lower.contains("frag-") ||
            lower.contains("chunk") || lower.contains("/hls/") || lower.contains("slice-") ||
            lower.contains(".ts?"))) {
            return false;
        }

        // Standard playable video & stream formats
        if (lower.contains(".mp4") || lower.contains(".m3u8") || lower.contains(".webm") ||
            lower.contains(".mov") || lower.contains(".mkv") || lower.contains(".mpd") ||
            lower.contains(".mp3") || lower.contains(".m4a") || lower.contains(".aac") ||
            lower.contains(".flac") || lower.contains(".opus") || lower.contains(".ogg")) {
            return true;
        }

        // Platform-specific media signatures (TikTok, YouTube, Facebook, Vimeo, Media CDNs)
        if (lower.contains("/video/tos/") || lower.contains("tiktokcdn.com") ||
            lower.contains("byteoversea.com") || lower.contains("akamaized.net/video/") ||
            lower.contains("googlevideo.com/videoplayback") || lower.contains("video_versions") ||
            lower.contains("player.vimeo.com/video") || lower.contains("fbcdn.net/v/") ||
            lower.contains("wimg." + new String(new byte[]{114, 117, 108, 101, 51, 52, 46, 120, 120, 120})) ||
            lower.contains("api-cdn." + new String(new byte[]{114, 117, 108, 101, 51, 52, 46, 120, 120, 120})) ||
            lower.contains("mime_type=video_mp4") || lower.contains("mime=video") ||
            lower.contains(new String(new byte[]{112, 104, 110, 99, 100, 110, 46, 99, 111, 109})) ||
            lower.contains(new String(new byte[]{112, 111, 114, 110, 104, 117, 98, 46, 99, 111, 109}))) {
            return true;
        }

        // Booru full image posts (only original images under /images/)
        if ((lower.contains(new String(new byte[]{114, 117, 108, 101, 51, 52, 46, 120, 120, 120})) || lower.contains("booru")) && lower.contains("/images/") &&
            (lower.contains(".jpeg") || lower.contains(".jpg") || lower.contains(".png") || lower.contains(".gif") || lower.contains(".webp"))) {
            return true;
        }

        return false;
    }

    private void showSnifferBrowserDialog(String initialUrl) {
        final Dialog dialog = new Dialog(this, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        final Set<String> detectedUrls = Collections.synchronizedSet(new LinkedHashSet<String>());

        float density = getResources().getDisplayMetrics().density;
        int barHeight = (int) (52 * density);
        int pad8 = (int) (8 * density);
        int pad6 = (int) (6 * density);
        int pad12 = (int) (12 * density);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#121212"));

        // Header bar
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, barHeight));
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(pad8, pad6, pad8, pad6);
        header.setBackgroundColor(Color.parseColor("#181818"));

        // Back button
        TextView btnBack = new TextView(this);
        btnBack.setText("‹");
        btnBack.setTextSize(26);
        btnBack.setTextColor(Color.WHITE);
        btnBack.setGravity(Gravity.CENTER);
        btnBack.setPadding(pad8, 0, pad8, 0);

        // Close button
        TextView btnClose = new TextView(this);
        btnClose.setText("✕");
        btnClose.setTextSize(18);
        btnClose.setTextColor(Color.WHITE);
        btnClose.setGravity(Gravity.CENTER);
        btnClose.setPadding(pad8, 0, pad8, 0);

        // URL Input
        EditText urlInput = new EditText(this);
        LinearLayout.LayoutParams urlLp = new LinearLayout.LayoutParams(0, (int) (36 * density), 1.0f);
        urlLp.setMargins(pad6, 0, pad6, 0);
        urlInput.setLayoutParams(urlLp);
        urlInput.setBackgroundColor(Color.parseColor("#262626"));
        urlInput.setTextColor(Color.WHITE);
        urlInput.setHintTextColor(Color.parseColor("#888888"));
        urlInput.setHint(getString(R.string.sniff_hint));
        urlInput.setTextSize(13);
        urlInput.setSingleLine(true);
        urlInput.setPadding(pad12, 0, pad12, 0);
        urlInput.setImeOptions(EditorInfo.IME_ACTION_GO);

        // Sniff counter badge button
        Button btnSniff = new Button(this);
        btnSniff.setText(getString(R.string.sniff_count, 0));
        btnSniff.setTextSize(12);
        btnSniff.setTextColor(Color.WHITE);
        btnSniff.setBackgroundColor(Color.parseColor("#333333"));
        btnSniff.setPadding(pad12, 0, pad12, 0);
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, (int) (34 * density));
        btnLp.setMargins(pad6, 0, pad6, 0);
        btnSniff.setLayoutParams(btnLp);

        header.addView(btnBack);
        header.addView(urlInput);
        header.addView(btnSniff);
        header.addView(btnClose);
        root.addView(header);

        // Sniffer WebView
        WebView sniffWebView = new WebView(this);
        sniffWebView.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f));
        WebSettings ws = sniffWebView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setAllowFileAccess(true);
        ws.setUserAgentString("Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36");

        sniffWebView.setWebChromeClient(new WebChromeClient());
        sniffWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
                return handleUrlScheme(view, request.getUrl().toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrlScheme(view, url);
            }

            private boolean handleUrlScheme(WebView view, String url) {
                if (url == null || url.isEmpty()) return false;
                // Allow normal HTTP and HTTPS browsing
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false;
                }
                // Handle intent:// deep links with web fallback
                if (url.startsWith("intent://")) {
                    try {
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        String fallback = intent.getStringExtra("browser_fallback_url");
                        if (fallback != null && (fallback.startsWith("http://") || fallback.startsWith("https://"))) {
                            view.loadUrl(fallback);
                            return true;
                        }
                    } catch (Exception ignored) {}
                }
                // Silently block app-specific schemes (snssdk1180://, snssdk1233://, tiktok://, market://)
                // Returning true prevents Android WebView net::ERR_UNKNOWN_URL_SCHEME error
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                detectedUrls.clear();
                mainHandler.post(() -> {
                    btnSniff.setText(getString(R.string.sniff_count, 0));
                    btnSniff.setBackgroundColor(Color.parseColor("#333333"));
                });
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    String reqUrl = request.getUrl().toString();
                    if (isSnifferMedia(reqUrl)) {
                        detectedUrls.add(reqUrl);
                        mainHandler.post(() -> {
                            btnSniff.setText(getString(R.string.sniff_count, detectedUrls.size()));
                            btnSniff.setBackgroundColor(Color.parseColor("#2E7D32"));
                        });
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String finishedUrl) {
                super.onPageFinished(view, finishedUrl);
                urlInput.setText(finishedUrl);
            }
        });

        // Continuous DOM & Network scanner (handles dynamically streamed video upon user scroll / play)
        final Runnable periodicScanner = new Runnable() {
            @Override
            public void run() {
                if (!dialog.isShowing()) return;
                try {
                    sniffWebView.evaluateJavascript(
                        "(function(){" +
                        "  try {" +
                        "    var d = [];" +
                        "    document.querySelectorAll('video, audio').forEach(function(el){" +
                        "      if (el.src && el.src.startsWith('http')) d.push(el.src);" +
                        "      if (el.currentSrc && el.currentSrc.startsWith('http')) d.push(el.currentSrc);" +
                        "      el.querySelectorAll('source').forEach(function(s){" +
                        "        if (s.src && s.src.startsWith('http')) d.push(s.src);" +
                        "      });" +
                        "    });" +
                        "    var gv = document.getElementById('gelcomVideoPlayer');" +
                        "    if (gv) {" +
                        "      if (gv.src && gv.src.startsWith('http')) d.push(gv.src);" +
                        "      gv.querySelectorAll('source').forEach(function(s){ if (s.src && s.src.startsWith('http')) d.push(s.src); });" +
                        "    }" +
                        "    var gi = document.getElementById('image');" +
                        "    if (gi && gi.src && gi.src.startsWith('http')) d.push(gi.src);" +
                        "    var ifrs = document.getElementsByTagName('iframe');" +
                        "    for (var i = 0; i < ifrs.length; i++) {" +
                        "      if (ifrs[i].src && ifrs[i].src.match(/^http.*/)) d.push(ifrs[i].src);" +
                        "    }" +
                        "    if (window.performance && window.performance.getEntriesByType) {" +
                        "      window.performance.getEntriesByType('resource').forEach(function(r) {" +
                        "        d.push(r.name);" +
                        "      });" +
                        "    }" +
                        "    for (var k in window) {" +
                        "      if (k.indexOf('flashvars') !== -1 && window[k] && window[k].mediaDefinitions) {" +
                        "        window[k].mediaDefinitions.forEach(function(m){ if (m && m.videoUrl) d.push(m.videoUrl); });" +
                        "      }" +
                        "    }" +
                        "    return JSON.stringify(d);" +
                        "  } catch(e) { return '[]'; }" +
                        "})();",
                        resJson -> {
                            if (resJson != null && !resJson.isEmpty() && !resJson.equals("\"[]\"")) {
                                try {
                                    String clean = resJson;
                                    if (clean.startsWith("\"") && clean.endsWith("\"")) {
                                        clean = clean.substring(1, clean.length() - 1)
                                                     .replace("\\\"", "\"")
                                                     .replace("\\\\", "\\");
                                    }
                                    JSONArray arr = new JSONArray(clean);
                                    for (int i = 0; i < arr.length(); i++) {
                                        String itemUrl = arr.getString(i);
                                        if (isSnifferMedia(itemUrl)) {
                                            detectedUrls.add(itemUrl);
                                        }
                                    }
                                    mainHandler.post(() -> {
                                        btnSniff.setText(getString(R.string.sniff_count, detectedUrls.size()));
                                        if (detectedUrls.size() > 0) {
                                            btnSniff.setBackgroundColor(Color.parseColor("#2E7D32"));
                                        }
                                    });
                                } catch (Exception ignored) {}
                            }
                        }
                    );
                } catch (Exception ignored) {}
                if (dialog.isShowing()) {
                    mainHandler.postDelayed(this, 1500);
                }
            }
        };

        mainHandler.postDelayed(periodicScanner, 1500);

        root.addView(sniffWebView);
        dialog.setContentView(root);

        btnBack.setOnClickListener(v -> {
            if (sniffWebView.canGoBack()) sniffWebView.goBack();
        });

        btnClose.setOnClickListener(v -> dialog.dismiss());

        urlInput.setOnEditorActionListener((v, actionId, event) -> {
            String target = urlInput.getText().toString().trim();
            if (!target.isEmpty()) {
                if (!target.startsWith("http://") && !target.startsWith("https://")) {
                    target = "https://" + target;
                }
                sniffWebView.loadUrl(target);
            }
            return true;
        });

        btnSniff.setOnClickListener(v -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("pageTitle", sniffWebView.getTitle() != null ? sniffWebView.getTitle() : getString(R.string.sniff_page_title));
                payload.put("pageUrl", sniffWebView.getUrl() != null ? sniffWebView.getUrl() : "");
                JSONArray urlArray = new JSONArray();
                synchronized (detectedUrls) {
                    for (String u : detectedUrls) {
                        urlArray.put(u);
                    }
                }
                payload.put("urls", urlArray);
                final String jsonStr = payload.toString();

                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "if (typeof window.__moriLiveSnifferCallback === 'function') { " +
                        "  window.__moriLiveSnifferCallback(" + jsonStr + "); " +
                        "}", null);
                }
            } catch (Exception ignored) {}
            dialog.dismiss();
        });

        dialog.setOnDismissListener(d -> {
            mainHandler.removeCallbacks(periodicScanner);
            sniffWebView.stopLoading();
            sniffWebView.loadUrl("about:blank");
            sniffWebView.destroy();
        });

        String target = initialUrl != null ? initialUrl.trim() : "";
        if (target.isEmpty()) target = "https://google.com";
        else if (!target.startsWith("http://") && !target.startsWith("https://")) {
            target = "https://" + target;
        }
        urlInput.setText(target);
        sniffWebView.loadUrl(target);

        dialog.show();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new MoriMainBridge(), "MoriMainBridge");
            WebSettings settings = webView.getSettings();
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
            settings.setMediaPlaybackRequiresUserGesture(false);

            webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();
                    if (url.startsWith("whatsapp://") || url.contains("wa.me") || url.contains("api.whatsapp.com")) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(intent);
                            return true;
                        } catch (Exception e) {
                            return super.shouldOverrideUrlLoading(view, request);
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url != null && (url.startsWith("whatsapp://") || url.contains("wa.me") || url.contains("api.whatsapp.com"))) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(intent);
                            return true;
                        } catch (Exception e) {
                            return super.shouldOverrideUrlLoading(view, url);
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, url);
                }
            });
        }

        handleIntent(getIntent());
        requestNotificationPermission();
    }

    private void requestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "if (typeof window.moriPauseAllMedia === 'function') window.moriPauseAllMedia();", null);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(new Runnable() {
                @Override
                public void run() {
                    getBridge().getWebView().evaluateJavascript(
                        "if (typeof window.checkAndMergePendingHistory === 'function') window.checkAndMergePendingHistory();" +
                        "window.dispatchEvent(new CustomEvent('mori_app_resumed'));", null);
                }
            }, 300);
        }
    }

    private void handleIntent(Intent intent) {
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (sharedText != null) {
                    final String escapedText = sharedText.replace("'", "\\'").replace("\"", "\\\"").replace("\n", " ");
                    getBridge().getWebView().postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            getBridge().getWebView().evaluateJavascript("window.moriShareText = '" + escapedText + "';", null);
                            getBridge().triggerWindowJSEvent("moriShareIntent", "{ \"text\": \"" + escapedText + "\" }");
                        }
                    }, 1000);
                }
            }
        }
    }
}
