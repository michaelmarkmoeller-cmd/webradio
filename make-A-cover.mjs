import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const svg = `<svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF006E"/>
      <stop offset="50%" stop-color="#8338EC"/>
      <stop offset="100%" stop-color="#3A86FF"/>
    </linearGradient>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FDDBB4"/>
      <stop offset="100%" stop-color="#E8A87C"/>
    </linearGradient>
    <linearGradient id="dress" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFE566"/>
      <stop offset="100%" stop-color="#FF9500"/>
    </linearGradient>
    <radialGradient id="face" cx="45%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FDDBB4"/>
      <stop offset="100%" stop-color="#D4956A"/>
    </radialGradient>
    <filter id="shadow"><feDropShadow dx="6" dy="6" stdDeviation="10" flood-opacity="0.4"/></filter>
    <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <!-- Baggrund -->
  <rect width="1000" height="1000" fill="url(#bg)"/>
  <circle cx="150" cy="120" r="90" fill="#FFE566" opacity="0.15"/>
  <circle cx="900" cy="880" r="130" fill="#3A86FF" opacity="0.2"/>
  <circle cx="880" cy="130" r="65" fill="#FF006E" opacity="0.18"/>

  <!-- Stort A i baggrunden - forskudt til højre -->
  <text x="600" y="950" font-family="Arial Black,Arial" font-weight="900" font-size="950"
    text-anchor="middle" fill="#fff" opacity="0.1">A</text>
  <text x="600" y="950" font-family="Arial Black,Arial" font-weight="900" font-size="950"
    text-anchor="middle" fill="#FFE566" stroke="#FF006E" stroke-width="5"
    paint-order="stroke" opacity="0.82">A</text>

  <!-- === KVINDE - stor figur til venstre === -->

  <!-- Hår baglag (langt) -->
  <path d="M 295 138 C 248 118 222 158 218 210 C 215 258 228 308 242 355
           C 238 320 230 275 235 228 C 240 178 262 148 308 132 Z" fill="#1C0800"/>
  <path d="M 218 250 C 208 310 205 390 212 465 C 215 498 220 522 224 545
           C 210 495 205 435 208 368 C 211 305 216 268 220 240 Z" fill="#280C00"/>
  <path d="M 388 132 C 435 118 462 155 466 208 C 468 255 457 306 444 352
           C 448 316 456 272 452 225 C 448 178 426 145 388 132 Z" fill="#1C0800"/>
  <path d="M 466 248 C 476 308 478 380 472 452 C 468 490 462 518 456 542
           C 470 492 475 432 472 366 C 470 302 465 264 462 240 Z" fill="#280C00"/>

  <!-- Hals -->
  <path d="M 318 300 C 316 318 314 338 313 358 L 368 358 C 367 338 365 318 363 300 Z"
    fill="url(#skin)"/>

  <!-- Hoved -->
  <ellipse cx="340" cy="208" rx="88" ry="98" fill="url(#face)"/>

  <!-- Hår forside/pandehår -->
  <path d="M 254 195 C 262 148 295 128 340 126 C 385 126 420 148 428 195
           C 418 165 400 148 340 146 C 280 146 262 168 254 195 Z" fill="#1C0800"/>
  <path d="M 254 202 C 250 225 252 252 260 278 C 252 262 250 234 252 208 Z" fill="#1C0800"/>
  <path d="M 428 202 C 432 225 430 252 422 278 C 430 262 432 234 430 208 Z" fill="#1C0800"/>

  <!-- Øjenbryn -->
  <path d="M 292 178 C 305 168 320 166 336 170" fill="none" stroke="#2C1005"
    stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 344 170 C 360 166 375 168 388 178" fill="none" stroke="#2C1005"
    stroke-width="4.5" stroke-linecap="round"/>

  <!-- Øjne -->
  <ellipse cx="314" cy="194" rx="18" ry="13" fill="#fff"/>
  <ellipse cx="368" cy="194" rx="18" ry="13" fill="#fff"/>
  <circle cx="316" cy="195" r="10" fill="#5C3317"/>
  <circle cx="370" cy="195" r="10" fill="#5C3317"/>
  <circle cx="316" cy="195" r="6" fill="#111"/>
  <circle cx="370" cy="195" r="6" fill="#111"/>
  <circle cx="319" cy="192" r="3" fill="#fff"/>
  <circle cx="373" cy="192" r="3" fill="#fff"/>
  <!-- Øjenlåg -->
  <path d="M 296 187 C 306 180 326 180 332 187" fill="none" stroke="#2C1005"
    stroke-width="3" stroke-linecap="round"/>
  <path d="M 350 187 C 358 180 382 180 386 187" fill="none" stroke="#2C1005"
    stroke-width="3" stroke-linecap="round"/>
  <!-- Nedre øjenlåg -->
  <path d="M 296 200 C 306 207 326 207 332 200" fill="none" stroke="#C07050"
    stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <path d="M 350 200 C 358 207 382 207 386 200" fill="none" stroke="#C07050"
    stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>

  <!-- Næse -->
  <path d="M 338 205 C 336 222 330 234 324 240 C 332 244 350 245 358 240
           C 352 234 346 222 342 205 Z" fill="#C07050" opacity="0.4"/>

  <!-- Mund -->
  <path d="M 313 263 C 328 274 352 274 368 263" fill="#E0506A" stroke="none"/>
  <path d="M 313 263 C 328 256 352 256 368 263" fill="#FF8090" stroke="none"/>
  <path d="M 313 263 C 328 274 352 274 368 263" fill="none" stroke="#B03050"
    stroke-width="1.5" stroke-linecap="round"/>

  <!-- Kinder -->
  <ellipse cx="292" cy="238" rx="24" ry="15" fill="#FF9090" opacity="0.22"/>
  <ellipse cx="390" cy="238" rx="24" ry="15" fill="#FF9090" opacity="0.22"/>

  <!-- Øreringe -->
  <circle cx="254" cy="228" r="8" fill="#FFE566" stroke="#FF9500" stroke-width="2"/>
  <ellipse cx="254" cy="244" rx="5" ry="8" fill="#FFE566" stroke="#FF9500" stroke-width="1.5"/>

  <!-- Skulder/top af kjole -->
  <path d="M 198 362 C 175 378 158 408 162 448 C 165 478 175 500 180 528
           L 498 528 C 503 500 513 478 516 448 C 520 408 503 378 480 362
           C 458 350 425 344 365 344 L 313 344 C 258 344 222 350 198 362 Z"
    fill="#FFE566" stroke="#FF9500" stroke-width="2"/>

  <!-- Kjole detalje - bælte -->
  <path d="M 175 528 C 172 545 170 555 170 565 L 508 565 C 508 555 506 545 503 528 Z"
    fill="#FF9500"/>

  <!-- Arm venstre - strakt op og holder i A's spids -->
  <path d="M 183 400 C 168 372 148 338 132 298 C 120 266 115 235 122 208
           C 130 182 145 165 158 158"
    fill="none" stroke="#FDDBB4" stroke-width="36" stroke-linecap="round"/>
  <path d="M 183 400 C 168 372 148 338 132 298 C 120 266 115 235 122 208
           C 130 182 145 165 158 158"
    fill="none" stroke="#E8A87C" stroke-width="28" stroke-linecap="round"/>
  <!-- Hånd venstre -->
  <ellipse cx="157" cy="154" rx="22" ry="18" fill="#FDDBB4" stroke="#D4956A" stroke-width="2"/>
  <!-- Fingre -->
  <path d="M 140 148 C 135 138 132 125 136 115" fill="none" stroke="#FDDBB4" stroke-width="7" stroke-linecap="round"/>
  <path d="M 150 143 C 146 132 144 118 148 108" fill="none" stroke="#FDDBB4" stroke-width="7" stroke-linecap="round"/>
  <path d="M 162 140 C 160 129 160 115 165 106" fill="none" stroke="#FDDBB4" stroke-width="7" stroke-linecap="round"/>
  <path d="M 173 144 C 174 133 176 120 182 112" fill="none" stroke="#FDDBB4" stroke-width="7" stroke-linecap="round"/>

  <!-- Arm højre - ned langs siden, lettere bøjet -->
  <path d="M 495 400 C 515 440 524 488 520 538 C 517 562 510 580 500 595"
    fill="none" stroke="#FDDBB4" stroke-width="34" stroke-linecap="round"/>
  <path d="M 495 400 C 515 440 524 488 520 538 C 517 562 510 580 500 595"
    fill="none" stroke="#E8A87C" stroke-width="26" stroke-linecap="round"/>
  <!-- Hånd højre -->
  <ellipse cx="498" cy="600" rx="20" ry="24" fill="#FDDBB4" stroke="#D4956A" stroke-width="2"/>

  <!-- Kjoleskørt -->
  <path d="M 168 565 C 148 628 135 700 132 768 C 128 820 132 868 140 900
           C 185 920 268 932 350 932 C 432 932 515 920 558 900
           C 566 868 570 820 566 768 C 563 700 550 628 530 565 Z"
    fill="#FFE566" stroke="#FF9500" stroke-width="1.5"/>

  <!-- Kjole folder/læg -->
  <path d="M 240 568 C 248 650 250 738 244 822 C 242 858 238 885 234 908"
    fill="none" stroke="#FF9500" stroke-width="2.5" opacity="0.45"/>
  <path d="M 350 568 C 350 650 350 738 350 822 C 350 858 350 885 350 908"
    fill="none" stroke="#FF9500" stroke-width="2.5" opacity="0.45"/>
  <path d="M 460 568 C 452 650 450 738 456 822 C 458 858 462 885 466 908"
    fill="none" stroke="#FF9500" stroke-width="2.5" opacity="0.45"/>

  <!-- Ben venstre -->
  <path d="M 258 925 C 252 948 248 968 246 985"
    fill="none" stroke="#E8A87C" stroke-width="38" stroke-linecap="round"/>
  <path d="M 258 925 C 252 948 248 968 246 985"
    fill="none" stroke="#FDDBB4" stroke-width="30" stroke-linecap="round"/>

  <!-- Ben højre -->
  <path d="M 442 925 C 448 948 452 968 454 985"
    fill="none" stroke="#E8A87C" stroke-width="38" stroke-linecap="round"/>
  <path d="M 442 925 C 448 948 452 968 454 985"
    fill="none" stroke="#FDDBB4" stroke-width="30" stroke-linecap="round"/>

  <!-- Sko venstre (høj hæl) -->
  <path d="M 228 985 C 232 992 245 996 260 996 C 275 996 288 992 292 985 Z"
    fill="#1C0800"/>
  <path d="M 246 985 L 244 975 C 244 970 246 967 248 967 C 250 967 252 970 252 975 L 250 985"
    fill="#1C0800"/>

  <!-- Sko højre (høj hæl) -->
  <path d="M 438 985 C 442 992 454 996 470 996 C 484 996 496 992 500 985 Z"
    fill="#1C0800"/>
  <path d="M 454 985 L 452 975 C 452 970 454 967 456 967 C 458 967 460 970 460 975 L 458 985"
    fill="#1C0800"/>

</svg>`

const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer()
await mkdir('Downloaded Covers/A', { recursive: true })
await writeFile('Downloaded Covers/A/folder.jpg', buf)
await writeFile('Downloaded Covers/A.jpg', buf)
console.log('✓ A cover gemt')
