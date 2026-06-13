'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  preset: any;
  bpm: number | null;
  time: number;
  width: number;
  height: number;
}

function lerpArray(current: Float32Array, target: Uint8Array, factor: number): void {
  for (let i = 0; i < current.length; i++) {
    current[i] += (target[i] - current[i]) * factor;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16) || 0;
  const g = parseInt(cleaned.slice(2, 4), 16) || 0;
  const b = parseInt(cleaned.slice(4, 6), 16) || 0;
  return [r, g, b];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function makeGradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, colors: string[]): CanvasGradient {
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  colors.forEach((c, i) => grad.addColorStop(i / Math.max(colors.length - 1, 1), c));
  return grad;
}

interface CanvasState {
  smoothFreq: Float32Array;
  smoothTime: Float32Array;
  peaks: Float32Array;
  peakVelocity: Float32Array;
  particles: Particle[];
  trailCanvas: HTMLCanvasElement | null;
  time: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  hue: number;
}

const stateMap = new WeakMap<HTMLCanvasElement, CanvasState>();

function getState(canvas: HTMLCanvasElement, freqLen: number): CanvasState {
  if (!stateMap.has(canvas)) {
    stateMap.set(canvas, {
      smoothFreq: new Float32Array(freqLen),
      smoothTime: new Float32Array(freqLen),
      peaks: new Float32Array(freqLen),
      peakVelocity: new Float32Array(freqLen),
      particles: [],
      trailCanvas: null,
      time: 0,
    });
  }
  const s = stateMap.get(canvas)!;
  if (s.smoothFreq.length !== freqLen) {
    s.smoothFreq = new Float32Array(freqLen);
    s.smoothTime = new Float32Array(freqLen);
    s.peaks = new Float32Array(freqLen);
    s.peakVelocity = new Float32Array(freqLen);
  }
  return s;
}

