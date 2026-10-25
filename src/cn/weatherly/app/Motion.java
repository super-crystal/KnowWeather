package cn.weatherly.app;

import android.animation.TimeInterpolator;
import android.animation.ValueAnimator;
import android.os.Build;
import android.view.MotionEvent;
import android.view.View;
import android.view.animation.PathInterpolator;

final class Motion {
  private Motion() {}
  static boolean enabled(){return Build.VERSION.SDK_INT<26||ValueAnimator.areAnimatorsEnabled();}
  private static final TimeInterpolator PRESS=new PathInterpolator(.215f,.61f,.355f,1f);
  private static double response(double t){double a=18,w=Math.sqrt(420-a*a);return 1-Math.exp(-a*t)*(Math.cos(w*t)+a/w*Math.sin(w*t));}
  private static final TimeInterpolator RELEASE=t->t<=0?0:t>=1?1:(float)(response(t*.32)+(1-response(.32))*t);
  static void bindPress(View view){view.setOnTouchListener((target,event)->{int action=event.getActionMasked();if(action!=MotionEvent.ACTION_DOWN&&action!=MotionEvent.ACTION_UP&&action!=MotionEvent.ACTION_CANCEL)return false;target.animate().cancel();if(!enabled()){target.setScaleX(1);target.setScaleY(1);return false;}boolean down=action==MotionEvent.ACTION_DOWN;float density=target.getResources().getDisplayMetrics().density;float size=Math.max(1,Math.min(target.getWidth(),target.getHeight())/density);float scale=down?1-Math.min(.045f,2f/size):1;target.animate().scaleX(scale).scaleY(scale).setInterpolator(down?PRESS:RELEASE).setDuration(down?90:320).start();return false;});}
}
