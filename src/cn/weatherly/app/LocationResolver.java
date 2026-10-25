package cn.weatherly.app;

import android.content.Context;
import android.location.Address;
import android.location.Geocoder;
import android.net.Uri;
import android.os.Build;
import android.webkit.WebResourceResponse;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

final class LocationResolver {
  private static long lastRequest;
  private static double coordinate(Uri uri,String key,double limit){double n=Double.parseDouble(uri.getQueryParameter(key));if(!Double.isFinite(n)||Math.abs(n)>limit)throw new IllegalArgumentException();return n;}
  static WebResourceResponse response(Context context,Uri uri){
    try {
      double lat=coordinate(uri,"lat",90),lon=coordinate(uri,"lon",180);
      return WeatherServices.result(200,"OK",resolve(context,lat,lon).toString());
    }catch(Exception error){return WeatherServices.result(502,"Bad Gateway","{\"error\":true,\"reason\":\"区域名称暂不可用\"}");}
  }
  static JSONObject resolve(Context context,double lat,double lon)throws Exception {
      if(!Double.isFinite(lat)||!Double.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new IllegalArgumentException();
      String key="reverse:"+String.format(Locale.US,"%.5f,%.5f",lat,lon);
      android.content.SharedPreferences prefs=context.getSharedPreferences("location_names",Context.MODE_PRIVATE);
      String cached=prefs.getString(key,null);long stamp=prefs.getLong(key+":time",0);
      if(cached!=null&&System.currentTimeMillis()-stamp<86400000L)return new JSONObject(cached);
      JSONObject result;
      try {
        synchronized(LocationResolver.class){long delay=1100-(System.currentTimeMillis()-lastRequest);if(delay>0)Thread.sleep(delay);lastRequest=System.currentTimeMillis();}
        // Fixed endpoint, WGS84, one user-initiated lookup. No autocomplete or bulk requests.
        result=WeatherServices.readJSON("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1&accept-language=zh-CN&lat="+lat+"&lon="+lon,4000,6500);
        if(result.optJSONObject("address")==null)throw new Exception("No address");
        result.put("provider","OpenStreetMap / Nominatim");
      }catch(Exception unavailable){result=systemAddress(context,lat,lon);}
      if(prefs.getAll().size()>128)prefs.edit().clear().apply();
      prefs.edit().putString(key,result.toString()).putLong(key+":time",System.currentTimeMillis()).apply();
      return result;
  }
  private static JSONObject systemAddress(Context context,double lat,double lon)throws Exception {
    if(!Geocoder.isPresent())throw new Exception("Geocoder unavailable");
    Geocoder geocoder=new Geocoder(context,Locale.SIMPLIFIED_CHINESE);
    final Address[] found=new Address[1];
    if(Build.VERSION.SDK_INT>=33){CountDownLatch done=new CountDownLatch(1);geocoder.getFromLocation(lat,lon,1,new Geocoder.GeocodeListener(){public void onGeocode(List<Address> rows){if(!rows.isEmpty())found[0]=rows.get(0);done.countDown();}public void onError(String error){done.countDown();}});done.await(3,TimeUnit.SECONDS);}
    else {List<Address> rows=geocoder.getFromLocation(lat,lon,1);if(rows!=null&&!rows.isEmpty())found[0]=rows.get(0);}
    Address a=found[0];if(a==null)throw new Exception("No system address");
    JSONObject address=new JSONObject().put("country",a.getCountryName()).put("country_code",a.getCountryCode()).put("state",a.getAdminArea()).put("city",a.getLocality()).put("county",a.getSubAdminArea()).put("city_district",a.getSubLocality());
    return new JSONObject().put("address",address).put("provider","Android 系统地址服务");
  }
}