function renderBars(opts: RenderOptions) {
  const { canvas, frequencyData, preset, width, height } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { colors } = preset.config;
  const state = getState(canvas, frequencyData.length);
  lerpArray(state.smoothFreq, frequencyData, 0.25);
  for (let i = 0; i < state.peaks.length; i++) {
    if (state.smoothFreq[i] > state.peaks[i]) { state.peaks[i] = state.smoothFreq[i]; state.peakVelocity[i] = 0; }
    else { state.peakVelocity[i] += 0.4; state.peaks[i] = Math.max(0, state.peaks[i] - state.peakVelocity[i]); }
  }
  const barCount = Math.min(frequencyData.length, 80);
  const totalBarW = width / barCount;
  const barWidth = totalBarW * 0.7;
  const gap = totalBarW * 0.3;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < barCount; i++) {
    const norm = state.smoothFreq[i] / 255;
    const barH = norm * height * 0.85;
    const x = i * totalBarW + gap / 2;
    const y = height - barH;
    const t = i / (barCount - 1);
    const ci = Math.floor(t * (colors.length - 1));
    const ci2 = Math.min(ci + 1, colors.length - 1);
    const tl = t * (colors.length - 1) - ci;
    const [r1,g1,b1] = hexToRgb(colors[ci]);
    const [r2,g2,b2] = hexToRgb(colors[ci2]);
    const r=Math.round(r1+(r2-r1)*tl),g=Math.round(g1+(g2-g1)*tl),b=Math.round(b1+(b2-b1)*tl);
    const cs = `rgb(${r},${g},${b})`;
    const bg = ctx.createLinearGradient(x,y,x,height);
    bg.addColorStop(0,`rgba(${r},${g},${b},1)`);
    bg.addColorStop(0.6,`rgba(${r},${g},${b},0.7)`);
    bg.addColorStop(1,`rgba(${r},${g},${b},0.15)`);
    ctx.fillStyle = bg; ctx.shadowBlur = 18+norm*20; ctx.shadowColor = cs;
    ctx.beginPath();
    if (barH > barWidth/2) ctx.roundRect(x,y,barWidth,barH,[barWidth/2,barWidth/2,2,2]);
    else ctx.rect(x,y,barWidth,Math.max(barH,1));
    ctx.fill();
    const rg = ctx.createLinearGradient(x,height,x,height+barH*0.35);
    rg.addColorStop(0,`rgba(${r},${g},${b},0.18)`);
    rg.addColorStop(1,`rgba(${r},${g},${b},0)`);
    ctx.fillStyle=rg; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.rect(x,height,barWidth,barH*0.35); ctx.fill();
    if (state.peaks[i] > 2) {
      const py = height - state.peaks[i]/255*height*0.85-3;
      ctx.fillStyle=`rgba(${r},${g},${b},0.9)`; ctx.shadowBlur=12; ctx.shadowColor=cs;
      ctx.beginPath(); ctx.arc(x+barWidth/2,py,2.5,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.shadowBlur=0;
}

function renderBarsReflective(opts: RenderOptions) {
  const { canvas, frequencyData, preset, width, height } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { colors } = preset.config;
  const state = getState(canvas, frequencyData.length);
  lerpArray(state.smoothFreq, frequencyData, 0.2);
  const barCount = Math.min(frequencyData.length, 72);
  const totalBarW = width / barCount;
  const barWidth = totalBarW * 0.65;
  const midY = height / 2;
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(0,0,width,height);
  const lg = makeGradient(ctx,0,midY,width,midY,colors);
  ctx.strokeStyle=lg; ctx.lineWidth=1; ctx.globalAlpha=0.3;
  ctx.beginPath(); ctx.moveTo(0,midY); ctx.lineTo(width,midY); ctx.stroke();
  ctx.globalAlpha=1;
  for (let i = 0; i < barCount; i++) {
    const norm=state.smoothFreq[i]/255, halfH=norm*midY*0.9;
    const x=i*totalBarW+(totalBarW-barWidth)/2;
    const t=i/(barCount-1);
    const ci=Math.floor(t*(colors.length-1)),ci2=Math.min(ci+1,colors.length-1);
    const tl=t*(colors.length-1)-ci;
    const [r1,g1,b1]=hexToRgb(colors[ci]),[r2,g2,b2]=hexToRgb(colors[ci2]);
    const r=Math.round(r1+(r2-r1)*tl),g=Math.round(g1+(g2-g1)*tl),b=Math.round(b1+(b2-b1)*tl);
    const tg=ctx.createLinearGradient(x,midY-halfH,x,midY);
    tg.addColorStop(0,`rgba(${r},${g},${b},0.9)`); tg.addColorStop(1,`rgba(${r},${g},${b},0.2)`);
    ctx.fillStyle=tg; ctx.shadowBlur=16+norm*16; ctx.shadowColor=`rgb(${r},${g},${b})`;
    if(halfH>2){ctx.beginPath();ctx.roundRect(x,midY-halfH,barWidth,halfH,[barWidth/2,barWidth/2,0,0]);ctx.fill();}
    const bg2=ctx.createLinearGradient(x,midY,x,midY+halfH);
    bg2.addColorStop(0,`rgba(${r},${g},${b},0.2)`); bg2.addColorStop(1,`rgba(${r},${g},${b},0.9)`);
    ctx.fillStyle=bg2; ctx.shadowBlur=0;
    if(halfH>2){ctx.beginPath();ctx.roundRect(x,midY,barWidth,halfH,[0,0,barWidth/2,barWidth/2]);ctx.fill();}
  }
  ctx.shadowBlur=0; ctx.globalAlpha=1;
}

function renderWave(opts: RenderOptions) {
  const { canvas, timeDomainData, frequencyData, preset, width, height } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { colors } = preset.config;
  const state = getState(canvas, timeDomainData.length);
  lerpArray(state.smoothTime, timeDomainData, 0.3);
  const bassEnd=Math.floor(frequencyData.length*0.1);
  let bassSum=0; for(let i=0;i<bassEnd;i++) bassSum+=frequencyData[i];
  const bassNorm=bassSum/bassEnd/255;
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(0,0,width,height);
  const midY=height/2, amp=0.3+bassNorm*0.2;
  const pts:[number,number][]=[];
  const step=width/127;
  for(let i=0;i<128;i++){
    const idx=Math.floor(i*state.smoothTime.length/128);
    pts.push([i*step,midY+((state.smoothTime[idx]-128)/128)*height*amp]);
  }
  function drawPath(){
    ctx!.beginPath(); ctx!.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length-2;i++){
      const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;
      ctx!.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);
    }
    ctx!.quadraticCurveTo(pts[pts.length-2][0],pts[pts.length-2][1],pts[pts.length-1][0],pts[pts.length-1][1]);
  }
  const sg=makeGradient(ctx,0,0,width,0,colors);
  for(const l of [{blur:40,alpha:0.15,lw:16},{blur:20,alpha:0.3,lw:8},{blur:8,alpha:0.6,lw:4},{blur:2,alpha:1,lw:2}]){
    drawPath(); ctx.strokeStyle=sg; ctx.lineWidth=l.lw; ctx.globalAlpha=l.alpha; ctx.shadowBlur=l.blur; ctx.shadowColor=colors[0]; ctx.stroke();
  }
  ctx.globalAlpha=1; ctx.shadowBlur=0;
  ctx.beginPath(); ctx.moveTo(0,height); for(const [x,y] of pts) ctx.lineTo(x,y); ctx.lineTo(width,height); ctx.closePath();
  const fg=ctx.createLinearGradient(0,midY-height*amp,0,height);
  fg.addColorStop(0,colors[0]+'44'); fg.addColorStop(0.5,colors[1]+'11'); fg.addColorStop(1,'transparent');
  ctx.fillStyle=fg; ctx.globalAlpha=0.5; ctx.fill(); ctx.globalAlpha=1;
}

