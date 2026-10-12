import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
const S = 1000

async function save(letter, svg) {
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 96 }).toBuffer()
  await mkdir(`Downloaded Covers/${letter}`, { recursive: true })
  await writeFile(`Downloaded Covers/${letter}/folder.jpg`, buf)
  await writeFile(`Downloaded Covers/${letter}.jpg`, buf)
  console.log(`✓ ${letter}`)
}

// Hjælpere
const rnd = (seed, max, min=0) => min + ((seed * 1664525 + 1013904223) & 0x7fffffff) % (max - min)
const sparkle = (cx,cy,r,c,op=1) => `<line x1="${cx}" y1="${cy-r}" x2="${cx}" y2="${cy+r}" stroke="${c}" stroke-width="${r*.2}" stroke-linecap="round" opacity="${op}"/><line x1="${cx-r}" y1="${cy}" x2="${cx+r}" y2="${cy}" stroke="${c}" stroke-width="${r*.2}" stroke-linecap="round" opacity="${op}"/><line x1="${cx-r*.7}" y1="${cy-r*.7}" x2="${cx+r*.7}" y2="${cy+r*.7}" stroke="${c}" stroke-width="${r*.1}" stroke-linecap="round" opacity="${op*.7}"/><line x1="${cx+r*.7}" y1="${cy-r*.7}" x2="${cx-r*.7}" y2="${cy+r*.7}" stroke="${c}" stroke-width="${r*.1}" stroke-linecap="round" opacity="${op*.7}"/>`
const star8 = (cx,cy,r,c,op=1) => `<polygon points="${Array.from({length:8},(_,i)=>`${cx+(i%2===0?r:r*.4)*Math.cos(i*Math.PI/4-Math.PI/8)},${cy+(i%2===0?r:r*.4)*Math.sin(i*Math.PI/4-Math.PI/8)}`).join(' ')}" fill="${c}" opacity="${op}"/>`
const bigLetter = (ch,x,y,size,fill,shadow,stroke,sw,glow='') =>
  `<text x="${x+10}" y="${y+12}" font-family="Arial Black,Arial" font-weight="900" font-size="${size}" text-anchor="middle" fill="${shadow}" opacity="0.7">${ch}</text>` +
  `<text x="${x+5}" y="${y+6}" font-family="Arial Black,Arial" font-weight="900" font-size="${size}" text-anchor="middle" fill="${shadow}" opacity="0.5">${ch}</text>` +
  (glow ? `<text x="${x}" y="${y}" font-family="Arial Black,Arial" font-weight="900" font-size="${size}" text-anchor="middle" fill="${glow}" opacity="0.15" filter="url(#G)">${ch}</text>` : '') +
  `<text x="${x}" y="${y}" font-family="Arial Black,Arial" font-weight="900" font-size="${size}" text-anchor="middle" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" paint-order="stroke">${ch}</text>`

const filters = `
  <filter id="G" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="g2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="softer"><feGaussianBlur stdDeviation="20"/></filter>
  <filter id="ds"><feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#000" flood-opacity="0.8"/></filter>`

