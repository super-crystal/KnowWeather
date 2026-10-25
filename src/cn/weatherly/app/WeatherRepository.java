package cn.weatherly.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.TimeZone;

final class WeatherRepository {
  static SharedPreferences prefs(Context c){return c.getSharedPreferences("weather_cards",Context.MODE_PRIVATE);}
  static JSONObject object(String value){try{return new JSONObject(value);}catch(Exception e){return new JSONObject();}}
  static JSONObject city(Context c){
    return object(prefs(c).getString("locationCity","{\"name\":\"请开启定位\"}"));
  }
  static JSONObject snapshot(Context c){return object(prefs(c).getString("locationSnapshot","{}"));}
  static String identity(JSONObject city){return city.optString("name")+":"+city.optDouble("latitude")+","+city.optDouble("longitude");}
  static boolean number(JSONObject o,String key){double n=o.optDouble(key,Double.NaN);return o.has(key)&&!o.isNull(key)&&!Double.isNaN(n)&&!Double.isInfinite(n);}
  static boolean validCity(JSONObject city){return city.optString("name").length()>0&&city.optString("name").length()<150&&number(city,"latitude")&&number(city,"longitude")&&Math.abs(city.optDouble("latitude"))<=90&&Math.abs(city.optDouble("longitude"))<=180;}
  static String model(String value){
    for(String allowed:new String[]{"cma","ecmwf_ifs025","gfs_seamless","jma_seamless","icon_seamless","meteofrance_seamless","gem_seamless","best_match"})if(allowed.equals(value))return value;
    return "ecmwf_ifs025";
  }
  // App city and its weather never overwrite a location-based widget.
  static synchronized boolean sync(Context c,JSONObject data){
    String choice=data.optString("chinaChoice","auto");if(!"cma".equals(choice)&&!"ecmwf".equals(choice))choice="auto";
    prefs(c).edit().putString("chinaChoice",choice).putString("unit","f".equals(data.optString("unit"))?"f":"c").apply();return true;
  }
  static String widgetModel(Context c,JSONObject city){return "CN".equalsIgnoreCase(city.optString("country_code"))&&!"ecmwf".equals(prefs(c).getString("chinaChoice","auto"))?"cma":"ecmwf_ifs025";}
  static synchronized void setLocatedCity(Context c,JSONObject city,long acquired,String note){
    if(!validCity(city))return;
    JSONObject previous=city(c);boolean changed=!previous.optString("name").equals(city.optString("name"));
    if(validCity(previous)){double dy=previous.optDouble("latitude")-city.optDouble("latitude"),dx=(previous.optDouble("longitude")-city.optDouble("longitude"))*Math.cos(Math.toRadians(city.optDouble("latitude")));changed|=Math.hypot(dx,dy)>.045;}
    SharedPreferences.Editor e=prefs(c).edit().putString("locationCity",city.toString()).putLong("locationAt",acquired).putString("locationNote",note);
    if(changed)e.remove("locationSnapshot");e.apply();
  }
  static JSONObject getJSON(String url) throws Exception {
    HttpURLConnection connection=(HttpURLConnection)new URL(url).openConnection();
    connection.setConnectTimeout(7000);connection.setReadTimeout(9000);connection.setRequestProperty("Accept","application/json");
    try {
      if(connection.getResponseCode()!=200)throw new Exception("Weather HTTP "+connection.getResponseCode());
      try(InputStream stream=connection.getInputStream();ByteArrayOutputStream bytes=new ByteArrayOutputStream()){
        byte[] buffer=new byte[8192];int length;
        while((length=stream.read(buffer))!=-1){bytes.write(buffer,0,length);if(bytes.size()>1000000)throw new Exception("Weather response too large");}
        JSONObject data=new JSONObject(new String(bytes.toByteArray(),StandardCharsets.UTF_8));
        if(data.optBoolean("error"))throw new Exception("Weather data unavailable");return data;
      }
    } finally {connection.disconnect();}
  }
  static String sourceName(String model){
    switch(model){case "cma":return "中国气象局 CMA";case "gfs_seamless":return "NOAA GFS";case "jma_seamless":return "JMA";case "icon_seamless":return "DWD ICON";case "meteofrance_seamless":return "Météo-France";case "gem_seamless":return "GEM";case "best_match":return "Open-Meteo 备用源";default:return "ECMWF IFS";}
  }
  static String weatherURL(JSONObject city,String model){
    return "https://api.open-meteo.com/v1/"+("cma".equals(model)?"cma":"forecast")+"?latitude="+city.optDouble("latitude")+"&longitude="+city.optDouble("longitude")+"&timezone=auto&forecast_days=2"+("cma".equals(model)?"":"&models="+model)+"&current=temperature_2m,weather_code,is_day&daily=temperature_2m_min,temperature_2m_max,sunrise,sunset";
  }
  static boolean usable(JSONObject data){JSONObject c=data.optJSONObject("current");JSONObject d=data.optJSONObject("daily");return c!=null&&d!=null&&number(c,"temperature_2m")&&d.optJSONArray("time")!=null&&d.optJSONArray("time").length()>0;}
  static Object first(JSONObject o,String key,int index){JSONArray values=o.optJSONArray(key);return values==null?JSONObject.NULL:values.opt(index);}
  static boolean refresh(Context c){
    JSONObject city=city(c);String requested=widgetModel(c,city),actual=requested;JSONObject data;
    if(!validCity(city))return false;
    try {
      try{data=getJSON(weatherURL(city,actual));if(!usable(data))throw new Exception("Incomplete forecast");}
      catch(Exception primary){actual="best_match";data=getJSON(weatherURL(city,actual));if(!usable(data))throw new Exception("Incomplete fallback");}
      JSONObject current=data.getJSONObject("current"),daily=data.getJSONObject("daily");
      JSONObject snapshot=new JSONObject().put("temperature",current.opt("temperature_2m")).put("code",current.opt("weather_code")).put("isDay",current.optInt("is_day",1)).put("time",current.optString("time")).put("timezone",data.optString("timezone","Asia/Shanghai")).put("low",first(daily,"temperature_2m_min",0)).put("high",first(daily,"temperature_2m_max",0)).put("sunrise",first(daily,"sunrise",0)).put("sunset",first(daily,"sunset",0)).put("nextSunrise",first(daily,"sunrise",1)).put("source",sourceName(actual)).put("fetchedAt",new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX",java.util.Locale.US).format(new java.util.Date()));
      synchronized(WeatherRepository.class){
        if(!identity(city).equals(identity(city(c)))||!requested.equals(widgetModel(c,city(c))))return false;
        // A live app update may have arrived while the network request was running.
        JSONObject previous=snapshot(c);
        if(timestamp(previous.optString("fetchedAt"))>timestamp(snapshot.optString("fetchedAt")))return true;
        prefs(c).edit().putString("locationSnapshot",snapshot.toString()).putBoolean("failed",false).apply();
      }
      return true;
    } catch(Exception error){synchronized(WeatherRepository.class){if(identity(city).equals(identity(city(c)))&&requested.equals(widgetModel(c,city(c))))prefs(c).edit().putBoolean("failed",true).apply();}return false;}
  }
  static long timestamp(String value){
    try{return new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX",java.util.Locale.US).parse(value).getTime();}
    catch(Exception e){try{return new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX",java.util.Locale.US).parse(value).getTime();}catch(Exception ignored){return 0;}}
  }
  static String temperature(Context c,JSONObject snapshot,String key){
    if(!number(snapshot,key))return "—";double n=snapshot.optDouble(key);if("f".equals(prefs(c).getString("unit","c")))n=n*9/5+32;return Long.toString(Math.round(n));
  }
  static String condition(int code){if(code<0)return "暂无天气";if(code==0)return "晴";if(code<=2)return "多云";if(code==3)return "阴";if(code==45||code==48)return "雾";if((code>=71&&code<=77)||code==85||code==86)return "雪";if(code>=95)return "雷阵雨";if(code>=51)return "雨";return "多云";}
  static String advice(JSONObject s){int code=s.optInt("code",-1);double t=s.optDouble("temperature",Double.NaN);if(code>=51&&!(code>=71&&code<=77))return "出门带伞";if(code>=71&&code<=77)return "注意防滑";if(t<10)return "添件外套";if(t<23)return "携带外套";if(t>30)return "补水防晒";return "舒适出行";}
  static String status(Context c){
    JSONObject s=snapshot(c);long time=timestamp(s.optString("fetchedAt"));
    if(!validCity(city(c)))return "开启定位后显示当地天气";
    String locationNote=prefs(c).getString("locationNote","");
    if(!number(s,"temperature"))return locationNote.isEmpty()?"等待天气 · 点击刷新":locationNote;
    boolean stale=time==0||System.currentTimeMillis()-time>90*60*1000||prefs(c).getBoolean("failed",false);
    java.text.SimpleDateFormat format=new java.text.SimpleDateFormat("HH:mm",java.util.Locale.CHINA);format.setTimeZone(TimeZone.getTimeZone(s.optString("timezone","Asia/Shanghai")));
    String date=format.format(new java.util.Date(time));
    if(System.currentTimeMillis()-time>24*3600000L){java.text.SimpleDateFormat full=new java.text.SimpleDateFormat("MM-dd HH:mm",java.util.Locale.CHINA);full.setTimeZone(format.getTimeZone());date=full.format(new java.util.Date(time));}
    return (stale?"缓存 ":"")+date+" · "+s.optString("source","Open-Meteo")+(locationNote.isEmpty()?"":" · "+locationNote);
  }
}
