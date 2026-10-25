import {openPage,closePage} from './interactions.mjs';

// The original selects remain data controls only. Every visible choice uses the same sheet.
export function installChoices(){
 const sheet=document.createElement('dialog');sheet.id='choiceSheet';sheet.className='choice-sheet';sheet.setAttribute('aria-labelledby','choiceTitle');
 sheet.innerHTML='<div class="sheet-handle" aria-hidden="true"></div><header class="choice-heading"><div><small>偏好设置</small><h2 id="choiceTitle"></h2></div><button class="choice-close" data-close="choiceSheet" aria-label="关闭选项">×</button></header><div class="choice-options" role="radiogroup" aria-labelledby="choiceTitle"></div><p class="choice-footnote">选择后自动保存</p>';
 document.body.append(sheet);const list=sheet.querySelector('.choice-options'),title=sheet.querySelector('h2'),caption=sheet.querySelector('small');
 let current=null,trigger=null,committing=false;
 const controls=new WeakMap();
 const descriptions={chinaSource:{auto:'按城市匹配适合的地区预报模型',cma:'通过 Open-Meteo 获取 CMA 模型预报',ecmwf:'欧洲中期天气预报中心全球模型'}};
 const mapNotes={auto:'优先在线街道，不可用时自动显示内置底图',local:'离线显示海岸线、湖泊和主要城市',online:'显示街道细节，需要联网；失败时保留内置底图'};
 function sync(select){const button=controls.get(select);if(!button)return;button.querySelector('span').textContent=select.selectedOptions[0]?.textContent||'请选择';if(button.disabled!==select.disabled)button.disabled=select.disabled;button.setAttribute('aria-label',(select.getAttribute('aria-label')||document.querySelector('label[for="'+select.id+'"]')?.textContent||'选择')+'：'+button.querySelector('span').textContent);}
 function open(select,button){
  if(select.disabled||sheet.open)return;current=select;trigger=button;committing=false;
  const name=select.getAttribute('aria-label')||document.querySelector('label[for="'+select.id+'"]')?.textContent||'选择选项';title.textContent=name;caption.textContent=select.id==='chinaSource'?'天气偏好':name.includes('底图')?'地图偏好':'城市对比';
  list.replaceChildren();const notes=descriptions[select.id]||(name.includes('底图')?mapNotes:{});
  for(const option of select.options){const row=document.createElement('button');row.type='button';row.className='choice-option';row.dataset.value=option.value;row.setAttribute('role','radio');row.setAttribute('aria-checked',String(option.selected));row.disabled=option.disabled;row.tabIndex=option.selected?0:-1;
   const text=document.createElement('span'),label=document.createElement('strong');label.textContent=option.textContent;text.append(label);if(notes[option.value]){const note=document.createElement('small');note.textContent=notes[option.value];text.append(note);}const mark=document.createElement('span');mark.className='choice-check';mark.setAttribute('aria-hidden','true');mark.textContent='✓';row.append(text,mark);list.append(row);
  }
  button.setAttribute('aria-expanded','true');openPage(sheet,button);(list.querySelector('[aria-checked="true"]')||list.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
 }
 list.addEventListener('click',async event=>{const row=event.target.closest('button');if(!row||row.disabled||committing)return;committing=true;const select=current,value=row.dataset.value,button=trigger;list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-checked',String(b===row)));await closePage(sheet);if(select?.isConnected&&!select.disabled&&select.value!==value){select.value=value;sync(select);select.dispatchEvent(new Event('change',{bubbles:true}));}if(button?.isConnected)button.focus({preventScroll:true});});
 list.addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const rows=[...list.querySelectorAll('button:not(:disabled)')],i=rows.indexOf(document.activeElement);rows[event.key==='Home'?0:event.key==='End'?rows.length-1:(i+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length]?.focus();});
 sheet.addEventListener('click',event=>{if(event.target===sheet){const r=sheet.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right)closePage(sheet);}});
 sheet.addEventListener('close',()=>{trigger?.setAttribute('aria-expanded','false');current=null;trigger=null;committing=false;});
 function upgrade(){document.querySelectorAll('select').forEach(select=>{if(!controls.has(select)){const button=document.createElement('button');button.type='button';button.className='choice-trigger';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','choiceSheet');button.setAttribute('aria-expanded','false');button.innerHTML='<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>';select.hidden=true;select.tabIndex=-1;select.after(button);controls.set(select,button);button.addEventListener('click',()=>open(select,button));select.addEventListener('change',()=>sync(select));}sync(select);});if(sheet.open&&current&&!current.isConnected)closePage(sheet);}
 // Observe structural changes and disabled state, not our own text/ARIA updates.
 new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('select')||n.querySelector?.('select')))))upgrade();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});upgrade();
}
