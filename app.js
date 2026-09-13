const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");
const form = document.getElementById("composer");
const promptBox = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const status = document.getElementById("status");
const clearBtn = document.getElementById("clearBtn");

let messages = JSON.parse(localStorage.getItem("hemton_messages") || "[]");
let memory = JSON.parse(localStorage.getItem("hemton_memory") || "[]");

function save(){localStorage.setItem("hemton_messages",JSON.stringify(messages));localStorage.setItem("hemton_memory",JSON.stringify(memory));}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function render(){
  document.querySelectorAll(".message").forEach(x=>x.remove());
  welcome.style.display = messages.length ? "none" : "";
  for(const m of messages){
    const row=document.createElement("div"); row.className=`message ${m.role}`;
    const av=m.role==="assistant"?'<div class="avatar">H</div>':"";
    row.innerHTML=`${av}<div class="bubble">${escapeHtml(m.content)}</div>`;
    chat.appendChild(row);
  }
  window.scrollTo(0,document.body.scrollHeight);
}
function add(role,content){messages.push({role,content});save();render();}
async function send(text){
  text=text.trim(); if(!text)return;
  add("user",text); promptBox.value=""; promptBox.style.height="auto";
  sendBtn.disabled=true; status.textContent="Hemton is thinking…";
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:messages.slice(-20),memory:memory.slice(-20)})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||"Server error");
    add("assistant",data.reply);
    if(Array.isArray(data.memory)) memory=data.memory.slice(-30);
    save();
    speak(data.reply);
  }catch(e){add("assistant","I couldn't connect to my AI server yet. Check that the backend is deployed and OPENAI_API_KEY is configured.");console.error(e)}
  finally{sendBtn.disabled=false;status.textContent=""}
}
form.addEventListener("submit",e=>{e.preventDefault();send(promptBox.value)});
promptBox.addEventListener("input",()=>{promptBox.style.height="auto";promptBox.style.height=Math.min(promptBox.scrollHeight,140)+"px"});
document.querySelectorAll(".suggestions button").forEach(b=>b.onclick=()=>send(b.textContent));

clearBtn.onclick=()=>{messages=[];memory=[];save();render();};
let voices = [];

function loadVoices(){
  voices = speechSynthesis.getVoices();
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speak(text){
  if(!("speechSynthesis" in window)) return;

  speechSynthesis.cancel();

  const maleVoice = voices.find(v =>
    v.lang.startsWith("en") &&
    /male|david|mark|daniel|george|alex|guy/i.test(v.name)
  );

  const u = new SpeechSynthesisUtterance(text);

  if(maleVoice) {
    u.voice = maleVoice;
  }

  u.rate = 0.95;
  u.pitch = 0.75;

  speechSynthesis.speak(u);
}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){
  const rec=new SR(); rec.lang=navigator.language||"en-US"; rec.interimResults=false;
  rec.onstart=()=>{micBtn.textContent="⏹️";status.textContent="Listening…"};
  rec.onend=()=>{micBtn.textContent="🎙️";status.textContent=""};
  rec.onresult=e=>{promptBox.value=e.results[0][0].transcript;send(promptBox.value)};
  micBtn.onclick=()=>{try{rec.start()}catch{}};
}else{
  micBtn.disabled=true;micBtn.title="Voice input is not supported in this browser";
}
render();