function renderGlowWave(opts: RenderOptions) {
  const { canvas, timeDomainData, frequencyData, preset, width, height, time } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { colors } = preset.config;
  const state = getState(canvas, timeDomainData.length);
  lerpArray(state.smoothTime, timeDomainData, 0.15);
  const bassEnd=Math.floor(frequencyData.length*0.1);
  let bassSum=0; for(let i=0;i<bassEnd;i++) bassSum+=frequencyData[i];
  const bassNorm=Math.min(bassSum/bassEnd/255,1);
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(0,0,width,height);
  const midY=height/2, t=time*0.0003;
  for(let layer=0;layer<4;layer++){
    const lo=(layer-1.5)*height*0.08, lc=colors[layer%colors.length];
    const amp=(0.2+bassNorm*0.25)*(1-layer*0.15);
    const pts:[number,number][]=[];
    for(let i=0;i<128;i++){
      const idx=Math.floor(i*state.smoothTime.length/128);
      const wv=((state.smoothTime[idx]-128)/128)*height*amp;
      const wob=Math.sin(i*0.05+t+layer*0.8)*height*0.015;
      pts.push([i*(width/127),midY+lo+wv+wob]);
    }
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length-2;i++){
      const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;
      ctx.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);
    }
    ctx.quadraticCurveTo(pts[pts.length-2][0],pts[pts.length-2][1],pts[pts.length-1][0],pts[pts.length-1][1]);
    ctx.strokeStyle=lc; ctx.lineWidth=3-layer*0.5; ctx.shadowBlur=30+layer*10; ctx.shadowColor=lc; ctx.globalAlpha=0.7-layer*0.1; ctx.stroke();
  }
  ctx.shadowBlur=0; ctx.globalAlpha=1;
}

function renderCircular(opts: RenderOptions) {
  const { canvas, frequencyData, timeDomainData, preset, width, height, time } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { colors } = preset.config;
  const state = getState(canvas, frequencyData.length);
  lerpArray(state.smoothFreq, frequencyData, 0.2);
  lerpArray(state.smoothTime, timeDomainData, 0.2);
  const t=time*0.0002, cx=width/2, cy=height/2, baseR=Math.min(width,height)*0.28;
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(0,0,width,height);
  const bassEnd=Math.floor(frequencyData.length*0.12);
  let bassSum=0; for(let i=0;i<bassEnd;i++) bassSum+=state.smoothFreq[i];
  const bassNorm=bassSum/bassEnd/255, pulseR=baseR+bassNorm*baseR*0.18;
  const ig=ctx.createRadialGradient(cx,cy,pulseR*0.1,cx,cy,pulseR);
  ig.addColorStop(0,colors[0]+'22'); ig.addColorStop(0.7,colors[1]+'11'); ig.addColorStop(1,'transparent');
  ctx.fillStyle=ig; ctx.beginPath(); ctx.arc(cx,cy,pulseR,0,Math.PI*2); ctx.fill();
  const ringPts:[number,number][]=[];
  for(let i=0;i<256;i++){
    const angle=(i/256)*Math.PI*2-Math.PI/2;
    const idx=Math.floor(i*state.smoothTime.length/256);
    const wv=((state.smoothTime[idx]-128)/128)*pulseR*0.25;
    ringPts.push([cx+Math.cos(angle)*(pulseR+wv),cy+Math.sin(angle)*(pulseR+wv)]);
  }
  ctx.beginPath(); ctx.moveTo(ringPts[0][0],ringPts[0][1]);
  for(let i=1;i<ringPts.length;i++){
    const mx=(ringPts[i][0]+ringPts[(i+1)%ringPts.length][0])/2;
    const my=(ringPts[i][1]+ringPts[(i+1)%ringPts.length][1])/2;
    ctx.quadraticCurveTo(ringPts[i][0],ringPts[i][1],mx,my);
  }
  ctx.closePath();
  ctx.strokeStyle=makeGradient(ctx,cx-pulseR,cy,cx+pulseR,cy,colors);
  ctx.lineWidth=2.5; ctx.shadowBlur=20; ctx.shadowColor=colors[0]; ctx.stroke();
  const barCount=Math.min(state.smoothFreq.length,120);
  for(let i=0;i<barCount;i++){
    const angle=(i/barCount)*Math.PI*2-Math.PI/2+t;
    const norm=state.smoothFreq[i]/255, spikeLen=norm*pulseR*0.9;
    const color=colors[Math.floor((i/barCount)*(colors.length-1))]||colors[0];
    const [r,g,b]=hexToRgb(color);
    const x1=cx+Math.cos(angle)*(pulseR+3),y1=cy+Math.sin(angle)*(pulseR+3);
    const x2=cx+Math.cos(angle)*(pulseR+3+spikeLen),y2=cy+Math.sin(angle)*(pulseR+3+spikeLen);
    const sg=ctx.createLinearGradient(x1,y1,x2,y2);
    sg.addColorStop(0,`rgba(${r},${g},${b},0.9)`); sg.addColorStop(1,`rgba(${r},${g},${b},0)`);
    ctx.strokeStyle=sg; ctx.lineWidth=2.5*norm+0.5; ctx.shadowBlur=10+norm*15; ctx.shadowColor=color;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }
  ctx.shadowBlur=0;
}