const designs = {

// ═══════════════════════════════════════════════════
// A — SUPERNOVA ALLSTAR: 64-strålet burst, gnistregn, prismatisk A
A: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="abg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#3d0050"/><stop offset="40%" stop-color="#1a0030"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <radialGradient id="aglow" cx="50%" cy="50%" r="40%"><stop offset="0%" stop-color="#FF006E" stop-opacity="0.5"/><stop offset="100%" stop-color="transparent"/></radialGradient>
  <linearGradient id="al" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="30%" stop-color="#FFD60A"/><stop offset="70%" stop-color="#FF006E"/><stop offset="100%" stop-color="#8338EC"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#abg)"/>
<rect width="${S}" height="${S}" fill="url(#aglow)"/>
${Array.from({length:64},(_,i)=>`<line x1="500" y1="500" x2="${500+520*Math.cos(i*Math.PI/32)}" y2="${500+520*Math.sin(i*Math.PI/32)}" stroke="${['#FF006E','#FFD60A','#8338EC','#FF4500','#00F5D4','#fff','#ADFF2F','#FF48C4'][i%8]}" stroke-width="${i%4===0?5:i%2===0?2.5:1}" opacity="${i%4===0?0.8:0.4}"/>`).join('')}
${Array.from({length:6},(_,i)=>`<circle cx="500" cy="500" r="${70+i*68}" fill="none" stroke="${['#FF006E','#FFD60A','#8338EC','#FF4500','#00F5D4','#fff'][i]}" stroke-width="2" opacity="${0.35-i*0.04}"/>`).join('')}
<circle cx="500" cy="500" r="320" fill="url(#aglow)" opacity="0.6" filter="url(#softer)"/>
${Array.from({length:80},(_,i)=>sparkle(rnd(i*7,950,25),rnd(i*13,950,25),4+(i%6)*3,['#FF006E','#FFD60A','#8338EC','#FF4500','#00F5D4','#fff','#ADFF2F'][i%7],0.6+(i%4)*0.1)).join('')}
${Array.from({length:30},(_,i)=>star8(rnd(i*17,900,50),rnd(i*23,900,50),8+(i%4)*5,['#FFD60A','#FF006E','#fff','#ADFF2F'][i%4],0.7+(i%3)*0.1)).join('')}
<circle cx="500" cy="500" r="50" fill="#fff" opacity="0.9" filter="url(#G)"/>
${bigLetter('A',500,710,720,'url(#al)','#2a0040','#FFD60A',6,'#FF006E')}
</svg>`,

// ═══════════════════════════════════════════════════
// B — NEON BUBBLE GALAXY: mørkt rum, 25 kæmpe farverige bobler med lys og refleks
B: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="bbg" cx="30%" cy="30%" r="80%"><stop offset="0%" stop-color="#001a00"/><stop offset="60%" stop-color="#000a00"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <linearGradient id="bl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#CCFF00"/><stop offset="50%" stop-color="#fff"/><stop offset="100%" stop-color="#00FF88"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#bbg)"/>
${Array.from({length:50},(_,i)=>`<circle cx="${rnd(i*11,960,20)}" cy="${rnd(i*17,960,20)}" r="1.5" fill="${['#CCFF00','#00FF88','#fff','#FF48C4'][i%4]}" opacity="${0.2+(i%5)*0.1}"/>`).join('')}
${[['#FF006E',180,220,110],['#CCFF00',720,180,95],['#00F5D4',150,700,120],['#FF9500',820,720,100],['#8338EC',480,120,85],['#FF1493',600,820,105],['#00FFFF',900,450,80],['#ADFF2F',100,480,90],['#FFD700',550,500,130],['#FF4500',350,350,75],['#7B2FBE',750,600,85],['#00FF88',250,800,70]].map(([c,x,y,r])=>`
  <circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="0.12" filter="url(#softer)"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="5" opacity="0.7" filter="url(#g2)"/>
  <circle cx="${x}" cy="${y}" r="${r*0.85}" fill="none" stroke="${c}" stroke-width="2" opacity="0.5"/>
  <ellipse cx="${x-r*.3}" cy="${y-r*.35}" rx="${r*.28}" ry="${r*.15}" fill="#fff" opacity="0.55" transform="rotate(-35 ${x-r*.3} ${y-r*.35})"/>
  <circle cx="${x-r*.45}" cy="${y-r*.45}" r="${r*.08}" fill="#fff" opacity="0.8"/>`).join('')}
${bigLetter('B',490,710,720,'url(#bl)','#001a00','#CCFF00',5,'#00FF88')}
</svg>`,

// ═══════════════════════════════════════════════════
// C — COSMIC EXPLOSION: tæt stjernetåge + shockwave-ringe + C i himmellys
C: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="cbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#20002a"/><stop offset="100%" stop-color="#000205"/></radialGradient>
  <radialGradient id="ccore" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff" stop-opacity="0.9"/><stop offset="20%" stop-color="#FF48C4" stop-opacity="0.5"/><stop offset="60%" stop-color="#8338EC" stop-opacity="0.2"/><stop offset="100%" stop-color="transparent"/></radialGradient>
  <linearGradient id="cl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="40%" stop-color="#00F5D4"/><stop offset="100%" stop-color="#FF48C4"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#cbg)"/>
${[['#FF48C4',280,350,340,120,-20],['#00F5D4',680,600,320,100,15],['#8338EC',500,500,400,150,0],['#FF9500',200,700,260,90,-35],['#3A86FF',780,250,280,110,25],['#FF006E',500,200,200,80,-10]].map(([c,x,y,rx,ry,rot])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity="0.2" filter="url(#softer)" transform="rotate(${rot} ${x} ${y})"/>`).join('')}
${Array.from({length:8},(_,i)=>`<circle cx="500" cy="500" r="${60+i*52}" fill="none" stroke="${['#FF48C4','#00F5D4','#8338EC','#FF9500','#3A86FF','#FF006E','#FFD700','#ADFF2F'][i]}" stroke-width="${4-i*0.3}" opacity="${0.55-i*0.05}"/>`).join('')}
<rect width="${S}" height="${S}" fill="url(#ccore)" opacity="0.7"/>
${Array.from({length:90},(_,i)=>`<circle cx="${rnd(i*11,960,20)}" cy="${rnd(i*17,960,20)}" r="${i%7===0?4:i%3===0?2.5:1.5}" fill="${['#fff','#FF48C4','#00F5D4','#FFD700','#8338EC'][i%5]}" opacity="${0.3+(i%6)*0.1}"/>`).join('')}
${Array.from({length:40},(_,i)=>sparkle(rnd(i*19,900,50),rnd(i*23,900,50),5+(i%5)*4,['#fff','#FF48C4','#00F5D4','#FFD700'][i%4],0.7)).join('')}
${bigLetter('C',510,710,720,'url(#cl)','#1a0030','#00F5D4',6,'#fff')}
</svg>`,

// ═══════════════════════════════════════════════════
// D — DISCO DIAMOND: spejlkugle-effekt med hundredvis af spejlfliser + regnbuestriber
D: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <linearGradient id="dl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="25%" stop-color="#88ddff"/><stop offset="75%" stop-color="#4499ff"/><stop offset="100%" stop-color="#0022aa"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="#000"/>
${Array.from({length:12},(_,i)=>`<rect x="0" y="${i*84}" width="${S}" height="84" fill="hsl(${i*30},100%,8%)"/>`).join('')}
${Array.from({length:20},(_,i)=>Array.from({length:20},(_,j)=>`<rect x="${i*51}" y="${j*51}" width="48" height="48" rx="4" fill="hsl(${(i*37+j*23)%360},80%,${35+((i+j)%4)*8}%)" opacity="${0.3+((i+j)%5)*0.1}" transform="rotate(${(i*7+j*11)%20-10} ${i*51+24} ${j*51+24})"/>`).join('')).join('')}
${['#FF0000','#FF7700','#FFEE00','#00FF44','#0088FF','#8800FF','#FF0088','#00FFEE'].map((c,i)=>`<line x1="${500+480*Math.cos(i*Math.PI/4)}" y1="${500+480*Math.sin(i*Math.PI/4)}" x2="${500-480*Math.cos(i*Math.PI/4)}" y2="${500-480*Math.sin(i*Math.PI/4)}" stroke="${c}" stroke-width="6" opacity="0.25" filter="url(#g2)"/>`).join('')}
<circle cx="500" cy="500" r="280" fill="none" stroke="#fff" stroke-width="3" opacity="0.15"/>
${Array.from({length:30},(_,i)=>sparkle(rnd(i*13,900,50),rnd(i*19,900,50),6+(i%5)*4,'#fff',0.8)).join('')}
${bigLetter('D',500,700,700,'url(#dl)','#000033','#88ddff',6,'#fff')}
</svg>`,

// ═══════════════════════════════════════════════════
// E — MATRIX STORM: grøn matrix-regn + 5 hvide lynbolte fra alle sider
E: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <linearGradient id="ebg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000a00"/><stop offset="100%" stop-color="#001500"/></linearGradient>
  <linearGradient id="el" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#00FFFF"/><stop offset="50%" stop-color="#FFFF00"/><stop offset="100%" stop-color="#00FF41"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#ebg)"/>
${Array.from({length:30},(_,i)=>Array.from({length:20},(_,j)=>`<text x="${i*35}" y="${j*55+rnd(i*17+j,40)}" font-family="Courier New,monospace" font-size="${8+j%4*3}" fill="#00FF41" opacity="${0.08+(j%5)*0.03}">${String.fromCharCode(33+rnd(i*j+17,90))}</text>`).join('')).join('')}
${[['#FFFF00',80,0,30,220,110,440,50,900],['#00FFFF',920,0,970,180,890,400,950,900],['#FF00FF',400,0,350,180,480,420,380,900],['#FFFFFF',600,0,680,250,580,500,640,900],['#00FF41',200,0,150,300,260,580,200,950]].map(([c,...pts])=>`
  <polyline points="${pts.join(',')}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#G)" opacity="0.9"/>
  <polyline points="${pts.join(',')}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`).join('')}
${Array.from({length:50},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*17,960,20)}" r="2.5" fill="${['#00FF41','#FFFF00','#00FFFF','#FF00FF'][i%4]}" opacity="${0.4+(i%4)*0.12}" filter="url(#g2)"/>`).join('')}
${bigLetter('E',520,720,740,'url(#el)','#000a00','#00FFFF',5,'#FFFF00')}
</svg>`,

// ═══════════════════════════════════════════════════
// F — FESTIVAL FIREWORKS: 10 store fyrværkeri med gnistregn og farvede skyer
F: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="fbg" cx="50%" cy="80%" r="90%"><stop offset="0%" stop-color="#05061a"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <linearGradient id="fl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFD700"/><stop offset="40%" stop-color="#fff"/><stop offset="100%" stop-color="#FFA500"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#fbg)"/>
${Array.from({length:40},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*17,700,10)}" r="${i%6===0?2.5:1}" fill="#fff" opacity="${0.15+(i%5)*0.08}"/>`).join('')}
${[['#FF006E',200,260],['#FFD700',720,180],['#00F5D4',130,550],['#8338EC',830,520],['#FF4500',500,140],['#00FF88',650,680],['#FF1493',360,720],['#3A86FF',870,280],['#ADFF2F',480,380],['#FF9500',240,380]].map(([c,cx,cy],fi)=>`
  ${Array.from({length:24},(_,i)=>`<line x1="${cx}" y1="${cy}" x2="${cx+(70+fi*6)*Math.cos(i*Math.PI/12)}" y2="${cy+(70+fi*6)*Math.sin(i*Math.PI/12)}" stroke="${c}" stroke-width="${3+fi%3}" stroke-linecap="round" opacity="${0.85}" filter="url(#g2)"/>
    <circle cx="${cx+(70+fi*6)*Math.cos(i*Math.PI/12)}" cy="${cy+(70+fi*6)*Math.sin(i*Math.PI/12)}" r="${3+fi%4}" fill="${c}" opacity="0.9"/>
    <circle cx="${cx+(90+fi*8)*Math.cos(i*Math.PI/12+0.1)}" cy="${cy+(90+fi*8)*Math.sin(i*Math.PI/12+0.1)}" r="${2}" fill="${c}" opacity="0.5"/>`).join('')}
  <circle cx="${cx}" cy="${cy}" r="14" fill="${c}" filter="url(#G)" opacity="0.9"/>
  <circle cx="${cx}" cy="${cy}" r="7" fill="#fff" opacity="0.95"/>`).join('')}
${bigLetter('F',500,730,730,'url(#fl)','#1a0a00','#FFA500',5,'#FFD700')}
</svg>`,

// ═══════════════════════════════════════════════════
// G — GALAXY SUPREME: triple spiral, 400 stjerner, glødende kerne, G i stjerneguld
G: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="gbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#1a0035"/><stop offset="50%" stop-color="#0a0018"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <radialGradient id="gcore" cx="50%" cy="50%" r="40%"><stop offset="0%" stop-color="#fff" stop-opacity="1"/><stop offset="15%" stop-color="#FFD700" stop-opacity="0.8"/><stop offset="40%" stop-color="#FF9500" stop-opacity="0.3"/><stop offset="100%" stop-color="transparent"/></radialGradient>
  <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFD700"/><stop offset="40%" stop-color="#fff"/><stop offset="100%" stop-color="#FFA500"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#gbg)"/>
${Array.from({length:160},(_,i)=>{const a=i*0.31,r=Math.min(i*3.8,460),x=500+r*Math.cos(a),y=500+r*Math.sin(a);const c=['#FF48C4','#8338EC','#3A86FF','#00F5D4','#FFD700','#FF006E'][i%6];return `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${i%12===0?4.5:i%6===0?3:i%3===0?2:1.5}" fill="${c}" opacity="${0.25+i/220}"/>`}).join('')}
${Array.from({length:160},(_,i)=>{const a=i*0.31+Math.PI*2/3,r=Math.min(i*3.5,440),x=500+r*Math.cos(a),y=500+r*Math.sin(a);const c=['#FF9500','#ADFF2F','#FF1493','#00FFFF','#9400D3','#FFD700'][i%6];return `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${i%10===0?4:i%5===0?2.5:1.5}" fill="${c}" opacity="${0.2+i/240}"/>`}).join('')}
${Array.from({length:160},(_,i)=>{const a=i*0.31+Math.PI*4/3,r=Math.min(i*3.2,420),x=500+r*Math.cos(a),y=500+r*Math.sin(a);const c=['#00FF88','#FF006E','#FFD700','#8338EC','#00F5D4','#FF4500'][i%6];return `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${i%9===0?3.5:i%3===0?2:1.5}" fill="${c}" opacity="${0.2+i/250}"/>`}).join('')}
${Array.from({length:60},(_,i)=>`<circle cx="${rnd(i*17,960,20)}" cy="${rnd(i*23,960,20)}" r="${i%5===0?3:1.5}" fill="#fff" opacity="${0.15+(i%6)*0.08}"/>`).join('')}
<circle cx="500" cy="500" r="400" fill="url(#gcore)" opacity="0.6"/>
<circle cx="500" cy="500" r="30" fill="#fff" opacity="1" filter="url(#G)"/>
<circle cx="500" cy="500" r="14" fill="#FFD700" opacity="1"/>
${bigLetter('G',490,700,700,'url(#gl)','#1a0035','#FFA500',5,'#FFD700')}
</svg>`,

// ═══════════════════════════════════════════════════
// H — HYPERCOLOR: 20 regnbuestriber + roterede firkanter + glow H
H: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="50%" stop-color="#FFD700"/><stop offset="100%" stop-color="#FF006E"/></linearGradient>
</defs>
${Array.from({length:20},(_,i)=>`<rect x="0" y="${i*50}" width="${S}" height="50" fill="hsl(${i*18},100%,50%)"/>`).join('')}
${Array.from({length:14},(_,i)=>Array.from({length:14},(_,j)=>`<rect x="${i*74-10}" y="${j*74-10}" width="62" height="62" fill="hsl(${(i*41+j*29)%360},100%,${(i+j)%2===0?15:60}%)" opacity="0.22" transform="rotate(${i*13+j*7} ${i*74+21} ${j*74+21})"/>`).join('')).join('')}
<circle cx="500" cy="500" r="430" fill="none" stroke="#fff" stroke-width="18" opacity="0.3"/>
<circle cx="500" cy="500" r="405" fill="none" stroke="#000" stroke-width="8" opacity="0.5"/>
${Array.from({length:8},(_,i)=>sparkle(rnd(i*19,900,50),rnd(i*23,900,50),16+i*4,'#fff',0.9)).join('')}
${bigLetter('H',500,700,680,'url(#hl)','#000','#000',14)}
<text x="500" y="700" font-family="Arial Black,Arial" font-weight="900" font-size="680" text-anchor="middle" fill="none" stroke="#fff" stroke-width="4" opacity="0.6">H</text>
</svg>`,

// ═══════════════════════════════════════════════════
// I — ICE FIRE SPLIT: venstre isblå krystal, højre orange ild, I midt imellem
I: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <linearGradient id="ibg-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#001a3a"/><stop offset="100%" stop-color="#003366"/></linearGradient>
  <linearGradient id="ibg-r" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#3d0a00"/><stop offset="100%" stop-color="#1a0500"/></linearGradient>
  <linearGradient id="il" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="50%" stop-color="#aaddff"/><stop offset="100%" stop-color="#ff6600"/></linearGradient>
  <clipPath id="left"><rect x="0" y="0" width="500" height="${S}"/></clipPath>
  <clipPath id="right"><rect x="500" y="0" width="500" height="${S}"/></clipPath>
</defs>
<rect width="${S}" height="${S}" fill="url(#ibg-l)" clip-path="url(#left)"/>
<rect width="${S}" height="${S}" fill="url(#ibg-r)" clip-path="url(#right)"/>
${Array.from({length:6},(_,i)=>`<line x1="${250}" y1="${250}" x2="${250+440*Math.cos(i*Math.PI/3)}" y2="${250+440*Math.sin(i*Math.PI/3)}" stroke="#88ddff" stroke-width="2.5" opacity="0.5" clip-path="url(#left)"/>${Array.from({length:3},(_,j)=>`<line x1="${250+(100+j*100)*Math.cos(i*Math.PI/3)}" y1="${250+(100+j*100)*Math.sin(i*Math.PI/3)}" x2="${250+(100+j*100)*Math.cos(i*Math.PI/3)+40*Math.cos(i*Math.PI/3+Math.PI/2)}" y2="${250+(100+j*100)*Math.sin(i*Math.PI/3)+40*Math.sin(i*Math.PI/3+Math.PI/2)}" stroke="#88ddff" stroke-width="2" opacity="0.45" clip-path="url(#left)"/>`).join('')}`).join('')}
${Array.from({length:12},(_,i)=>`<ellipse cx="${700+Math.cos(i*Math.PI/6)*150}" cy="${150+Math.sin(i*Math.PI/6)*150+i*50}" rx="${25+i*5}" ry="${60+i*8}" fill="#FF4500" opacity="${0.25+i%3*0.07}" filter="url(#soft)" clip-path="url(#right)" transform="rotate(${-15+i*3} ${700+Math.cos(i*Math.PI/6)*150} ${150+Math.sin(i*Math.PI/6)*150+i*50})"/>`).join('')}
${Array.from({length:30},(_,i)=>`<circle cx="${rnd(i*11,480,20)}" cy="${rnd(i*17,960,20)}" r="${i%5===0?3:1.5}" fill="#88ddff" opacity="${0.3+(i%4)*0.12}" clip-path="url(#left)"/>`).join('')}
${Array.from({length:30},(_,i)=>`<circle cx="${rnd(i*13,480,520)}" cy="${rnd(i*19,960,20)}" r="${i%4===0?4:2}" fill="${['#FFD700','#FF4500','#FF6600'][i%3]}" opacity="${0.3+(i%4)*0.1}" clip-path="url(#right)"/>`).join('')}
<line x1="500" y1="0" x2="500" y2="${S}" stroke="#fff" stroke-width="6" opacity="0.6" filter="url(#g2)"/>
${bigLetter('I',500,730,740,'url(#il)','#001a3a','#fff',6,'#88ddff')}
</svg>`,

// ═══════════════════════════════════════════════════
// J — NEON JUNGLE NIGHTS: mørk jungelnat med glødende blomster og insekter
J: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="jbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#001a00"/><stop offset="100%" stop-color="#000500"/></radialGradient>
  <linearGradient id="jl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FF1493"/><stop offset="50%" stop-color="#FF69B4"/><stop offset="100%" stop-color="#FF006E"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#jbg)"/>
${[[-60,100,140],[-60,700,160],[860,200,130],[860,750,145],[200,950,150],[750,950,135],[400,-60,120],[600,-60,130]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*0.55}" fill="#003300" opacity="0.8" transform="rotate(${(x+y)%50-25} ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="${r*.8}" ry="${r*0.38}" fill="#005500" opacity="0.7" transform="rotate(${-(x+y)%40} ${x} ${y})"/><line x1="${x}" y1="${y}" x2="500" y2="500" stroke="#002200" stroke-width="8" opacity="0.4"/>`).join('')}
${[[200,180,'#FF1493',42],[760,300,'#FFD700',36],[280,680,'#FF4500',44],[820,730,'#FF1493',40],[520,120,'#ADFF2F',32],[150,850,'#00FFFF',38],[880,180,'#FF006E',34],[600,850,'#FFD700',40]].map(([x,y,c,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="1" filter="url(#G)"/><circle cx="${x}" cy="${y}" r="${r*0.6}" fill="#fff" opacity="0.6"/>${Array.from({length:8},(_,i)=>`<ellipse cx="${x+r*1.7*Math.cos(i*Math.PI/4)}" cy="${y+r*1.7*Math.sin(i*Math.PI/4)}" rx="${r*.85}" ry="${r*.38}" fill="${c}" opacity="0.85" filter="url(#g2)" transform="rotate(${i*45} ${x+r*1.7*Math.cos(i*Math.PI/4)} ${y+r*1.7*Math.sin(i*Math.PI/4)})"/>`).join('')}`).join('')}
${Array.from({length:40},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*17,960,20)}" r="3" fill="${['#ADFF2F','#00FFFF','#FFD700','#FF1493'][i%4]}" opacity="${0.4+(i%4)*0.15}" filter="url(#g2)"/>`).join('')}
${bigLetter('J',520,730,730,'url(#jl)','#001a00','#FF1493',6,'#FF69B4')}
</svg>`,

// ═══════════════════════════════════════════════════
// K — KALEIDOSCOPE ULTRA: 24-fold symmetri, 8 farvelag, K i prismatisk centrum
K: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="kbg" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#1a0030"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <linearGradient id="kl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFD700"/><stop offset="33%" stop-color="#FF006E"/><stop offset="66%" stop-color="#00F5D4"/><stop offset="100%" stop-color="#FFD700"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#kbg)"/>
${Array.from({length:24},(_,i)=>{const c=['#FF0000','#FF7700','#FFEE00','#00CC44','#0088FF','#8800FF','#FF0088','#00FFEE','#FF4400','#44FF00','#0044FF','#FF00AA'][i%12];return `<polygon points="500,500 ${500+470*Math.cos(i*Math.PI/12)},${500+470*Math.sin(i*Math.PI/12)} ${500+470*Math.cos((i+1)*Math.PI/12)},${500+470*Math.sin((i+1)*Math.PI/12)}" fill="${c}" opacity="0.55"/>
  <polygon points="500,500 ${500+280*Math.cos(i*Math.PI/12+Math.PI/24)},${500+280*Math.sin(i*Math.PI/12+Math.PI/24)} ${500+280*Math.cos((i+.5)*Math.PI/12+Math.PI/24)},${500+280*Math.sin((i+.5)*Math.PI/12+Math.PI/24)}" fill="${c}" opacity="0.75"/>
  <polygon points="500,500 ${500+380*Math.cos(i*Math.PI/12-Math.PI/20)},${500+380*Math.sin(i*Math.PI/12-Math.PI/20)} ${500+130*Math.cos(i*Math.PI/12+Math.PI/8)},${500+130*Math.sin(i*Math.PI/12+Math.PI/8)}" fill="${c}" opacity="0.3"/>`}).join('')}
${Array.from({length:5},(_,i)=>`<circle cx="500" cy="500" r="${60+i*75}" fill="none" stroke="#fff" stroke-width="${3-i*0.4}" opacity="${0.25-i*0.03}"/>`).join('')}
<circle cx="500" cy="500" r="55" fill="#fff" opacity="0.95" filter="url(#G)"/>
<circle cx="500" cy="500" r="28" fill="#000" opacity="0.85"/>
${bigLetter('K',500,690,640,'url(#kl)','#000','#FFD700',5,'#FF006E')}
</svg>`,

// ═══════════════════════════════════════════════════
// L — LASER ARENA: sort, 14 neon-laserstråler fra bunden, tåge-effekt, L i neon
L: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="lbg" cx="50%" cy="100%" r="90%"><stop offset="0%" stop-color="#0a000a"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <linearGradient id="ll" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FF48C4"/><stop offset="40%" stop-color="#fff"/><stop offset="100%" stop-color="#FF48C4"/></linearGradient>
  <radialGradient id="lfog" cx="50%" cy="100%" r="80%"><stop offset="0%" stop-color="#2a002a" stop-opacity="0.7"/><stop offset="100%" stop-color="transparent"/></radialGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#lbg)"/>
<rect width="${S}" height="${S}" fill="url(#lfog)"/>
${[['#FF006E',80,980,500,0],['#00FFFF',920,980,500,0],['#FFD700',500,980,0,350],['#FF006E',500,980,S,350],['#00FF88',0,980,900,100],['#FF4500',S,980,100,100],['#8338EC',200,980,800,50],['#00FFFF',800,980,200,50],['#FF1493',350,980,650,150],['#ADFF2F',650,980,350,150],['#FF006E',150,980,750,200],['#3A86FF',750,980,250,200],['#FFD700',450,980,S,0],['#00FFFF',550,980,0,0]].map(([c,x1,y1,x2,y2])=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="4" opacity="0.75" filter="url(#G)"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="1.5" opacity="0.4"/>`).join('')}
${Array.from({length:30},(_,i)=>sparkle(rnd(i*17,900,50),rnd(i*23,200,50),8+(i%5)*5,['#FF006E','#00FFFF','#FFD700','#FF48C4','#00FF88'][i%5],0.8)).join('')}
${Array.from({length:40},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*19,500,20)}" r="2" fill="${['#FF006E','#00FFFF','#FFD700'][i%3]}" opacity="${0.3+(i%4)*0.1}"/>`).join('')}
${bigLetter('L',500,730,740,'url(#ll)','#1a0030','#FF48C4',6,'#FF006E')}
</svg>`,

// ═══════════════════════════════════════════════════
// M — MAGIC METEOR SHOWER: 300 stjerner + 20 meteorer + magiske gnister
M: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="mbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#100025"/><stop offset="50%" stop-color="#0a0015"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <radialGradient id="mcore" cx="50%" cy="50%" r="40%"><stop offset="0%" stop-color="#8338EC" stop-opacity="0.3"/><stop offset="100%" stop-color="transparent"/></radialGradient>
  <linearGradient id="ml" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFD700"/><stop offset="25%" stop-color="#fff"/><stop offset="50%" stop-color="#FF48C4"/><stop offset="75%" stop-color="#fff"/><stop offset="100%" stop-color="#FFD700"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#mbg)"/>
<rect width="${S}" height="${S}" fill="url(#mcore)"/>
${Array.from({length:120},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*17,960,20)}" r="${i%8===0?3.5:i%4===0?2:1.2}" fill="${['#fff','#FFD700','#FF48C4','#8338EC','#00F5D4','#ADFF2F'][i%6]}" opacity="${0.25+(i%7)*0.09}"/>`).join('')}
${Array.from({length:20},(_,i)=>{const x=rnd(i*23,900,50),y=rnd(i*17,600,20),len=40+i%4*30,a=Math.PI/4+(i%3-1)*0.3;const c=['#FFD700','#FF48C4','#00F5D4','#fff','#ADFF2F'][i%5];return `<line x1="${x}" y1="${y}" x2="${x+len*Math.cos(a)}" y2="${y+len*Math.sin(a)}" stroke="${c}" stroke-width="${3-i%2}" opacity="0.8" stroke-linecap="round" filter="url(#g2)"/><circle cx="${x}" cy="${y}" r="4" fill="${c}" opacity="0.9"/>`}).join('')}
${Array.from({length:60},(_,i)=>sparkle(rnd(i*19,900,50),rnd(i*23,900,50),4+(i%6)*4,['#FFD700','#FF48C4','#00F5D4','#fff','#ADFF2F','#8338EC'][i%6],0.7+(i%3)*0.1)).join('')}
${Array.from({length:20},(_,i)=>star8(rnd(i*29,880,60),rnd(i*31,880,60),10+(i%4)*8,['#FFD700','#fff','#FF48C4'][i%3],0.75)).join('')}
${bigLetter('M',500,720,680,'url(#ml)','#100025','#FFD700',4,'#FF48C4')}
</svg>`,

// ═══════════════════════════════════════════════════
// N — NEON AURORA MAX: 10 aurora-baner i neon + snebyge + N i isgrøn
N: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000312"/><stop offset="100%" stop-color="#000820"/></linearGradient>
  <linearGradient id="nl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0fff0"/><stop offset="50%" stop-color="#fff"/><stop offset="100%" stop-color="#00FF88"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#nbg)"/>
${[['#00FF88',180,280,550,120,-20,0.4],['#FF00FF',650,240,480,85,12,0.35],['#00FFFF',350,420,600,95,-8,0.3],['#ADFF2F',550,320,520,80,22,0.28],['#FF69B4',100,500,570,90,-15,0.25],['#9400D3',800,380,440,75,18,0.3],['#00FF88',300,160,490,70,-6,0.22],['#FF4500',700,460,400,65,25,0.2],['#FFFF00',500,200,560,85,-18,0.25],['#00BFFF',200,600,480,75,10,0.22]].map(([c,x,y,rx,ry,rot,op])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${op}" filter="url(#softer)" transform="rotate(${rot} ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="${rx*.6}" ry="${ry*.5}" fill="${c}" opacity="${op*0.5}" filter="url(#softer)" transform="rotate(${rot} ${x} ${y})"/>`).join('')}
${Array.from({length:80},(_,i)=>`<circle cx="${rnd(i*11,960,20)}" cy="${rnd(i*13,960,20)}" r="${i%7===0?3.5:i%3===0?2:1}" fill="${['#fff','#00FF88','#00FFFF','#FF00FF'][i%4]}" opacity="${0.2+(i%6)*0.1}"/>`).join('')}
${Array.from({length:30},(_,i)=>sparkle(rnd(i*17,900,50),rnd(i*19,900,50),5+(i%5)*3,'#fff',0.7)).join('')}
${bigLetter('N',500,720,720,'url(#nl)','#000820','#00FF88',6,'#00FF88')}
</svg>`,

// ═══════════════════════════════════════════════════
// O — VORTEX PORTAL: spiraliserende ringe + eksplosiv portal-effekt
O: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="obg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#000a20"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <radialGradient id="oportal" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff" stop-opacity="0.95"/><stop offset="15%" stop-color="#00FFFF" stop-opacity="0.7"/><stop offset="35%" stop-color="#8338EC" stop-opacity="0.4"/><stop offset="70%" stop-color="#000080" stop-opacity="0.2"/><stop offset="100%" stop-color="transparent"/></radialGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#obg)"/>
${Array.from({length:14},(_,i)=>`<circle cx="500" cy="500" r="${460-i*32}" fill="${i%2===0?`hsl(${220+i*15},100%,${i%4===0?8:20}%)`:`hsl(${180+i*20},100%,${i%4===0?25:8}%)`}" stroke="hsl(${200+i*12},100%,60%)" stroke-width="3" opacity="${0.5+i%3*0.15}"/>`).join('')}
${Array.from({length:20},(_,i)=>`<line x1="500" y1="500" x2="${500+480*Math.cos(i*Math.PI/10+i*0.05)}" y2="${500+480*Math.sin(i*Math.PI/10+i*0.05)}" stroke="hsl(${200+i*9},100%,60%)" stroke-width="2" opacity="0.35"/>`).join('')}
<circle cx="500" cy="500" r="480" fill="url(#oportal)" opacity="0.8"/>
${Array.from({length:30},(_,i)=>sparkle(rnd(i*13,900,50),rnd(i*19,900,50),6+(i%5)*4,['#00FFFF','#8338EC','#FF48C4','#FFD700'][i%4],0.8)).join('')}
<circle cx="500" cy="500" r="90" fill="#fff" opacity="0.9" filter="url(#G)"/>
<circle cx="500" cy="500" r="50" fill="#000" opacity="0.95"/>
<text x="500" y="536" font-family="Arial Black,Arial" font-weight="900" font-size="80" text-anchor="middle" fill="#00FFFF" filter="url(#G)">O</text>
</svg>`,

