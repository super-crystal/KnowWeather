package cn.weatherly.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.util.SizeF;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

public class WeatherWidgetProvider extends AppWidgetProvider {
  static final String REFRESH="cn.weatherly.app.REFRESH_WIDGET";
  @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){update(c,manager,ids,getClass()==SunWidgetProvider.class);WidgetRefreshService.schedule(c,false);WidgetRefreshService.schedule(c,true);}
  @Override public void onEnabled(Context c){WidgetRefreshService.schedule(c,true);}
  @Override public void onDeleted(Context c,int[] ids){if(!hasWidgets(c))WidgetRefreshService.cancel(c);}
  @Override public void onDisabled(Context c){if(!hasWidgets(c))WidgetRefreshService.cancel(c);}
  @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager manager,int id,Bundle options){update(c,manager,new int[]{id},getClass()==SunWidgetProvider.class);}
  @Override public void onReceive(Context c,Intent intent){super.onReceive(c,intent);if(REFRESH.equals(intent.getAction())){boolean online=WidgetRefreshService.connected(c);if(!online){WeatherRepository.prefs(c).edit().putBoolean("failed",true).apply();updateAll(c);}WidgetRefreshService.schedule(c,false);android.widget.Toast.makeText(c,online?"正在刷新天气":"当前离线，显示缓存",android.widget.Toast.LENGTH_SHORT).show();}}
  static boolean hasWidgets(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);return m.getAppWidgetIds(new ComponentName(c,WeatherWidgetProvider.class)).length+m.getAppWidgetIds(new ComponentName(c,SunWidgetProvider.class)).length>0;}
  static void updateAll(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);update(c,m,m.getAppWidgetIds(new ComponentName(c,WeatherWidgetProvider.class)),false);update(c,m,m.getAppWidgetIds(new ComponentName(c,SunWidgetProvider.class)),true);}
  static void update(Context c,AppWidgetManager manager,int[] ids,boolean solar){
    for(int id:ids){
      Bundle options=manager.getAppWidgetOptions(id);
      if(Build.VERSION.SDK_INT>=31){
        ArrayList<SizeF> sizes=options.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
        if(sizes!=null&&!sizes.isEmpty()){
          Map<SizeF,RemoteViews> layouts=new LinkedHashMap<>();
          for(SizeF size:sizes){if(layouts.size()==8)break;if(size.getWidth()>0&&size.getHeight()>0)layouts.put(size,views(c,solar,size.getWidth(),size.getHeight()));}
          if(!layouts.isEmpty()){manager.updateAppWidget(id,new RemoteViews(layouts));continue;}
        }
      }
      boolean landscape=c.getResources().getConfiguration().orientation==android.content.res.Configuration.ORIENTATION_LANDSCAPE;
      int width=options.getInt(landscape?AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH:AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,180),height=options.getInt(landscape?AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT:AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,180);
      manager.updateAppWidget(id,views(c,solar,width,height));
    }
  }
  private static RemoteViews views(Context c,boolean solar,float width,float height){
      float ratio=Math.max(60,width)/Math.max(60,height);int bitmapWidth=720,bitmapHeight=720;if(ratio>1)bitmapHeight=Math.max(120,(int)(720/ratio));else bitmapWidth=Math.max(120,(int)(720*ratio));
      RemoteViews views=new RemoteViews(c.getPackageName(),R.layout.weather_widget);views.setImageViewBitmap(R.id.card_image,CardRenderer.render(c,solar,bitmapWidth,bitmapHeight));
      boolean busy=System.currentTimeMillis()-WeatherRepository.prefs(c).getLong("refreshStarted",0)<45000L;views.setViewVisibility(R.id.card_refresh,busy?android.view.View.INVISIBLE:android.view.View.VISIBLE);views.setViewVisibility(R.id.card_refresh_progress,busy?android.view.View.VISIBLE:android.view.View.GONE);views.setBoolean(R.id.card_refresh,"setEnabled",!busy);
      String label=WeatherRepository.city(c).optString("name")+"，"+(solar?"日出日落":WeatherRepository.temperature(c,WeatherRepository.snapshot(c),"temperature")+"度，"+WeatherRepository.condition(WeatherRepository.snapshot(c).optInt("code",-1)))+"，"+WeatherRepository.status(c);
      views.setContentDescription(R.id.card_image,label);
      Intent open=new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
      views.setOnClickPendingIntent(R.id.card_image,PendingIntent.getActivity(c,0,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
      Intent refresh=new Intent(c,WeatherWidgetProvider.class).setAction(REFRESH).addFlags(Intent.FLAG_RECEIVER_FOREGROUND);
      views.setOnClickPendingIntent(R.id.card_refresh,PendingIntent.getBroadcast(c,1,refresh,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));return views;
  }
}
