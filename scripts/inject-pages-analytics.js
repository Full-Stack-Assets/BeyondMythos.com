#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || path.join(process.cwd(), "public"));
const measurementId = String(process.env.GA_MEASUREMENT_ID || "").trim();
const scriptName = "portfolio-analytics.js";
const tag = `<script defer src="/${scriptName}"></script>`;

const client = `(function(){
var measurementId=${JSON.stringify(measurementId)};
if(!measurementId)return;
var match=location.pathname.match(/\\/sites\\/([^/]+)/);
var publication=match?decodeURIComponent(match[1]):'network';
window.dataLayer=window.dataLayer||[];
window.gtag=window.gtag||function(){dataLayer.push(arguments)};
function send(name,params){window.gtag('event',name,Object.assign({portfolio_site:'beyondmythos',publication_slug:publication},params||{}));}
var loader=document.createElement('script');loader.async=true;loader.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);document.head.appendChild(loader);
window.gtag('js',new Date());window.gtag('config',measurementId,{portfolio_site:'beyondmythos',publication_slug:publication});
var reached={};
addEventListener('scroll',function(){if(!document.querySelector('article.post'))return;var available=document.documentElement.scrollHeight-innerHeight;if(available<=0)return;var percent=Math.round(scrollY/available*100);[50,90].forEach(function(mark){if(percent>=mark&&!reached[mark]){reached[mark]=true;send('article_scroll',{percent_scrolled:mark,article:document.querySelector('h1')?.textContent?.trim()||document.title});}});},{passive:true});
document.addEventListener('submit',function(event){if(event.target.closest&&event.target.closest('[data-newsletter]'))send('newsletter_signup',{placement:'publication_footer'});});
document.addEventListener('click',function(event){var link=event.target.closest&&event.target.closest('a[href]');if(!link)return;var url=new URL(link.href,location.href);var common={article:document.querySelector('h1')?.textContent?.trim()||document.title,placement:link.dataset.placement||'link'};if(link.dataset.analyticsEvent){send(link.dataset.analyticsEvent,Object.assign(common,{merchant:link.dataset.merchant||url.hostname}));}else if(link.closest('.sponsor')){send('sponsor_click',Object.assign(common,{merchant:url.hostname}));}else if(link.closest('.market-links')){send('affiliate_click',Object.assign(common,{merchant:url.hostname}));}else if(link.closest('.commerce-item')){send('product_cta',common);}else if(url.origin!==location.origin){send('outbound_click',Object.assign(common,{destination:url.hostname}));}else{send('internal_recirculation',Object.assign(common,{destination:url.pathname}));}});
})();\n`;

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(resolved) : entry.name.endsWith(".html") ? [resolved] : [];
  });
}

fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(path.join(root, scriptName), client, "utf8");
let changed = 0;
for (const file of htmlFiles(root)) {
  const html = fs.readFileSync(file, "utf8");
  if (html.includes(tag)) continue;
  const updated = html.includes("</body>") ? html.replace("</body>", `  ${tag}\n</body>`) : `${html}\n${tag}\n`;
  fs.writeFileSync(file, updated, "utf8");
  changed += 1;
}
console.log(`Installed portfolio analytics in ${changed} HTML files under ${root}.`);
