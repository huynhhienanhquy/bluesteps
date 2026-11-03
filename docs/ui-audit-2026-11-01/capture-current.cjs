const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createRequire}=require('node:module');
const requireApp=createRequire(path.resolve('apps/mobile/package.json'));
const {chromium}=requireApp('@playwright/test');
const out=__dirname, app=path.resolve('apps/mobile/app');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const routes=walk(app).filter(f=>f.endsWith('.tsx')&&!/[/\\](_layout|\+not-found)\.tsx$/.test(f)).map(file=>{
 const raw=path.relative(app,file).replaceAll('\\','/').replace(/\.tsx$/,'');
 const pattern='/'+raw.split('/').filter(x=>!x.startsWith('(')).join('/').replace(/(^|\/)index$/,'');
 const source=fs.readFileSync(file,'utf8');
 const component=source.match(/export\s*\{\s*(\w+)\s+as\s+default/)?.[1]||source.match(/import\s*\{\s*(\w+)/)?.[1]||'unknown';
 const target=source.match(/from\s+['"]([^'"]+)['"]/)?.[1];
 return {pattern:pattern||'/',file:path.relative(process.cwd(),file).replaceAll('\\','/'),component,target:target?path.relative(process.cwd(),path.resolve(path.dirname(file),target+'.tsx')).replaceAll('\\','/'):null,source};
});
fs.writeFileSync(path.join(out,'routes.json'),JSON.stringify(routes,null,2));
const shots=new Set(['/','/login','/register','/onboarding','/forgot-password','/verify-email','/collection','/collection-filters','/scan','/handbook','/handbook/types/[kind]','/articles','/articles/briefs','/articles/calendar','/events','/game','/rewards','/profile','/community','/notifications','/assistant']);
(async()=>{
 const health=await fetch('http://127.0.0.1:8000/v1/events');
 if(!health.ok) throw Error('API preflight returned '+health.status);
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:428,height:926},colorScheme:'light',locale:'vi-VN',timezoneId:'Asia/Bangkok'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const apiResponses=[];page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8000/'))apiResponses.push({method:r.request().method(),path:new URL(r.url()).pathname,status:r.status()});});
 const results=[];
 for(const route of routes){
  const url=route.pattern.replace('[id]','00000000-0000-4000-8000-000000000001').replace('[kind]','plastic').replace('[category]','recyclable');
  const start=errors.length,apiStart=apiResponses.length;
  try{
   const res=await page.goto('http://127.0.0.1:4173'+url,{waitUntil:'networkidle',timeout:25000});
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForTimeout(150);
   const text=await page.locator('body').innerText();
   let screenshot=null;
   if(shots.has(route.pattern)){screenshot='app-'+(url==='/'?'home':url.slice(1).replaceAll('/','-'))+'.png';await page.screenshot({path:path.join(out,screenshot)});}
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,headings:[...document.querySelectorAll('[role="heading"]')].map(n=>({text:n.textContent,font:getComputedStyle(n).fontFamily,size:getComputedStyle(n).fontSize,lineHeight:getComputedStyle(n).lineHeight})),images:[...document.images].map(n=>({src:n.getAttribute('src'),width:n.naturalWidth,height:n.naturalHeight}))}));
   const displayState=text.includes('Failed to fetch')||text.includes('Dịch vụ tạm thời')?'connection-error':text.includes('Đăng nhập để tiếp tục')?'auth-gated':text.includes('Không tìm thấy tài nguyên')?'missing-test-resource':text.includes('được công bố')?'empty':text.includes('Đang tải dữ liệu')?'pending':'rendered';
   results.push({route:route.pattern,url,status:res.status(),displayState,text,screenshot,...state,apiResponses:apiResponses.slice(apiStart),errors:errors.slice(start)});
   console.log(route.pattern+' '+res.status()+' '+displayState);
  }catch(e){results.push({route:route.pattern,url,error:e.message,errors:errors.slice(start)});console.log(route.pattern+' FAILED '+e.message);}
 }
 const variants=[];
 for(const route of ['/onboarding?step=0&preview=1','/onboarding?step=9&preview=1','/community?preview=1&frame=722:5635','/community?preview=1&frame=722:5699','/notifications?preview=1&frame=703:5399','/notifications?preview=1&frame=703:5524','/game?preview=1&frame=386:18241','/game?preview=1&frame=427:19392','/handbook/types/plastic','/handbook/types/medical','/design-preview?frame=386:8558']){
   await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'networkidle',timeout:20000});
   const text=await page.locator('body').innerText();variants.push({route,text,hash:crypto.createHash('sha256').update(text).digest('hex')});
 }
 const report={capturedAt:new Date().toISOString(),platform:'Chromium React Native Web preview; not Android/iOS native',baseURL:'http://127.0.0.1:4173',viewport:{width:428,height:926},session:'guest; no login or business-data mutations',routes:results,variants,errors,apiResponses};
 fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(report,null,2));
 await browser.close();
 console.log(JSON.stringify({routes:results.length,failed:results.filter(r=>r.error||r.errors.length).length,overflow:results.filter(r=>r.overflow).map(r=>r.route),screenshots:results.filter(r=>r.screenshot).length,variants:variants.length,pageErrors:errors}));
})().catch(e=>{console.error(e);process.exitCode=1;});
