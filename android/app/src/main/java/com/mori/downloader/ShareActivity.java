package com.mori.downloader;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import okhttp3.Cookie;
import okhttp3.CookieJar;
import okhttp3.Headers;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class ShareActivity extends AppCompatActivity {

    private static final String TAG = "MoriShare";
    private static final String CHANNEL_ID = "mori_download";
    private static final int NOTIF_ID_BASE = 4000;

    private WebView webView;
    private String sharedUrl = "";
    private ExecutorService executor = Executors.newCachedThreadPool();
    private Handler mainHandler = new Handler(Looper.getMainLooper());
    private int notifCounter = 0;

    private static final CookieJar memoryCookieJar = new CookieJar() {
        private final HashMap<String, List<Cookie>> cookieStore = new HashMap<>();

        @Override
        public void saveFromResponse(HttpUrl url, List<Cookie> cookies) {
            cookieStore.put(url.host(), cookies);
        }

        @Override
        public List<Cookie> loadForRequest(HttpUrl url) {
            List<Cookie> cookies = cookieStore.get(url.host());
            return cookies != null ? cookies : new ArrayList<>();
        }
    };

    private static final OkHttpClient sharedClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .followRedirects(true)
            .cookieJar(memoryCookieJar)
            .build();

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();

        // Extract shared URL from intent
        Intent intent = getIntent();
        if (Intent.ACTION_SEND.equals(intent.getAction()) && "text/plain".equals(intent.getType())) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null) {
                // Extract first URL from text
                java.util.regex.Matcher m = java.util.regex.Pattern
                        .compile("https?://[^\\s]+")
                        .matcher(text);
                sharedUrl = m.find() ? m.group() : text.trim();
            }
        }

        if (sharedUrl.isEmpty()) {
            finish();
            return;
        }

        if (getWindow() != null) {
            getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        setupWebView();
        setContentView(webView);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        executor.shutdownNow();
        super.onDestroy();
    }

    private void setupWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.TRANSPARENT);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Expose JavascriptInterface
        webView.addJavascriptInterface(new MoriShareBridge(), "MoriShareBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectConfig();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        webView.loadUrl("file:///android_asset/public/share.html");
    }

    private void injectConfig() {
        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String lang = prefs.getString("mori_lang", "en");
        String theme = prefs.getString("mori_theme", "dark");
        String font = prefs.getString("mori_font", "display");
        String preferServer = prefs.getString("mori_prefer_server", "ask");
        String downloadPath = prefs.getString("mori_download_path", "Mori");
        String autoFolder = prefs.getString("mori_auto_folder", "true");
        String filenameTemplate = prefs.getString("mori_filename", "title");

        String escapedUrl = sharedUrl
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", " ")
                .replace("\r", "");
        String js = "window.__MORI_SHARE_URL = '" + escapedUrl + "';" +
                "try { " +
                "  localStorage.setItem('mori_lang', '" + lang + "');" +
                "  localStorage.setItem('mori_theme', '" + theme + "');" +
                "  localStorage.setItem('mori_font', '" + font + "');" +
                "  localStorage.setItem('mori_prefer_server', '" + preferServer + "');" +
                "  localStorage.setItem('mori_download_path', '" + downloadPath + "');" +
                "  localStorage.setItem('mori_auto_folder', '" + autoFolder + "');" +
                "  localStorage.setItem('mori_filename', '" + filenameTemplate + "');" +
                "} catch(e) {};" +
                "if (typeof window.onMoriConfigReady === 'function') window.onMoriConfigReady();";
        webView.evaluateJavascript(js, null);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Mori Downloads", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Mori download notifications");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private void showDownloadCompleteNotification(String title) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("Download Complete ✓")
                .setContentText(title)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);
        nm.notify(NOTIF_ID_BASE + (notifCounter++), b.build());
    }

    private void showDownloadFailedNotification(String title, String reason) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_error)
                .setContentTitle("Download Failed")
                .setContentText(title + ": " + reason)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);
        nm.notify(NOTIF_ID_BASE + (notifCounter++), b.build());
    }

    public class MoriShareBridge {

        /**
         * Synchronous HTTP request bridge (mirrors CapacitorHttp API shape).
         * Called from httpHelper.js via window.MoriShareBridge.
         * NOTE: Must be called off the main thread (Android enforces this).
         *
         * @param optionsJson JSON: { url, method, headers, data, params, responseType }
         * @return JSON: { status, headers, data }
         */
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

                // Append query params
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
                        hb.add(k, hdrsIn.getString(k));
                    }
                }

                Request.Builder rb = new Request.Builder().url(url).headers(hb.build());
                if ("POST".equals(method) || "PUT".equals(method)) {
                    String ct = hdrsIn != null
                            ? hdrsIn.optString("Content-Type", "application/x-www-form-urlencoded")
                            : "application/x-www-form-urlencoded";
                    RequestBody rb2 = body != null
                            ? RequestBody.create(body, MediaType.parse(ct))
                            : RequestBody.create("", MediaType.parse(ct));
                    rb = "PUT".equals(method) ? rb.put(rb2) : rb.post(rb2);
                } else if ("DELETE".equals(method)) {
                    rb = rb.delete();
                }

                Response res = client.newCall(rb.build()).execute();

                JSONObject resHeaders = new JSONObject();
                for (String name : res.headers().names()) {
                    resHeaders.put(name.toLowerCase(), res.header(name));
                }

                String resData;
                if ("arraybuffer".equals(respType) || "blob".equals(respType)) {
                    byte[] bytes = res.body() != null ? res.body().bytes() : new byte[0];
                    resData = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
                } else {
                    resData = res.body() != null ? res.body().string() : "";
                }

                JSONObject result = new JSONObject();
                result.put("status", res.code());
                result.put("headers", resHeaders);
                result.put("data", resData);
                return result.toString();

            } catch (Exception e) {
                Log.e(TAG, "httpRequest error: " + e.getMessage());
                return "{\"status\":0,\"data\":\"\",\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}";
            }
        }

        /**
         * Download a file natively via OkHttp.
         * Called from share.js after scraping succeeds.
         *
         * @param url         Direct media URL
         * @param filename    Target filename (will be sanitized)
         * @param folder      Subfolder under Downloads/ (e.g. "Mori/TikTok")
         * @param headersJson Extra headers JSON or empty string
         * @param title       Title shown in completion notification
         */
        @JavascriptInterface
        public void downloadFile(String url, String filename, String folder, String headersJson, String title) {
            executor.execute(() -> {
                try {
                    OkHttpClient client = sharedClient;

                    Headers.Builder hb = new Headers.Builder();
                    hb.add("User-Agent", "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36");
                    if (headersJson != null && !headersJson.isEmpty()) {
                        try {
                            JSONObject hdrs = new JSONObject(headersJson);
                            Iterator<String> keys = hdrs.keys();
                            while (keys.hasNext()) {
                                String k = keys.next();
                                hb.set(k, hdrs.getString(k));
                            }
                        } catch (Exception ignored) {}
                    }

                    Request req = new Request.Builder().url(url).headers(hb.build()).build();
                    Response res = client.newCall(req).execute();

                    if (!res.isSuccessful() || res.body() == null) {
                        final String errMsg = "HTTP " + res.code();
                        mainHandler.post(() -> {
                            showDownloadFailedNotification(title, errMsg);
                            webView.evaluateJavascript(
                                "window.onDownloadFailed && window.onDownloadFailed('" +
                                esc(filename) + "', '" + esc(errMsg) + "')", null);
                        });
                        return;
                    }

                    // Save under DIRECTORY_DOWNLOADS (e.g. Download/Mori or Download/Mori/TikTok)
                    File publicBaseDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File targetDir = new File(publicBaseDir, (folder != null && !folder.isEmpty()) ? folder : "Mori");
                    if (!targetDir.exists()) targetDir.mkdirs();

                    File targetFile = new File(targetDir, sanitize(filename));
                    if (targetFile.exists()) {
                        int dot = filename.lastIndexOf('.');
                        String stem = dot > 0 ? filename.substring(0, dot) : filename;
                        String ext  = dot > 0 ? filename.substring(dot) : "";
                        int c = 1;
                        while (targetFile.exists()) {
                            targetFile = new File(targetDir, stem + "_" + c + ext);
                            c++;
                        }
                    }

                    // Write file to disk
                    try (InputStream is = res.body().byteStream();
                         FileOutputStream fos = new FileOutputStream(targetFile)) {
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = is.read(buf)) != -1) fos.write(buf, 0, n);
                    }

                    // Explicitly set modified timestamp to NOW (today's date)
                    targetFile.setLastModified(System.currentTimeMillis());

                    // MediaScanner scanFile trigger for Android Gallery indexing
                    final File saved = targetFile;
                    String savedName = saved.getName().toLowerCase();
                    String mimeType = null;
                    int dotIdx = savedName.lastIndexOf('.');
                    if (dotIdx >= 0 && dotIdx < savedName.length() - 1) {
                        String ext = savedName.substring(dotIdx + 1);
                        mimeType = android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                    }

                    if (mimeType == null) {
                        if (savedName.endsWith(".mp3") || savedName.endsWith(".m4a") || savedName.endsWith(".flac") || savedName.endsWith(".aac") || savedName.endsWith(".wav")) {
                            mimeType = "audio/*";
                        } else if (savedName.endsWith(".jpg") || savedName.endsWith(".jpeg") || savedName.endsWith(".png") || savedName.endsWith(".webp") || savedName.endsWith(".gif")) {
                            mimeType = "image/*";
                        } else if (savedName.endsWith(".mp4") || savedName.endsWith(".mov") || savedName.endsWith(".webm") || savedName.endsWith(".mkv")) {
                            mimeType = "video/*";
                        }
                    }

                    final String finalMime = mimeType;
                    android.media.MediaScannerConnection.scanFile(
                            getApplicationContext(),
                            new String[]{saved.getAbsolutePath()},
                            finalMime != null ? new String[]{finalMime} : null,
                            (path, uri) -> {
                                Log.d(TAG, "MediaScanner indexed: " + path + " -> " + uri);
                                if (uri != null) {
                                    try {
                                        ContentValues values = new ContentValues();
                                        long nowSec = System.currentTimeMillis() / 1000;
                                        long nowMs = System.currentTimeMillis();
                                        values.put(MediaStore.MediaColumns.DATE_MODIFIED, nowSec);
                                        values.put(MediaStore.MediaColumns.DATE_ADDED, nowSec);
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                            values.put(MediaStore.MediaColumns.DATE_TAKEN, nowMs);
                                        }
                                        values.put(MediaStore.Video.VideoColumns.DATE_TAKEN, nowMs);
                                        values.put(MediaStore.Images.ImageColumns.DATE_TAKEN, nowMs);
                                        getContentResolver().update(uri, values, null, null);
                                    } catch (Exception e) {
                                        Log.e(TAG, "Failed to update MediaStore timestamp: " + e.getMessage());
                                    }
                                }
                            });

                    // Broadcast intent fallback for older gallery apps
                    try {
                        Intent mediaScanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                        mediaScanIntent.setData(Uri.fromFile(saved));
                        sendBroadcast(mediaScanIntent);
                    } catch (Exception ignored) {}

                    mainHandler.post(() -> {
                        showDownloadCompleteNotification(title);
                        webView.evaluateJavascript(
                            "window.onDownloadComplete && window.onDownloadComplete('" +
                            esc(filename) + "', '" + esc(saved.getAbsolutePath()) + "')", null);
                    });

                } catch (Exception e) {
                    Log.e(TAG, "downloadFile error: " + e.getMessage());
                    mainHandler.post(() -> {
                        showDownloadFailedNotification(title, e.getMessage());
                        webView.evaluateJavascript(
                            "window.onDownloadFailed && window.onDownloadFailed('" +
                            esc(filename) + "', '" + esc(e.getMessage()) + "')", null);
                    });
                }
            });
        }

        /** Save pending share history entry to SharedPreferences for main app to merge */
        @JavascriptInterface
        public void savePendingHistory(String itemJson) {
            try {
                if (itemJson == null || itemJson.trim().isEmpty()) return;
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String existingListStr = prefs.getString("mori_pending_share_history_list", "[]");
                org.json.JSONArray list;
                try {
                    list = new org.json.JSONArray(existingListStr);
                } catch (Exception e) {
                    list = new org.json.JSONArray();
                }
                list.put(itemJson);
                prefs.edit().putString("mori_pending_share_history_list", list.toString()).commit();
            } catch (Exception e) {
                Log.e(TAG, "savePendingHistory error: " + e.getMessage());
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

        /** Dismiss the share overlay */
        @JavascriptInterface
        public void dismiss() {
            mainHandler.post(() -> {
                try {
                    android.webkit.CookieManager.getInstance().flush();
                } catch (Exception ignored) {}
                finish();
            });
        }

        /** Show a native Toast message */
        @JavascriptInterface
        public void showToast(String message) {
            mainHandler.post(() ->
                android.widget.Toast.makeText(ShareActivity.this, message, android.widget.Toast.LENGTH_SHORT).show()
            );
        }

        private String esc(String s) {
            if (s == null) return "";
            return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", "");
        }
    }
    
    private String sanitize(String name) {
        if (name == null) return "Mori_Media";
        String clean = name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        // Remove leading dots to prevent creating Android hidden files (.filename)
        while (clean.startsWith(".")) {
            clean = clean.substring(1).trim();
        }
        return clean.isEmpty() ? "Mori_Media" : clean;
    }
}
