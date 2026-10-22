import * as THREE from './three.module.min.js';
const VERSION='1.0';
const $=s=>document.querySelector(s);const UI=$('#ui');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const rnd=a=>a[Math.floor(Math.random()*a.length)];
const baraja=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
$('#ver').textContent='Arguiñano v'+VERSION;
const ETAPAS=window.ETAPAS,COLAB=window.COLAB,REC=window.RECETAS,QUIZ=window.QUIZ;
// ---------- ajustes ----------
const DEF={nombre:'Iker',musica:true,voz:true,volMus:1,cabecera:true,plato:'auto',calidad:'auto'};
let A=Object.assign({},DEF,JSON.parse(localStorage.getItem('kar_ajustes')||'{}'));const guardaA=()=>localStorage.setItem('kar_ajustes',JSON.stringify(A));
let EST=Object.assign({mejor:{},total:0},JSON.parse(localStorage.getItem('kar_estado')||'{}'));const guardaE=()=>localStorage.setItem('kar_estado',JSON.stringify(EST));
// ---------- audio (solo sonidos reales recortados de los vídeos y los archivos de Iker) ----------
let bed=null;
function musica(src,loop=true,vol=.55){paraMusica();if(!A.musica||!src)return;bed=new Audio(src);bed.loop=loop;bed.volume=vol*(A.volMus??1);bed.dataset.v=vol;bed.dataset.src=src;bed.play().catch(()=>{});}
function paraMusica(){if(bed){bed.pause();bed=null;}}
let vozActual=null,saltar=false,hablando=false;const SUB=$('#sub');
function clip(id,quien,txt){return new Promise(res=>{ // reproduce un clip (real o TTS) con subtítulo
  txt=txt??((window.VOZ||{})[id]||(window.ACLIPS||{})[id]||'');if(txt){SUB.textContent=(quien?quien+': ':'')+txt;SUB.classList.remove('oculto');}
  const fin=()=>{SUB.classList.add('oculto');vozActual=null;hablando=false;res();};
  if(!A.voz||saltar){setTimeout(fin,saltar?0:Math.min(7000,900+txt.length*55));return;}
  const a=new Audio('voz/'+id+'.ogg');a.volume=1;vozActual={a,fin};hablando=true;if(bed)bed.volume=.18*(A.volMus??1);
  const ok=()=>{if(bed)bed.volume=(+bed.dataset.v)*(A.volMus??1);fin();};vozActual.fin=ok;
  a.onended=ok;a.onerror=()=>setTimeout(ok,1200);a.play().catch(()=>setTimeout(ok,1500));});}
const KTXT={k_bienvenida:'Muy buenas, queridas amigas, queridos amigos y queridas familias.',k_bienvenida13:'Muy buenas, queridas amigas, queridos amigos y queridas familias.',k_familias04:'Bueno, familias, amigos y amigas, vamos a preparar…',k_vamos:'Vamos allá.',k_vamos2:'¡Vamos allá!',k_vamos3:'Vamos allá.',k_vamos13:'¡Vamos allá!',k_muybien:'Bien, bien, perfecto, perfecto, muy bien, muy bien.',k_muybien2:'Muy bien.',k_quebueno:'Ay, qué bueno.',k_quebueno2:'Qué bueno.',k_comodito:'Muy bien, comodito.',k_muybieneva:'Sí, señor. Muy bien, Eva.',k_perejil:'Ahora una ramita de perejil.',k_despedida:'Queridas amigas, queridos amigos y queridas familias, ha sido un placer.',k_manana:'Mañana nos vemos aquí.',k_fundamento:'…para que todos vayamos entrándole a la cosa con fundamento.',k_chiste:'Tengo chiste.'};
Object.assign(KTXT,window.KCLIPS||{});
const karlos=id=>clip(id,'Karlos',KTXT[id]);
const hay=id=>!!KTXT[id];
const kr=(...ids)=>{const l=ids.flat().filter(hay);return l.length?karlos(rnd(l)):Promise.resolve();};
function cortaVoz(){if(vozActual){vozActual.a.pause();vozActual.fin();}}
// ---------- 3D ----------
const canvas=$('#c3d');const lowEnd=(navigator.hardwareConcurrency||4)<=4||Math.min(screen.width,screen.height)<=720;
const renderer=new THREE.WebGLRenderer({canvas,antialias:!lowEnd,powerPreference:'low-power'});
const calidad=()=>A.calidad==='auto'?(lowEnd?'baja':'alta'):A.calidad;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xeeeeee);
const cam=new THREE.PerspectiveCamera(46,1,0.1,60);
function ajustaTam(){const pr=calidad()==='baja'?Math.min(1,devicePixelRatio)*0.75:Math.min(1.5,devicePixelRatio);renderer.setPixelRatio(pr);renderer.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();}
addEventListener('resize',ajustaTam);
const amb=new THREE.HemisphereLight(0xffffff,0x8a8f96,1.25);scene.add(amb);
const dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(1,6,6);scene.add(dl);
const L=c=>new THREE.MeshLambertMaterial({color:c});const P=(c,s=80)=>new THREE.MeshPhongMaterial({color:c,shininess:s,specular:0x555555});const B=c=>new THREE.MeshBasicMaterial({color:c});
function caja(g,w,h,d,m,x,y,z,ry=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.rotation.y=ry;g.add(o);return o;}
function cil(g,rt,rb,h,m,x,y,z,seg=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);o.position.set(x,y,z);g.add(o);return o;}
function texCanvas(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const setG=new THREE.Group();scene.add(setG);let lamparas=[];let etapaAct=ETAPAS[2];let platoVar='lamparas';
// listones horizontales azules retroiluminados
function paredListones(g,w,h,x,y,z,ry,col,gap){const t=texCanvas(64,256,(c,W,H)=>{for(let i=0;i<16;i++){const yy=i*16;const gr=c.createLinearGradient(0,yy,0,yy+16);gr.addColorStop(0,gap);gr.addColorStop(.25,col);gr.addColorStop(.85,col);gr.addColorStop(1,'#0b3e74');c.fillStyle=gr;c.fillRect(0,yy,W,16);}});t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(w/2,h/2.2);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,y,z);m.rotation.y=ry;g.add(m);return m;}
function persiana(g,w,h,x,y,z,ry){const t=texCanvas(32,128,(c,W,H)=>{for(let i=0;i<8;i++){c.fillStyle='#ffffff';c.fillRect(0,i*16,W,11);c.fillStyle='#b9bdc4';c.fillRect(0,i*16+11,W,5);}});t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,h/0.9);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;g.add(m);}
function cajones(g,w,h,d,x,y,z,col,n=2,ry=0){const grp=new THREE.Group();grp.position.set(x,y,z);grp.rotation.y=ry;g.add(grp);caja(grp,w,h,d,P(col,40),0,h/2,0);const mod=Math.max(1,Math.round(w/0.8));for(let i=0;i<mod;i++){const cx=-w/2+(i+.5)*w/mod;for(let j=0;j<n;j++){const cy=h*(j+.5)/n;caja(grp,w/mod-0.04,h/n-0.04,0.01,P(col+0x050505,60),cx,cy,d/2+0.005);caja(grp,w/mod*0.45,0.025,0.03,P(0xd8dadd,120),cx,cy+h/n*0.28,d/2+0.02);}}caja(grp,w+0.04,0.05,d+0.06,P(0xf8f8f6,90),0,h+0.025,0);return grp;}
function horno(g,x,y,z,ry=0){const grp=new THREE.Group();grp.position.set(x,y,z);grp.rotation.y=ry;g.add(grp);caja(grp,0.6,0.52,0.03,P(0xa9adb3,140),0,0,0);caja(grp,0.5,0.32,0.01,P(0x050507,160),0,-0.04,0.02);caja(grp,0.54,0.08,0.012,P(0xb8bcc2,140),0,0.2,0.022);caja(grp,0.46,0.02,0.04,P(0xd0d3d8,140),0,0.13,0.04);}
function botella(g,x,y,z,col,h=0.3,r=0.04){cil(g,r,r,h*0.7,P(col,140),x,y+h*0.35,z,8);cil(g,r*0.35,r*0.5,h*0.3,P(col,140),x,y+h*0.85,z,6);}
function jarron(g,x,y,z,col,h=0.3,r=0.07){cil(g,r*0.8,r,h,P(col,120),x,y+h/2,z,10);}
function perejil(g,x,y,z){const m=L(0x3f8f2f);for(let i=0;i<7;i++){const o=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,4),m);o.position.set(x+Math.sin(i*1.7)*0.08,y+0.05+Math.cos(i*2.3)*0.05+i*0.012,z+Math.cos(i*1.3)*0.07);g.add(o);}}
function pantallaFruta(g,x,y,z,ry){const t=texCanvas(256,160,(c,W,H)=>{c.fillStyle='#1a1a1a';c.fillRect(0,0,W,H);const gr=c.createLinearGradient(0,0,W,0);gr.addColorStop(0,'#d06b1a');gr.addColorStop(1,'#7a1a10');c.fillStyle=gr;c.fillRect(8,8,W-16,H-16);for(let i=0;i<6;i++){c.fillStyle='#ff8c1a';c.beginPath();c.arc(30+i*38,60+(i%2)*30,20,0,7);c.fill();}c.fillStyle='#2f8a2f';c.beginPath();c.arc(200,120,44,Math.PI,0);c.fill();c.fillStyle='#e8343a';c.beginPath();c.arc(200,120,36,Math.PI,0);c.fill();});const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.95),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,y,z);m.rotation.y=ry;g.add(m);caja(g,1.58,1.02,0.04,P(0x222222),x-Math.sin(ry)*0.03,y,z-Math.cos(ry)*0.03,ry);}
function neveraVia(g,x,y,z){const grp=new THREE.Group();grp.position.set(x,y,z);g.add(grp);
  const al=P(0xc9ccd0,120);caja(grp,0.62,0.86,0.42,al,0,0.43,0);for(const sx of[-1,1])cil(grp,0.05,0.05,0.86,al,sx*0.31,0.43,0.19,8);
  const fondo=texCanvas(128,192,(c,W,H)=>{c.fillStyle='#fbfbfb';c.fillRect(0,0,W,H);c.fillStyle='#2f9e2f';c.font='bold 22px Arial';c.textAlign='center';c.fillText('VIA',W/2,26);c.font='bold 18px Arial';c.fillText('NATURE',W/2,46);c.strokeStyle='#2f9e2f';c.lineWidth=3;c.beginPath();c.arc(W/2,12,8,Math.PI*1.1,Math.PI*1.9);c.stroke();});
  const fm=new THREE.Mesh(new THREE.PlaneGeometry(0.52,0.76),new THREE.MeshBasicMaterial({map:fondo}));fm.position.set(0,0.44,0.215);grp.add(fm);
  caja(grp,0.52,0.012,0.2,new THREE.MeshPhongMaterial({color:0xddeeff,transparent:true,opacity:.6}),0,0.42,0.3);
  const cols=[0x3aa83a,0xe04070,0xff8a1a,0xd01a1a,0x7a2a9a,0x3aa83a];for(let r=0;r<2;r++)for(let i=0;i<5;i++){const bx=-0.2+i*0.1,by=0.1+r*0.33;cil(grp,0.028,0.028,0.2,P(0xf4efe6,120),bx,by+0.1,0.3,8);cil(grp,0.03,0.03,0.08,B(cols[(i+r*2)%6]),bx,by+0.1,0.3,8);cil(grp,0.015,0.02,0.04,P(0xffffff),bx,by+0.22,0.3,6);}
  const vid=new THREE.Mesh(new THREE.PlaneGeometry(0.56,0.8),new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.14,shininess:200,specular:0xffffff}));vid.position.set(0,0.44,0.43);grp.add(vid);
  caja(grp,0.03,0.6,0.03,al,0.25,0.44,0.44);return grp;}
