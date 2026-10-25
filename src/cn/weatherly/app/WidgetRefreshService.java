package cn.weatherly.app;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import java.util.Set;
import java.util.Collections;
import java.util.concurrent.ConcurrentHashMap;

public final class WidgetRefreshService extends JobService {
  private final Set<JobParameters> active=Collections.newSetFromMap(new ConcurrentHashMap<JobParameters,Boolean>());
  static boolean connected(Context c){android.net.ConnectivityManager manager=(android.net.ConnectivityManager)c.getSystemService(Context.CONNECTIVITY_SERVICE);if(manager==null)return false;android.net.Network network=manager.getActiveNetwork();android.net.NetworkCapabilities caps=network==null?null:manager.getNetworkCapabilities(network);return caps!=null&&caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET);}
  static void schedule(Context c,boolean periodic){
    JobScheduler scheduler=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);if(scheduler==null)return;
    int id=periodic?1201:1202;if(periodic){for(JobInfo job:scheduler.getAllPendingJobs())if(job.getId()==id)return;}
    JobInfo.Builder builder=new JobInfo.Builder(id,new ComponentName(c,WidgetRefreshService.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY);
    if(periodic)builder.setPeriodic(30*60*1000L).setPersisted(true);else builder.setOverrideDeadline(0);
    scheduler.schedule(builder.build());
  }
  static void cancel(Context c){JobScheduler scheduler=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);if(scheduler!=null){scheduler.cancel(1201);scheduler.cancel(1202);}}
  @Override public boolean onStartJob(JobParameters params){
    active.add(params);WeatherRepository.prefs(this).edit().putLong("refreshStarted",System.currentTimeMillis()).apply();WeatherWidgetProvider.updateAll(this);
    new Thread(()->{WidgetLocation.refresh(getApplicationContext(),false);boolean ok=WeatherRepository.refresh(getApplicationContext());if(active.remove(params)){if(active.isEmpty())WeatherRepository.prefs(this).edit().remove("refreshStarted").apply();WeatherWidgetProvider.updateAll(getApplicationContext());jobFinished(params,!ok&&WidgetLocation.permitted(this)&&WidgetLocation.backgroundPermitted(this));}},"WeatherWidgetRefresh").start();return true;
  }
  @Override public boolean onStopJob(JobParameters params){active.remove(params);if(active.isEmpty())WeatherRepository.prefs(this).edit().remove("refreshStarted").apply();WeatherWidgetProvider.updateAll(this);return true;}
}
