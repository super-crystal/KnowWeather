package cn.weatherly.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.*;

public final class CardCenterActivity extends Activity {
  private LinearLayout content;private ImageView weatherPreview,sunPreview;private TextView status;private RefreshControl refreshControl;private boolean dark,busy,alive;private Button locationAccess;
  private int dp(float value){return (int)(getResources().getDisplayMetrics().density*value+.5f);}
  private TextView text(String value,float size,boolean bold){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(Color.parseColor(dark?"#F3F6FC":"#17202E"));if(bold)t.setTypeface(null,android.graphics.Typeface.BOLD);return t;}
  private void touchFeedback(View v){Motion.bindPress(v);}
  private void buttonStyle(Button b,boolean primary){android.graphics.drawable.GradientDrawable background=new android.graphics.drawable.GradientDrawable();background.setCornerRadius(dp(primary?15:12));background.setColor(Color.parseColor(primary?(dark?"#293A53":"#E5EBF5"):"#00000000"));b.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(Color.parseColor("#223678E8")),background,null));b.setElevation(0);b.setAllCaps(false);b.setMinHeight(0);b.setMinimumHeight(0);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(dp(5),0,dp(5),0);b.setTextColor(Color.parseColor(dark?"#B5D6FF":"#235DAA"));touchFeedback(b);}
  @Override public void onCreate(Bundle saved){
    super.onCreate(saved);alive=true;
    dark=(getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES;
    String appTheme=getSharedPreferences("weather_cards",MODE_PRIVATE).getString("appTheme","auto");if("dark".equals(appTheme))dark=true;if("light".equals(appTheme))dark=false;
    ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(Color.parseColor(dark?"#151D26":"#F1F3F6"));
    content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(dp(20),dp(18),dp(20),dp(28));scroll.addView(content);setContentView(scroll);
    if(Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);scroll.setOnApplyWindowInsetsListener((v,insets)->{Insets s=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(s.left,s.top,s.right,s.bottom);return insets;});scroll.requestApplyInsets();int flags=android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;if(getWindow().getInsetsController()!=null)getWindow().getInsetsController().setSystemBarsAppearance(dark?0:flags,flags);}
    LinearLayout heading=new LinearLayout(this);heading.setGravity(Gravity.CENTER_VERTICAL);Button back=new Button(this);back.setText("返回");buttonStyle(back,false);back.setOnClickListener(v->finish());heading.addView(back,new LinearLayout.LayoutParams(dp(60),dp(48)));TextView title=text("卡片中心",25,true);title.setGravity(Gravity.CENTER);heading.addView(title,new LinearLayout.LayoutParams(0,dp(56),1));refreshControl=new RefreshControl(this,Color.parseColor(dark?"#B5D6FF":"#235DAA"));touchFeedback(refreshControl);refreshControl.setOnClickListener(v->refresh());heading.addView(refreshControl,new LinearLayout.LayoutParams(dp(48),dp(48)));content.addView(heading);
    TextView intro=text("把天气放在桌面，每一眼都心中有数。",14,false);intro.setPadding(0,dp(15),0,dp(12));content.addView(intro);
    status=text("",12,false);status.setTextColor(Color.parseColor(dark?"#ABB9CA":"#647185"));status.setPadding(0,0,0,dp(18));content.addView(status);
    locationAccess=new Button(this);locationAccess.setTextSize(13);buttonStyle(locationAccess,true);locationAccess.setOnClickListener(v->enableLocation());content.addView(locationAccess,new LinearLayout.LayoutParams(-1,dp(46)));
    TextView locationHelp=text("卡片独立显示定位所在城市，不跟随应用选城。定位失败时保留上次位置；允许后台定位后可在桌面自动更新。",12,false);locationHelp.setPadding(0,dp(10),0,dp(18));content.addView(locationHelp);
    LinearLayout cards=new LinearLayout(this);cards.setOrientation(LinearLayout.HORIZONTAL);content.addView(cards);
    weatherPreview=card(cards,false,"实时天气");sunPreview=card(cards,true,"日出日落");
    TextView styleTitle=text("卡片外观",19,true);styleTitle.setPadding(0,dp(27),0,dp(12));content.addView(styleTitle);
    RadioGroup styles=new RadioGroup(this);styles.setOrientation(LinearLayout.HORIZONTAL);
    String[] keys={"weather","light","dark","system"},labels={"随天气","浅色","深色","随系统"};String selected=WeatherRepository.prefs(this).getString("widgetTheme","weather");
    for(int i=0;i<keys.length;i++){final String key=keys[i];RadioButton b=new RadioButton(this);b.setText(labels[i]);b.setTextSize(12);b.setTextColor(Color.parseColor(dark?"#F3F6FC":"#17202E"));b.setId(View.generateViewId());touchFeedback(b);styles.addView(b,new LinearLayout.LayoutParams(0,dp(52),1));if(key.equals(selected))b.setChecked(true);b.setOnClickListener(v->{WeatherRepository.prefs(this).edit().putString("widgetTheme",key).apply();WeatherWidgetProvider.updateAll(this);previews();});}content.addView(styles);
    TextView how=text("添加到桌面",19,true);how.setPadding(0,dp(23),0,dp(10));content.addView(how);
    TextView help=text("点击卡片下方的“添加到桌面”，再按系统提示确认。也可以长按桌面空白处 → 小组件 → 知天气。\n\n卡片按定位所在城市自动更新，应用内选城不会改变卡片；温度单位和数据源偏好保持一致。点击卡片打开应用，右下角刷新按钮更新天气。约每 30 分钟后台更新一次，系统省电时可能延后。离线时显示缓存和更新时间。",14,false);help.setLineSpacing(dp(4),1);content.addView(help);
    TextView note=text("支持 Android 16 桌面小组件。手机厂商的卡片中心是否收录第三方组件，由桌面系统决定。",12,false);note.setTextColor(Color.parseColor(dark?"#ABB9CA":"#647185"));note.setPadding(0,dp(20),0,0);content.addView(note);
    previews();
  }
  private ImageView card(LinearLayout row,boolean solar,String name){
    LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(0,-2,1);if(solar)params.leftMargin=dp(12);row.addView(box,params);
    ImageView image=new ImageView(this);image.setScaleType(ImageView.ScaleType.FIT_XY);image.setAdjustViewBounds(true);image.setContentDescription(name+"卡片预览");box.addView(image,new LinearLayout.LayoutParams(-1,-2));image.setOnClickListener(v->pin(solar));touchFeedback(image);
    TextView label=text(name,15,true);label.setGravity(Gravity.CENTER);label.setPadding(0,dp(12),0,dp(8));box.addView(label);
    Button button=new Button(this);button.setText("添加到桌面");button.setTextSize(12);buttonStyle(button,true);button.setContentDescription("添加"+name+"卡片到桌面");button.setOnClickListener(v->pin(solar));box.addView(button,new LinearLayout.LayoutParams(-1,dp(44)));return image;
  }
  private void previews(){if(weatherPreview==null)return;if(locationAccess!=null)locationAccess.setText(!WidgetLocation.permitted(this)?"开启卡片定位":!WidgetLocation.backgroundPermitted(this)?"允许后台定位":"查看位置权限");weatherPreview.setImageBitmap(CardRenderer.render(this,false,420,420));sunPreview.setImageBitmap(CardRenderer.render(this,true,420,420));status.setText(WeatherRepository.city(this).optString("name","北京")+" · "+(busy?"正在更新…":WeatherRepository.status(this)));}
  private void pin(boolean solar){
    AppWidgetManager manager=AppWidgetManager.getInstance(this);
    if(Build.VERSION.SDK_INT>=26&&manager.isRequestPinAppWidgetSupported()){
      boolean accepted=manager.requestPinAppWidget(new ComponentName(this,solar?SunWidgetProvider.class:WeatherWidgetProvider.class),null,null);
      Toast.makeText(this,accepted?"请在系统弹窗中确认添加":"请长按桌面空白处，从小组件中添加知天气",Toast.LENGTH_LONG).show();
    }else Toast.makeText(this,"请长按桌面空白处 → 小组件 → 知天气",Toast.LENGTH_LONG).show();
  }
  private void refresh(){if(busy)return;busy=true;refreshControl.setBusy(true);previews();new Thread(()->{WidgetLocation.refresh(getApplicationContext(),true);boolean ok=WeatherRepository.refresh(getApplicationContext());WeatherWidgetProvider.updateAll(getApplicationContext());runOnUiThread(()->{if(!alive)return;busy=false;refreshControl.setBusy(false);previews();Toast.makeText(this,ok?"定位卡片天气已更新":WeatherRepository.status(this),Toast.LENGTH_SHORT).show();});},"CardCenterRefresh").start();}
  private void enableLocation(){if(!WidgetLocation.permitted(this)){requestPermissions(new String[]{android.Manifest.permission.ACCESS_COARSE_LOCATION,android.Manifest.permission.ACCESS_FINE_LOCATION},102);return;}if(!WidgetLocation.backgroundPermitted(this)){new android.app.AlertDialog.Builder(this).setTitle("让卡片跟随所在城市").setMessage("仅在卡片更新时获取位置，用于当地天气。请选择“位置 → 始终允许”；建议开启精确位置。可以暂不开启，卡片保留最近位置。").setPositiveButton("前往设置",(dialog,which)->openLocationSettings()).setNegativeButton("暂不开启",null).show();return;}openLocationSettings();}
  private void openLocationSettings(){startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,android.net.Uri.parse("package:"+getPackageName())));}
  @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request==102){if(WidgetLocation.permitted(this)){refresh();if(!WidgetLocation.backgroundPermitted(this))enableLocation();}else Toast.makeText(this,"未开启定位，卡片不会使用应用内手动城市",Toast.LENGTH_LONG).show();}}
  @Override protected void onResume(){super.onResume();previews();if(WidgetLocation.permitted(this)&&(!WeatherRepository.validCity(WeatherRepository.city(this))||System.currentTimeMillis()-WeatherRepository.prefs(this).getLong("locationAt",0)>60000L))refresh();}
  @Override protected void onDestroy(){alive=false;super.onDestroy();}
}
