package com.sparkbot.academy;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Full-frame immersive Android tablet & phone host activity for SparkBot: Engineering Academy.
 * Enables edge-to-edge sticky immersive display across both landscape and portrait orientations,
 * display cutout fill, hardware-accelerated WebGL rendering, and zero-flash dark launch background.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureFullFrameWindow();
        configureWebViewForTablet();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveSystemBars();
        }
    }

    private void configureFullFrameWindow() {
        Window window = getWindow();
        if (window == null) return;

        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(lp);
        }

        applyImmersiveSystemBars();
    }

    private void applyImmersiveSystemBars() {
        Window window = getWindow();
        if (window == null) return;
        View decorView = window.getDecorView();

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }

    private void configureWebViewForTablet() {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        webView.setBackgroundColor(Color.parseColor("#0b1222"));
        WebSettings settings = webView.getSettings();
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDomStorageEnabled(true);
    }
}