function renderParticles(opts: RenderOptions) {
  const { canvas, frequencyData, preset, width, height } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { colors } = preset.config;
  const state = getState(canvas, frequencyData.length);
  lerpArray(state.smoothFreq, frequencyData, 0.25);
  const cx=width/2, cy=height/2, baseR=Math.min(width,height)*0.22;
  const bassEnd=Math.floor(frequencyData.length*0.12);
  let bassSum=0; for(let i=0;i<bassEnd;i++) bassSum+=state.smoothFreq[i];
  const bassNorm=bassSum/bassEnd/255;
  let totalE=0; for(let i=0;i<state.smoothFreq.length;i++) totalE+=state.smoothFreq[i];
  const energyNorm=totalE/state.smoothFreq.length/255;
  const dynamicR=baseR+bassNorm*baseR*0.3;
  ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(0,0,width,height);
  if(energyNorm>0.2 && state.particles.length<200){
    for(let i=0;i<Math.ceil(energyNorm*6);i++){
      const angle=Math.random()*Math.PI*2, speed=0.8+Math.random()*4+bassNorm*6;
      const life=60+Math.random()*120, color=colors[Math.floor(Math.random()*colors.length)];
      const [r,g,b]=hexToRgb(color), [h]=rgbToHsl(r,g,b);
      state.particles.push({x:cx+Math.cos(angle)*dynamicR*(0.5+Math.random()*0.5),y:cy+Math.sin(angle)*dynamicR*(0.5+Math.random()*0.5),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,maxLife:life,size:1.5+Math.random()*3+bassNorm*3,color,hue:h});
    }
  }
  state.particles=state.particles.filter(p=>p.life>0);
  for(const p of state.particles){
    const lf=p.life/p.maxLife;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*lf,0,Math.PI*2);
    ctx.fillStyle=`hsla(${p.hue+(1-lf)*60},90%,65%,${lf*lf})`;
    ctx.shadowBlur=15*lf; ctx.shadowColor=p.color; ctx.fill();
    p.x+=p.vx; p.y+=p.vy; p.vx*=0.97; p.vy*=0.97; p.life--;
  }
  ctx.shadowBlur=0;
  const barCount=Math.min(state.smoothFreq.length,128);
  for(let i=0;i<barCount;i++){
    const angle=(i/barCount)*Math.PI*2-Math.PI/2, norm=state.smoothFreq[i]/255;
    const color=colors[Math.floor((i/barCount)*(colors.length-1))]||colors[0];
    const [r,g,b]=hexToRgb(color);
    const x1=cx+Math.cos(angle)*dynamicR,y1=cy+Math.sin(angle)*dynamicR;
    const x2=cx+Math.cos(angle)*(dynamicR+norm*dynamicR*0.7),y2=cy+Math.sin(angle)*(dynamicR+norm*dynamicR*0.7);
    const sg=ctx.createLinearGradient(x1,y1,x2,y2);
    sg.addColorStop(0,`rgba(${r},${g},${b},0.8)`); sg.addColorStop(1,`rgba(${r},${g},${b},0)`);
    ctx.strokeStyle=sg; ctx.lineWidth=1.5+norm*2; ctx.shadowBlur=8+norm*12; ctx.shadowColor=color;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }
  ctx.shadowBlur=0;
}

interface Star { x:number; y:number; r:number; speed:number; hue:number; }
const starFields = new WeakMap<HTMLCanvasElement, Star[]>();
function getStars(canvas:HTMLCanvasElement,w:number,h:number):Star[]{
  if(!starFields.has(canvas)){
    const stars:Star[]=[];
    for(let i=0;i<200;i++) stars.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.5+0.3,speed:Math.random()*0.3+0.05,hue:Math.random()*360});
    starFields.set(canvas,stars);
  }
  return starFields.get(canvas)!;
}