// ═══════════════════════════════════════════════════
// P — PAINT EXPLOSION: hvid baggrund, eksplosion af maling fra centrum
P: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
</defs>
<rect width="${S}" height="${S}" fill="#fff"/>
<circle cx="500" cy="500" r="380" fill="#fff" opacity="0.9"/>
${[['#FF006E',0],['#FFD700',45],['#00F5D4',90],['#8338EC',135],['#FF4500',180],['#00BB55',225],['#3A86FF',270],['#FF1493',315]].map(([c,angle])=>`
  <ellipse cx="${500+220*Math.cos(angle*Math.PI/180)}" cy="${500+220*Math.sin(angle*Math.PI/180)}" rx="130" ry="65" fill="${c}" opacity="0.9" transform="rotate(${angle} ${500+220*Math.cos(angle*Math.PI/180)} ${500+220*Math.sin(angle*Math.PI/180)})"/>
  <ellipse cx="${500+340*Math.cos(angle*Math.PI/180)}" cy="${500+340*Math.sin(angle*Math.PI/180)}" rx="70" ry="35" fill="${c}" opacity="0.85" transform="rotate(${angle} ${500+340*Math.cos(angle*Math.PI/180)} ${500+340*Math.sin(angle*Math.PI/180)})"/>
  <ellipse cx="${500+430*Math.cos((angle+8)*Math.PI/180)}" cy="${500+430*Math.sin((angle+8)*Math.PI/180)}" rx="35" ry="18" fill="${c}" opacity="0.7" transform="rotate(${angle+8} ${500+430*Math.cos((angle+8)*Math.PI/180)} ${500+430*Math.sin((angle+8)*Math.PI/180)})"/>
  ${Array.from({length:5},(_,i)=>`<circle cx="${500+(360+i*18)*Math.cos((angle+i*3)*Math.PI/180)}" cy="${500+(360+i*18)*Math.sin((angle+i*3)*Math.PI/180)}" r="${12-i*1.8}" fill="${c}" opacity="${0.7-i*0.1}"/>`).join('')}`).join('')}
