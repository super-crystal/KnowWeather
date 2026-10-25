package cn.weatherly.app;
import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.*;
import android.view.View;
import android.view.animation.LinearInterpolator;

final class RefreshControl extends View {
  private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);private final int tint;private boolean busy;private float angle;private ValueAnimator spinner;
  RefreshControl(Context c,int color){super(c);tint=color;setClickable(true);setFocusable(true);setContentDescription("刷新卡片天气");setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf((color&0x00ffffff)|0x22000000),null,new android.graphics.drawable.ColorDrawable(Color.WHITE)));}
  void setBusy(boolean value){busy=value;setEnabled(!value);setContentDescription(value?"正在刷新卡片天气":"刷新卡片天气");if(spinner!=null){spinner.cancel();spinner=null;}if(value&&isAttachedToWindow()){spinner=ValueAnimator.ofFloat(0,360);spinner.setDuration(800);spinner.setRepeatCount(ValueAnimator.INFINITE);spinner.setInterpolator(new LinearInterpolator());spinner.addUpdateListener(a->{angle=(Float)a.getAnimatedValue();invalidate();});spinner.start();}invalidate();}
  @Override public CharSequence getAccessibilityClassName(){return "android.widget.Button";}
  @Override protected void onDetachedFromWindow(){if(spinner!=null)spinner.cancel();super.onDetachedFromWindow();}
  @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);float cx=getWidth()/2f,cy=getHeight()/2f,r=Math.min(getWidth(),getHeight())*.23f;paint.setColor(tint);paint.setStrokeWidth(getResources().getDisplayMetrics().density*2);paint.setStrokeCap(Paint.Cap.ROUND);paint.setStyle(Paint.Style.STROKE);
    if(busy){paint.setAlpha(45);canvas.drawCircle(cx,cy,r,paint);paint.setAlpha(255);canvas.save();canvas.rotate(angle,cx,cy);canvas.drawArc(cx-r,cy-r,cx+r,cy+r,-90,250,false,paint);canvas.restore();}
    else {canvas.drawArc(cx-r,cy-r,cx+r,cy+r,-65,295,false,paint);double rad=Math.toRadians(230);float x=cx+(float)Math.cos(rad)*r,y=cy+(float)Math.sin(rad)*r,s=getResources().getDisplayMetrics().density*4;Path arrow=new Path();arrow.moveTo(x-s,y-s*.1f);arrow.lineTo(x,y+s);arrow.lineTo(x+s*.6f,y-s*.5f);canvas.drawPath(arrow,paint);}
  }
}