function renderNebula(opts: RenderOptions) {
  const { canvas, frequencyData, timeDomainData, preset, width, height, time } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { colors } = preset.config;
  const state = getState(canvas, frequencyData.length);
  lerpArray(state.smoothFreq, frequencyData, 0.18);
  lerpArray(state.smoothTime, timeDomainData, 0.18);
  const t=time*0.0001, cx=width/2, cy=height/2;
  const bassEnd=Math.floor(frequencyData.length*0.1);
  let bassSum=0; for(let i=0;i<bassEnd;i++) bassSum+=state.smoothFreq[i];
  const bassNorm=bassSum/bassEnd/255;
  ctx.fillStyle='rgba(0,0,5,0.25)'; ctx.fillRect(0,0,width,height);
  const stars=getStars(canvas,width,height);
  for(const star of stars){
    const p=0.5+bassNorm*0.5;
    ctx.fillStyle=`hsla(${star.hue},80%,80%,${0.5+p*0.5})`; ctx.shadowBlur=bassNorm*6; ctx.shadowColor=`hsl(${star.hue},80%,80%)`;
    ctx.beginPath(); ctx.arc(star.x,star.y,star.r*p,0,Math.PI*2); ctx.fill();
    star.x-=star.speed; if(star.x<0){star.x=width;star.y=Math.random()*height;}
  }
  ctx.shadowBlur=0;
  for(let cloud=0;cloud<3;cloud++){
    const cx2=cx+Math.sin(t+cloud*2.1)*width*0.2, cy2=cy+Math.cos(t*0.7+cloud*1.4)*height*0.15;
    const rad=(0.15+bassNorm*0.06)*Math.min(width,height)+cloud*20;
    const color=colors[cloud%colors.length]; const [r,g,b]=hexToRgb(color);
    const ng=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,rad);
    ng.addColorStop(0,`rgba(${r},${g},${b},${0.12+bassNorm*0.1})`); ng.addColorStop(0.5,`rgba(${r},${g},${b},0.04)`); ng.addColorStop(1,'transparent');
    ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(cx2,cy2,rad,0,Math.PI*2); ctx.fill();
  }
  for(let ri=0;ri<5;ri++){
    const fs=Math.floor((ri/5)*state.smoothFreq.length), fe=Math.floor(((ri+1)/5)*state.smoothFreq.length);
    let sum=0; for(let i=fs;i<fe;i++) sum+=state.smoothFreq[i];
    const norm=sum/(fe-fs)/255, ringR=Math.min(width,height)*(0.08+ri*0.07)+norm*30;
    const color=colors[ri%colors.length]; const [r,g,b]=hexToRgb(color);
    ctx.strokeStyle=`rgba(${r},${g},${b},${0.15+norm*0.5})`; ctx.lineWidth=1.5+norm*3; ctx.shadowBlur=20+norm*30; ctx.shadowColor=color;
    ctx.beginPath(); ctx.arc(cx,cy,ringR,0,Math.PI*2); ctx.stroke();
  }
  ctx.shadowBlur=0;
  const innerR=Math.min(width,height)*0.06;
  ctx.beginPath();
  for(let i=0;i<=256;i++){
    const angle=(i/256)*Math.PI*2-Math.PI/2;
    const idx=Math.floor(i*state.smoothTime.length/256);
    const wv=((state.smoothTime[idx]-128)/128)*innerR*1.5;
    const px=cx+Math.cos(angle)*(innerR+wv), py=cy+Math.sin(angle)*(innerR+wv);
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.strokeStyle=makeGradient(ctx,cx-innerR,cy,cx+innerR,cy,colors);
  ctx.lineWidth=2; ctx.shadowBlur=15; ctx.shadowColor=colors[0]; ctx.stroke(); ctx.shadowBlur=0;
}

function renderOscilloscope(opts: RenderOptions) {
  const { canvas, timeDomainData, frequencyData, preset, width, height, time } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { colors } = preset.config;
  const state = getState(canvas, timeDomainData.length);
  lerpArray(state.smoothTime, timeDomainData, 0.35);
  const bassEnd=Math.floor(frequencyData.length*0.1);
  let bassSum=0; for(let i=0;i<bassEnd;i++) bassSum+=frequencyData[i];
  const bassNorm=bassSum/bassEnd/255;
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(0,0,width,height);
  const cx=width/2, cy=height/2, t=time*0.001;
  const n=Math.min(state.smoothTime.length,512), halfAmp=Math.min(width,height)*0.45;
  const offset=Math.floor(n*0.25);
  const pts:[number,number][]=[];
  for(let i=0;i<n;i++){
    const xv=(state.smoothTime[i]-128)/128, yv=(state.smoothTime[(i+offset)%n]-128)/128;
    const cosT=Math.cos(t*0.15), sinT=Math.sin(t*0.15);
    pts.push([cx+(xv*cosT-yv*sinT)*halfAmp, cy+(xv*sinT+yv*cosT)*halfAmp]);
  }
  for(let i=1;i<pts.length;i++){
    const frac=i/pts.length, ci=Math.floor(frac*(colors.length-1)), ci2=Math.min(ci+1,colors.length-1);
    const tl=frac*(colors.length-1)-ci;
    const [r1,g1,b1]=hexToRgb(colors[ci]),[r2,g2,b2]=hexToRgb(colors[ci2]);
    const r=Math.round(r1+(r2-r1)*tl),g=Math.round(g1+(g2-g1)*tl),b=Math.round(b1+(b2-b1)*tl);
    ctx.strokeStyle=`rgba(${r},${g},${b},0.85)`; ctx.lineWidth=1.5+bassNorm*1.5; ctx.shadowBlur=8+bassNorm*12; ctx.shadowColor=`rgb(${r},${g},${b})`;
    ctx.beginPath(); ctx.moveTo(pts[i-1][0],pts[i-1][1]); ctx.lineTo(pts[i][0],pts[i][1]); ctx.stroke();
  }
  ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  for(let i=1;i<4;i++){
    ctx.beginPath(); ctx.moveTo(width*i/4,0); ctx.lineTo(width*i/4,height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,height*i/4); ctx.lineTo(width,height*i/4); ctx.stroke();
  }
}