function lampara(g,x,z,len){const grp=new THREE.Group();g.add(grp);cil(grp,0.004,0.004,len,B(0x888888),x,4.1-len/2,z,4);const em=new THREE.MeshBasicMaterial({color:0xffffff});const c=cil(grp,0.085,0.085,0.42,em,x,4.1-len-0.21,z,14);grp.userData.mat=em;lamparas.push(grp);return grp;}
function isla(g,x,z,w,col){caja(g,w,0.06,1.25,P(0xfafafa,110),x,0.93,z);caja(g,w-0.1,0.88,1.0,P(col,30),x,0.45,z-0.05);
  caja(g,w-0.2,0.04,0.5,P(0xf4f4f4),x,0.25,z+0.4);// balda inferior
  for(let i=0;i<4;i++)caja(g,0.34,0.3,0.34,P(0x8fd13a,60),x-w/2+0.45+i*0.45,0.42,z+0.42);
  const hob=caja(g,1.3,0.012,0.6,P(0x050507,200),x+w/2-0.9,0.965,z+0.05);for(let i=0;i<4;i++){const r=new THREE.Mesh(new THREE.RingGeometry(0.09,0.1,20),B(0x555555));r.rotation.x=-Math.PI/2;r.position.set(x+w/2-1.25+(i%2)*0.6,0.973,z-0.08+Math.floor(i/2)*0.27);g.add(r);}
  caja(g,0.85,0.006,0.5,L(0xb5d33a),x-0.2,0.963,z+0.1);// mantel verde lima
  caja(g,0.6,0.04,0.36,L(0x9a6b3a),x-0.25,0.985,z+0.1);// tabla
  jarron(g,x-1.2,0.96,z-0.15,0x8a8d92,0.45,0.08);perejil(g,x-1.2,1.42,z-0.15);
  const cu=P(0xf2f2f0);cil(g,0.07,0.07,0.2,cu,x-0.95,1.06,z-0.25,10);for(let i=0;i<4;i++){const s=cil(g,0.012,0.012,0.4,L(0xc89a5a),x-0.95+(i-1.5)*0.03,1.25,z-0.25,5);s.rotation.z=(i-1.5)*0.12;}
  botella(g,x-1.45,0.96,z+0.25,0x3a4a1a,0.42,0.035);}
function persona(o){const g=new THREE.Group();const piel=new THREE.MeshLambertMaterial({color:o.piel||0xe9b996}),blanco=new THREE.MeshLambertMaterial({color:0xfbfbfb}),pant=L(o.pant||0x2a2a2a);const ropa=o.chef===false?L(o.ropa||0xd0587a):blanco;
  for(const s of[-1,1]){cil(g,0.1,0.085,0.92,pant,s*0.12,0.46,0,10);const zp=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),L(0x111111));zp.scale.set(1,0.5,1.6);zp.position.set(s*0.12,0.04,0.05);g.add(zp);}
  const tp=[];for(let i=0;i<=12;i++){const t=i/12;tp.push(new THREE.Vector2(0.2+0.08*Math.sin(t*Math.PI*0.9)+(t>0.85?-(t-0.85)*0.9:0),0.9+t*0.78));}
  const tor=new THREE.Mesh(new THREE.LatheGeometry(tp,16),ropa);tor.scale.z=0.82;g.add(tor);
  if(o.chef!==false){for(const s of[-1,1])for(let k=0;k<4;k++){const b=new THREE.Mesh(new THREE.SphereGeometry(0.016,6,4),L(0xd0d0d0));b.position.set(s*0.075,1.58-k*0.13,0.235);g.add(b);}
    const cue=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.03,6,14),blanco);cue.rotation.x=Math.PI/2;cue.position.y=1.68;g.add(cue);
    const lg=new THREE.Mesh(new THREE.PlaneGeometry(0.06,0.05),B(0xc0182a));lg.position.set(0.13,1.52,0.24);g.add(lg);}
  for(const s of[-1,1]){const sh=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8),ropa);sh.position.set(s*0.27,1.58,0);g.add(sh);const a=cil(g,0.075,0.062,0.62,ropa,s*0.32,1.27,0.03,10);a.rotation.z=s*0.1;const h=new THREE.Mesh(new THREE.SphereGeometry(0.06,8,6),piel);h.scale.set(1,1.2,0.8);h.position.set(s*0.355,0.92,0.05);g.add(h);}
  cil(g,0.065,0.075,0.1,piel,0,1.72,0,8);const hd=new THREE.Mesh(new THREE.SphereGeometry(0.16,16,12),piel);hd.scale.set(1,1.15,1.05);hd.position.y=1.92;g.add(hd);
  const nz=new THREE.Mesh(new THREE.SphereGeometry(0.035,8,6),piel);nz.scale.set(0.9,1.1,1.2);nz.position.set(0,1.92,0.165);g.add(nz);
  for(const s of[-1,1]){const or=new THREE.Mesh(new THREE.SphereGeometry(0.035,6,6),piel);or.scale.set(0.5,1,0.8);or.position.set(s*0.16,1.93,0);g.add(or);}
  const pelo=L(o.pelo||0x444444);const hp=new THREE.Mesh(new THREE.SphereGeometry(0.168,14,10,0,Math.PI*2,0,Math.PI*0.5),pelo);hp.position.set(0,1.97,-0.015);hp.scale.set(1,1.05,1.08);g.add(hp);
  if(o.mujer){const lh=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.21,0.42,14,1,true,Math.PI*0.35,Math.PI*1.3),new THREE.MeshLambertMaterial({color:o.pelo,side:THREE.DoubleSide}));lh.position.y=1.8;g.add(lh);}
  if(o.barba){const bm=L(o.barba);const b=new THREE.Mesh(new THREE.SphereGeometry(0.158,14,8,Math.PI*0.05,Math.PI*0.9,Math.PI*0.55,Math.PI*0.32),bm);b.rotation.y=Math.PI*0.5+Math.PI*0.0;b.position.set(0,1.93,0.02);b.scale.set(1.04,1.2,1.12);g.add(b);
    const bi=new THREE.Mesh(new THREE.CapsuleGeometry(0.018,0.09,3,6),bm);bi.rotation.z=Math.PI/2;bi.position.set(0,1.865,0.165);g.add(bi);}
  else if(o.bigote){const bi=new THREE.Mesh(new THREE.CapsuleGeometry(0.016,0.08,3,6),L(o.bigote));bi.rotation.z=Math.PI/2;bi.position.set(0,1.865,0.165);g.add(bi);}
  if(o.gorro){const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push(new THREE.Vector2(0.15+0.06*t+(t>0.85?0.02:0),t*o.gorro));}pts.push(new THREE.Vector2(0.21,o.gorro+0.02),new THREE.Vector2(0.17,o.gorro+0.1),new THREE.Vector2(0.0,o.gorro+0.12));
    const gg=new THREE.LatheGeometry(pts,24);const pos=gg.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),y=pos.getY(i);const an=Math.atan2(z,x);const f=1+0.06*Math.abs(Math.sin(an*12))*Math.min(1,y/0.15);pos.setX(i,x*f);pos.setZ(i,z*f);}gg.computeVertexNormals();
    const gm=new THREE.Mesh(gg,blanco);gm.position.y=2.04;g.add(gm);const ban=cil(g,0.158,0.158,0.09,blanco,0,2.07,0,20);}
  if(o.gafas){for(const s of[-1,1]){const r=new THREE.Mesh(new THREE.TorusGeometry(0.035,0.006,4,12),L(0x111111));r.position.set(s*0.06,1.96,0.16);g.add(r);}}
  const ojo=L(0x2a1a10);for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(0.016,6,4),ojo);e.position.set(s*0.06,1.965,0.15);g.add(e);const ce=caja(g,0.05,0.01,0.01,L(o.barba||o.pelo||0x333333),s*0.06,1.995,0.152);}
  const boca=caja(g,0.06,0.012,0.01,L(0x7a2a2a),0,1.835,0.168);g.userData.boca=boca;
  sombra(g,0.9,0.9,0,0,0.004);return g;}
