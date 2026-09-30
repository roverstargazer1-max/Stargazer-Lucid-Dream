// Explicit local review UI. Every fixture goes through the real selection and reader flow.
// Enabled by ?review=1, never included in the static blog build.
import {setStarCoreGain} from './painted.js';
import {setCloudTreatment} from './dome-renderer.js';
export function installReviewTools({articles,relations,select,refresh,look,renderMedia,audit}){
  const originals=articles.map(a=>structuredClone(a)),originalRelations=structuredClone(relations);
  const host=document.createElement('fieldset');host.className='growth-controls';
  host.innerHTML=`<legend>V20 验收样本 · 刷新恢复</legend>
    <select id="qa-article" aria-label="验收文章"></select>
    <select id="qa-fixture" aria-label="验收内容"><option value="normal">原始内容</option><option value="long">长标题、引言与三条理由</option><option value="mixed">中英数字与长链接图片</option><option value="empty">无引言</option><option value="short">一屏短文</option></select>
    <button id="qa-open">查看样本</button>
    <select id="qa-text" aria-label="文字放大"><option value="100">文字 100%</option><option value="200">文字 200%</option></select>
    <select id="qa-view" aria-label="场景对照视角"><option value="dark">暗天空</option><option value="cloud">亮云</option><option value="horizon">地平线</option><option value="zenith">天顶</option></select><button id="qa-look">查看视角</button>
    <select id="qa-core" aria-label="星光对照"><option value="1.1">光核 +10%</option><option value="1">原始光核</option></select>
    <select id="qa-cloud" aria-label="远云对照"><option value="0">原始远云</option><option value="0.08">远云灰度混合 8%</option></select>
    <select id="qa-mark" aria-label="字标对照"><option value="full">原始小字标</option><option value="simple">精简小字标</option></select>
    <button id="qa-audit">检查完整动效与状态</button>
    <output id="qa-result" aria-live="polite">仅用于内容、构图和显示设置验收。</output>
    <pre id="qa-audit-result" style="max-width:100%;white-space:pre-wrap;text-align:left"></pre>`;
  document.querySelector('.art-study-controls').append(host);
  const $=id=>document.getElementById(id);
  for(const article of articles){const option=document.createElement('option');option.value=article.id;option.textContent=article.title;$('qa-article').append(option);}
  $('qa-article').value='unfinished';
  $('qa-open').onclick=()=>{
    originals.forEach((a,i)=>Object.assign(articles[i],structuredClone(a)));
    relations.splice(0,relations.length,...structuredClone(originalRelations));
    const article=articles.find(a=>a.id===$('qa-article').value),fixture=$('qa-fixture').value;
    if(fixture==='long'){
      article.title='在漫长的夜色里给所有尚未完成的事留下一扇窗';
      article.intro='这是一段用于检查长内容的引言。我们沿着夜空继续前行，让文字自然换行，也让每一个动作都能随时找到。'.repeat(5);
      article.paragraphs=Array.from({length:18},(_,i)=>`第 ${i+1} 段。${article.intro.slice(0,95)}`);
      relations.splice(0,relations.length,...relations.filter(r=>!r.includes(article.id)));
      for(const other of articles.filter(a=>a.id!==article.id).slice(0,3))relations.push([article.id,other.id,'验收用关系理由：这段文字用于观察长句、标点和换行后的阅读节奏，并不代表作者实际确认的观点。'.repeat(3)]);
    }
    if(fixture==='mixed'){
      article.title='夜航日志 2026：Lucid Dream 与第 128 次观察';
      article.intro='September 2026，23:48。ABC / 0123456789，“句读”、破折号——与中文字体的节奏。';
      article.paragraphs=['图片与长链接是本地排版验收样本。','https://example.com/'+('a-long-readable-path/').repeat(14),...Array.from({length:8},()=>article.intro.repeat(3))];
    }
    if(fixture==='empty')article.intro='';
    if(fixture==='short'){article.title='晚安';article.intro='';article.paragraphs=['今天就写到这里。'];}
    renderMedia(fixture==='mixed');refresh();document.querySelector('.art-study-bar').open=false;select(article.id);
    $('qa-result').textContent=`样本：${fixture} / ${article.id}；仅当次访问。`;
  };
  $('qa-text').onchange=()=>{document.documentElement.style.fontSize=$('qa-text').value==='200'?'32px':'';refresh();window.dispatchEvent(new Event('resize'));};
  $('qa-look').onclick=()=>{const poses={dark:[0,.9,1],cloud:[.6,.25,1],horizon:[.4,.05,.8],zenith:[0,Math.PI/2,.6]};document.querySelector('.art-study-bar').open=false;look(...poses[$('qa-view').value]);};
  $('qa-core').onchange=()=>setStarCoreGain(Number($('qa-core').value));
  $('qa-cloud').onchange=()=>setCloudTreatment(Number($('qa-cloud').value));
  $('qa-mark').onchange=()=>document.body.dataset.mark=$('qa-mark').value;
  $('qa-audit').onclick=async()=>{
    const button=$('qa-audit'),results=[];button.disabled=true;$('qa-audit-result').textContent='运行中';
    document.querySelector('.art-study-bar').open=false;
    const wait=async(predicate,limit=10000)=>{
      const start=performance.now();while(!predicate()){
        if(performance.now()-start>limit)throw new Error('状态等待超时');
        await new Promise(resolve=>requestAnimationFrame(resolve));
      }
    };
    const delay=async(ms)=>{const end=performance.now()+ms;await wait(()=>performance.now()>=end);};
    const check=(name,pass,evidence)=>{results.push({name,pass,evidence});if(!pass)throw new Error(name);};
    const point=()=>{const r=document.querySelector('.star-target.is-selected').getBoundingClientRect();return [r.x,r.y];};
    try{
      audit.full();$('home').click();await wait(()=>document.body.dataset.room==='inside');
      $('window-entry').click();await wait(()=>document.body.dataset.room==='outside'&&!document.body.dataset.arrival);
      let start=performance.now();select('night');audit.activate('night');audit.activate('night');
      check('移动中重复激活不打开正文',!$('reader').open&&$('read-button').disabled);
      await wait(()=>!$('read-button').disabled);
      check('相机到位时动作区已可见',getComputedStyle(document.querySelector('.preview-bottom')).opacity==='1'&&!$('reader').open,{elapsed:Math.round(performance.now()-start),previewBusy:$('preview').getAttribute('aria-busy')});
      await wait(()=>!$('preview').hasAttribute('aria-busy'));
      check('首次完整显露', $('preview').dataset.presentation==='first'&&!document.querySelector('.ink-veil'),{elapsed:Math.round(performance.now()-start)});
      $('deselect').click();start=performance.now();select('night');await wait(()=>!$('preview').hasAttribute('aria-busy'));
      check('重复显露缩短但不能提前阅读',$('preview').dataset.presentation==='repeat'&&$('read-button').disabled,{elapsed:Math.round(performance.now()-start)});
      await wait(()=>!$('read-button').disabled);const before=point();$('read-button').click();await wait(()=>!$('reader').dataset.motion);
      $('reading-scroll').scrollTop=$('reading-scroll').scrollHeight;await wait(()=>$('reading-state').textContent==='已到文末');
      $('close-reader').click();await wait(()=>!$('reader').open);const after=point();
      check('阅读返回位置和身份保持',audit.selected()==='night'&&before.every((v,i)=>Math.abs(v-after[i])<.5),{before,after});
      select('answer');await delay(450);audit.interrupt();check('手动中断清理遮块',!document.querySelector('.ink-veil'));
      select('answer');check('中断的简介仍走首次',$('preview').dataset.presentation==='first');
      await delay(350);select('letter');check('移动中改选目标',audit.selected()==='letter'&&!$('reader').open);
      $('home').click();await wait(()=>document.body.dataset.room==='inside');check('归窗清理选中与遮块',!audit.selected()&&!document.querySelector('.ink-veil')&&$('preview').hidden);
      $('window-entry').click();await wait(()=>!document.body.dataset.arrival&&document.body.dataset.room==='outside');select('night');await wait(()=>!$('read-button').disabled);
      $('time-mode').click();await wait(()=>!$('read-button').disabled);
      check('切换时间仍聚焦同文',audit.selected()==='night'&&$('preview').dataset.presentation==='repeat');
      check('时间提示来自文章年月',$('time-cue').textContent===`${articles[0].date.slice(0,4)} 年 ${Number(articles[0].date.slice(5,7))} 月`&&!$('time-cue').hidden,$('time-cue').textContent);
      await wait(()=>$('time-cue').hidden,5000);check('时间提示自动退出',true);
      $('relation-mode').click();await wait(()=>!$('read-button').disabled);
      check('动画末尾没有遮块',!document.querySelector('.ink-veil')&&!$('reader').open);
      $('qa-result').textContent='完整动效与状态检查通过';
    }catch(error){results.push({name:'检查中止',pass:false,evidence:error.message});$('qa-result').textContent='检查发现问题';}
    finally{button.disabled=false;$('qa-audit-result').textContent=JSON.stringify(results,null,2);document.querySelector('.art-study-bar').open=true;}
  };
}