interface VinylState {
  smoothFreq: Float32Array;
  smoothedBands: Float32Array;
  rotation: number;
  lastRenderTime: number;
  labelImg: HTMLImageElement | null;
  labelImgSrc: string | null;
}
const vinylStateMap = new WeakMap<HTMLCanvasElement, VinylState>();
function getVinylState(canvas: HTMLCanvasElement, freqLen: number): VinylState {
  if (!vinylStateMap.has(canvas)) {
    vinylStateMap.set(canvas, { smoothFreq: new Float32Array(freqLen), smoothedBands: new Float32Array(32), rotation: 0, lastRenderTime: performance.now(), labelImg: null, labelImgSrc: null });
  }
  const s = vinylStateMap.get(canvas)!;
  if (s.smoothFreq.length !== freqLen) s.smoothFreq = new Float32Array(freqLen);
  return s;
}

function renderVinyl(opts: RenderOptions) {
  const { canvas, frequencyData, preset, width, height, time } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { colors } = preset.config;
  const vs = getVinylState(canvas, frequencyData.length);

  for (let i = 0; i < vs.smoothFreq.length; i++) vs.smoothFreq[i] += (frequencyData[i] - vs.smoothFreq[i]) * 0.2;

  const BAND_COUNT = 32;
  const bStep = Math.floor(frequencyData.length / BAND_COUNT);
  for (let b = 0; b < BAND_COUNT; b++) {
    let sum = 0; const start = b * bStep;
    for (let i = start; i < start + bStep && i < frequencyData.length; i++) sum += frequencyData[i];
    vs.smoothedBands[b] += (sum / bStep / 255 - vs.smoothedBands[b]) * 0.15;
  }

  const elapsed = Math.min((time - vs.lastRenderTime) / 1000, 0.1);
  vs.lastRenderTime = time;
  let totalE = 0; for (let i = 0; i < frequencyData.length; i++) totalE += frequencyData[i];
  const energyNorm = Math.min(totalE / frequencyData.length / 255, 1);
  vs.rotation += (33.33 * (0.5 + energyNorm * 0.8) / 60) * 360 * elapsed;
  if (vs.rotation >= 360) vs.rotation -= 360;

  const bassEnd = Math.floor(frequencyData.length * 0.1);
  let bassSum = 0; for (let i = 0; i < bassEnd; i++) bassSum += frequencyData[i];
  const bassNorm = Math.min(bassSum / bassEnd / 255, 1);

  const cx = width / 2, cy = height / 2;
  const maxR = Math.min(width, height) * 0.44;
  const grooveInnerR = maxR * 0.40, grooveOuterR = maxR * 0.83;
  const labelR = maxR * 0.35, spindleR = maxR * 0.025;

  ctx.fillStyle = 'rgba(6,6,18,0.5)'; ctx.fillRect(0, 0, width, height);

  const ag = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.4);
  ag.addColorStop(0, colors[0] + '15'); ag.addColorStop(0.6, colors[1] + '08'); ag.addColorStop(1, 'transparent');
  ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, maxR * 1.4, 0, Math.PI * 2); ctx.fill();

  for (let ring = 0; ring < 2; ring++) {
    const alpha = Math.max(0, bassNorm - 0.15 - ring * 0.2) * 0.7;
    if (alpha > 0.01) {
      ctx.strokeStyle = colors[ring % colors.length]; ctx.globalAlpha = alpha;
      ctx.lineWidth = 2 + bassNorm * 4; ctx.shadowBlur = 15 + bassNorm * 20; ctx.shadowColor = colors[ring % colors.length];
      ctx.beginPath(); ctx.arc(cx, cy, maxR + 10 + ring * 18 + bassNorm * (20 + ring * 15), 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;

  ctx.save();
  ctx.translate(cx, cy); ctx.rotate((vs.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);

  const dg = ctx.createRadialGradient(cx - maxR * 0.08, cy - maxR * 0.08, maxR * 0.03, cx, cy, maxR);
  dg.addColorStop(0, '#2e2e2e'); dg.addColorStop(0.15, '#181818'); dg.addColorStop(0.6, '#0f0f0f'); dg.addColorStop(1, '#080808');
  ctx.fillStyle = dg; ctx.shadowBlur = 40; ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, maxR - 1, 0, Math.PI * 2); ctx.stroke();

  for (let g = 0; g < 72; g++) {
    const t2 = g / 72, r2 = grooveInnerR + (grooveOuterR - grooveInnerR) * t2;
    const bandVal = vs.smoothedBands[Math.min(Math.floor(t2 * BAND_COUNT), BAND_COUNT - 1)];
    const ci = Math.floor(t2 * (colors.length - 1)), ci2 = Math.min(ci + 1, colors.length - 1);
    const tl = t2 * (colors.length - 1) - ci;
    const [r1,g1,b1] = hexToRgb(colors[ci]), [r2c,g2c,b2c] = hexToRgb(colors[ci2]);
    const cr=Math.round(r1+(r2c-r1)*tl), cg=Math.round(g1+(g2c-g1)*tl), cb=Math.round(b1+(b2c-b1)*tl);
    ctx.strokeStyle = g%2===0?'rgba(22,22,26,0.9)':'rgba(28,28,32,0.7)'; ctx.lineWidth=0.6;
    ctx.beginPath(); ctx.arc(cx,cy,r2,0,Math.PI*2); ctx.stroke();
    if (bandVal > 0.04) {
      ctx.strokeStyle=`rgba(${cr},${cg},${cb},${Math.min(bandVal*0.65,0.6)})`; ctx.lineWidth=0.8+bandVal;
      ctx.shadowBlur=bandVal*10; ctx.shadowColor=`rgb(${cr},${cg},${cb})`;
      ctx.beginPath(); ctx.arc(cx,cy,r2,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0;
    }
  }

  for (let i = 0; i < 200; i++) {
    const angle = (i/200)*Math.PI*2-Math.PI/2;
    const freqIdx = Math.floor((i/200)*Math.min(frequencyData.length,256)*0.75);
    const norm = vs.smoothFreq[freqIdx] / 255;
    if (norm < 0.015) continue;
    const t3 = i/200, ci = Math.floor(t3*(colors.length-1)), ci2 = Math.min(ci+1,colors.length-1);
    const tl = t3*(colors.length-1)-ci;
    const [r1,g1,b1]=hexToRgb(colors[ci]),[r2c,g2c,b2c]=hexToRgb(colors[ci2]);
    const cr=Math.round(r1+(r2c-r1)*tl),cg=Math.round(g1+(g2c-g1)*tl),cb=Math.round(b1+(b2c-b1)*tl);
    const ie = grooveOuterR+2, bl = norm*(maxR-grooveOuterR-4);
    const x1=cx+Math.cos(angle)*ie, y1=cy+Math.sin(angle)*ie;
    const x2=cx+Math.cos(angle)*(ie+bl), y2=cy+Math.sin(angle)*(ie+bl);
    const bg2=ctx.createLinearGradient(x1,y1,x2,y2);
    bg2.addColorStop(0,`rgba(${cr},${cg},${cb},0.95)`); bg2.addColorStop(0.7,`rgba(${cr},${cg},${cb},0.5)`); bg2.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
    ctx.strokeStyle=bg2; ctx.lineWidth=1.2+norm*1.8; ctx.shadowBlur=5+norm*12; ctx.shadowColor=`rgb(${cr},${cg},${cb})`;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }
  ctx.shadowBlur=0;

  const shine = ctx.createRadialGradient(cx-maxR*0.28,cy-maxR*0.28,0,cx,cy,maxR);
  shine.addColorStop(0,'rgba(255,255,255,0.07)'); shine.addColorStop(0.25,'rgba(255,255,255,0.03)'); shine.addColorStop(0.6,'rgba(0,0,0,0.08)'); shine.addColorStop(1,'rgba(0,0,0,0.25)');
  ctx.fillStyle=shine; ctx.beginPath(); ctx.arc(cx,cy,maxR,0,Math.PI*2); ctx.fill();

  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,labelR,0,Math.PI*2); ctx.clip();
  const labelImgSrc = useStore.getState().vinylLabelImage;
  if (labelImgSrc && vs.labelImgSrc !== labelImgSrc) {
    const img = new Image(); img.onload = () => { vs.labelImg = img; }; img.src = labelImgSrc; vs.labelImgSrc = labelImgSrc;
  }
  if (!labelImgSrc) { vs.labelImg = null; vs.labelImgSrc = null; }

  if (vs.labelImg && vs.labelImgSrc === labelImgSrc && labelImgSrc) {
    ctx.drawImage(vs.labelImg, cx-labelR, cy-labelR, labelR*2, labelR*2);
    const ov=ctx.createRadialGradient(cx,cy,0,cx,cy,labelR);
    ov.addColorStop(0,'rgba(0,0,0,0)'); ov.addColorStop(0.75,'rgba(0,0,0,0.08)'); ov.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle=ov; ctx.fillRect(cx-labelR,cy-labelR,labelR*2,labelR*2);
  } else {
    const tNorm=(time*0.0004)%1, h1=tNorm*360, h2=(h1+140)%360, h3=(h1+260)%360;
    const lg2=ctx.createRadialGradient(cx-labelR*0.2,cy-labelR*0.2,0,cx,cy,labelR);
    lg2.addColorStop(0,`hsl(${h1},75%,45%)`); lg2.addColorStop(0.45,`hsl(${h2},85%,28%)`); lg2.addColorStop(1,`hsl(${h3},65%,15%)`);
    ctx.fillStyle=lg2; ctx.fillRect(cx-labelR,cy-labelR,labelR*2,labelR*2);
    for(let lr=1;lr<=5;lr++){
      ctx.strokeStyle=`rgba(255,255,255,${0.04+lr*0.01})`; ctx.lineWidth=0.6;
      ctx.beginPath(); ctx.arc(cx,cy,labelR*(0.15+lr*0.15),0,Math.PI*2); ctx.stroke();
    }
    const dg2=ctx.createRadialGradient(cx,cy,0,cx,cy,labelR*0.25);
    dg2.addColorStop(0,'rgba(255,255,255,0.15)'); dg2.addColorStop(1,'rgba(0,0,0,0.2)');
    ctx.fillStyle=dg2; ctx.beginPath(); ctx.arc(cx,cy,labelR*0.25,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(cx,cy,labelR,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,labelR+4,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='#080808'; ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(cx,cy,spindleR,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(cx-spindleR*0.3,cy-spindleR*0.3,spindleR*0.5,0,Math.PI*2); ctx.fill();
  ctx.restore();

  const abX=cx+maxR*0.72, abY=cy-maxR*0.82, atX=cx+grooveOuterR*0.65, atY=cy-labelR*1.1;
  ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=8; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(abX+3,abY+3); ctx.quadraticCurveTo(abX-12+3,(atY*0.3+abY*0.7)+3,atX+3,atY+3); ctx.stroke();
  const armG=ctx.createLinearGradient(abX,abY,atX,atY);
  armG.addColorStop(0,'#d8d8d8'); armG.addColorStop(0.4,'#909090'); armG.addColorStop(1,'#606060');
  ctx.strokeStyle=armG; ctx.lineWidth=5;
  ctx.beginPath(); ctx.moveTo(abX,abY); ctx.quadraticCurveTo(abX-12,atY*0.3+abY*0.7,atX,atY); ctx.stroke();
  ctx.save(); ctx.translate(atX,atY); ctx.rotate(Math.atan2(atY-abY,atX-abX)+Math.PI/6);
  ctx.fillStyle='#444'; ctx.strokeStyle='#777'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(-10,-4,20,8,3); ctx.fill(); ctx.stroke(); ctx.restore();
  const pg=ctx.createRadialGradient(abX-4,abY-4,1,abX,abY,12);
  pg.addColorStop(0,'#ffffff'); pg.addColorStop(0.35,'#bbbbbb'); pg.addColorStop(1,'#404040');
  ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(abX,abY,12,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=8+bassNorm*25; ctx.shadowColor=colors[0]; ctx.fillStyle=colors[0]; ctx.globalAlpha=0.35+bassNorm*0.65;
  ctx.beginPath(); ctx.arc(atX,atY,3+bassNorm*5,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.lineCap='butt';
}

const RENDERERS: Record<string, (opts: RenderOptions) => void> = {
  bars: renderBars, 'bars-reflective': renderBarsReflective, wave: renderWave,
  'glow-wave': renderGlowWave, circular: renderCircular, particles: renderParticles,
  nebula: renderNebula, oscilloscope: renderOscilloscope, vinyl: renderVinyl,
};

export function useVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserNode = useStore((state) => state.analyserNode);
  const audioState = useStore((state) => state.audioState);
  const currentPreset = useStore((state) => state.currentPreset);
  const bpm = useStore((state) => state.bpm);

  useEffect(() => {
    if (audioState !== 'ready' || !analyserNode) {
      if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
      return;
    }
    analyserNode.smoothingTimeConstant = currentPreset.config.smoothing ?? 0.8;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bufferLength = analyserNode.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);
    const renderLoop = () => {
      analyserNode.getByteFrequencyData(freqData);
      analyserNode.getByteTimeDomainData(timeData);
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width * dpr, height = rect.height * dpr;
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const style = useStore.getState().currentPreset.config.waveformStyle;
      (RENDERERS[style] || renderBars)({ canvas, frequencyData: freqData, timeDomainData: timeData, preset: useStore.getState().currentPreset, bpm, time: performance.now(), width, height });
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };
    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => { if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; } };
  }, [audioState, analyserNode, currentPreset, bpm]);

  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => { canvasRef.current = node; }, []);
  return { canvasRef: setCanvasRef };
}
