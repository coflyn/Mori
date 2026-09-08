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
import java.net.URLDecoder;
import android.os.Environment;
import android.media.MediaScannerConnection;
import android.media.MediaMetadataRetriever;
import android.graphics.Bitmap;
import android.util.Base64;
import android.util.Log;
import android.webkit.MimeTypeMap;
 
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
            .followSslRedirects(true)
            .cookieJar(memoryCookieJar)
            .build();

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

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
                    resHeaders.put(name.toLowerCase(), res.header(name));
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
                return result.toString();

            } catch (Throwable e) {
                Log.e("MoriMain", "httpRequest error: " + e.getMessage());
                String msg = e.getMessage() != null ? e.getMessage().replace("\"", "'") : e.getClass().getSimpleName();
                return "{\"status\":0,\"data\":\"\",\"error\":\"" + msg + "\"}";
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
                intent.putExtra("title", title != null ? title : "Downloading Media...");
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
                            "mori_download_complete", "Mori Downloads", android.app.NotificationManager.IMPORTANCE_DEFAULT);
                    nm.createNotificationChannel(ch);
                }
                androidx.core.app.NotificationCompat.Builder b = new androidx.core.app.NotificationCompat.Builder(MainActivity.this, "mori_download_complete")
                        .setSmallIcon(android.R.drawable.stat_sys_download_done)
                        .setContentTitle("Download Complete ✓")
                        .setContentText((title != null ? title : "Media") + (path != null ? " · " + path : ""))
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
                            "mori_download_complete", "Mori Downloads", android.app.NotificationManager.IMPORTANCE_DEFAULT);
                    nm.createNotificationChannel(ch);
                }
                androidx.core.app.NotificationCompat.Builder b = new androidx.core.app.NotificationCompat.Builder(MainActivity.this, "mori_download_complete")
                        .setSmallIcon(android.R.drawable.stat_notify_error)
                        .setContentTitle("Download Failed")
                        .setContentText((title != null ? title : "Media") + ": " + (error != null ? error : "Failed"))
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
                if (!f.isAbsolute()) {
                    f = new File(Environment.getExternalStorageDirectory(), cleanPath.replaceFirst("^/+", ""));
                }
                if (!f.exists()) {
                    File d1 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), cleanPath.replaceFirst("^/+", ""));
                    if (d1.exists()) f = d1;
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
                        else if (name.endsWith(".mp3") || name.endsWith(".m4a")) mimeType = "audio/mpeg";
                        else if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp")) mimeType = "image/jpeg";
                    }
                    final String finalMime = mimeType;
                    MediaScannerConnection.scanFile(
                        getApplicationContext(),
                        new String[]{ f.getAbsolutePath() },
                        finalMime != null ? new String[]{ finalMime } : null,
                        (scannedPath, uri) -> {
                            Log.d("MoriMainBridge", "MediaScanner indexed: " + scannedPath + " -> " + uri);
                        }
                    );
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public String getVideoThumbnail(String rawPath) {
            try {
                if (rawPath == null || rawPath.isEmpty()) return null;
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
                if (f.exists()) {
                    MediaMetadataRetriever retriever = new MediaMetadataRetriever();
                    retriever.setDataSource(f.getAbsolutePath());
                    Bitmap bitmap = retriever.getFrameAtTime(1000000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                    if (bitmap == null) {
                        bitmap = retriever.getFrameAtTime();
                    }
                    retriever.release();
                    if (bitmap != null) {
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 70, baos);
                        byte[] bytes = baos.toByteArray();
                        bitmap.recycle();
                        return "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return null;
        }
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
    public void onResume() {
        super.onResume();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(new Runnable() {
                @Override
                public void run() {
                    getBridge().getWebView().evaluateJavascript(
                        "if (typeof window.checkAndMergePendingHistory === 'function') window.checkAndMergePendingHistory();", null);
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
