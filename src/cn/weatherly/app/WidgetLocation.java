package cn.weatherly.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Looper;
import android.os.SystemClock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;

final class WidgetLocation {
  static boolean permitted(Context c){return c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED||c.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED;}
  static boolean backgroundPermitted(Context c){return Build.VERSION.SDK_INT<29||c.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION)==PackageManager.PERMISSION_GRANTED;}
  static long age(Location location){return location==null?Long.MAX_VALUE:Math.max(0,(SystemClock.elapsedRealtimeNanos()-location.getElapsedRealtimeNanos())/1000000L);}
  private static void note(Context c,String message){WeatherRepository.prefs(c).edit().putString("locationNote",message).apply();}
  // Run on a worker; never request permissions or block the UI from a job.
  static synchronized boolean refresh(Context context,boolean foreground){
    if(!permitted(context)){note(context,"需要位置权限");return false;}
    if(!foreground&&!backgroundPermitted(context)){note(context,"需要后台定位权限");return false;}
    LocationManager manager=(LocationManager)context.getSystemService(Context.LOCATION_SERVICE);
    if(manager==null){note(context,"定位暂不可用");return false;}
    List<String> providers=new ArrayList<>();Location recent=null;
    try{
      for(String provider:new String[]{"fused",LocationManager.NETWORK_PROVIDER,LocationManager.GPS_PROVIDER}){
        if(!manager.getAllProviders().contains(provider)||!manager.isProviderEnabled(provider))continue;
        providers.add(provider);Location last=manager.getLastKnownLocation(provider);
        if(last!=null&&(recent==null||age(last)<age(recent)))recent=last;
      }
      Location location=age(recent)<120000L?recent:null;
      if(location==null){
        CountDownLatch done=new CountDownLatch(1);AtomicReference<Location> found=new AtomicReference<>();List<CancellationSignal> signals=new ArrayList<>();List<LocationListener> listeners=new ArrayList<>();
        try{
          for(String provider:providers){
            if(Build.VERSION.SDK_INT>=30){CancellationSignal signal=new CancellationSignal();signals.add(signal);try{manager.getCurrentLocation(provider,signal,Runnable::run,value->{if(value!=null&&age(value)<120000L&&found.compareAndSet(null,value))done.countDown();});}catch(RuntimeException unavailable){signal.cancel();}}
            else {LocationListener listener=new LocationListener(){public void onLocationChanged(Location value){if(age(value)<120000L&&found.compareAndSet(null,value))done.countDown();}public void onStatusChanged(String p,int s,Bundle b){}public void onProviderEnabled(String p){}public void onProviderDisabled(String p){}};listeners.add(listener);try{manager.requestSingleUpdate(provider,listener,Looper.getMainLooper());}catch(RuntimeException ignored){}}
          }
          if(!providers.isEmpty())done.await(10,TimeUnit.SECONDS);location=found.get();
        }finally{for(CancellationSignal signal:signals)signal.cancel();for(LocationListener listener:listeners)manager.removeUpdates(listener);}
      }
      String status="";
      if(location==null&&age(recent)<15*60000L){location=recent;status="最近位置";}
      if(location==null){note(context,"定位失败，保留上次位置");return false;}
      JSONObject previous=WeatherRepository.city(context),city;
      double lat=location.getLatitude(),lon=location.getLongitude();
      if(WeatherRepository.validCity(previous)&&Math.abs(lat-previous.optDouble("latitude"))<.003&&Math.abs(lon-previous.optDouble("longitude"))<.003)city=new JSONObject(previous.toString());
      else city=regionCity(LocationResolver.resolve(context,lat,lon),lat,lon);
      city.put("latitude",lat).put("longitude",lon).put("located",true);
      if(location.hasAccuracy()&&location.getAccuracy()>1000)status="定位精度较低";
      WeatherRepository.setLocatedCity(context,city,System.currentTimeMillis(),status);return true;
    }catch(Exception unavailable){note(context,"定位失败，保留上次位置");return false;}
  }
  private static String clean(String value){return value==null?"":value.trim();}
  static JSONObject regionCity(JSONObject result,double lat,double lon)throws Exception{
    JSONObject a=result.optJSONObject("address");if(a==null)throw new Exception("Missing district");
    String code=a.optString("country_code").toUpperCase(Locale.US),state=a.optString("state"),name="",parent="";
    String[] keys={"city_district","district","county","borough","city","town","municipality","suburb"};
    if("CN".equals(code))for(String key:keys){String candidate=clean(a.optString(key));if(candidate.matches(".*(区|县|旗)$")&&!candidate.equals(state)&&!candidate.matches(".*(街道|社区|小区|地区|开发区|工业区)$")){name=candidate;break;}}
    if(name.isEmpty())for(String key:new String[]{"county","city_district","district","borough","city","town","municipality"}){String candidate=clean(a.optString(key));if(!candidate.isEmpty()&&!candidate.equals(state)&&!("CN".equals(code)&&candidate.matches(".*(自治州|地区|盟)$"))){name=candidate;break;}}
    if(name.isEmpty())throw new Exception("Missing city");
    List<String> parents=new ArrayList<>();for(String key:new String[]{"municipality","city","region","county"})parents.add(a.optString(key));for(String part:result.optString("display_name").split("[,，]"))parents.add(clean(part));
    for(String candidate:parents)if(!candidate.isEmpty()&&!candidate.equals(name)&&!candidate.equals(state)&&candidate.matches(".*(市|自治州|地区|盟)$")){parent=candidate;break;}
    return new JSONObject().put("name",name).put("latitude",lat).put("longitude",lon).put("country",a.optString("country")).put("country_code",code).put("admin1",state).put("admin2",parent).put("located",true);
  }
}
