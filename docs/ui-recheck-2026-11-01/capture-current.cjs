const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const appRequire = createRequire(path.join(root, 'apps/mobile/package.json'));
const { chromium } = appRequire('@playwright/test');
const out = __dirname;
const routes = JSON.parse(fs.readFileSync(path.join(out, 'routes.json'), 'utf8'));
const baseURL = 'http://127.0.0.1:4173';
const apiURL = 'http://127.0.0.1:8000';
const fixtureIds = {};
const publicReads = {};
const missingId = '00000000-0000-4000-8000-000000000001';
function routeURL(pattern) {
  const resource = pattern.startsWith('/articles/') ? 'articles' : pattern.startsWith('/events/') ? 'events' : pattern.startsWith('/handbook/') ? 'waste-items' : pattern.startsWith('/rewards/') ? 'rewards' : pattern.startsWith('/points/') ? 'collection-points' : null;
  return pattern.replace('[id]', fixtureIds[resource] || missingId).replace('[kind]', 'plastic').replace('[category]', 'recycle');
}
(async () => {
  for (const endpoint of ['events', 'articles', 'waste-items', 'collection-points', 'rewards']) {
    const response = await fetch(apiURL + '/v1/' + endpoint);
    const data = await response.json();
    if (!response.ok) throw Error('API preflight failed: ' + endpoint + ' ' + response.status);
    fixtureIds[endpoint] = data.items?.[0]?.id;
    publicReads[endpoint] = { status:response.status, publishedItemsInFirstPage:data.items?.length??0 };
  }
  const browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
  const context = await browser.newContext({ viewport:{width:428,height:926}, locale:'vi-VN', timezoneId:'Asia/Bangkok', colorScheme:'light' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const results = [];
  const screenshots = path.join(out, 'screenshots');
  fs.mkdirSync(screenshots, { recursive:true });
  async function inspect(url, label, screenshot = true) {
    const start = errors.length;
    const responses = [];
    const responseListener = (r) => { if(r.url().startsWith(apiURL+'/')) responses.push({path:new URL(r.url()).pathname,status:r.status()}); };
    page.on('response', responseListener);
    try {
      const response = await page.goto(baseURL + url, { waitUntil:'domcontentloaded', timeout:20000 });
      await page.locator('body').waitFor();
      await page.waitForFunction(() => document.body.innerText.trim().length>0, {timeout:15000});
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle', {timeout:3500}).catch(()=>{});
      const state = await page.evaluate(() => ({
        text:document.body.innerText,
        documentWidth:document.documentElement.scrollWidth,
        width:innerWidth,
        headings:[...document.querySelectorAll('[role="heading"]')].map((n)=>({text:n.textContent,font:getComputedStyle(n).fontFamily,size:getComputedStyle(n).fontSize})),
        images:[...document.images].map((n)=>({loaded:n.complete&&n.naturalWidth>0,width:n.naturalWidth,height:n.naturalHeight})),
      }));
      const displayState = /Đăng nhập để tiếp tục/.test(state.text) ? 'auth-gated' : /Failed to fetch|Dịch vụ tạm thời/.test(state.text) ? 'connection-error' : /Không tìm thấy tài nguyên/.test(state.text) ? 'missing-resource' : /Đang tải dữ liệu/.test(state.text) ? 'pending' : 'rendered';
      const imageName = label.replaceAll(/[^a-z0-9_-]/gi,'-') + '.png';
      if(screenshot) await page.screenshot({path:path.join(screenshots,imageName)});
      return {url,status:response.status(),displayState,...state,screenshot:screenshot?'screenshots/'+imageName:null,apiResponses:responses,errors:errors.slice(start)};
    } catch(e) { return {url,error:e.message,apiResponses:responses,errors:errors.slice(start)}; }
    finally { page.off('response',responseListener); }
  }
  for(const [index,route] of routes.entries()) {
    const result = await inspect(routeURL(route.pattern), String(index+1).padStart(2,'0')+'-'+(route.pattern==='/'?'home':route.pattern.slice(1)));
    results.push({route:route.pattern,...result});
    fs.writeFileSync(path.join(out,'routes-capture-checkpoint.json'),JSON.stringify(results,null,2)+'\n');
    console.log((index+1)+'/'+routes.length+' '+route.pattern+' '+(result.error?'FAILED':result.displayState));
  }
  const variants = [];
  for(const url of ['/onboarding?step=0','/onboarding?step=9','/community?frame=722:5635','/community?frame=722:5699','/notifications?frame=703:5399','/notifications?frame=703:5524','/messages?frame=771:6023','/messages?frame=771:6514','/game?frame=386:18241','/game?frame=427:19392','/scan?frame=386:14194','/scan?frame=386:14264','/handbook/types/plastic','/handbook/types/medical','/design-preview?frame=386:8558']) {
    const result = await inspect(url,'variant-'+variants.length,false);
    variants.push({...result,textHash:result.text?crypto.createHash('sha256').update(result.text).digest('hex'):null});
  }
  fs.writeFileSync(path.join(out,'variants-checkpoint.json'),JSON.stringify(variants,null,2)+'\n');
  await page.setViewportSize({width:390,height:844});
  const narrow=[];
  for(const url of ['/','/handbook','/articles','/events','/collection','/calendar','/profile','/rewards','/scan','/game']) narrow.push(await inspect(url,'390-'+(url==='/'?'home':url.slice(1))));
  const report={capturedAt:new Date().toISOString(),platform:'Headless Chrome / React Native Web; not native acceptance',baseURL,viewport:{width:428,height:926},session:'guest; no login, no data mutations or interception',publicReads,knownResourceSamples:Object.keys(fixtureIds).filter((key)=>fixtureIds[key]),routes:results,variants,narrow,errors};
  fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
  console.log(JSON.stringify({routes:results.length,failed:results.filter((r)=>r.error||r.errors.length).length,overflow:results.filter((r)=>r.documentWidth>r.width).map((r)=>r.route),narrowOverflow:narrow.filter((r)=>r.documentWidth>r.width).map((r)=>r.url),pageErrors:errors,publicReads},null,2));
})().catch((e)=>{console.error(e);process.exitCode=1;});