const PERS={karlos:{gorro:0.5,pelo:0x8a8580,barba:0x9a958f,piel:0xe2a986},joseba:{gorro:0.3,pelo:0x2a1a10,piel:0xe9b996},eva:{chef:false,ropa:0xf2f2f2,mujer:true,pelo:0xc9a060},ainhoa:{chef:false,ropa:0x3a3a3a,mujer:true,pelo:0x4a2a14},berasategui:{gorro:0,barba:0xd8d8d8,pelo:0xd8d8d8,piel:0xe9b996},arzak:{gorro:0,pelo:0xf0f0f0,gafas:true,piel:0xe9b996}};
let host=null,invitado=null;
function ponHost(id){if(host)scene.remove(host);host=persona(PERS[id]);host.position.set(0.1,0,-0.95);scene.add(host);}
function ponInvitado(id){if(invitado)scene.remove(invitado);invitado=null;if(!id)return;invitado=persona(PERS[id]);invitado.position.set(-1.0,0,-1.0);invitado.rotation.y=0.35;scene.add(invitado);}
// ---- platós ----
function construyeSet(et,variante){setG.clear();lamparas=[];etapaAct=et;const c=et.col;if(et.id==='a3_2010'){platoA3(variante);return;}
  const suelo=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshPhongMaterial({color:c.suelo,shininess:et.id.startsWith('a3')?140:20,specular:et.id.startsWith('a3')?0x999999:0x111111}));suelo.rotation.x=-Math.PI/2;setG.add(suelo);
  const techo=new THREE.Mesh(new THREE.PlaneGeometry(20,20),B(0xf0f0ee));techo.rotation.x=Math.PI/2;techo.position.y=4.2;setG.add(techo);
  for(let i=0;i<5;i++)for(let j=0;j<3;j++){const s=new THREE.Mesh(new THREE.CircleGeometry(0.07,10),B(0x9a9a9a));s.rotation.x=Math.PI/2;s.position.set(-4+i*2,4.19,-6+j*2.4);setG.add(s);}
  if(et.id==='a3_2010')platoA3(variante);else if(et.id==='a3_2019')platoCA();else if(et.id==='t5_2004')platoT5b();else platoT5a();}
// ---- utilidades de modelado suave ----
function rbox(w,h,d,r,m){r=Math.min(r,w/2-0.001,h/2-0.001);const sh=new THREE.Shape();const x=-w/2,y=-h/2;sh.moveTo(x+r,y);sh.lineTo(x+w-r,y);sh.quadraticCurveTo(x+w,y,x+w,y+r);sh.lineTo(x+w,y+h-r);sh.quadraticCurveTo(x+w,y+h,x+w-r,y+h);sh.lineTo(x+r,y+h);sh.quadraticCurveTo(x,y+h,x,y+h-r);sh.lineTo(x,y+r);sh.quadraticCurveTo(x,y,x+r,y);
  const bv=Math.min(0.015,d/4);const g=new THREE.ExtrudeGeometry(sh,{depth:d-bv*2,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:2,curveSegments:4});g.translate(0,0,-(d-bv*2)/2);return new THREE.Mesh(g,m);}
function rb(g,w,h,d,r,m,x,y,z,ry=0){const o=rbox(w,h,d,r,m);o.position.set(x,y,z);o.rotation.y=ry;g.add(o);return o;}
const sombraTex=texCanvas(64,64,(c,W,H)=>{const r=c.createRadialGradient(32,32,2,32,32,32);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=r;c.fillRect(0,0,W,H);});
function sombra(g,w,d,x,z,y=0.003,op=1){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:sombraTex,transparent:true,opacity:op,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);g.add(m);}
const brilloTex=texCanvas(64,64,(c,W,H)=>{const r=c.createRadialGradient(32,32,1,32,32,32);r.addColorStop(0,'rgba(255,255,240,.9)');r.addColorStop(.3,'rgba(255,255,230,.35)');r.addColorStop(1,'rgba(255,255,220,0)');c.fillStyle=r;c.fillRect(0,0,W,H);});
function brillo(g,x,y,z,s){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:brilloTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sp.position.set(x,y,z);sp.scale.set(s,s,1);g.add(sp);return sp;}
const M={gris:new THREE.MeshLambertMaterial({color:0x50545a}),grisC:new THREE.MeshLambertMaterial({color:0x5c6066}),blanco:new THREE.MeshPhongMaterial({color:0xfbfbfb,shininess:120,specular:0x777777}),acero:new THREE.MeshPhongMaterial({color:0xc3c7cc,shininess:160,specular:0xffffff}),asa:new THREE.MeshPhongMaterial({color:0xe6e8ea,shininess:200,specular:0xffffff}),negro:new THREE.MeshPhongMaterial({color:0x07080a,shininess:220,specular:0x888888})};
function mueble(g,w,h,d,x,z,ry,filas,modulos){const grp=new THREE.Group();grp.position.set(x,0,z);grp.rotation.y=ry;g.add(grp);
  rb(grp,w-0.02,h-0.06,d-0.04,0.02,M.gris,0,0.03+(h-0.06)/2,-0.02);const n=modulos||Math.max(1,Math.round(w/0.75));
  for(let i=0;i<n;i++){const cx=-w/2+(i+.5)*w/n;for(let j=0;j<filas;j++){const fh=(h-0.1)/filas;const cy=0.08+fh*(j+.5);rb(grp,w/n-0.025,fh-0.025,0.03,0.012,M.grisC,cx,cy,d/2-0.02);caja(grp,w/n*0.62,0.018,0.025,M.asa,cx,cy+fh*0.3,d/2+0.01);}}
  rb(grp,w+0.06,0.05,d+0.08,0.02,M.blanco,0,h+0.025,0);sombra(g,w+0.5,d+0.6,x,z);return grp;}
function suelo(g){const t=texCanvas(512,512,(c,W,H)=>{const gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#cfd5da');gr.addColorStop(1,'#b7bec5');c.fillStyle=gr;c.fillRect(0,0,W,H);
    // reflejos horneados: ventana azul, nevera, lámparas, muebles
    const ref=(x,w,col,a)=>{const g2=c.createLinearGradient(0,0,0,H*0.55);g2.addColorStop(0,col);g2.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=a;c.fillStyle=g2;c.fillRect(x,0,w,H*0.55);c.globalAlpha=1;};
    ref(60,400,'#3a90d8',.45);ref(150,110,'#2d3035',.6);ref(250,170,'#45484d',.45);ref(380,70,'#eef0f2',.6);ref(420,60,'#9ea3a8',.6);for(const x of[255,300,345])ref(x,10,'#ffffff',.5);
    c.strokeStyle='rgba(255,255,255,.06)';for(let i=0;i<W;i+=64){c.beginPath();c.moveTo(i,0);c.lineTo(i,H);c.stroke();}});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(16,12),new THREE.MeshPhongMaterial({map:t,shininess:180,specular:0x999999}));m.rotation.x=-Math.PI/2;m.position.set(0,0,-2.5);g.add(m);}
function techoA3(g){// techo blanco con borde rebajado y muchos focos redondos
  const bl=B(0xf4f4f2),bl2=B(0xe2e2e0);caja(g,16,0.02,12,bl,0,4.35,-2.5);
  for(const [w,d,x,z] of [[16,1.6,0,-7.6],[16,1.4,0,2.6],[1.6,12,-6.7,-2.5],[1.6,12,6.7,-2.5]]){caja(g,w,0.3,d,bl2,x,4.05,z);}
  const foco=new THREE.CircleGeometry(0.06,10),fm=B(0xffffff),aro=new THREE.RingGeometry(0.06,0.09,12),am=B(0xb8b8b8);
  const pon=(x,z)=>{const f=new THREE.Mesh(foco,fm);f.rotation.x=Math.PI/2;f.position.set(x,3.895,z);g.add(f);const a=new THREE.Mesh(aro,am);a.rotation.x=Math.PI/2;a.position.set(x,3.896,z);g.add(a);};
  for(let x=-6;x<=6;x+=1.0){pon(x,-7.2);pon(x,2.2);}for(let z=-6;z<=1.5;z+=1.0){pon(-6.3,z);pon(6.3,z);}
  for(let i=0;i<5;i++)for(let j=0;j<3;j++){const f=new THREE.Mesh(foco,fm);f.rotation.x=Math.PI/2;f.position.set(-3+i*1.5,4.33,-5+j*2);g.add(f);}}
