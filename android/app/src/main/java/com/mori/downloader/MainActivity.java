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
 
public class MainActivity extends BridgeActivity {

    public class MoriMainBridge {
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