<circle cx="500" cy="500" r="60" fill="#fff" opacity="0.95"/>
${bigLetter('P',490,710,700,'#111','#888','#fff',14)}
</svg>`,

// ═══════════════════════════════════════════════════
// Q — QUANTUM COLLISION: partikelaccelerator med kollisionspunkt i centrum
Q: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="qbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#001220"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <radialGradient id="qboom" cx="50%" cy="50%" r="35%"><stop offset="0%" stop-color="#fff" stop-opacity="0.9"/><stop offset="20%" stop-color="#00F5D4" stop-opacity="0.5"/><stop offset="100%" stop-color="transparent"/></radialGradient>
  <linearGradient id="ql" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00F5D4"/><stop offset="50%" stop-color="#fff"/><stop offset="100%" stop-color="#00B4D8"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#qbg)"/>
${Array.from({length:5},(_,i)=>`<circle cx="500" cy="500" r="${80+i*85}" fill="none" stroke="${['#00F5D4','#FF006E','#FFD700','#8338EC','#ADFF2F'][i]}" stroke-width="${3-i*0.3}" stroke-dasharray="${20+i*5} ${10+i*3}" opacity="0.5"/>`).join('')}
${Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;const r1=60+i%3*80;const r2=420;const c=['#00F5D4','#FF006E','#FFD700','#8338EC'][i%4];return `<line x1="${Math.round(500+r1*Math.cos(a))}" y1="${Math.round(500+r1*Math.sin(a))}" x2="${Math.round(500+r2*Math.cos(a+0.4))}" y2="${Math.round(500+r2*Math.sin(a+0.4))}" stroke="${c}" stroke-width="2.5" opacity="0.5" filter="url(#g2)"/><circle cx="${Math.round(500+r2*Math.cos(a+0.4))}" cy="${Math.round(500+r2*Math.sin(a+0.4))}" r="8" fill="${c}" opacity="0.9" filter="url(#g2)"/>`}).join('')}
${Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;const r=460;const c=['#00F5D4','#FF006E','#FFD700','#8338EC','#ADFF2F'][i%5];return `<line x1="${Math.round(500+r*Math.cos(a))}" y1="${Math.round(500+r*Math.sin(a))}" x2="${Math.round(500+r*Math.cos(a+Math.PI))}" y2="${Math.round(500+r*Math.sin(a+Math.PI))}" stroke="${c}" stroke-width="1.5" opacity="0.2"/>`}).join('')}
<rect width="${S}" height="${S}" fill="url(#qboom)" opacity="0.8"/>
${Array.from({length:30},(_,i)=>sparkle(rnd(i*11,900,50),rnd(i*17,900,50),4+(i%5)*4,['#00F5D4','#FF006E','#FFD700'][i%3],0.8)).join('')}
${bigLetter('Q',490,700,700,'url(#ql)','#001220','#00F5D4',5,'#00F5D4')}
</svg>`,