function paredAzul(g){// listones horizontales azules con luz degradada (retroiluminada)
  const t=texCanvas(256,256,(c,W,H)=>{const bg=c.createLinearGradient(0,0,W,0);bg.addColorStop(0,'#0f63b8');bg.addColorStop(.5,'#3aa6f2');bg.addColorStop(1,'#0f63b8');c.fillStyle=bg;c.fillRect(0,0,W,H);
    for(let i=0;i<16;i++){const y=i*16;c.fillStyle='rgba(255,255,255,.22)';c.fillRect(0,y,W,2);c.fillStyle='rgba(0,20,60,.35)';c.fillRect(0,y+13,W,3);}
    const v=c.createLinearGradient(0,0,0,H);v.addColorStop(0,'rgba(0,0,40,.25)');v.addColorStop(.6,'rgba(255,255,255,0)');v.addColorStop(1,'rgba(180,230,255,.35)');c.fillStyle=v;c.fillRect(0,0,W,H);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(10.5,1.7),new THREE.MeshBasicMaterial({map:t}));m.position.set(0.6,3.05,-8.05);g.add(m);
  const ls=new THREE.MeshBasicMaterial({color:0x2f8fe0});for(const sx of [-1,1]){const lat=new THREE.Mesh(new THREE.PlaneGeometry(7,3.9),new THREE.MeshBasicMaterial({map:texCanvas(256,128,(c,W,H)=>{const gr=c.createLinearGradient(0,0,W,0);gr.addColorStop(0,'#0e5aa8');gr.addColorStop(1,'#2a8ee0');c.fillStyle=gr;c.fillRect(0,0,W,H);for(let i=0;i<8;i++){c.fillStyle='rgba(0,20,60,.18)';c.fillRect(0,i*16+13,W,3);}})}));lat.position.set(sx*6.9,2.0,-4.3);lat.rotation.y=-sx*Math.PI/2;g.add(lat);}}
function nichos(g){// cajas/paneles blancos con huecos a la izquierda + persiana blanca
  const bl=new THREE.MeshLambertMaterial({color:0xf7f7f7}),hu=new THREE.MeshLambertMaterial({color:0xdedfe0});
  for(const [x,y,z,w,h] of [[-6.1,2.6,-6.6,1.2,0.8],[-6.1,1.6,-6.2,1.0,0.7],[-6.1,3.3,-5.6,0.9,0.6]]){rb(g,0.5,h,w,0.03,bl,x,y,z);caja(g,0.02,h*0.75,w*0.8,hu,x+0.24,y,z);}
  persiana(g,1.9,3.7,-5.0,1.95,-6.6,0.75);caja(g,0.06,3.8,0.06,M.blanco,-5.7,1.9,-7.25);}
function hornos(g,x,z){rb(g,2.1,2.75,0.75,0.03,new THREE.MeshLambertMaterial({color:0x3e4146}),x,1.375,z);
  for(let i=0;i<3;i++){const hx=x-0.66+i*0.66;rb(g,0.6,0.56,0.04,0.02,M.acero,hx,1.55,z+0.38);caja(g,0.5,0.32,0.012,M.negro,hx,1.5,z+0.405);caja(g,0.56,0.07,0.012,new THREE.MeshPhongMaterial({color:0x202226,shininess:150}),hx,1.75,z+0.405);caja(g,0.42,0.018,0.04,M.asa,hx,1.69,z+0.43);}
  for(let i=0;i<3;i++)caja(g,0.6,0.02,0.02,M.asa,x-0.66+i*0.66,0.9,z+0.39);sombra(g,2.6,1.3,x,z+0.1);}
function nevera(g,x,z){rb(g,1.3,2.15,0.75,0.05,M.acero,x,1.075,z);caja(g,0.012,2.05,0.02,new THREE.MeshBasicMaterial({color:0x6a6d70}),x,1.08,z+0.38);
  for(const s of[-1,1])cil(g,0.016,0.016,1.0,M.asa,x+s*0.07,1.25,z+0.42,8);
  rb(g,0.28,0.4,0.03,0.03,new THREE.MeshPhongMaterial({color:0x2a2c30,shininess:150}),x-0.33,1.35,z+0.38);caja(g,0.12,0.03,0.02,B(0x5ad1ff),x-0.33,1.5,z+0.4);sombra(g,1.8,1.3,x,z+0.1);}
function estantes(g){for(const y of[1.55,2.05]){rb(g,2.7,0.05,0.36,0.02,M.blanco,0.75,y,-7.72);}
  caja(g,2.9,1.05,0.04,new THREE.MeshBasicMaterial({color:0xfdfdfd}),0.75,1.6,-7.93);
  const vid=c=>new THREE.MeshPhongMaterial({color:c,shininess:180,specular:0xffffff,transparent:true,opacity:.85});
  [0x2e4a16,0x5a2610,0x24381a,0xa88620,0x2e4a16].forEach((c,i)=>botellaV(g,-0.35+i*0.13,2.08,-7.7,c,0.34,0.035));
  for(const x of[0.5,0.72])jarronV(g,x,2.08,-7.7,0x9bd43c,0.3,0.075);botellaV(g,1.4,1.58,-7.7,0xf8f8f8,0.4,0.05);jarronV(g,1.75,1.58,-7.7,0x9bd43c,0.22,0.08);
  const rv=new THREE.Mesh(new THREE.SphereGeometry(0.17,16,12),new THREE.MeshPhongMaterial({color:0xc4101c,shininess:200,specular:0xffffff}));rv.position.set(2.15,1.1,-7.25);g.add(rv);cil(g,0.06,0.08,0.08,rv.material,2.15,1.27,-7.25,12);
  botellaV(g,1.72,0.95,-7.3,0xff7a1a,0.42,0.05);botellaV(g,1.9,0.95,-7.3,0x17a59c,0.36,0.045);}
function botellaV(g,x,y,z,col,h,r){const pts=[];for(let i=0;i<=10;i++){const t=i/10;const rr=t<0.65?r:t<0.8?r*(1-(t-0.65)/0.15*0.6):r*0.4;pts.push(new THREE.Vector2(rr,t*h));}const o=new THREE.Mesh(new THREE.LatheGeometry(pts,12),new THREE.MeshPhongMaterial({color:col,shininess:180,specular:0xffffff}));o.position.set(x,y,z);g.add(o);}
function jarronV(g,x,y,z,col,h,r){const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(new THREE.Vector2(r*(0.75+0.35*Math.sin(t*Math.PI)),t*h));}const o=new THREE.Mesh(new THREE.LatheGeometry(pts,14),new THREE.MeshPhongMaterial({color:col,shininess:150,specular:0xffffff,transparent:true,opacity:.9}));o.position.set(x,y,z);g.add(o);}
function neveraVia2(g,x,y,z){const grp=new THREE.Group();grp.position.set(x,y,z);grp.scale.setScalar(1.2);g.add(grp);
  rb(grp,0.86,1.18,0.5,0.1,new THREE.MeshPhongMaterial({color:0xcfd2d6,shininess:170,specular:0xffffff}),0,0.59,0);
  const fondo=texCanvas(256,352,(c,W,H)=>{c.fillStyle='#fdfdfd';c.fillRect(0,0,W,H);c.fillStyle='#38a33a';c.font='bold 54px Arial';c.textAlign='center';c.fillText('VIA',W/2,62);c.font='bold 40px Arial';c.fillText('NATURE',W/2,104);c.strokeStyle='#38a33a';c.lineWidth=6;c.beginPath();c.ellipse(W/2+64,22,16,9,-0.6,0,7);c.stroke();});
  const fm=new THREE.Mesh(new THREE.PlaneGeometry(0.7,1.0),new THREE.MeshBasicMaterial({map:fondo}));fm.position.set(0,0.6,0.2);grp.add(fm);
  caja(grp,0.7,0.014,0.24,new THREE.MeshPhongMaterial({color:0xe6f4ff,transparent:true,opacity:.55,shininess:200}),0,0.52,0.31);
  const cols=[0x3aa83a,0xe5407a,0xff8a1a,0xd01a1a,0x7a2a9a];for(let r=0;r<2;r++)for(let i=0;i<5;i++){const bx=-0.26+i*0.13,by=0.12+r*0.42;botellaV(grp,bx,by,0.31,0xf6f0e4,0.26,0.035);cil(grp,0.037,0.037,0.09,B(cols[(i+r*2)%5]),bx,by+0.1,0.31,10);}
  const vid=new THREE.Mesh(new THREE.PlaneGeometry(0.74,1.04),new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.12,shininess:250,specular:0xffffff}));vid.position.set(0,0.6,0.26);grp.add(vid);
  cil(grp,0.015,0.015,0.8,M.asa,0.33,0.6,0.28,8);sombra(g,1.2,0.8,x,z+0.05,y+0.004);return grp;}
function lampara2(g,x,z,yb){const grp=new THREE.Group();g.add(grp);const len=4.33-(yb+1.0);cil(grp,0.004,0.004,len,B(0x777777),x,4.33-len/2,z,4);
  const em=new THREE.MeshBasicMaterial({color:0xffffff});cil(grp,0.075,0.075,1.0,em,x,yb+0.5,z,16);caja(grp,0.27,0.01,0.27,B(0xfffbe8),x,yb,z).visible=false;
  const gl=brillo(grp,x,yb+0.4,z+0.1,0.7);grp.userData.mat=em;grp.userData.gl=gl;lamparas.push(grp);return grp;}
function islaA3(g,x,z,w){rb(g,w,0.07,1.3,0.03,M.blanco,x,0.93,z);rb(g,w-0.12,0.82,1.0,0.02,M.gris,x,0.48,z-0.06);
  rb(g,w-0.25,0.04,0.42,0.02,M.blanco,x,0.24,z+0.43);for(let i=0;i<4;i++)rb(g,0.33,0.3,0.33,0.04,new THREE.MeshLambertMaterial({color:0x92d13a}),x-w/2+0.5+i*0.45,0.41,z+0.43);
  rb(g,1.35,0.012,0.62,0.02,M.negro,x+w/2-0.95,0.968,z+0.05);for(let i=0;i<4;i++){const r=new THREE.Mesh(new THREE.RingGeometry(0.1,0.11,24),B(0x60646a));r.rotation.x=-Math.PI/2;r.position.set(x+w/2-1.28+(i%2)*0.62,0.976,z-0.1+Math.floor(i/2)*0.3);g.add(r);}
  caja(g,0.9,0.006,0.55,new THREE.MeshLambertMaterial({color:0xb6d63a}),x-0.25,0.968,z+0.1);
  rb(g,0.62,0.04,0.38,0.05,new THREE.MeshLambertMaterial({color:0xa06e3c}),x-0.3,0.99,z+0.08);
  jarronV(g,x-1.25,0.965,z-0.2,0x8b8f95,0.48,0.08);perejil(g,x-1.25,1.44,z-0.2);
  cil(g,0.075,0.07,0.22,M.blanco,x-0.98,1.075,z-0.28,14);for(let i=0;i<5;i++){const s=cil(g,0.012,0.012,0.42,L(0xc89a5a),x-0.98+(i-2)*0.025,1.27,z-0.28,5);s.rotation.z=(i-2)*0.1;const cu=new THREE.Mesh(new THREE.SphereGeometry(0.035,6,4),L(0xc89a5a));cu.scale.set(1,1.4,0.4);cu.position.set(x-0.98+(i-2)*0.045,1.5,z-0.28);g.add(cu);}
  botellaV(g,x-1.55,0.965,z+0.28,0x34451a,0.46,0.035);sombra(g,w+0.6,1.8,x,z);}
