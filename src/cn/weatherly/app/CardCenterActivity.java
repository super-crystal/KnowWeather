package cn.weatherly.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.*;

public final class CardCenterActivity extends Activity {
  private LinearLayout content;private ImageView weatherPreview,sunPreview;private TextView status;private RefreshControl refreshControl;private boolean busy,alive;private Button locationAccess;
  private int dp(float value){return (int)(getResources().getDisplayMetrics().density*value+.5f);}
  private TextView text(String value,float size,boolean bold){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(Color.parseColor("#17202E"));if(bold)t.setTypeface(null,android.graphics.Typeface.BOLD);return t;}
  private void touchFeedback(View v){Motion.bindPress(v);}
  private void buttonStyle(Button b,boolean primary){android.graphics.drawable.GradientDrawable background=new android.graphics.drawable.GradientDrawable();background.setCornerRadius(dp(primary?15:12));background.setColor(Color.parseColor(primary?("#E5EBF5"):"#00000000"));b.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(Color.parseColor("#223678E8")),background,null));b.setElevation(0);b.setAllCaps(false);b.setMinHeight(0);b.setMinimumHeight(0);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(dp(5),0,dp(5),0);b.setTextColor(Color.parseColor("#235DAA"));touchFeedback(b);}
  private void styleChoice(Button b,boolean selected){buttonStyle(b,false);android.graphics.drawable.GradientDrawable fill=new android.graphics.drawable.GradientDrawable();fill.setCornerRadius(dp(15));fill.setColor(Color.parseColor(selected?"#FFFFFF":"#00000000"));b.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(Color.parseColor("#223678E8")),fill,null));b.setTextColor(Color.parseColor(selected?"#235DAA":"#647185"));b.setSelected(selected);b.setTypeface(null,selected?android.graphics.Typeface.BOLD:android.graphics.Typeface.NORMAL);}
  @Override public void onCreate(Bundle saved){
    super.onCreate(saved);alive=true;
    WeatherRepository.prefs(this).edit().putString("appTheme","light").apply();
    ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(Color.parseColor("#F1F3F6"));
    content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(dp(20),dp(18),dp(20),dp(28));scroll.addView(content);setContentView(scroll);
    if(Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);scroll.setOnApplyWindowInsetsListener((v,insets)->{Insets s=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(s.left,s.top,s.right,s.bottom);return insets;});scroll.requestApplyInsets();int flags=android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;if(getWindow().getInsetsController()!=null)getWindow().getInsetsController().setSystemBarsAppearance(flags,flags);}
    LinearLayout heading=new LinearLayout(this);heading.setGravity(Gravity.CENTER_VERTICAL);Button back=new Button(this);back.setText("返回");buttonStyle(back,false);back.setOnClickListener(v->finish());heading.addView(back,new LinearLayout.LayoutParams(dp(60),dp(48)));TextView title=text("卡片中心",25,true);title.setGravity(Gravity.CENTER);heading.addView(title,new LinearLayout.LayoutParams(0,dp(56),1));refreshControl=new RefreshControl(this,Color.parseColor("#235DAA"));touchFeedback(refreshControl);refreshControl.setOnClickListener(v->refresh());heading.addView(refreshControl,new LinearLayout.LayoutParams(dp(48),dp(48)));content.addView(heading);
    TextView intro=text("把天气放在桌面，每一眼都心中有数。",14,false);intro.setPadding(0,dp(15),0,dp(12));content.addView(intro);
    status=text("",12,false);status.setTextColor(Color.parseColor("#647185"));status.setPadding(0,0,0,dp(18));content.addView(status);
    locationAccess=new Button(this);locationAccess.setTextSize(13);buttonStyle(locationAccess,true);locationAccess.setOnClickListener(v->enableLocation());content.addView(locationAccess,new LinearLayout.LayoutParams(-1,dp(46)));
    TextView locationHelp=text("卡片独立显示定位所在城市，不跟随应用选城。定位失败时保留上次位置；允许后台定位后可在桌面自动更新。",12,false);locationHelp.setPadding(0,dp(10),0,dp(18));content.addView(locationHelp);
    LinearLayout cards=new LinearLayout(this);cards.setOrientation(LinearLayout.HORIZONTAL);content.addView(cards);
    weatherPreview=card(cards,false,"实时天气");sunPreview=card(cards,true,"日出日落");
    TextView styleTitle=text("卡片外观",19,true);styleTitle.setPadding(0,dp(27),0,dp(12));content.addView(styleTitle);
    LinearLayout styles=new LinearLayout(this);styles.setPadding(dp(5),dp(5),dp(5),dp(5));
    android.graphics.drawable.GradientDrawable rail=new android.graphics.drawable.GradientDrawable();rail.setColor(Color.parseColor("#E5EBF5"));rail.setCornerRadius(dp(19));styles.setBackground(rail);
    String selected=WeatherRepository.prefs(this).getString("widgetTheme","weather");if(!"weather".equals(selected)&&!"light".equals(selected)){selected="weather";WeatherRepository.prefs(this).edit().putString("widgetTheme",selected).apply();WeatherWidgetProvider.updateAll(this);}
    final String[] keys={"weather","light"},labels={"随天气","浅色"};final Button[] choices=new Button[2];
    for(int i=0;i<keys.length;i++){final int index=i;Button b=new Button(this);choices[i]=b;b.setText(labels[i]);b.setTextSize(14);b.setContentDescription("卡片外观："+labels[i]);styleChoice(b,keys[i].equals(selected));styles.addView(b,new LinearLayout.LayoutParams(0,dp(48),1));b.setOnClickListener(v->{WeatherRepository.prefs(this).edit().putString("widgetTheme",keys[index]).apply();for(int j=0;j<choices.length;j++)styleChoice(choices[j],j==index);WeatherWidgetProvider.updateAll(this);previews();});}content.addView(styles);
    TextView note=text("支持 Android 16 桌面小组件。手机厂商的卡片中心是否收录第三方组件，由桌面系统决定。",12,false);note.setTextColor(Color.parseColor("#647185"));note.setPadding(0,dp(20),0,0);content.addView(note);
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
