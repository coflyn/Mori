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
import android.media.ThumbnailUtils;
import android.util.Size;
import android.provider.MediaStore;
import android.graphics.Matrix;
import androidx.core.content.FileProvider;
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
                if (!f.exists()) {
                    File d2 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), cleanPath.replaceFirst("^/+", ""));
                    if (d2.exists()) f = d2;
                }
                if (!f.exists()) {
                    File d3 = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), cleanPath.replaceFirst("^/+", ""));
                    if (d3.exists()) f = d3;
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

            int dstWidth = 512;
            int dstHeight = 512;
            if (videoWidth > 0 && videoHeight > 0) {
                int maxDim = 512;
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

                if (bitmap.getWidth() > 512 || bitmap.getHeight() > 512) {
                    int bw = bitmap.getWidth();
                    int bh = bitmap.getHeight();
                    int scaledW, scaledH;
                    if (bw >= bh) {
                        scaledW = 512;
                        scaledH = Math.max(1, (bh * 512) / bw);
                    } else {
                        scaledH = 512;
                        scaledW = Math.max(1, (bw * 512) / bh);
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
                                contentUri, new Size(512, 512), null);
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
                                    bitmap = ThumbnailUtils.createVideoThumbnail(f, new Size(512, 512), null);
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
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 75, baos);
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