// ═══════════════════════════════════════════════════
// R — NEON CITY RAIN: regnvåd nat, neon-reflekser i puddervand, R som kæmpe skylt
R: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <linearGradient id="rbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a0205"/><stop offset="60%" stop-color="#150308"/><stop offset="100%" stop-color="#0a0205"/></linearGradient>
  <linearGradient id="rrefl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FF4500" stop-opacity="0.3"/><stop offset="100%" stop-color="#FF4500" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#rbg)"/>
${Array.from({length:14},(_,i)=>Array.from({length:14},(_,j)=>`<rect x="${i*72}" y="${j*72}" width="70" height="24" fill="hsl(${(i*23+j*17)%360},60%,8%)" opacity="0.8"/>`).join('')).join('')}
${Array.from({length:35},(_,i)=>`<line x1="${rnd(i*17,960,20)}" y1="0" x2="${rnd(i*17,960,20)+rnd(i*23,20)-10}" y2="${30+rnd(i*13,50)}" stroke="#6694aa" stroke-width="1" opacity="${0.2+(i%4)*0.08}"/>`).join('')}
${[['#FF4500',200,400],['#00FFFF',750,300],['#FF006E',400,250],['#FFD700',800,500]].map(([c,x,y])=>`<ellipse cx="${x}" cy="${850}" rx="${60+Math.abs(x-500)/8}" ry="18" fill="${c}" opacity="0.25" filter="url(#softer)"/><line x1="${x}" y1="${y}" x2="${x}" y2="840" stroke="${c}" stroke-width="${6}" opacity="0.08" filter="url(#softer)"/>`).join('')}
<rect x="80" y="70" width="840" height="860" rx="25" fill="none" stroke="#FF4500" stroke-width="8" filter="url(#G)" opacity="0.8"/>
<rect x="90" y="80" width="820" height="840" rx="20" fill="none" stroke="#FF4500" stroke-width="3" opacity="0.4"/>
${Array.from({length:8},(_,i)=>sparkle(140+i*105,930,10,'#FF4500',0.9)).join('')}
<text x="500" y="700" font-family="Arial Black,Arial" font-weight="900" font-size="680" text-anchor="middle" fill="#FF4500" filter="url(#G)" opacity="0.95">R</text>
<text x="500" y="700" font-family="Arial Black,Arial" font-weight="900" font-size="680" text-anchor="middle" fill="#fff" opacity="0.22">R</text>
<text x="500" y="700" font-family="Arial Black,Arial" font-weight="900" font-size="680" text-anchor="middle" fill="none" stroke="#FF6633" stroke-width="3" opacity="0.5">R</text>
</svg>`,

// ═══════════════════════════════════════════════════
// S — SOLAR SYSTEM: sol i centrum, 6 planeter med ringe + komet, S i solflammer
S: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="sbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#050010"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <radialGradient id="ssun" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#fff"/><stop offset="25%" stop-color="#FFD700"/><stop offset="60%" stop-color="#FF4500"/><stop offset="100%" stop-color="#FF0000" stop-opacity="0"/></radialGradient>
  <linearGradient id="sl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="40%" stop-color="#FFD700"/><stop offset="100%" stop-color="#FF4500"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#sbg)"/>
${Array.from({length:70},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*17,960,20)}" r="${i%7===0?3:1.5}" fill="#fff" opacity="${0.15+(i%5)*0.08}"/>`).join('')}
${[[120,['#FF6B00','#FF4500']],[195,['#4488FF','#2255CC']],[265,['#CC4400','#882200']],[330,['#FFD700','#FFAA00'],true],[390,['#88BBFF','#4477CC'],false]].map(([r,[c1,c2],ring=false],i)=>`<circle cx="500" cy="500" r="${r}" fill="none" stroke="${['#4a3a2a','#444','#333','#4a3a00','#333'][i]}" stroke-width="1" opacity="0.3"/>
  <circle cx="${500+r}" cy="500" r="${12+i*5}" fill="${c1}"/>
  <circle cx="${500+r}" cy="500" r="${8+i*3}" fill="${c2}"/>
  ${ring?`<ellipse cx="${500+r}" cy="500" rx="${22+i*4}" ry="7" fill="none" stroke="${c1}" stroke-width="4" opacity="0.7" transform="rotate(-20 ${500+r} 500)"/>`:''}
  <circle cx="${500+r*0.7}" cy="${500-r*0.7}" r="${6+i*2}" fill="hsl(${180+i*30},80%,60%)"/>`).join('')}