function platoA3(v){const g=setG;
  caja(g,16,4.4,0.1,new THREE.MeshBasicMaterial({map:texCanvas(64,256,(c,W,H)=>{const gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#e9e9e9');gr.addColorStop(1,'#fafafa');c.fillStyle=gr;c.fillRect(0,0,W,H);})}),0,2.2,-8.12);
  suelo(g);paredAzul(g);techoA3(g);nichos(g);hornos(g,-2.35,-7.45);
  mueble(g,4.0,0.9,0.72,1.0,-7.32,0,3);estantes(g);nevera(g,3.95,-7.35);
  if(v==='via')neveraVia2(g,2.75,0.95,-7.4);else{lampara2(g,1.7,-7.3,2.0);lampara2(g,1.93,-7.1,1.68);lampara2(g,2.15,-7.35,1.76);}
  // izquierda: encimera con fregadero y columnas blanco/negro
  mueble(g,2.5,0.9,0.75,-4.1,-4.6,0.3,2);caja(g,0.62,0.012,0.42,M.acero,-3.85,0.935,-4.45).rotation.y=0.3;
  for(const [dx,h,c] of [[-0.75,0.8,M.negro],[-0.5,0.6,M.blanco],[-0.25,0.95,M.negro]])cil(g,0.085,0.085,h,c,-4.2+dx,0.93+h/2,-4.85,16);
  pantallaFruta(g,-6.85,2.0,-3.0,Math.PI/2);
  // derecha: muebles y columna alta gris
  mueble(g,2.2,0.9,0.75,4.7,-3.4,-Math.PI/2,3);rb(g,0.8,3.3,0.75,0.03,M.gris,6.3,1.65,-3.4);caja(g,0.02,2.4,0.02,M.asa,5.89,1.5,-3.1);
  islaA3(g,0,0.2,4.6);}
function platoCA(){const g=setG; // Cocina abierta: muebles grises, estantes blancos, cortinas rojas
  caja(g,14,4.2,0.1,L(0xeeeeec),0,2.1,-8.1);caja(g,2,2.6,0.7,P(0x4a4d52),-2.6,1.3,-7.4);for(let i=0;i<2;i++)horno(g,-2.9+i*0.6,1.5,-7.0);
  cajones(g,4,0.88,0.7,1.2,0,-7.3,0x6b6e72,2);for(const y of[1.5,2.0,2.5]){caja(g,2.6,0.04,0.35,P(0xffffff),1.2,y,-7.7);for(let i=0;i<5;i++)jarron(g,0.2+i*0.5,y+0.02,-7.65,i%2?0xffffff:0x3f8f2f,0.2,0.06);}
  for(const x of[-4.8,4.8]){const cu=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,3.6,10,1,true,0,Math.PI),L(0xb5121b));cu.position.set(x,1.9,-6);g.add(cu);}
  caja(g,1.3,2.1,0.75,P(0xb8bcc2,150),4.0,1.05,-7.3);caja(g,0.1,4.2,7,L(0xdcdcd8),-6.6,2.1,-3.5);caja(g,0.1,4.2,7,L(0xdcdcd8),6.6,2.1,-3.5);
  cajones(g,2.4,0.88,0.75,-4.2,0,-4.2,0x6b6e72,2,0.25);isla(g,0,0.2,4.6,0x6b6e72);
  g.children.filter(o=>o.material&&o.material.color&&o.material.color.getHex()===0xb5d33a).forEach(o=>o.material.color.set(0xd8337a));}
function platoT5b(){const g=setG; // Telecinco 2004-2010: pared magenta, pizarra negra, árboles de apio
  caja(g,14,4.2,0.1,L(0xd0287a),0,2.1,-8.1);caja(g,0.1,4.2,7,L(0x1a1a1a),-6.6,2.1,-3.5);caja(g,0.1,4.2,7,L(0xf0f0f0),6.6,2.1,-3.5);
  const chalk=texCanvas(256,128,(c,W,H)=>{c.fillStyle='#161616';c.fillRect(0,0,W,H);c.strokeStyle='#eee';c.lineWidth=2;for(let i=0;i<9;i++){c.beginPath();c.arc(20+i*28,40+(i%3)*25,10,0,5);c.stroke();}});const cm=new THREE.Mesh(new THREE.PlaneGeometry(6,3),new THREE.MeshBasicMaterial({map:chalk}));cm.position.set(-6.5,2,-3.5);cm.rotation.y=Math.PI/2;g.add(cm);
  for(let i=0;i<5;i++){const x=-4+i*2;cil(g,0.06,0.08,2.2,L(0x8cc63a),x,1.1,-6.5,6);for(let k=0;k<8;k++){const h=cil(g,0.015,0.02,0.6,L(0x7cc23a),x+Math.sin(k)*0.2,2.4,-6.5+Math.cos(k)*0.2,4);h.rotation.z=Math.sin(k)*0.5;h.rotation.x=Math.cos(k)*0.5;}}
  cajones(g,5,0.88,0.7,0,0,-7.3,0x2b2b2b,2);isla(g,0,0.2,4.6,0x2b2b2b);}
function platoT5a(){const g=setG; // Telecinco 1997-2000: suelo de barro, paredes crema, mesa azul redonda, muebles verde azulado
  caja(g,14,4.2,0.1,L(0xf1e4c8),0,2.1,-8.1);caja(g,0.1,4.2,7,L(0xf1e4c8),-6.6,2.1,-3.5);caja(g,0.1,4.2,7,L(0xf1e4c8),6.6,2.1,-3.5);
  for(let i=0;i<6;i++){caja(g,0.7,0.5,0.04,L(0x8a5a2a),-4.5+i*1.8,2.7,-8.0);caja(g,0.6,0.4,0.05,L([0xd9c08a,0xa8c8a0,0xe0b0a0][i%3]),-4.5+i*1.8,2.7,-7.98);}
  for(const y of[1.6,2.1]){caja(g,3,0.05,0.35,L(0xffffff),-3.4,y,-7.7);for(let i=0;i<4;i++)perejil(g,-4.5+i*0.7,y,-7.6);}
  const mesa=cil(g,0.9,0.9,0.75,L(0x2a4fc0),-3.2,0.38,-3.5,20);for(let i=0;i<8;i++){const t=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6),P(0xd01a1a,120));t.position.set(-3.2+Math.sin(i)*0.5,0.8,-3.5+Math.cos(i*1.3)*0.5);g.add(t);}
  cajones(g,5,0.88,0.7,1,0,-7.3,0x3f8f8a,2);isla(g,0,0.2,4.6,0x3f8f8a);
  g.children.filter(o=>o.material&&o.material.color&&o.material.color.getHex()===0xfafafa).forEach(o=>o.material.color.set(0xd9b48a));}
function luces(on){lamparas.forEach(l=>{l.userData.mat.color.set(on?0xffffff:0xd8d8d8);l.userData.gl.visible=on;});}
function aplicaPlato(rec){let v=A.plato;if(v==='auto')v=(rec&&rec==='alubias')?'lamparas':'via';platoVar=v;construyeSet(etapaAct,v==='via'?'via':'lamparas');luces(v!=='apagadas');}
// cámara
const camT={p:new THREE.Vector3(0,2.2,4.8),l:new THREE.Vector3(0,1.3,-4)},camC={p:camT.p.clone(),l:camT.l.clone()};
const VISTAS={general:[[-0.7,1.8,2.6],[0.9,1.35,-7]],foto01:[[-0.7,1.8,2.6],[0.9,1.35,-7]],foto02:[[3.4,2.15,0.4],[-1.6,1.2,-7.6]],v8:[[0.7,1.7,2.4],[-0.3,1.45,-7]],karlos:[[0.15,1.85,1.6],[0.1,1.7,-1]],manos:[[0.1,2.3,1.4],[-0.1,0.9,0.1]],lateral:[[-3.2,2.0,2.6],[1,1.4,-4]],fondo:[[1.6,1.7,-3.4],[2.2,1.4,-7.5]],dos:[[-0.5,1.9,2.4],[-0.4,1.6,-1]],via:[[2.2,1.6,-4.6],[2.75,1.45,-7.4]]};
function vista(n,inst){const v=VISTAS[n];camT.p.set(...v[0]);camT.l.set(...v[1]);if(inst){camC.p.copy(camT.p);camC.l.copy(camT.l);}}
let orbita=false,render3D=true,last=0;
// ---- cámaras grúa: barridos suaves que suben, bajan y hacen arco sobre la isla ----
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;let grua=null;
const CEN=new THREE.Vector3(0.4,0,-2.6);
function gruaPos(k,o){return [CEN.x+Math.sin(o.a)*o.r,o.h,CEN.z+Math.cos(o.a)*o.r];}
function moverGrua(desde,hasta,ms,mira){return new Promise(res=>{orbita=false;grua={t0:performance.now(),ms,desde,hasta,mira:mira||[0.4,1.2,-4],res};});}
// 5 movimientos de grúa (referencia: ejemplos de Iker): [posDesde,miraDesde,posHasta,miraHasta,ms]
const GRUAS={
 acercar:[[0.2,3.6,5.2],[0.2,1.2,-3],[0.15,1.75,1.3],[0.1,1.6,-1],6000],          // 1) push-in de plano general elevado a plano medio de Karlos
 cenital:[[0.6,1.8,2.2],[0,1.0,0.1],[-0.25,3.3,0.35],[-0.25,0.95,0.15],5500],      // 3) sube y picado hasta vista cenital del plato
 abrir:[[0.15,1.75,1.4],[0.1,1.6,-1],[0.4,3.2,5.6],[0.5,1.3,-4.5],6500],            // 4) dolly-out que descubre todo el plató
 bajo:[[0.8,2.4,2.4],[0.1,1.5,-1],[0.6,0.55,1.9],[0.1,1.9,-1],4000],                // 5) bajada rápida a contrapicado (momento divertido)
};
async function tomaGrua(n,ms){const g=GRUAS[n];if(n==='lateral')return;await moverGrua2(g[0],g[1],g[2],g[3],ms||g[4]);}
function moverGrua2(p0,l0,p1,l1,ms){return new Promise(res=>{orbita=false;grua={t0:performance.now(),ms,p0,l0,p1,l1,res};});}
// 2) travelling lateral siguiendo a Karlos que camina (al horno, la nevera o la tabla)
async function travelling(destX,ms=4500){if(!host)return;const x0=host.position.x;const t0=performance.now();orbita=false;andando=true;
  await new Promise(res=>{const f=()=>{const k=Math.min(1,(performance.now()-t0)/ms),e=ease(k);host.position.x=x0+(destX-x0)*e;host.rotation.y=destX>x0?0.9*(k<1?1:0):-0.9*(k<1?1:0);const hx=host.position.x;grua={t0:0,ms:1,p0:[hx,1.75,1.9],l0:[hx,1.5,-1],p1:[hx,1.75,1.9],l1:[hx,1.5,-1],res:()=>{}};if(k<1)requestAnimationFrame(f);else{host.rotation.y=0;andando=false;res();}};f();});}
let andando=false;let mg={i:0,t0:0};const MGS=['abrir','acercar','bajo','cenital'];
function menuGruas(){const t=performance.now();const n=MGS[mg.i%MGS.length];const g=GRUAS[n];const ms=g[4]+1500;if(!mg.t0)mg.t0=t;let f=(t-mg.t0)/g[4];if(t-mg.t0>ms){mg.i++;mg.t0=t;f=0;}f=Math.min(1,f);const e=ease(f);const L3=(u,v)=>u.map((x,i)=>x+(v[i]-x)*e);camT.p.set(...L3(g[0],g[2]));camT.p.y+=Math.sin(e*Math.PI)*0.35;camT.l.set(...L3(g[1],g[3]));return true;}
function loop(t){requestAnimationFrame(loop);const fps=calidad()==='baja'?30:60;if(t-last<1000/fps-2)return;const dt=Math.min(0.1,(t-last)/1000);last=t;if(!render3D)return;
  if(grua){const f=grua.ms<=1?1:Math.min(1,(performance.now()-grua.t0)/grua.ms),e=ease(f);const L3=(u,v)=>u.map((x,i)=>x+(v[i]-x)*e);const arco=Math.sin(e*Math.PI)*0.35;const pp=L3(grua.p0,grua.p1);pp[1]+=arco;camT.p.set(...pp);camT.l.set(...L3(grua.l0,grua.l1));camC.p.copy(camT.p);camC.l.copy(camT.l);if(f>=1&&grua.ms>1){const r=grua.res;grua=null;r();}else if(grua.ms<=1){grua=null;}}
  else if(orbita&&menuGruas()){}else if(orbita){const t=s0();const a=Math.sin(t*0.09)*0.95,h=2.2+Math.sin(t*0.13+1)*1.1,r=4.6+Math.sin(t*0.07)*0.9;camT.p.set(...gruaPos(0,{a,h,r}));camT.l.set(0.4,1.1+Math.sin(t*0.11)*0.25,-4.2);}
  const k=1-Math.pow(0.05,dt);camC.p.lerp(camT.p,k);camC.l.lerp(camT.l,k);cam.position.copy(camC.p);cam.lookAt(camC.l);
  const s=t/1000;if(host){host.userData.boca.scale.y=hablando?1+3*Math.abs(Math.sin(s*13)):1;host.rotation.z=Math.sin(s*1.2)*0.012;}if(invitado)invitado.rotation.z=Math.sin(s*1.1+1)*0.01;
  renderer.render(scene,cam);}
// ---------- logo (dibujado) ----------
function dibujaLogo(g,cx,cy,sz,et){g.save();g.textAlign='center';g.textBaseline='middle';
  // gorro de cocinero
  g.fillStyle='#fff';g.strokeStyle='#b5121b';g.lineWidth=sz*0.04;g.beginPath();g.arc(cx-sz*0.25,cy-sz*1.05,sz*0.22,0,7);g.arc(cx,cy-sz*1.2,sz*0.26,0,7);g.arc(cx+sz*0.25,cy-sz*1.05,sz*0.22,0,7);g.fill();g.fillRect(cx-sz*0.3,cy-sz*1.05,sz*0.6,sz*0.38);g.strokeRect(cx-sz*0.3,cy-sz*0.75,sz*0.6,sz*0.08);
  const t1=et?et.titulo.replace(/ de Karlos Arguiñano| Karlos Arguiñano/,'').replace('Karlos Arguiñano ',''):'El juego de la cocina';
  g.font=`${sz*0.62}px Logo, cursive`;g.lineWidth=sz*0.12;g.strokeStyle='#7a0c12';g.strokeText('Karlos Arguiñano',cx,cy-sz*0.2);g.fillStyle='#fff';g.fillText('Karlos Arguiñano',cx,cy-sz*0.2);
  g.font=`bold ${sz*0.36}px Arial`;const w=g.measureText(t1).width+sz*0.5;g.fillStyle='#e3262f';g.beginPath();g.roundRect(cx-w/2,cy+sz*0.3,w,sz*0.55,sz*0.27);g.fill();g.fillStyle='#fff';g.fillText(t1,cx,cy+sz*0.59);
  if(et){g.font=`bold ${sz*0.24}px Arial`;g.fillStyle='#ffd27a';g.lineWidth=sz*0.06;g.strokeStyle='#000';g.strokeText(et.cadena+' · '+et.años,cx,cy+sz*1.12);g.fillText(et.cadena+' · '+et.años,cx,cy+sz*1.12);}
  g.restore();}
function logoCanvas(cls,et){const c=document.createElement('canvas');c.width=700;c.height=520;c.className=cls;dibujaLogo(c.getContext('2d'),350,300,130,et);return c;}
// ---------- menú (misma estructura que ¡Ahora Caigo! 1.35, como El Tirón) ----------
let menuEl=null,yaTitulo=!!sessionStorage.getItem('kar_menu');sessionStorage.removeItem('kar_menu');
function mbtn(t,s,cls,fn){const b=document.createElement('button');b.className='mbtn '+cls;b.innerHTML=`<span class="fp"></span><span>${t}${s?`<small>${s}</small>`:''}</span>`;b.onclick=e=>{e.stopPropagation();fn();};return b;}
function volverB(a){const b=document.createElement('button');b.className='tbtn back';b.innerHTML='⟵ Volver';b.onclick=e=>{e.stopPropagation();Lt(a);};return b;}
function h2(t){const e=document.createElement('h2');e.textContent=t;return e;}
function fila(lbl,...els){const r=document.createElement('div');r.className='orow';const l=document.createElement('label');l.textContent=lbl;r.append(l,...els);return r;}
function siNo(k,cb){const b=document.createElement('button');const p=()=>{b.className='tbtn'+(A[k]?' sel':'');b.textContent=A[k]?'Sí':'No';};b.onclick=e=>{e.stopPropagation();A[k]=!A[k];guardaA();p();cb&&cb();};p();return b;}
function elige(k,ops,cb){return ops.map(([v,t])=>{const b=document.createElement('button');b.className='tbtn'+(String(A[k])===String(v)?' sel':'');b.textContent=t;b.onclick=e=>{e.stopPropagation();A[k]=v;guardaA();b.parentElement.querySelectorAll('.tbtn').forEach(x=>x.classList.toggle('sel',x===b));cb&&cb();};return b;});}
function entrarMenu(){render3D=true;orbita=true;UI.innerHTML='';ponInvitado(null);if(!bed||bed.dataset.src!=='snd/bed_a3_2013.ogg')musica('snd/bed_a3_2013.ogg',true,.4);}
function menu(){Lt(yaTitulo?'main':'title');}
let etSel=ETAPAS[2];
function Lt(a='main'){
  if(a!=='title')entrarMenu();else{render3D=true;orbita=true;UI.innerHTML='';}
  if(!menuEl){menuEl=document.createElement('div');menuEl.id='menu';document.body.appendChild(menuEl);}
  const e=menuEl;e.classList.remove('oculto');$('#ver').style.display='none';e.innerHTML='';
  if(a==='title'){const u=document.createElement('div');u.className='title';const lg=logoCanvas('tlogo');lg.style.animation='none';const d=document.createElement('div');d.className='tsub';d.textContent='El juego';const f=document.createElement('div');f.className='ttap';f.textContent='Toca para empezar';u.append(lg,d,f);e.appendChild(u);
    cabeceraJuego(lg);
    const p=v=>{v.stopPropagation();e.removeEventListener('pointerup',p);removeEventListener('keydown',p);yaTitulo=true;paraMusica();Lt('main');};e.addEventListener('pointerup',p);addEventListener('keydown',p);return;}
  const n=document.createElement('div');n.className='mbox';const i=document.createElement('div');i.className='logo';i.appendChild(logoCanvas('mlogo',a==='dia'?etSel:null));const o=document.createElement('div');o.className='mtag';o.textContent='COCINA · 3D';i.appendChild(o);
  const r=document.createElement('div');r.className='col ui';
  if(a==='main'){r.append(mbtn('Jugar','Elige etapa del programa y día de la semana','gold',()=>Lt('play')),
      mbtn('Opciones','Tu nombre, música, voz, cabecera, plató, calidad gráfica','',()=>Lt('options')),
      mbtn('Ver cabecera','Las cabeceras reales de cada etapa y la del juego','',()=>Lt('cabs')),
      mbtn('La historia del programa','Karlos te la cuenta, con chistes (voz sintética)','hist',()=>{salirMenu();historia();}),
      mbtn('Vídeos de Ikeriano (Grok Imagine)','Los 33 vídeos de Iker, tal cual','gold',()=>Lt('videos')),mbtn('Cómo se juega','Pasos de cocina y preguntas','',()=>Lt('help')),mbtn('Créditos','','',()=>Lt('credits')));}
  else if(a==='play'){r.append(h2('Elige etapa'));ETAPAS.forEach(et=>r.append(mbtn(et.nombre,`${et.titulo} · ${et.años}`+(EST.mejor[et.id]?` · récord ${EST.mejor[et.id]}`:''),'gold',()=>{etSel=et;Lt('dia');})));r.append(volverB('main'));}
  else if(a==='dia'){r.append(h2(etSel.titulo));['Lunes','Martes','Miércoles','Jueves','Viernes'].forEach((d,k)=>{const cid=colabDia(etSel,d);const hostJ=etSel.id==='a3_2019'&&d==='Viernes';r.append(mbtn(d,`${REC[etSel.recetas[k%etSel.recetas.length]].n}`+(hostJ?' · presenta Joseba':'')+(cid?` · con ${COLAB[cid].nombre}`:''),k?'':'gold',()=>{salirMenu();programa(etSel,d,k);}));});r.append(volverB('play'));}
  else if(a==='options'){r.appendChild(h2('Opciones'));const nom=document.createElement('input');nom.className='otext';nom.value=A.nombre;nom.maxLength=14;nom.onclick=e=>e.stopPropagation();nom.oninput=()=>{A.nombre=nom.value.trim()||'Iker';guardaA();};
    const vol=document.createElement('input');vol.type='range';vol.min=0;vol.max=100;vol.value=Math.round((A.volMus??1)*100);vol.oninput=()=>{A.volMus=vol.value/100;guardaA();if(bed)bed.volume=(+bed.dataset.v)*A.volMus;};
    r.append(fila('👤 Tu nombre',nom),fila('🎵 Música',siNo('musica',()=>{if(!A.musica)paraMusica();else entrarMenu();}),vol),fila('🎤 Voces',siNo('voz')),fila('📺 Cabecera al empezar cada programa',siNo('cabecera')),
      fila('💡 Plató (Antena 3)',...elige('plato',[['auto','Auto'],['lamparas','Lámparas encendidas'],['apagadas','Lámparas apagadas'],['via','Nevera Vía Nature']],()=>{aplicaPlato();vista(A.plato==='via'?'via':'general');setTimeout(()=>orbita=true,2500);orbita=false;})),
      fila('✨ Calidad gráfica',...elige('calidad',[['auto','Auto'],['baja','Baja'],['alta','Alta']],()=>{ajustaTam();})));
    const x=document.createElement('p');x.className='mtext';x.textContent='«Auto» en el plató: lámparas en el programa del puré de alubias (2013) y nevera Vía Nature en el resto, como en los vídeos de hogarmania/hogarutil.';r.append(x,volverB('main'));}
  else if(a==='cabs'){r.append(h2('Ver cabecera'),mbtn('Cabecera del juego','La canción que mandó Iker','gold',async()=>{salirMenu();await cabeceraJuegoPantalla();menu();}));ETAPAS.forEach(et=>r.append(mbtn(et.nombre,et.cabNota,'',async()=>{salirMenu();await cabecera(et);menu();})));r.append(volverB('main'));}
  else if(a==='videos'){r.classList.add('text');r.append(volverB('main'),h2('Vídeos de Ikeriano (Grok Imagine)'));const gd=document.createElement('div');gd.className='galeria';
    for(let i=1;i<=NVID;i++){const t=document.createElement('button');t.className='mini';t.innerHTML=`<img src="ika/${String(i).padStart(2,'0')}.jpg" loading="lazy"><span>${i}</span>`;t.onclick=e=>{e.stopPropagation();verVideo(i);};gd.appendChild(t);}r.append(gd);}
  else if(a==='help'){r.classList.add('text');r.append(volverB('main'),h2('Cómo se juega'));const u=document.createElement('div');u.className='mtext';u.innerHTML=`<p>Elige una <b>etapa</b> del programa y un <b>día</b>. Karlos cocina un plato y tú cocinas con él:</p><p>🧺 <b>Ingredientes:</b> toca los que lleva el plato.<br>🔪 <b>Cortar:</b> toca muchas veces el botón antes de que acabe el tiempo.<br>📋 <b>En orden:</b> toca los pasos en el orden correcto.<br>⏱ <b>Punto:</b> para la aguja en la zona verde.<br>❓ <b>Preguntas</b> de cocina.</p><p>Los colaboradores salen en sus días. Cada acierto da puntos.</p>`;r.append(u);}
  else if(a==='credits'){r.classList.add('text');r.append(volverB('main'),h2('Créditos'));const u=document.createElement('div');u.className='mtext';u.innerHTML=`<p><b>Idea</b><br>Iker (Ikeriano)</p><p><b>Música, cabeceras y frases de Karlos</b><br>Recortadas tal cual de los vídeos de referencia y de los archivos de Iker.</p><p><b>Voz sintética (TTS Piper)</b><br>La historia del programa y las presentaciones de los colaboradores. No son sus voces reales.</p><p class="small">Versión ${VERSION}. Juego de fans sin ánimo de lucro inspirado en los programas de cocina de Karlos Arguiñano.</p>`;r.append(u);}
  const l=document.createElement('div');l.className='mver';l.textContent='v'+VERSION;n.appendChild(l);n.append(i,r);e.appendChild(n);}
const NVID=0;
function verVideo(i){paraMusica();const c=document.createElement('div');c.id='cab';const v=document.createElement('video');v.playsInline=true;v.setAttribute('playsinline','');v.controls=false;c.appendChild(v);
  const bar=document.createElement('div');bar.className='vbar';const lab=document.createElement('span');const mk=(t,f)=>{const b=document.createElement('button');b.className='btnR';b.textContent=t;b.onclick=e=>{e.stopPropagation();f();};return b;};
  const carga=n=>{i=(n-1+NVID)%NVID+1;v.src=`ika/${String(i).padStart(2,'0')}.mp4`;v.volume=A.volMus??1;v.play().catch(()=>{});lab.textContent=`Vídeo ${i} de ${NVID}`;};
  bar.append(mk('⏮ Anterior',()=>carga(i-1)),mk('⏯',()=>v.paused?v.play():v.pause()),lab,mk('Siguiente ⏭',()=>carga(i+1)),mk('✖ Cerrar',()=>{v.pause();c.remove();entrarMenu();}));
  v.onended=()=>carga(i+1);c.appendChild(bar);document.body.appendChild(c);carga(i);}
function salirMenu(){orbita=false;$('#ver').style.display='';if(menuEl)menuEl.classList.add('oculto');paraMusica();}
function colabDia(et,d){return et.colab.find(c=>COLAB[c].dia===d)||null;}
// cabecera cantada del juego (archivo de Iker, tal cual) con el logo sincronizado
let cabJ=null;
function cabeceraJuego(lg){if(cabJ){cabJ.pause();}if(!A.musica)return Promise.resolve();const a=new Audio('snd/cabecera_juego.ogg');a.volume=A.volMus??1;cabJ=a;
  const anim=()=>{if(a!==cabJ||!lg.isConnected)return;const t=a.currentTime;const k=Math.min(1,t/1.2);const pulso=1+0.035*Math.max(0,Math.sin(t*Math.PI*2*(124/60)/2));lg.style.transform=`scale(${(0.2+0.8*(1-Math.pow(1-k,3)))*pulso}) rotate(${(1-k)*-12}deg)`;lg.style.opacity=String(Math.min(1,t/0.6));if(!a.paused)requestAnimationFrame(anim);};
  a.onplay=()=>requestAnimationFrame(anim);a.onended=()=>{lg.style.transform='';lg.style.animation='tFloat 3.2s ease-in-out infinite';};
  return a.play().catch(()=>{lg.style.animation='';});}
function paraCabJ(){if(cabJ){cabJ.pause();cabJ=null;}}
const _pm=paraMusica;
function cabeceraJuegoPantalla(){return new Promise(res=>{render3D=true;UI.innerHTML='';const d=document.createElement('div');d.id='menu';d.innerHTML='<div class="title"></div>';const t=d.firstChild;const lg=logoCanvas('tlogo');lg.style.animation='none';t.appendChild(lg);const b=document.createElement('button');b.className='btnR';b.textContent='Saltar ⏭';b.style.position='absolute';b.style.right='3vw';b.style.bottom='4vh';t.appendChild(b);document.body.appendChild(d);
  const fin=()=>{paraCabJ();d.remove();res();};b.onclick=e=>{e.stopPropagation();fin();};cabeceraJuego(lg);if(cabJ)cabJ.addEventListener('ended',()=>setTimeout(fin,600));else setTimeout(fin,3000);});}
function cabecera(et){return new Promise(res=>{render3D=false;paraMusica();UI.innerHTML='';const c=document.createElement('div');c.id='cab';const v=document.createElement('video');v.src=et.cab;v.playsInline=true;v.setAttribute('playsinline','');v.preload='auto';v.volume=(A.volMus??1);c.appendChild(v);document.body.appendChild(c);let hecho=false;const fin=()=>{if(hecho)return;hecho=true;v.pause();c.remove();render3D=true;res();};const b=document.createElement('button');b.className='btnR cabsalta';b.textContent='Saltar ⏭';b.onclick=e=>{e.stopPropagation();fin();};c.appendChild(b);v.onended=fin;v.onerror=fin;v.play().catch(()=>{v.muted=true;v.play().catch(fin);});});}
function botonSaltar(){const b=document.createElement('button');b.className='btnR';b.textContent='Saltar ⏭';b.style.marginTop='0';const e=document.createElement('div');e.className='esq';e.appendChild(b);UI.appendChild(e);return b;}
// ---------- historia ----------
async function historia(){construyeSet(ETAPAS[2],'lamparas');ponHost('karlos');render3D=true;UI.innerHTML='';saltar=false;const b=botonSaltar();b.onclick=()=>{saltar=true;cortaVoz();};
  const r=document.createElement('div');r.className='rotulo';r.textContent='La historia del programa · voz sintética (TTS)';UI.appendChild(r);
  const pl=['karlos','general','lateral','karlos','fondo','general','karlos','dos'];for(let i=1;i<=8&&!saltar;i++){vista(pl[i-1]);await clip('hist'+i,'Karlos (TTS)');await sleep(250);}
  saltar=false;construyeSet(etapaAct,'lamparas');menu();}
// ---------- partida ----------
let puntos=0;
function hud(et,rec){UI.innerHTML=`<div class="hud"><span class="pt" id="pt">${puntos} pts</span><span class="rc">${rec.em} ${rec.n}</span></div>`;}
function suma(n){puntos+=n;const e=$('#pt');if(e)e.textContent=puntos+' pts';}
function cajaFuera(){const c=$('.caja');if(c)c.remove();}
function cajaUI(html){let c=$('.caja');if(!c){c=document.createElement('div');c.className='caja';UI.appendChild(c);}c.innerHTML=html;return c;}
async function bien(et){if(Math.random()<0.6)await karlos(rnd(et.bien));}
function temporizador(el,ms,onFin){const t0=performance.now();let id=setInterval(()=>{const f=1-(performance.now()-t0)/ms;el.style.width=Math.max(0,f*100)+'%';if(f<=0){clearInterval(id);onFin();}},50);return()=>clearInterval(id);}
function pasoIng(rec){return new Promise(res=>{const ops=baraja([...rec.ing,...rec.no]);const c=cajaUI(`<h3>🧺 ¿Qué ingredientes lleva? Toca los ${rec.ing.length} correctos</h3><div class="ops">${ops.map(o=>`<button class="op2">${o}</button>`).join('')}</div><div class="tiempo"></div>`);let ok=0,mal=0,hecho=false;
  const fin=()=>{if(hecho)return;hecho=true;stop();c.querySelectorAll('.op2').forEach(b=>{b.disabled=true;if(rec.ing.includes(b.textContent))b.classList.add('ok');});setTimeout(()=>res({ok,mal,pts:Math.max(0,ok*50-mal*25)}),1300);};
  const stop=temporizador(c.querySelector('.tiempo'),20000,fin);
  c.querySelectorAll('.op2').forEach(b=>b.onclick=()=>{if(b.disabled)return;b.disabled=true;if(rec.ing.includes(b.textContent)){b.classList.add('ok');ok++;suma(50);if(ok===rec.ing.length)fin();}else{b.classList.add('ko');mal++;suma(-25);}});});}
function pasoCortar(rec){return new Promise(res=>{vista('manos');const N=10;const c=cajaUI(`<h3>🔪 Corta ${rec.cortar}: toca ${N} veces</h3><div class="plato" id="tj">🔪 0/${N}</div><button class="btnR" id="ct">¡CORTA!</button><div class="tiempo"></div>`);let n=0,hecho=false;
  const fin=()=>{if(hecho)return;hecho=true;stop();setTimeout(()=>res({ok:n>=N,pts:n>=N?150:n*10}),600);};const stop=temporizador(c.querySelector('.tiempo'),6000,fin);
  $('#ct').onclick=()=>{n++;$('#tj').textContent=`🔪 ${n}/${N}`;suma(10);if(host)host.rotation.x=0.04*(n%2);if(n>=N){suma(50);fin();}};});}
function pasoOrden(rec){return new Promise(res=>{vista('karlos');const ops=baraja(rec.orden);const c=cajaUI(`<h3>📋 Toca los pasos en orden</h3><div class="ops">${ops.map(o=>`<button class="op2">${o}</button>`).join('')}</div>`);let k=0,mal=0;
  c.querySelectorAll('.op2').forEach(b=>b.onclick=()=>{if(b.disabled)return;if(b.textContent===rec.orden[k]){b.disabled=true;b.classList.add('ok');b.textContent=(k+1)+'. '+b.textContent;k++;suma(40);if(k===rec.orden.length)setTimeout(()=>res({ok:mal===0,pts:0}),900);}else{b.classList.add('ko');mal++;suma(-10);setTimeout(()=>b.classList.remove('ko'),500);}});});}
function pasoPunto(rec){return new Promise(res=>{vista('manos');const c=cajaUI(`<h3>⏱ ${rec.punto}: para la aguja en la zona verde</h3><div class="barT"><div class="ag"></div></div><button class="btnR" id="pp">¡YA!</button>`);const ag=c.querySelector('.ag');let x=0,dir=1,vivo=true;const t0=performance.now();
  const mv=()=>{if(!vivo)return;const t=(performance.now()-t0)/1000;x=(Math.sin(t*2.4)+1)/2;ag.style.left=`calc(${x*100}% - 3px)`;requestAnimationFrame(mv);};mv();
  $('#pp').onclick=()=>{if(!vivo)return;vivo=false;const ok=x>=0.42&&x<=0.62;const pts=ok?150:(Math.abs(x-0.52)<0.2?50:0);suma(pts);c.querySelector('h3').textContent=ok?'¡En su punto!':x<0.42?'Le faltaba un poco…':'¡Se ha pasado!';setTimeout(()=>res({ok,pts}),1100);};});}
function pasoQuiz(q){return new Promise(res=>{vista('karlos');const ops=baraja([q.a,...q.o]);const c=cajaUI(`<h3>❓ ${q.q}</h3><div class="ops">${ops.map(o=>`<button class="op2">${o}</button>`).join('')}</div><div class="tiempo"></div>`);let hecho=false;
  const fin=(b)=>{if(hecho)return;hecho=true;stop();const ok=b&&b.textContent===q.a;c.querySelectorAll('.op2').forEach(x=>{x.disabled=true;if(x.textContent===q.a)x.classList.add('ok');});if(b&&!ok)b.classList.add('ko');if(ok)suma(100);setTimeout(()=>res({ok}),1300);};
  const stop=temporizador(c.querySelector('.tiempo'),15000,()=>fin(null));c.querySelectorAll('.op2').forEach(b=>b.onclick=()=>fin(b));});}
let quizUsadas=[];function nuevaQ(){if(quizUsadas.length>=QUIZ.length-2)quizUsadas=[];let i;do{i=Math.floor(Math.random()*QUIZ.length);}while(quizUsadas.includes(i));quizUsadas.push(i);return QUIZ[i];}
async function programa(et,dia,k){puntos=0;construyeSet(et,'lamparas');const rid=et.recetas[k%et.recetas.length];const rec=REC[rid];aplicaPlato(rid);
  if(A.cabecera)await cabecera(et);
  const hostId=(et.id==='a3_2019'&&dia==='Viernes')?'joseba':'karlos';ponHost(hostId);ponInvitado(null);musica(et.musica,true,.3);
  hud(et,rec);const b=botonSaltar();b.textContent='Menú ✖';b.onclick=()=>{saltar=true;cortaVoz();sessionStorage.setItem('kar_menu','1');location.reload();};
  const rt=document.createElement('div');rt.className='rotulo';rt.textContent=`${dia} · ${rec.n}`;UI.appendChild(rt);
  await tomaGrua('abrir',5000);await tomaGrua('acercar',5500);if(hostId==='karlos'){vista('karlos');await karlos(et.saludo);if(rec.hoy&&hay(rec.hoy))await karlos(rec.hoy);await kr('k_vamos','k_vamos2','k_vamos3','k_vamos13');}else{vista('karlos');await clip('c_joseba','Joseba (TTS)');}
  rt.remove();vista('lateral');const K=hostId==='karlos';
  if(K)await kr('k_ingr_sencillos','k_ingr_mirad');let r=await pasoIng(rec);if(r.ok===rec.ing.length&&!r.mal)await bien(et);
  cajaFuera();const tv=travelling(-1.2,4000);if(K)await kr('k_cortar_brunoise','k_cortar_rodajas','k_cortar_cebolleta','k_daditos');await tv;r=await pasoCortar(rec);if(r.ok)await bien(et);
  cajaFuera();const tv2=travelling(0.1,4000);if(K)await kr('k_rehogar','k_dorar','k_fuego99','k_sal_pizquita','k_sal_olla','k_rehogar_rico');await tv2;if(K&&Math.random()<0.5){await tomaGrua('bajo');await kr('k_chiste_cigarro','k_chiste_ca');}r=await pasoOrden(rec);if(r.ok)await bien(et);
  cajaFuera();await tomaGrua('acercar',4500);if(K){const pt=rec.punto.toLowerCase();await kr(/horno/.test(pt)?['k_horno_meto','k_horno_precalentado','k_horno_cecina']:/fre[ií]r|fritu/.test(pt)?['k_freir_guindillas','k_freir_costrones']:['k_fuego_suave','k_vapor','k_hierva15']);}r=await pasoPunto(rec);if(r.ok)await bien(et);
  cajaFuera();const cz=tomaGrua('cenital');if(K){await kr('k_perejil','k_perejil_picadito','k_perejil04');await kr('k_rico_queRico','k_rico_muyRico','k_rehogar_rico','k_sabrosas','k_quebueno');}await cz;
  r=await pasoQuiz(nuevaQ());if(r.ok)await bien(et);
  const cid=colabDia(et,dia);
  if(cid&&!(cid==='joseba'&&hostId==='joseba')){const C=COLAB[cid],cr=REC[C.receta];ponInvitado(cid);vista('dos');hud(et,cr);const cl=document.createElement('div');cl.className='colab';cl.textContent=`${C.nombre} · ${C.papel} (voz sintética)`;UI.appendChild(cl);
    if(cid==='ainhoa'&&hay('k_hola_ainhoa')&&et.id==='a3_2010')await karlos('k_hola_ainhoa');if(cid==='ainhoa'&&window.ACLIPS){await clip(rnd(Object.keys(window.ACLIPS)),'Ainhoa',null);}else await clip(C.voz,C.nombre.split(' ')[0]+' (TTS)');if(cid==='eva'&&et.bien.includes('k_muybieneva')){}
    r=await pasoIng(cr);r=await pasoPunto(cr);if(r.ok&&cid==='eva'&&et.bien.includes('k_muybieneva'))await karlos('k_muybieneva');r=await pasoQuiz(nuevaQ());}
  r=await pasoQuiz(nuevaQ());
  // final
  UI.innerHTML='';tomaGrua('abrir');EST.mejor[et.id]=Math.max(EST.mejor[et.id]||0,puntos);EST.total=(EST.total||0)+puntos;guardaE();
  UI.innerHTML=`<div class="caja"><h3>${rec.em} ¡Plato terminado!</h3><div class="plato">${puntos} puntos</div><div>Récord de la etapa: ${EST.mejor[et.id]}</div><button class="btnR" id="sg">Otro día</button> <button class="btnR" id="mn">Menú</button></div>`;
  $('#sg').onclick=()=>{cortaVoz();paraMusica();Lt('dia');};$('#mn').onclick=()=>{cortaVoz();paraMusica();menu();};
  if(hostId==='karlos'){if(et.id==='a3_2010'&&hay('k_hasta_manana_a3'))await karlos('k_hasta_manana_a3');else{await karlos('k_despedida');if(et.id==='a3_2019')await karlos('k_manana');}}
  if(et.id==='a3_2019'&&A.musica){musica('snd/despedida_cancion.ogg',false,.8);}}
window.__k={sinOrbita:()=>{orbita=false;},programa,historia,cabecera,menu,Lt,vista,construyeSet,aplicaPlato,ponHost,ponInvitado,ETAPAS,pasoIng,pasoCortar,pasoOrden,pasoPunto,pasoQuiz,hud,A,luces};
document.fonts.load('40px Logo').catch(()=>{}).finally(()=>{ajustaTam();construyeSet(ETAPAS[2],'lamparas');aplicaPlato('alubias');ponHost('karlos');vista('general',true);requestAnimationFrame(loop);menu();});
