/* Copia visual autónoma: preserva el gráfico original y sus enlaces por año. */
const root=document.documentElement;
const content=document.querySelector('main');
let current='/';
let observer;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const notices=document.getElementById('preview-notice');
const normalize=text=>text.replace(/\s+/g,' ').trim();
function notify(message){notices.textContent=message;notices.hidden=false;}
function motionEnabled(){return root.classList.contains('pulido')&&document.getElementById('preview-motion').checked&&!reduced.matches;}
function cancelMotion(){content.getAnimations({subtree:true}).forEach(animation=>animation.cancel());}
function animateGraph(element){if(!motionEnabled())return;
 const annual=element.matches('figure.grafico');
 const bars=element.querySelectorAll(annual?'.columna':'.b-total');
 bars.forEach((bar,index)=>{bar.style.transformOrigin=annual?'center bottom':'left center';bar.animate([{transform:annual?'scaleY(0)':'scaleX(0)'},{transform:annual?'scaleY(1)':'scaleX(1)'}],{duration:850,delay:Math.min(index*10,220),easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'})});
}
function bindMotion(){observer?.disconnect();cancelMotion();observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){animateGraph(entry.target);observer.unobserve(entry.target)}}),{threshold:.25});content.querySelectorAll('figure.grafico,.barras-h,.margen .barras,.autores').forEach(graph=>observer.observe(graph));}
function bindGraphs(){content.querySelectorAll('figure.grafico').forEach(figure=>{
 const reading=figure.querySelector('.lectura');const initial=reading.innerHTML;
 figure.querySelectorAll('.barras a').forEach(link=>{
 const describe=()=>{figure.getAnimations({subtree:true}).forEach(animation=>animation.cancel());const label=link.getAttribute('aria-label');const colon=label.indexOf(':');reading.replaceChildren();const year=document.createElement('strong');year.textContent=label.slice(0,colon);reading.append(year,document.createTextNode(' '+label.slice(colon+1).trim()))};
 link.addEventListener('mouseenter',describe);link.addEventListener('focus',describe);link.addEventListener('mouseleave',()=>{if(!figure.contains(document.activeElement))reading.innerHTML=initial});link.addEventListener('blur',()=>{reading.innerHTML=initial});
 });
 });}
function bindTables(){content.querySelectorAll('article.texto>table').forEach(table=>{const wrap=document.createElement('div');wrap.className='tabla-lectura';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',table.querySelector('caption')?.textContent||'Tabla de metodología');table.before(wrap);wrap.append(table)});}
function render(path,hash='',push=true){
 const template=[...document.querySelectorAll('template[data-path]')].find(t=>t.dataset.path===path);
 if(!template){notify('Esta consulta no está incluida en la copia visual. El sitio publicado conserva su búsqueda completa.');return false;}
 current=path;root.dataset.vista=path==='/'?'inicio':path.split('/')[1].split('?')[0];content.replaceChildren(template.content.cloneNode(true));notices.hidden=true;
 document.querySelectorAll('.cabecera nav a').forEach(link=>{const active=link.getAttribute('href')===(path.startsWith('/boletin/')?'/proyectos':path.split('?')[0]);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});
 document.querySelectorAll('.menu[open]').forEach(menu=>menu.open=false);
 bindGraphs();bindTables();bindMotion();
 if(push){const url=new URL(location.href);url.searchParams.set('vista',path);url.hash=hash;history.pushState({},'',url)}
 if(hash)requestAnimationFrame(()=>document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView());else window.scrollTo({top:0,behavior:'instant'});
 return true;
}
document.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;const href=link.getAttribute('href');if(!href)return;
 if(href.startsWith('#'))return;
 if(href.startsWith('/')){event.preventDefault();const url=new URL(href,'http://127.0.0.1');render(url.pathname+url.search,url.hash);}
});
document.addEventListener('submit',event=>{event.preventDefault();const form=event.target;const params=new URLSearchParams(new FormData(form));for(const[key,value]of [...params])if(!value)params.delete(key);const query=params.toString();render('/proyectos'+(query?'?'+query:''));});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{root.classList.toggle('pulido',button.dataset.mode==='pulido');document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b===button));bindMotion()}));
document.getElementById('preview-replay').addEventListener('click',()=>{cancelMotion();content.querySelectorAll('figure.grafico,.barras-h,.margen .barras,.autores').forEach(graph=>{const box=graph.getBoundingClientRect();if(box.bottom>0&&box.top<innerHeight)animateGraph(graph)})});
document.getElementById('preview-motion').addEventListener('change',bindMotion);reduced.addEventListener('change',bindMotion);
const theme=document.querySelector('.tema');theme?.addEventListener('click',()=>{const dark=(root.dataset.theme|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))==='dark';root.dataset.theme=dark?'light':'dark';theme.setAttribute('aria-label',dark?'Cambiar a modo oscuro':'Cambiar a modo claro');theme.querySelector('svg')?.classList.toggle('oscuro',!dark)});
window.addEventListener('popstate',()=>{const url=new URL(location.href);const path=url.searchParams.get('vista')||'/';if(path===current)return;render(path,url.hash,false)});
const initialUrl=new URL(location.href);render(initialUrl.searchParams.get('vista')||'/',initialUrl.hash,false);
window.preview={render,animateGraph,cancelMotion,current:()=>current,normalize};
