package cn.weatherly.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public final class MainActivity extends Activity {
  private static final String HOST = "appassets.androidplatform.net";
  private static final String HOME = "https://" + HOST + "/assets/index.html";
  private static final int LOCATION_REQUEST = 101;
  private WebView webView;
  private FrameLayout root;
  private GeolocationPermissions.Callback locationCallback;
  private String locationOrigin;
  private String activeScene;

  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    root = new FrameLayout(this);
    webView = new WebView(this);
    root.addView(webView,new FrameLayout.LayoutParams(-1,-1));
    setContentView(root);
    if (Build.VERSION.SDK_INT >= 30) {
      getWindow().setDecorFitsSystemWindows(false);
      root.setOnApplyWindowInsetsListener((view,insets) -> {
        Insets system = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
        Insets ime = insets.getInsets(WindowInsets.Type.ime());
        view.setPadding(system.left,system.top,system.right,Math.max(system.bottom,ime.bottom));
        return insets;
      });
      root.requestApplyInsets();
    } else {
      root.setFitsSystemWindows(true);
    }
    applyBars();
    WeatherRepository.prefs(this).edit().putString("appTheme","light").apply();
    String widgetStyle=WeatherRepository.prefs(this).getString("widgetTheme","weather");
    if(!"weather".equals(widgetStyle)&&!"light".equals(widgetStyle)){WeatherRepository.prefs(this).edit().putString("widgetTheme","weather").apply();WeatherWidgetProvider.updateAll(this);}
    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setUserAgentString(settings.getUserAgentString()+" Weatherly/1.4.0");
    settings.setDomStorageEnabled(true);
    settings.setGeolocationEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setMediaPlaybackRequiresUserGesture(true);
    settings.setSupportMultipleWindows(false);
    if (Build.VERSION.SDK_INT >= 33) settings.setAlgorithmicDarkeningAllowed(false);
    else if (Build.VERSION.SDK_INT >= 29) settings.setForceDark(WebSettings.FORCE_DARK_OFF);
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    WebView.setWebContentsDebuggingEnabled(false);
    webView.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!HOST.equals(uri.getHost())) return null;
        if("https".equals(uri.getScheme()) && "/native/location".equals(uri.getPath()) && "GET".equals(request.getMethod()))return LocationResolver.response(getApplicationContext(),uri);
        if("https".equals(uri.getScheme()) && "/native/data".equals(uri.getPath()) && "GET".equals(request.getMethod())) return WeatherServices.response(uri);
        if("https".equals(uri.getScheme()) && "/native/sync".equals(uri.getPath()) && "GET".equals(request.getMethod())) {
          String payload=uri.getQueryParameter("data");
          if(payload==null||payload.length()>12000)return emptyResponse();
          try {
            org.json.JSONObject data=new org.json.JSONObject(payload);
            if(!WeatherRepository.sync(getApplicationContext(),data))return emptyResponse();
            WeatherRepository.prefs(getApplicationContext()).edit().putString("appTheme","light").apply();
            WeatherWidgetProvider.updateAll(getApplicationContext());
            if(WeatherWidgetProvider.hasWidgets(getApplicationContext()))WidgetRefreshService.schedule(getApplicationContext(),true);
            return new WebResourceResponse("application/json","UTF-8",200,"OK",new HashMap<>(),new ByteArrayInputStream("{\"ok\":true}".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
          }catch(Exception error){return emptyResponse();}
        }
        String assetPath = uri.getPath();
        if (!"https".equals(uri.getScheme()) || assetPath == null || !assetPath.startsWith("/assets/") || assetPath.contains("..") || assetPath.contains("\\")) return emptyResponse();
        String asset = assetPath.substring(8);
        String mime = asset.endsWith(".html") ? "text/html" : asset.endsWith(".css") ? "text/css" : (asset.endsWith(".js")||asset.endsWith(".mjs")) ? "application/javascript" : asset.endsWith(".svg") ? "image/svg+xml" : asset.endsWith(".png") ? "image/png" : "application/octet-stream";
        try {
          Map<String,String> headers = new HashMap<>();
          headers.put("Cache-Control","no-cache");
          headers.put("X-Content-Type-Options","nosniff");
          return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open(asset));
        } catch(IOException error) { return emptyResponse(); }
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
        return routeNavigation(request.getUrl(),request.isForMainFrame());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,String url) {
        return routeNavigation(Uri.parse(url),true);
      }
    });
    webView.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onConsoleMessage(ConsoleMessage message) {
        if(message.messageLevel()==ConsoleMessage.MessageLevel.ERROR)android.util.Log.e("Weatherly",message.message());
        // The bundled page emits only an enum; no native JavaScript bridge is exposed.
        if (message.message().equals("WEATHERLY_THEME:light")) applyBars();
        else if(message.message().startsWith("WEATHERLY_SKY:")) applySky(message.message().substring(14));
        return true;
      }
      @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback) {
        if (!origin.equals("https://"+HOST) && !origin.equals("https://"+HOST+"/")) { callback.invoke(origin,false,false); return; }
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED) callback.invoke(origin,true,false);
        else {
          if(locationCallback!=null) locationCallback.invoke(locationOrigin,false,false);
          locationCallback=callback;locationOrigin=origin;
          requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION,Manifest.permission.ACCESS_FINE_LOCATION},LOCATION_REQUEST);
        }
      }
    });
    webView.loadUrl(HOME);
  }
  private WebResourceResponse emptyResponse() {
    return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",new HashMap<>(),new ByteArrayInputStream(new byte[0]));
  }
  private boolean routeNavigation(Uri uri,boolean mainFrame) {
    if(mainFrame && HOST.equals(uri.getHost()) && "https".equals(uri.getScheme()) && "/native/cards".equals(uri.getPath())) {
      startActivity(new Intent(this,CardCenterActivity.class));return true;
    }
    if (HOST.equals(uri.getHost()) && "https".equals(uri.getScheme()) && uri.getPath() != null && uri.getPath().startsWith("/assets/")) return false;
    if (mainFrame && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) {
      try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); }
      catch(ActivityNotFoundException error) { Toast.makeText(this,"暂时无法打开链接",Toast.LENGTH_SHORT).show(); }
    }
    return true;
  }
  private void applySky(String scene) {
    String color;
    switch(scene){case "sunny":color="#2859AE";break;case "cloudy":color="#414D9B";break;case "fog":color="#8F9DAB";break;case "rain":color="#273E5D";break;case "storm":color="#202C48";break;case "snow":color="#708BA9";break;case "night":case "nightcloud":color="#08142F";break;case "overcast":color="#586C89";break;case "unknown":color="#61758D";break;default:return;}
    activeScene=scene;int value=Color.parseColor(color);root.setBackgroundColor(value);getWindow().setStatusBarColor(value);getWindow().setNavigationBarColor(value);
    if(Build.VERSION.SDK_INT>=30&&getWindow().getInsetsController()!=null)getWindow().getInsetsController().setSystemBarsAppearance(0,android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
    else getWindow().getDecorView().setSystemUiVisibility(0);
  }
  private void applyBars() {
    activeScene=null;
    int color=Color.parseColor("#F5F7F9");
    root.setBackgroundColor(color);webView.setBackgroundColor(color);
    getWindow().setStatusBarColor(color);getWindow().setNavigationBarColor(color);
    if(Build.VERSION.SDK_INT>=30) {
      int flags=android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
      if(getWindow().getInsetsController()!=null) getWindow().getInsetsController().setSystemBarsAppearance(flags,flags);
    } else {
      int flags=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
      if(Build.VERSION.SDK_INT>=26) flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      getWindow().getDecorView().setSystemUiVisibility(flags);
    }
  }
  @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results) {
    super.onRequestPermissionsResult(code,permissions,results);
    if(code==LOCATION_REQUEST && locationCallback!=null) {
      boolean allowed=false;for(int result:results) if(result==PackageManager.PERMISSION_GRANTED) allowed=true;
      locationCallback.invoke(locationOrigin,allowed,false);locationCallback=null;locationOrigin=null;
    }
  }
  @Override public void onConfigurationChanged(Configuration configuration) {
    super.onConfigurationChanged(configuration);
    if(activeScene!=null)applySky(activeScene);else applyBars();
  }
  @Override public void onBackPressed() {
    webView.evaluateJavascript("(function(){return window.weatherlyBack ? window.weatherlyBack() : false;})()",value->{
      if("true".equals(value)) return;
      if(webView.canGoBack()) webView.goBack(); else finish();
    });
  }
  @Override protected void onPause() { super.onPause();webView.onPause(); }
  @Override protected void onResume() { super.onResume();if(webView!=null)webView.onResume();if(WeatherWidgetProvider.hasWidgets(this)&&WidgetLocation.permitted(this)&&System.currentTimeMillis()-WeatherRepository.prefs(this).getLong("locationAt",0)>60000L)new Thread(()->{WidgetLocation.refresh(getApplicationContext(),true);WeatherRepository.refresh(getApplicationContext());WeatherWidgetProvider.updateAll(getApplicationContext());},"WidgetForegroundLocation").start(); }
  @Override protected void onDestroy() {
    if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);
    if(webView!=null){root.removeView(webView);webView.destroy();}
    super.onDestroy();
  }
}
