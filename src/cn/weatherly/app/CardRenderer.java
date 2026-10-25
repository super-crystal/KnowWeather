package cn.weatherly.app;

import android.content.Context;
import android.graphics.*;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

final class CardRenderer {
  static Bitmap render(Context context,boolean solar,int width,int height){
    float factor=Math.min(1f,720f/Math.max(width,height));width=Math.max(120,Math.round(width*factor));height=Math.max(120,Math.round(height*factor));
    Bitmap bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(bitmap);
    canvas.scale(width/420f,width/420f);draw(context,canvas,solar,height*420f/width);return bitmap;
  }
  static void draw(Context context,Canvas canvas,boolean solar,float height){
    JSONObject snapshot=WeatherRepository.snapshot(context),city=WeatherRepository.city(context);
    boolean valid=WeatherRepository.number(snapshot,"temperature"),day=snapshot.optInt("isDay",1)!=0;
    String style=WeatherRepository.prefs(context).getString("widgetTheme","weather");
    boolean night=!"light".equals(style)&&valid&&!day;
    int top=Color.parseColor(night?"#070F32":"#2454AF"),bottom=Color.parseColor(night?"#233961":"#75BCE9");
    Paint paint=new Paint(3);Path clip=new Path();clip.addRoundRect(new RectF(0,0,420,height),52,52,Path.Direction.CW);canvas.save();canvas.clipPath(clip);
    paint.setShader(new LinearGradient(0,0,70,height,top,bottom,Shader.TileMode.CLAMP));canvas.drawRect(0,0,420,height,paint);paint.setShader(null);
    sky(canvas,paint,night);
    if(solar)solar(context,canvas,paint,snapshot,day,height);else weather(context,canvas,paint,snapshot,city,valid,day,height);
    text(canvas,paint,WeatherRepository.status(context),32,height-29,15,Color.argb(210,255,255,255),false,322);
    canvas.restore();
  }
  static void sky(Canvas c,Paint p,boolean night){
    for(int i=0;i<12;i++){
      float x=(i*91+70)%500-30,y=86+(i*43)%140;
      p.setShader(new RadialGradient(x,y,80,new int[]{Color.argb(night?17:28,240,248,255),Color.TRANSPARENT},null,Shader.TileMode.CLAMP));c.drawCircle(x,y,80,p);
    }
    p.setShader(null);
    Path cloud=new Path();cloud.moveTo(-30,140);cloud.cubicTo(60,105,60,185,130,145);cloud.cubicTo(220,103,230,190,330,145);cloud.cubicTo(380,115,440,151,470,166);
    p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(18);p.setColor(Color.argb(night?10:19,255,255,255));c.drawPath(cloud,p);p.setStyle(Paint.Style.FILL);
    if(night){p.setColor(Color.argb(90,230,240,255));for(int i=0;i<11;i++)c.drawCircle((i*71+17)%420,(i*47+26)%220,1.25f,p);}
  }
  static void weather(Context context,Canvas c,Paint p,JSONObject s,JSONObject city,boolean valid,boolean day,float height){
    // Location marker is drawn locally, so no font-dependent emoji is required.
    p.setColor(Color.WHITE);Path pin=new Path();pin.moveTo(42,38);pin.cubicTo(16,37,27,63,42,77);pin.cubicTo(58,62,68,37,42,38);c.drawPath(pin,p);p.setColor(Color.parseColor("#315C94"));c.drawCircle(42,49,5,p);
    text(c,p,city.optString("name","北京"),62,65,31,Color.WHITE,true,238);
    int code=s.optInt("code",-1);weatherIcon(c,p,344,68,code,day,35);
    String temperature=WeatherRepository.temperature(context,s,"temperature");
    boolean compact=height<330;
    text(c,p,temperature+"°",30,compact?height*.59f:194,compact?70:102,Color.WHITE,false,346);
    String condition=WeatherRepository.condition(code);
    String range=WeatherRepository.temperature(context,s,"low")+"° / "+WeatherRepository.temperature(context,s,"high")+"°";
    text(c,p,valid?condition+"  "+range:"天气暂未更新",32,compact?height-62:height-124,compact?23:28,Color.WHITE,false,354);
    if(!compact)text(c,p,valid?WeatherRepository.advice(s):"卡片中心开启定位",32,height-88,27,Color.WHITE,false,354);
    if("f".equals(WeatherRepository.prefs(context).getString("unit","c")))text(c,p,"°F",337,221,19,Color.argb(200,255,255,255),false,52);
  }
  static String time(String raw){return raw!=null&&raw.length()>=16?raw.substring(11,16):"—:—";}
  static long localTimestamp(JSONObject s,String raw){
    try{SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm",Locale.US);f.setTimeZone(TimeZone.getTimeZone(s.optString("timezone","Asia/Shanghai")));return f.parse(raw).getTime();}catch(Exception e){return 0;}
  }
  static void solar(Context context,Canvas c,Paint p,JSONObject s,boolean day,float height){
    String rise=s.optString("sunrise",""),set=s.optString("sunset",""),next=s.optString("nextSunrise","");
    long r=localTimestamp(s,rise),t=localTimestamp(s,set),now=System.currentTimeMillis();boolean beforeRise=r>0&&now<r,afterSet=t>0&&now>t;
    String title=beforeRise||afterSet?"日出":"日落",main=beforeRise?rise:afterSet?next:set;
    text(c,p,title,32,66,31,Color.WHITE,true,252);weatherIcon(c,p,344,68,0,true,27);
    text(c,p,time(main),32,height<330?120:137,height<330?50:62,Color.WHITE,false,334);
    if(height<330){text(c,p,"日落 "+time(set),32,height-62,23,Color.WHITE,false,356);return;}
    c.save();c.translate(0,height-420);
    p.setColor(Color.argb(50,232,247,255));p.setStrokeWidth(2);c.drawLine(0,281,420,281,p);
    Path curve=new Path();curve.moveTo(-20,316);curve.cubicTo(81,322,99,260,149,213);curve.cubicTo(202,153,235,169,270,226);curve.cubicTo(307,292,348,320,440,322);
    p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(5);p.setColor(Color.argb(65,212,239,255));c.drawPath(curve,p);
    Path below=new Path();below.moveTo(-20,316);below.cubicTo(55,317,92,293,119,281);p.setColor(Color.argb(95,7,38,100));c.drawPath(below,p);p.setStyle(Paint.Style.FILL);
    float fraction=(r>0&&t>r)?(float)Math.max(0,Math.min(1,(now-r)/(double)(t-r))):.5f;
    float x=55+fraction*310,y=312-(float)Math.sin(fraction*Math.PI)*132;
    if(r==0||t==0){x=210;y=184;}
    p.setShader(new RadialGradient(x,y,48,new int[]{Color.argb(180,255,251,203),Color.TRANSPARENT},null,Shader.TileMode.CLAMP));c.drawCircle(x,y,48,p);p.setShader(null);p.setColor(Color.parseColor("#FFFADC"));c.drawCircle(x,y,12,p);
    String secondary=beforeRise?"今日日落 "+time(set):"明日日出 "+time(next);
    text(c,p,secondary,32,348,28,Color.WHITE,false,356);
    if(r==0||t==0)text(c,p,"当前城市暂无日出日落数据",32,310,19,Color.WHITE,false,356);
    c.restore();
  }
  static void weatherIcon(Canvas c,Paint p,float x,float y,int code,boolean day,float radius){
    if(code<0||code==3||code==45||code==48||code>=51){
      p.setColor(Color.parseColor("#DBEEFF"));c.drawCircle(x-17,y+5,15,p);c.drawCircle(x,y-4,21,p);c.drawCircle(x+23,y+7,14,p);c.drawRoundRect(x-31,y+4,x+36,y+21,10,10,p);
      if(code>=51){p.setColor(Color.parseColor("#8BDCFF"));p.setStrokeWidth(4);for(int i=-1;i<=1;i++)c.drawLine(x+i*17,y+29,x-4+i*17,y+39,p);}return;
    }
    p.setColor(Color.parseColor("#FFE04A"));
    if(day){c.drawCircle(x,y,radius*.65f,p);p.setStrokeWidth(4);p.setStrokeCap(Paint.Cap.ROUND);for(int i=0;i<8;i++){double a=i*Math.PI/4;c.drawLine(x+(float)Math.cos(a)*radius*.85f,y+(float)Math.sin(a)*radius*.85f,x+(float)Math.cos(a)*radius*1.13f,y+(float)Math.sin(a)*radius*1.13f,p);}}
    else{Path moon=new Path();moon.addCircle(x,y,radius,Path.Direction.CW);Path cut=new Path();cut.addCircle(x+radius*.51f,y-radius*.43f,radius*.89f,Path.Direction.CW);moon.op(cut,Path.Op.DIFFERENCE);c.drawPath(moon,p);star(c,p,x+28,y-29,7);star(c,p,x+39,y-7,4);}
  }
  static void star(Canvas c,Paint p,float x,float y,float r){Path star=new Path();star.moveTo(x,y-r);star.lineTo(x+r*.32f,y-r*.3f);star.lineTo(x+r,y);star.lineTo(x+r*.32f,y+r*.3f);star.lineTo(x,y+r);star.lineTo(x-r*.32f,y+r*.3f);star.lineTo(x-r,y);star.lineTo(x-r*.32f,y-r*.3f);star.close();c.drawPath(star,p);}
  static void text(Canvas c,Paint p,String text,float x,float y,float size,int color,boolean bold,float maxWidth){
    p.setShader(null);p.setStyle(Paint.Style.FILL);p.setColor(color);p.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));p.setTextSize(size);
    while(p.measureText(text)>maxWidth&&p.getTextSize()>size*.72f)p.setTextSize(p.getTextSize()-1);
    if(p.measureText(text)>maxWidth){int end=text.length();while(end>0&&p.measureText(text.substring(0,end)+"…")>maxWidth)end--;text=text.substring(0,end)+"…";}
    c.drawText(text,x,y,p);
  }
}
