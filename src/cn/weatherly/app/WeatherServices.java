package cn.weatherly.app;

import android.net.Uri;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import org.json.JSONArray;
import org.json.JSONObject;

// Only these public weather endpoints can be read. No caller-supplied URL is accepted.
final class WeatherServices {
  static String endpoint(Uri uri) {
    String kind=uri.getQueryParameter("kind");
    if("storms".equals(kind))return "https://typhoon.nmc.cn/weatherservice/typhoon/jsons/list_default";
    if("storm".equals(kind)){String id=uri.getQueryParameter("id");if(id!=null&&id.matches("[0-9]{1,12}"))return "https://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_"+id;}
    if("warnings".equals(kind))return "https://forecast.weather.com.cn/api/v1/traffic/alarm/alarmMap?callback=getAlarm";
    if("hkwarnings".equals(kind))return "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang=sc";
    if("uswarnings".equals(kind)){try{double lat=Double.parseDouble(uri.getQueryParameter("lat")),lon=Double.parseDouble(uri.getQueryParameter("lon"));if(Double.isFinite(lat)&&Double.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)return "https://api.weather.gov/alerts/active?point="+lat+","+lon;}catch(Exception ignored){}}
    return null;
  }
  static WebResourceResponse response(Uri uri){
    String url=endpoint(uri);if(url==null)return result(400,"Bad Request","{\"error\":true,\"reason\":\"无效天气服务\"}");
    try {
      JSONObject data=readJSON(url,7000,12000);
      if("warnings".equals(uri.getQueryParameter("kind"))){JSONObject original=data.optJSONObject("result");if(original==null||original.optJSONArray("data")==null)throw new Exception("Invalid warnings");JSONArray rows=original.getJSONArray("data"),compact=new JSONArray();for(int i=0;i<rows.length();i++){JSONArray row=rows.optJSONArray(i);if(row==null)continue;JSONArray trimmed=new JSONArray();for(int j=0;j<7;j++)trimmed.put(row.opt(j));compact.put(trimmed);}data=new JSONObject().put("result",new JSONObject().put("data",compact).put("count",compact.length()));}
      return result(200,"OK",data.toString());
    }catch(Exception error){android.util.Log.w("WeatherlyService",uri.getQueryParameter("kind")+": "+error.getClass().getSimpleName());return result(502,"Bad Gateway","{\"error\":true,\"reason\":\"官方天气服务暂不可用\"}");}
  }
  static JSONObject readJSON(String url,int connectTimeout,int readTimeout)throws Exception {
    HttpURLConnection connection=(HttpURLConnection)new URL(url).openConnection();
    try {
      connection.setConnectTimeout(connectTimeout);connection.setReadTimeout(readTimeout);connection.setInstanceFollowRedirects(false);connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("User-Agent","Weatherly/1.2.3 (personal Android weather app)");
      if(connection.getResponseCode()!=200)throw new Exception("Service unavailable");
      String raw;
      try(InputStream in=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>3000000)throw new Exception("Response too large");}raw=new String(out.toByteArray(),StandardCharsets.UTF_8);}
      int start=raw.indexOf('{'),end=raw.lastIndexOf('}');if(start<0||end<start)throw new Exception("Invalid JSON");return new JSONObject(raw.substring(start,end+1));
    }finally{connection.disconnect();}
  }
  static WebResourceResponse result(int code,String reason,String body){HashMap<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-store");headers.put("X-Content-Type-Options","nosniff");return new WebResourceResponse("application/json","UTF-8",code,reason,headers,new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));}
}
