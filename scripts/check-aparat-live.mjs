// Live diagnostic only; it never creates or publishes application content.
import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const id=process.argv[2];
if(!/^[A-Za-z0-9]{5,24}$/.test(id||""))throw new Error("Pass a real public Aparat video ID.");
const output=resolve("docs/qa/step7/aparat-live.json");
const browser=await chromium.launch({channel:"msedge"});
const page=await browser.newPage();
const result={checkedAt:new Date().toISOString(),id,embedUrl:`https://www.aparat.com/video/video/embed/videohash/${id}/vt/frame`,pages:[],playbackConfirmed:false};
try{
 for(const url of ["https://api.aparat.com/","https://www.aparat.com/",`https://www.aparat.com/v/${id}`,result.embedUrl]){
  try{const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:20000});result.pages.push({url,status:response?.status(),finalUrl:page.url(),title:await page.title(),textExcerpt:(await page.locator("body").innerText({timeout:2000})).slice(0,350)});}
  catch(e){result.pages.push({url,error:e.message.split("\n")[0]});}
 }
 try{
  await page.locator("video").first().waitFor({state:"attached",timeout:20000});
  const initial=await page.locator("video").first().evaluate(async video=>{video.muted=true;await video.play();return {time:video.currentTime,duration:video.duration};});
  await page.waitForFunction(time=>{const video=document.querySelector("video");return video && video.currentTime>time+0.2;},initial.time,{timeout:15000});
  result.playbackConfirmed=true;result.observedDuration=initial.duration;
 }catch(e){result.playbackError=e.message.split("\n")[0];}
 result.limitation="HTTP 200 alone does not prove playback. playbackConfirmed requires an actual video element, successful muted play() and advancing currentTime. This third-party diagnostic content is never seeded in the application.";
}finally{await browser.close();await mkdir(resolve("docs/qa/step7"),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+"\n");}
console.log(JSON.stringify({output,playbackConfirmed:result.playbackConfirmed,pages:result.pages.map(p=>({url:p.url,status:p.status,error:p.error}))}));