${Array.from({length:32},(_,i)=>`<line x1="500" y1="500" x2="${500+420*Math.cos(i*Math.PI/16)}" y2="${500+420*Math.sin(i*Math.PI/16)}" stroke="#FF4500" stroke-width="${i%4===0?4:1.5}" opacity="${i%4===0?0.5:0.2}"/>`).join('')}
<circle cx="500" cy="500" r="80" fill="url(#ssun)" filter="url(#G)"/>
<circle cx="500" cy="500" r="42" fill="#FFD700"/>
<path d="M 100 200 Q 300 150 450 480" fill="none" stroke="#88ccff" stroke-width="3" opacity="0.7" stroke-dasharray="8 4"/>
<circle cx="100" cy="200" r="10" fill="#88ccff"/>
${bigLetter('S',500,700,700,'url(#sl)','#050010','#FFD700',5,'#FF4500')}
</svg>`,

// ═══════════════════════════════════════════════════
// T — TROPICAL THUNDER MAXIMUM
T: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <linearGradient id="ttrop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FF4500"/><stop offset="35%" stop-color="#FF0080"/><stop offset="65%" stop-color="#8B00AA"/><stop offset="100%" stop-color="#3d00aa"/></linearGradient>
  <linearGradient id="tstorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000c14"/><stop offset="100%" stop-color="#001a28"/></linearGradient>
  <linearGradient id="tl" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFD700"/><stop offset="50%" stop-color="#fff"/><stop offset="100%" stop-color="#00F5D4"/></linearGradient>
  <clipPath id="tleft"><rect x="0" y="0" width="505" height="${S}"/></clipPath>
  <clipPath id="tright"><rect x="495" y="0" width="510" height="${S}"/></clipPath>
</defs>
<rect width="${S}" height="${S}" fill="url(#ttrop)" clip-path="url(#tleft)"/>
<rect width="${S}" height="${S}" fill="url(#tstorm)" clip-path="url(#tright)"/>
${Array.from({length:8},(_,i)=>[[-80+i*40,200+i*50,160],[60+i*20,750-i*30,140],[400-i*10,950,130]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.55}" fill="#004400" opacity="0.8" transform="rotate(${i*8-20} ${x} ${y})" clip-path="url(#tleft)"/>`).join('')).join('')}
${[[200,200,'#FF1493',40],[330,650,'#FFD700',35],[120,820,'#FF4500',42],[450,380,'#ADFF2F',32]].map(([x,y,c,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="0.9" filter="url(#G)" clip-path="url(#tleft)"/>${Array.from({length:8},(_,i)=>`<ellipse cx="${x+r*1.7*Math.cos(i*Math.PI/4)}" cy="${y+r*1.7*Math.sin(i*Math.PI/4)}" rx="${r*.85}" ry="${r*.38}" fill="${c}" opacity="0.8" transform="rotate(${i*45} ${x+r*1.7*Math.cos(i*Math.PI/4)} ${y+r*1.7*Math.sin(i*Math.PI/4)})" clip-path="url(#tleft)"/>`).join('')}`).join('')}
${Array.from({length:20},(_,i)=>`<circle cx="${rnd(i*11,480,20)}" cy="${rnd(i*13,960,20)}" r="${i%4===0?4:2}" fill="${['#FFD700','#FF1493','#ADFF2F'][i%3]}" opacity="0.6" clip-path="url(#tleft)"/>`).join('')}
${[['#FFFF00',620,0,570,200,650,450,610,900],['#00FFFF',820,0,870,250,790,500,840,900],['#FF00FF',740,0,760,180,720,400,750,900]].map(([c,...pts])=>`<polyline points="${pts.join(',')}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" filter="url(#G)" opacity="0.9" clip-path="url(#tright)"/><polyline points="${pts.join(',')}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" clip-path="url(#tright)"/>`).join('')}
${Array.from({length:20},(_,i)=>`<circle cx="${rnd(i*17,490,510)}" cy="${rnd(i*19,960,20)}" r="2" fill="${['#FFFF00','#00FFFF','#FF00FF'][i%3]}" opacity="0.5" clip-path="url(#tright)"/>`).join('')}
<line x1="500" y1="0" x2="500" y2="${S}" stroke="#fff" stroke-width="8" opacity="0.5" filter="url(#g2)"/>
${bigLetter('T',500,710,720,'url(#tl)','#1a0a00','#FFD700',5,'#00F5D4')}
</svg>`,

// ═══════════════════════════════════════════════════
// U — UNIVERSE MAX: 5 galakser, 6 planeter, kometer, nebula, U i kosmisk
U: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="ubg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#020010"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <linearGradient id="ul" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00F5D4"/><stop offset="33%" stop-color="#8338EC"/><stop offset="66%" stop-color="#FF48C4"/><stop offset="100%" stop-color="#00F5D4"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#ubg)"/>
${[['#FF48C4',200,220,80,50,-30],['#8338EC',800,300,70,45,20],['#3A86FF',150,750,90,55,-15],['#FF9500',850,750,75,48,25],['#00FF88',500,150,65,40,0]].map(([c,cx,cy,rx,ry,rot])=>Array.from({length:40},(_,i)=>{const a=i*0.38,r=Math.min(i*2.8,rx);return `<circle cx="${Math.round(cx+r*Math.cos(a))}" cy="${Math.round(cy+r*.6*Math.sin(a))}" r="${i%8===0?3:1.5}" fill="${c}" opacity="${0.3+i/80}" transform="rotate(${rot} ${cx} ${cy})"/>`}).join('')).join('')}
${Array.from({length:80},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*17,960,20)}" r="${i%6===0?2.5:1}" fill="#fff" opacity="${0.15+(i%5)*0.08}"/>`).join('')}
${[['#FF6B00','#FF3300',120,350,50],['#4488FF','#2244AA',820,250,40],['#AADDFF','#6699BB',180,680,35],['#FF8800','#CC4400',870,680,45],['#00DDAA','#007755',500,880,38],['#AA44FF','#6600CC',300,200,30]].map(([c1,c2,x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c1}"/><circle cx="${x}" cy="${y}" r="${r*.65}" fill="${c2}"/><ellipse cx="${x}" cy="${y}" rx="${r*1.8}" ry="${r*.4}" fill="none" stroke="${c1}" stroke-width="4" opacity="0.55" transform="rotate(-25 ${x} ${y})"/>`).join('')}
${[[180,500,'#88CCFF'],[720,200,'#FFCC44']].map(([x,y,c])=>`<path d="M${x} ${y} Q${x+80} ${y-40} ${x+160} ${y-100}" fill="none" stroke="${c}" stroke-width="3" opacity="0.7"/><circle cx="${x}" cy="${y}" r="8" fill="${c}"/><ellipse cx="${x-12}" cy="${y+6}" rx="18" ry="6" fill="${c}" opacity="0.4" transform="rotate(-30 ${x-12} ${y+6})"/>`).join('')}
${[['#FF48C4',200,220],['#8338EC',800,300],['#3A86FF',150,750],['#FF9500',850,750],['#00FF88',500,150]].map(([c,x,y])=>`<circle cx="${x}" cy="${y}" r="16" fill="${c}" opacity="0.85" filter="url(#G)"/>`).join('')}
${bigLetter('U',500,720,720,'url(#ul)','#020010','#8338EC',5,'#00F5D4')}
</svg>`,

// ═══════════════════════════════════════════════════
// V — VICTORY EXPLOSION: konfetti-kanon, streamers, stjerneburst, V i bold sort
V: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="vbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#fffef0"/><stop offset="100%" stop-color="#fff"/></radialGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#vbg)"/>
${Array.from({length:80},(_,i)=>`<rect x="${rnd(i*11,940,30)}" y="${rnd(i*17,940,30)}" width="${6+i%6*4}" height="${14+i%4*8}" fill="hsl(${i*16},100%,55%)" opacity="${0.75+(i%3)*0.08}" transform="rotate(${(i*47)%360} ${rnd(i*11,940,30)+5} ${rnd(i*17,940,30)+10})"/>`).join('')}
${Array.from({length:25},(_,i)=>`<path d="M${rnd(i*19,880,60)} ${rnd(i*23,880,60)} Q${rnd(i*19+5,900,50)+50} ${rnd(i*23+5,900,50)+70} ${rnd(i*19+10,900,60)+100} ${rnd(i*23+10,900,60)+30}" fill="none" stroke="hsl(${i*20},100%,55%)" stroke-width="${3+i%3}" opacity="0.8"/>`).join('')}
${Array.from({length:16},(_,i)=>`<line x1="500" y1="500" x2="${500+490*Math.cos(i*Math.PI/8)}" y2="${500+490*Math.sin(i*Math.PI/8)}" stroke="hsl(${i*22},100%,55%)" stroke-width="${i%4===0?6:2.5}" opacity="${i%4===0?0.35:0.2}"/>`).join('')}
${[[150,150,'#FF006E'],[850,150,'#FFD700'],[150,850,'#00F5D4'],[850,850,'#8338EC'],[500,80,'#FF4500'],[80,500,'#00BB55'],[920,500,'#3A86FF'],[500,920,'#FF1493']].map(([x,y,c])=>star8(x,y,22,c,0.9)).join('')}
${Array.from({length:20},(_,i)=>sparkle(rnd(i*31,900,50),rnd(i*37,900,50),8+(i%5)*5,'hsl('+(i*18)+',100%,55%)',0.8)).join('')}
<circle cx="500" cy="500" r="65" fill="#fff" opacity="0.92"/>
<text x="500" y="710" font-family="Arial Black,Arial" font-weight="900" font-size="720" text-anchor="middle" fill="#111" stroke="#fff" stroke-width="14" paint-order="stroke">V</text>
</svg>`,

// ═══════════════════════════════════════════════════
// W — OCEAN STORM: massive bølger, lynnedslag i havet, W i ocean-guld
W: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <linearGradient id="wbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000c18"/><stop offset="40%" stop-color="#001830"/><stop offset="100%" stop-color="#003060"/></linearGradient>
  <linearGradient id="wl" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFB700"/><stop offset="50%" stop-color="#fff"/><stop offset="100%" stop-color="#4fc3f7"/></linearGradient>
  <radialGradient id="wmoon" cx="80%" cy="15%" r="20%"><stop offset="0%" stop-color="#fffde7" stop-opacity="0.4"/><stop offset="100%" stop-color="transparent"/></radialGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#wbg)"/>
<rect width="${S}" height="${S}" fill="url(#wmoon)"/>
<circle cx="820" cy="120" r="55" fill="#fffde7" opacity="0.7"/>
<circle cx="820" cy="120" r="48" fill="#ffee88" opacity="0.9"/>
${Array.from({length:40},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*17,400,20)}" r="${i%5===0?2.5:1}" fill="#fff" opacity="${0.15+(i%4)*0.1}"/>`).join('')}
${Array.from({length:14},(_,i)=>`<path d="M ${-60} ${200+i*60} Q ${100} ${140+i*60} ${250} ${200+i*60} Q ${400} ${260+i*60} ${500} ${200+i*60} Q ${600} ${140+i*60} ${750} ${200+i*60} Q ${900} ${260+i*60} ${1060} ${200+i*60}" fill="none" stroke="${i<5?'#4fc3f7':i<10?'#0088cc':'#005588'}" stroke-width="${i<5?5:i<10?7:4}" opacity="${i<5?0.7:i<10?0.5:0.35}"/>`).join('')}
${Array.from({length:8},(_,i)=>`<ellipse cx="${120+i*100}" cy="${650+i%3*30}" rx="${40+i*10}" ry="${15+i*5}" fill="#fff" opacity="${0.15+i%3*0.05}" transform="rotate(${i*5-10} ${120+i*100} ${650+i%3*30})"/>`).join('')}
${[['#FFFF00',280,0,230,280,310,580,260,950],['#00FFFF',700,0,760,220,680,500,720,950]].map(([c,...pts])=>`<polyline points="${pts.join(',')}" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" filter="url(#G)" opacity="0.9"/><polyline points="${pts.join(',')}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`).join('')}
${bigLetter('W',500,830,760,'url(#wl)','#001830','#FFB700',5,'#4fc3f7')}
</svg>`,

// ═══════════════════════════════════════════════════
// X — CROSSFIRE NUCLEAR: 8 neon-energistråler krydser, shockwave, X i hvid kerne
X: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="xbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#200010"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <radialGradient id="xboom" cx="50%" cy="50%" r="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.95"/><stop offset="25%" stop-color="#FF006E" stop-opacity="0.5"/><stop offset="60%" stop-color="#8338EC" stop-opacity="0.2"/><stop offset="100%" stop-color="transparent"/></radialGradient>
  <linearGradient id="xl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FF006E"/><stop offset="33%" stop-color="#fff"/><stop offset="66%" stop-color="#00F5D4"/><stop offset="100%" stop-color="#FF006E"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#xbg)"/>
${['#FF006E','#FFD700','#00F5D4','#8338EC','#FF4500','#00FFFF','#FF48C4','#ADFF2F'].map((c,i)=>`<line x1="${500+480*Math.cos(i*Math.PI/4)}" y1="${500+480*Math.sin(i*Math.PI/4)}" x2="${500-480*Math.cos(i*Math.PI/4)}" y2="${500-480*Math.sin(i*Math.PI/4)}" stroke="${c}" stroke-width="8" opacity="0.65" filter="url(#G)"/><line x1="${500+480*Math.cos(i*Math.PI/4)}" y1="${500+480*Math.sin(i*Math.PI/4)}" x2="${500-480*Math.cos(i*Math.PI/4)}" y2="${500-480*Math.sin(i*Math.PI/4)}" stroke="#fff" stroke-width="2.5" opacity="0.4"/>`).join('')}
${Array.from({length:6},(_,i)=>`<circle cx="500" cy="500" r="${50+i*72}" fill="none" stroke="${['#FF006E','#FFD700','#00F5D4','#8338EC','#FF4500','#00FFFF'][i]}" stroke-width="${4-i*0.4}" opacity="${0.45-i*0.05}"/>`).join('')}
<rect width="${S}" height="${S}" fill="url(#xboom)" opacity="0.9"/>
${Array.from({length:50},(_,i)=>sparkle(rnd(i*13,900,50),rnd(i*19,900,50),4+(i%6)*4,['#FF006E','#FFD700','#00F5D4','#8338EC','#FF4500','#fff'][i%6],0.8+(i%3)*0.06)).join('')}
${bigLetter('X',500,700,700,'url(#xl)','#000','#FF006E',4,'#fff')}
</svg>`,

// ═══════════════════════════════════════════════════
// Y — YIN-YANG SUPERNOVA: kosmisk yin-yang med galaksehalvdele + Y i glødende guld
Y: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="yang" cx="45%" cy="35%" r="65%"><stop offset="0%" stop-color="#FF48C4"/><stop offset="50%" stop-color="#8338EC"/><stop offset="100%" stop-color="#3A0CA3"/></radialGradient>
  <radialGradient id="yin" cx="55%" cy="65%" r="65%"><stop offset="0%" stop-color="#00FFFF"/><stop offset="50%" stop-color="#0088BB"/><stop offset="100%" stop-color="#003355"/></radialGradient>
  <linearGradient id="yl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFD700"/><stop offset="40%" stop-color="#fff"/><stop offset="100%" stop-color="#FFA500"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="#000"/>
<circle cx="500" cy="500" r="460" fill="url(#yang)"/>
<path d="M 500 40 A 460 460 0 0 1 500 960 A 230 230 0 0 1 500 500 A 230 230 0 0 0 500 40" fill="url(#yin)"/>
<circle cx="500" cy="270" r="100" fill="url(#yin)"/>
<circle cx="500" cy="730" r="100" fill="url(#yang)"/>
${Array.from({length:40},(_,i)=>{const a=i*Math.PI/20;return `<circle cx="${Math.round(500+240*Math.cos(a))}" cy="${Math.round(270+240*Math.sin(a))}" r="2" fill="#00FFFF" opacity="${0.2+(i%4)*0.1}"/>`}).join('')}
${Array.from({length:40},(_,i)=>{const a=i*Math.PI/20;return `<circle cx="${Math.round(500+240*Math.cos(a))}" cy="${Math.round(730+240*Math.sin(a))}" r="2" fill="#FF48C4" opacity="${0.2+(i%4)*0.1}"/>`}).join('')}
<circle cx="500" cy="270" r="35" fill="#fff" opacity="0.95" filter="url(#g2)"/>
<circle cx="500" cy="730" r="35" fill="#000" opacity="0.9"/>
<circle cx="500" cy="730" r="20" fill="#FF48C4" opacity="0.7"/>
${Array.from({length:28},(_,i)=>`<circle cx="${500+460*Math.cos(i*Math.PI/14)}" cy="${500+460*Math.sin(i*Math.PI/14)}" r="${i%2===0?10:6}" fill="${i%4<2?'#FFD700':'#fff'}" opacity="0.9" filter="url(#g2)"/>`).join('')}
${Array.from({length:50},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*17,960,20)}" r="${i%6===0?2.5:1.2}" fill="#fff" opacity="${0.1+(i%5)*0.06}"/>`).join('')}
${bigLetter('Y',500,710,700,'url(#yl)','#000','#FFD700',5,'#FFD700')}
</svg>`,

// ═══════════════════════════════════════════════════
// Z — ZIGZAG RAVE MAXIMUM: 8 farverige lynbolte + glitch-effekt + Z i neon
Z: `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><defs>${filters}
  <radialGradient id="zbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#0a0020"/><stop offset="60%" stop-color="#05000e"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <linearGradient id="zl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#39FF14"/><stop offset="40%" stop-color="#ADFF2F"/><stop offset="100%" stop-color="#39FF14"/></linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="url(#zbg)"/>
${Array.from({length:8},(_,i)=>`<rect x="0" y="${i*130}" width="${S}" height="2" fill="hsl(${200+i*20},100%,60%)" opacity="0.06"/>`).join('')}
${[['#FFFF00',80,0,40,220,110,460,50,900],['#FF00FF',930,0,960,200,890,440,950,900],['#00FFFF',310,0,220,240,360,490,280,900],['#FF4500',690,0,780,260,660,510,730,900],['#39FF14',500,0,420,300,560,500,500,900],['#FF48C4',170,0,100,350,220,620,150,950],['#FFD700',820,0,900,350,780,600,850,950],['#00FFFF',450,0,520,280,460,520,440,900]].map(([c,...pts])=>`
  <polyline points="${pts.join(',')}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#G)" opacity="0.85"/>
  <polyline points="${pts.join(',')}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
  <polyline points="${pts.join(',')}" fill="none" stroke="${c}" stroke-width="14" stroke-linecap="round" opacity="0.08" filter="url(#softer)"/>`).join('')}
${Array.from({length:50},(_,i)=>`<circle cx="${rnd(i*13,960,20)}" cy="${rnd(i*17,960,20)}" r="${i%5===0?4:2}" fill="${['#39FF14','#FFFF00','#FF00FF','#00FFFF','#FF4500'][i%5]}" opacity="${0.25+(i%5)*0.12}" filter="url(#g2)"/>`).join('')}
${Array.from({length:20},(_,i)=>sparkle(rnd(i*19,900,50),rnd(i*23,900,50),6+(i%5)*4,['#39FF14','#FFFF00','#FF00FF','#00FFFF'][i%4],0.85)).join('')}
<circle cx="500" cy="500" r="280" fill="#39FF14" opacity="0.04" filter="url(#softer)"/>
${bigLetter('Z',500,700,700,'url(#zl)','#000','#39FF14',5,'#39FF14')}
</svg>`,

}

for (const [letter, svg] of Object.entries(designs)) {
  await save(letter, svg)
}
console.log('\n🔥 Alle 26 covers — MAXIMUM WOW!')
