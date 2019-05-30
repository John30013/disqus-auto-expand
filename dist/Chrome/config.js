let _options={...defaultConfig};function logDebug(e,...t){chrome.tabs.query({active:!0,currentWindow:!0},function(o){chrome.tabs.sendMessage(o[0].id,{action:"logDebug",caller:"config",message:e,params:t})})}const manifest=chrome.runtime.getManifest();function updateConfigValue(e,t){chrome.storage.sync.set({[e]:t},()=>{logDebug('--\x3e Updated config option "%s" to (%s) "%s"',e,typeof t,t)}),"useDarkTheme"!==e&&chrome.tabs.query({active:!0,currentWindow:!0},function(e){chrome.tabs.sendMessage(e[0].id,{action:"refreshOptions"})})}document.querySelector("span#version").innerHTML=manifest.version,chrome.storage.sync.get(defaultConfig,e=>{logDebug("config.js loaded."),logDebug("Setting options from storage: %o",e);for(let t in e){let o=document.getElementById(t);o?"checkbox"===o.type?(o.checked=e[t],"useDarkTheme"===t&&(document.body.classList.toggle("theme-dark",o.checked),logDebug("--\x3e document.body classNames: %s",document.body.classNames)),logDebug("--\x3e %s checkbox %s.",o.checked?"Checked":"Unchecked",t)):"numeric"===o.getAttribute("inputmode")&&(o.value=""+e[t],logDebug("--\x3e %s set to %s.",t,o.value,o)):logDebug('--\x3e Skipped option "%s" with no control.',t)}}),document.body.addEventListener("input",e=>{logDebug("Handling change event on %s",e.target.id,e);let t=e.target,o=null,n=null;"checkInterval"===t.id?(n&&clearTimeout(n),n=setTimeout(e=>{e.validity.valid?updateConfigValue(e.id,+e.value):chrome.storage.sync.get(e.id,t=>{e.value=t[e.id]})},350,t)):(o=t.checked,"useDarkTheme"===t.id?(document.body.classList.toggle("theme-dark",t.checked),logDebug("--\x3e document.body className: %s",document.body.className)):"mobileMedia"===t.id&&document.querySelector("#hideOpenedMobileMediaLinks").toggleAttribute("disabled",!o),updateConfigValue(t.id,o))});