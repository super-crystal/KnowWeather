// Each online attempt owns a monitor; callbacks from removed layers cannot revive it.
export class TileHealth {
 constructor(report,{setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),timeout=8000}={}){this.report=report;this.setTimer=setTimer;this.clearTimer=clearTimer;this.timeout=timeout;this.loaded=0;this.failed=0;this.closed=false;this.timer=null;}
 start(){if(this.closed)return;this.report('loading');this.timer=this.setTimer(()=>{this.timer=null;if(!this.closed)this.report(this.loaded?'partial':'fallback');},this.timeout);}
 tileLoaded(){if(this.closed)return;this.loaded++;this.report(this.failed?'partial':'online');}
 tileFailed(){if(this.closed)return;this.failed++;this.report(this.loaded?'partial':'fallback');}
 settled(){if(this.closed)return;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;this.report(this.loaded?(this.failed?'partial':'online'):'fallback');}
 dispose(){this.closed=true;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;}
}
