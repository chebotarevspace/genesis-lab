import { COLS, H, W, type World } from './engine';
export function draw(canvas: HTMLCanvasElement, world: World, selected: number | null, showFood: boolean, zoom: number, pan: {x:number;y:number}) {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr); if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle = '#090f16'; ctx.fillRect(0,0,rect.width,rect.height);
  ctx.scale(rect.width / W, rect.height / H); ctx.translate(W/2 + pan.x,H/2 + pan.y); ctx.scale(zoom,zoom); ctx.translate(-W/2,-H/2);
  if (showFood) for (let i=0;i<world.food.length;i++) { const v = world.food[i] / 20; ctx.fillStyle = `rgba(46,190,154,${v * 0.32})`; ctx.fillRect(i % COLS * 16, Math.floor(i / COLS) * 16,16,16); if (world.food[i] > 1.5) { ctx.fillStyle = `rgba(89,213,160,${0.15 + v})`; ctx.fillRect(i % COLS * 16+7,Math.floor(i/COLS)*16+7,1.5,1.5); } }
  ctx.strokeStyle = '#17202c'; ctx.lineWidth = 0.5/zoom; ctx.beginPath(); for(let x=0;x<=W;x+=80){ctx.moveTo(x,0);ctx.lineTo(x,H);}for(let y=0;y<=H;y+=80){ctx.moveTo(0,y);ctx.lineTo(W,y);}ctx.stroke();
  for(const o of world.organisms) { const hue = 175 + o.genome.aggression * 125; ctx.fillStyle = `hsl(${hue} 75% 67%)`; ctx.beginPath(); ctx.arc(o.x,o.y,2.6 + o.energy / 65,0,Math.PI*2); ctx.fill(); ctx.strokeStyle = `hsla(${hue},75%,67%,0.35)`;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x-Math.cos(o.heading)*10,o.y-Math.sin(o.heading)*10);ctx.stroke(); if(o.id===selected){ctx.fillStyle='rgba(120,208,235,0.04)';ctx.strokeStyle='#ceeef4';ctx.beginPath();ctx.arc(o.x,o.y,o.genome.sense,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(o.x,o.y,9,0,Math.PI*2);ctx.stroke();} }
}
