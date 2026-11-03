// R.L. Garth Website - Main JavaScript
// Build: 2026-11-03 10:21:32

console.log('%crlgarth.com', 'font-weight: bold; font-size: 14px; color: #2a4a3e;');
console.log('Build: 2026-11-03 10:21:32');

// ============================================
// CONSTANTS
// ============================================

// One record per page. start is the previous section's end.
// sky is the colour at a mood's midpoint, or at the section start when it has no mood.
// enterSky is the colour on arrival. enter is a stop inside the previous section.
const SECTIONS = [
    { id: 'home', end: 0.15, sky: '#f8f4ef' },
    { id: 'penelope', end: 0.30, sky: '#e0ebe0', spawn: 'fairy', spawnLead: 1 / 3 },
    { id: 'boneeaters', end: 0.47, sky: '#1a1a28', nav: 'dark', mood: 'dark', spawn: 'wraith', spawnInset: 0.02, enter: { at: 0.27, sky: '#6a7080' }, moodLead: 0.05 },
    { id: 'stories', end: 0.65, sky: '#c8b898', nav: 'sepia', mood: 'paper', enterSky: '#3a3530' },
    { id: 'manuscriptic', end: 0.83, sky: '#c8b898', nav: 'sepia', mood: 'paper' },
    { id: 'about', end: 1, sky: '#f8f4ef', enterSky: '#e8dcc8' }
];

SECTIONS.forEach((section, index) => {
    section.start = index === 0 ? 0 : SECTIONS[index - 1].end;
});

function sectionMid(section) {
    return (section.start + section.end) / 2;
}

function moodZone(mood) {
    const run = SECTIONS.filter(section => section.mood === mood);
    if (!run.length) return null;
    const first = run[0];
    const last = run[run.length - 1];
    const peak = sectionMid(first);
    return {
        start: first.start - (first.moodLead || 0),
        peak,
        release: sectionMid(last),
        end: last.end
    };
}

function zoneIntensity(scroll, zone) {
    if (!zone || scroll < zone.start || scroll > zone.end) return 0;
    if (scroll <= zone.peak) {
        return zone.peak === zone.start ? 1 : (scroll - zone.start) / (zone.peak - zone.start);
    }
    if (scroll <= zone.release) return 1;
    return zone.end === zone.release ? 0 : 1 - (scroll - zone.release) / (zone.end - zone.release);
}

function buildSkyStops(sections) {
    const stops = [{ pos: 0, color: sections[0].sky }];
    sections.forEach((section, index) => {
        if (section.enter) stops.push({ pos: section.enter.at, color: section.enter.sky });
        if (section.enterSky) stops.push({ pos: section.start, color: section.enterSky });
        if (section.mood) {
            stops.push({ pos: sectionMid(section), color: section.sky });
        } else if (index > 0 && !section.enterSky) {
            stops.push({ pos: section.start, color: section.sky });
        }
        if (index === sections.length - 1) stops.push({ pos: section.end, color: section.sky });
    });
    return stops;
}

function spawnZone(section) {
    const index = SECTIONS.indexOf(section);
    const prev = SECTIONS[index - 1];
    let start = section.start;
    let end = section.end;
    if (section.spawnLead && prev) {
        start = prev.end - (prev.end - prev.start) * section.spawnLead;
    }
    if (section.spawnInset) end -= section.spawnInset;
    if (section.spawn === 'fairy') {
        const dark = moodZone('dark');
        if (dark) end = dark.start;
    }
    return { start, end };
}

function navRange(name) {
    const run = SECTIONS.filter(section => section.nav === name);
    if (!run.length) return null;
    const first = run[0];
    return {
        start: first.enter ? first.enter.at : first.start,
        end: run[run.length - 1].end
    };
}

const darkZone = moodZone('dark');
const paperZone = moodZone('paper');
const fairyZone = spawnZone(SECTIONS.find(section => section.spawn === 'fairy'));
const wraithZone = spawnZone(SECTIONS.find(section => section.spawn === 'wraith'));
const skyStops = buildSkyStops(SECTIONS);
const navDark = navRange('dark');
const navSepia = navRange('sepia');
const hintFrom = fairyZone.start;
const hintUntil = sectionMid(SECTIONS[SECTIONS.length - 1]);

const CONFIG = {
    // Foliage counts - reduced to ~80 for performance test
    foliage: {
        mobile: { bgLeaves: 5, midLeaves: 8, fgLeaves: 4, flowers: 3, trunks: 4, webs: 3, bones: 2, papers: 2, pencils: 2, boxes: 2, cabinets: 1 },
        desktop: { bgLeaves: 12, midLeaves: 16, fgLeaves: 10, flowers: 5, trunks: 8, webs: 5, bones: 3, papers: 3, pencils: 3, boxes: 3, cabinets: 2 }
    },
    
    // Animation settings
    spreadMultiplier: { mobile: 60, desktop: 120 },
    zoomMultiplier: { mobile: 0.6, desktop: 1.2 },
    darkSpread: { mobile: 15, desktop: 30 },
    paperSpread: { mobile: 15, desktop: 30 },
    scaleMultiplier: { mobile: 0.1, desktop: 0.2 }
};

// ============================================
// INITIALIZATION
// ============================================

// Force scroll to top on page load/reload (unless there's a hash)
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
if (!window.location.hash) {
    window.scrollTo(0, 0);
}

// Detect mobile for simplified experience
const isMobile = window.innerWidth <= 600;

// Detect touch device
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// DOM elements
const viewport = document.getElementById('viewport');
const sky = document.getElementById('sky');
const progress = document.getElementById('progress');
const scrollHint = document.getElementById('scrollHint');
const entryScreen = document.getElementById('entryScreen');
const navBar = document.getElementById('navBar');

// Set current year in footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Update text for touch devices
if (isTouchDevice) {
    const entryText = document.querySelector('.entry-text');
    const scrollHintText = document.querySelector('.scroll-hint span');
    if (entryText) entryText.textContent = 'Swipe to enter';
    if (scrollHintText) scrollHintText.textContent = 'Swipe';
}

function navigateToSection(id) {
    const section = SECTIONS.find(item => item.id === id);
    if (!section) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: sectionMid(section) * maxScroll, behavior: 'smooth' });
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('href').slice(1);
        navigateToSection(id);
        history.pushState(null, null, '#' + id);
    });
});

function handleHash() {
    const id = window.location.hash.slice(1);
    if (SECTIONS.some(section => section.id === id)) {
        setTimeout(() => navigateToSection(id), 100);
    }
}

// Listen for hash changes
window.addEventListener('hashchange', handleHash);

// Handle hash on initial page load
if (window.location.hash) {
    handleHash();
}

// ============================================
// FOLIAGE SYSTEM
// ============================================

const foliageElements = [];
const counts = isMobile ? CONFIG.foliage.mobile : CONFIG.foliage.desktop;

function createFoliageItem(src, opts) {
    const el = document.createElement('div');
    el.className = 'foliage-item';
    
    const size = opts.sizeRange[0] + Math.random() * (opts.sizeRange[1] - opts.sizeRange[0]);
    let x, y, rotation = Math.random() * 360;
    
    if (opts.coverage === 'full') {
        x = -10 + Math.random() * 120;
        y = -10 + Math.random() * 120;
    } else if (opts.coverage === 'edges') {
        const edge = Math.random();
        if (edge < 0.3) { x = -5 + Math.random() * 30; y = Math.random() * 100; }
        else if (edge < 0.6) { x = 70 + Math.random() * 35; y = Math.random() * 100; }
        else if (edge < 0.8) { x = Math.random() * 100; y = -5 + Math.random() * 30; }
        else { x = Math.random() * 100; y = 70 + Math.random() * 35; }
    } else if (opts.coverage === 'vertical') {
        x = -10 + Math.random() * 120;
        y = 20 + Math.random() * 80;
        rotation = -10 + Math.random() * 20;
    } else if (opts.coverage === 'corners') {
        const corner = Math.floor(Math.random() * 4);
        if (corner === 0) { x = -5 + Math.random() * 25; y = -5 + Math.random() * 25; }
        else if (corner === 1) { x = 75 + Math.random() * 30; y = -5 + Math.random() * 25; }
        else if (corner === 2) { x = -5 + Math.random() * 25; y = 75 + Math.random() * 30; }
        else { x = 75 + Math.random() * 30; y = 75 + Math.random() * 30; }
        rotation = Math.random() * 360;
    } else {
        x = 5 + Math.random() * 90;
        y = 5 + Math.random() * 90;
    }
    
    el.style.cssText = `
        width: ${size}px;
        height: ${opts.coverage === 'vertical' ? size * 2.5 : size}px;
        left: ${x}%; top: ${y}%;
        z-index: ${Math.floor(opts.z * 10)};
        opacity: ${opts.opacity};
        filter: blur(${opts.blur || 0}px);
        transform: rotate(${rotation}deg);
    `;
    
    const img = document.createElement('img');
    img.src = src;
    el.appendChild(img);
    
    foliageElements.push({
        el, baseX: x, baseY: y, z: opts.z, rotation, size,
        baseOpacity: opts.opacity, isFlower: src.includes('flower'), 
        isDark: opts.isDark || false, isPaper: opts.isPaper || false
    });
    
    viewport.insertBefore(el, viewport.firstChild);
}

// Create foliage layers - Light/Green theme
for (let i = 0; i < counts.bgLeaves; i++) createFoliageItem('assets/img/leaves.svg', { sizeRange: [80, 150], z: 0.5 + Math.random() * 0.5, opacity: 0.3 + Math.random() * 0.15, blur: 0, coverage: 'full', isDark: false, isPaper: false });
for (let i = 0; i < counts.midLeaves; i++) createFoliageItem('assets/img/leaves.svg', { sizeRange: [120, 220], z: 1 + Math.random() * 1, opacity: 0.6 + Math.random() * 0.2, blur: 0, coverage: 'full', isDark: false, isPaper: false });
for (let i = 0; i < counts.fgLeaves; i++) createFoliageItem('assets/img/leaves.svg', { sizeRange: [180, 320], z: 2 + Math.random() * 1.5, opacity: 0.8 + Math.random() * 0.2, blur: 0, coverage: 'edges', isDark: false, isPaper: false });
for (let i = 0; i < counts.flowers; i++) createFoliageItem('assets/img/flower-pink.svg', { sizeRange: [35, 60], z: 2.5 + Math.random() * 1, opacity: 0.9, blur: 0, coverage: 'scattered', isDark: false, isPaper: false });
for (let i = 0; i < Math.floor(counts.flowers * 0.8); i++) createFoliageItem('assets/img/flower-yellow.svg', { sizeRange: [30, 50], z: 2.5 + Math.random() * 1, opacity: 0.9, blur: 0, coverage: 'scattered', isDark: false, isPaper: false });
for (let i = 0; i < Math.floor(counts.flowers * 0.8); i++) createFoliageItem('assets/img/flower-blue.svg', { sizeRange: [32, 55], z: 2.5 + Math.random() * 1, opacity: 0.9, blur: 0, coverage: 'scattered', isDark: false, isPaper: false });

// Create foliage layers - Dark theme (Bone Eaters)
for (let i = 0; i < counts.trunks; i++) createFoliageItem('assets/img/dark-trunk.svg', { sizeRange: [200, 450], z: 0.5 + Math.random() * 2.5, opacity: 0, blur: 0, coverage: 'vertical', isDark: true, isPaper: false });
for (let i = 0; i < counts.webs; i++) createFoliageItem('assets/img/spider-web.svg', { sizeRange: [100, 200], z: 1 + Math.random() * 2, opacity: 0, blur: 0, coverage: 'corners', isDark: true, isPaper: false });
for (let i = 0; i < counts.bones; i++) createFoliageItem('assets/img/bone.svg', { sizeRange: [60, 120], z: 1.5 + Math.random() * 1.5, opacity: 0, blur: 0, coverage: 'scattered', isDark: true, isPaper: false });

// Create foliage layers - Paper theme (Short Stories)
for (let i = 0; i < counts.papers; i++) createFoliageItem('assets/img/paper.svg', { sizeRange: [60, 100], z: 1 + Math.random() * 1.5, opacity: 0, blur: 0, coverage: 'edges', isDark: false, isPaper: true });
for (let i = 0; i < counts.pencils; i++) createFoliageItem('assets/img/pencil.svg', { sizeRange: [120, 180], z: 1 + Math.random() * 1.5, opacity: 0, blur: 0, coverage: 'full', isDark: false, isPaper: true });
for (let i = 0; i < counts.boxes; i++) createFoliageItem('assets/img/boxes.svg', { sizeRange: [80, 140], z: 1 + Math.random() * 1.5, opacity: 0, blur: 0, coverage: 'full', isDark: false, isPaper: true });
for (let i = 0; i < counts.cabinets; i++) createFoliageItem('assets/img/file-cabinet.svg', { sizeRange: [120, 180], z: 0.8 + Math.random() * 1, opacity: 0, blur: 0, coverage: 'edges', isDark: false, isPaper: true });

// ============================================
// SKY COLOR SYSTEM
// ============================================

function hexToRgb(hex) {
    return { r: parseInt(hex.slice(1,3), 16), g: parseInt(hex.slice(3,5), 16), b: parseInt(hex.slice(5,7), 16) };
}

function interpolateColor(stops, pos) {
    let lower = stops[0], upper = stops[stops.length-1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (pos >= stops[i].pos && pos <= stops[i+1].pos) { lower = stops[i]; upper = stops[i+1]; break; }
    }
    const t = upper.pos === lower.pos ? 0 : (pos - lower.pos) / (upper.pos - lower.pos);
    const c1 = hexToRgb(lower.color), c2 = hexToRgb(upper.color);
    return `rgb(${Math.round(c1.r + (c2.r - c1.r) * t)},${Math.round(c1.g + (c2.g - c1.g) * t)},${Math.round(c1.b + (c2.b - c1.b) * t)})`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getScrollPercent() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return Math.min(1, Math.max(0, window.scrollY / maxScroll));
}

function isInZone(scrollPercent, zone) {
    return scrollPercent >= zone.start && scrollPercent <= zone.end;
}

// ============================================
// MAIN UPDATE LOOP
// ============================================

function update() {
    const scrollPercent = getScrollPercent();
    const spreadMult = isMobile ? CONFIG.spreadMultiplier.mobile : CONFIG.spreadMultiplier.desktop;
    const darkIntensity = zoneIntensity(scrollPercent, darkZone);
    const paperIntensity = zoneIntensity(scrollPercent, paperZone);

    progress.style.width = (scrollPercent * 100) + '%';
    entryScreen.classList.toggle('hidden', scrollPercent > 0.01);
    navBar.classList.toggle('dark', scrollPercent >= navDark.start && scrollPercent < navDark.end);
    navBar.classList.toggle('sepia', scrollPercent >= navSepia.start && scrollPercent < navSepia.end);
    scrollHint.classList.toggle('visible', scrollPercent > hintFrom && scrollPercent < hintUntil);
    
    // Update sky and body background color (body color controls mobile browser bars)
    const currentColor = interpolateColor(skyStops, scrollPercent);
    sky.style.background = currentColor;
    document.body.style.backgroundColor = currentColor;

    const spread = scrollPercent * spreadMult;
    const inDarkZone = scrollPercent > darkZone.start && scrollPercent < darkZone.end;
    const inPaperZone = scrollPercent > paperZone.start && scrollPercent < paperZone.end;

    const zoomMult = isMobile ? CONFIG.zoomMultiplier.mobile : CONFIG.zoomMultiplier.desktop;
    const darkSpread = isMobile ? CONFIG.darkSpread.mobile : CONFIG.darkSpread.desktop;
    const paperSpread = isMobile ? CONFIG.paperSpread.mobile : CONFIG.paperSpread.desktop;
    const scaleMult = isMobile ? CONFIG.scaleMultiplier.mobile : CONFIG.scaleMultiplier.desktop;

    foliageElements.forEach(item => {
        const xFromCenter = item.baseX - 50, yFromCenter = item.baseY - 50;
        const distFromCenter = Math.sqrt(xFromCenter * xFromCenter + yFromCenter * yFromCenter);
        const spreadMultiplier = 0.5 + distFromCenter / 70;
        let moveX, moveY, scale;
        
        if (item.isDark) {
            // Dark zone elements (trunks, webs, bones)
            scale = 0.3 + darkIntensity * item.z * zoomMult;
            moveX = xFromCenter * darkIntensity * darkSpread * item.z / 50;
            moveY = yFromCenter * darkIntensity * darkSpread * item.z / 50;
            item.el.style.opacity = darkIntensity * 0.85;
        } else if (item.isPaper) {
            // Paper zone elements (papers, pencils, boxes) - semi-transparent
            scale = 0.4 + paperIntensity * item.z * zoomMult * 0.7;
            moveX = xFromCenter * paperIntensity * paperSpread * item.z / 50;
            moveY = yFromCenter * paperIntensity * paperSpread * item.z / 50;
            item.el.style.opacity = paperIntensity * 0.6;
        } else {
            // Normal light elements (leaves, flowers)
            moveX = xFromCenter * spread * item.z * spreadMultiplier / 50;
            moveY = yFromCenter * spread * item.z * spreadMultiplier / 50;
            scale = 1 + scrollPercent * item.z * scaleMult;
            // Fade out in dark and paper zones
            if (inDarkZone) {
                item.el.style.opacity = item.isFlower ? 0.05 : (1 - darkIntensity) * 0.4;
            } else if (inPaperZone) {
                item.el.style.opacity = item.isFlower ? 0.1 : (1 - paperIntensity) * 0.5;
            } else {
                item.el.style.opacity = item.baseOpacity || '';
            }
        }
        
        item.el.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale}) rotate(${item.rotation}deg)`;
    });

    SECTIONS.forEach((sec, index) => {
        const el = document.getElementById(sec.id);
        const center = sectionMid(sec);
        const range = (sec.end - sec.start) / 2 * 0.85;
        let isActive = Math.abs(scrollPercent - center) < range;
        if (index === SECTIONS.length - 1 && scrollPercent >= center) isActive = true;
        el.classList.toggle('active', isActive);
    });
}

// ============================================
// FAIRY SPAWNING SYSTEM
// ============================================

const fairyImages = ['assets/img/fairy-pink.png', 'assets/img/fairy-yellow.png'];
let fairyActive = false, fairyTimeout = null;

function spawnFairy() {
    const scrollPercent = getScrollPercent();
    if (fairyActive || !isInZone(scrollPercent, fairyZone)) {
        if (isInZone(scrollPercent, fairyZone)) scheduleNextFairy();
        return;
    }
    fairyActive = true;
    
    const fairy = document.createElement('img');
    fairy.src = fairyImages[Math.floor(Math.random() * fairyImages.length)];
    const goingLeft = Math.random() > 0.5;
    const startY = 5 + Math.random() * 90;
    const size = 30 + Math.random() * 20;
    const duration = 7 + Math.random() * 4;
    
    fairy.style.width = size + 'px';
    fairy.style.setProperty('--duration', duration + 's');
    fairy.style.top = startY + 'vh';
    fairy.style.zIndex = Math.floor(1 + Math.random() * 25);
    fairy.className = goingLeft ? 'fairy right-to-left' : 'fairy left-to-right';
    
    viewport.appendChild(fairy);
    setTimeout(() => { fairy.remove(); fairyActive = false; scheduleNextFairy(); }, (duration + 0.5) * 1000);
}

function scheduleNextFairy() {
    if (fairyTimeout) clearTimeout(fairyTimeout);
    if (!isInZone(getScrollPercent(), fairyZone)) return;
    fairyTimeout = setTimeout(spawnFairy, 2000 + Math.random() * 6000);
}

function stopFairies() {
    if (fairyTimeout) { clearTimeout(fairyTimeout); fairyTimeout = null; }
    document.querySelectorAll('.fairy').forEach(f => {
        f.style.transition = 'opacity 0.4s ease-out';
        f.style.opacity = '0';
        setTimeout(() => f.remove(), 400);
    });
    fairyActive = false;
}

// ============================================
// DARK FAIRY (WRAITH) SPAWNING SYSTEM
// ============================================

const darkFairyImages = ['assets/img/dark-fairy.png', 'assets/img/dark-fairy-2.png'];
let wraithActive = false, wraithTimeout = null;

function spawnWraith() {
    const scrollPercent = getScrollPercent();
    if (wraithActive || !isInZone(scrollPercent, wraithZone)) {
        if (isInZone(scrollPercent, wraithZone)) scheduleNextWraith();
        return;
    }
    wraithActive = true;
    
    const wraith = document.createElement('img');
    wraith.src = darkFairyImages[Math.floor(Math.random() * darkFairyImages.length)];
    const goingLeft = Math.random() > 0.5;
    const angle = (Math.random() - 0.5) * 60;
    const verticalOffset = Math.tan(angle * Math.PI / 180) * 100;
    const startY = 20 + Math.random() * 50;
    const endY = Math.max(5, Math.min(85, startY + verticalOffset));
    const size = 30 + Math.random() * 20;
    const duration = 7.5 + Math.random() * 4.5;
    
    wraith.style.width = size + 'px';
    wraith.style.setProperty('--duration', duration + 's');
    wraith.style.setProperty('--start-y', startY + 'vh');
    wraith.style.setProperty('--end-y', endY + 'vh');
    wraith.style.setProperty('--scale', 0.8 + Math.random() * 0.5);
    wraith.style.zIndex = Math.floor(5 + Math.random() * 25);
    wraith.className = `wraith ${goingLeft ? 'right-to-left' : 'left-to-right'}`;
    
    viewport.appendChild(wraith);
    setTimeout(() => { wraith.remove(); wraithActive = false; scheduleNextWraith(); }, (duration + 0.5) * 1000);
}

function scheduleNextWraith() {
    if (wraithTimeout) clearTimeout(wraithTimeout);
    if (!isInZone(getScrollPercent(), wraithZone)) return;
    wraithTimeout = setTimeout(spawnWraith, 3000 + Math.random() * 7000);
}

function stopWraiths() {
    if (wraithTimeout) { clearTimeout(wraithTimeout); wraithTimeout = null; }
    document.querySelectorAll('.wraith').forEach(w => w.remove());
    wraithActive = false;
}

// ============================================
// EXCERPT MODAL
// ============================================

function openExcerpt(excerptName) {
    const modal = document.getElementById('excerptModal');
    const content = document.getElementById('excerptContent');
    
    fetch(`/assets/content/excerpt-${excerptName}.html`)
        .then(r => {
            if (!r.ok) throw new Error('Excerpt not found');
            return r.text();
        })
        .then(html => {
            content.innerHTML = html;
            // Set background based on story type
            if (excerptName.includes('bone-eaters')) {
                content.style.background = '#0d0d14';
            } else if (excerptName.includes('remys-boxes')) {
                content.style.background = '#f5f0e6';
            } else {
                content.style.background = '#fefdfb';
            }
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
            // Scroll to top after modal opens (needs slight delay for render)
            requestAnimationFrame(() => {
                content.scrollTop = 0;
            });
        })
        .catch(err => {
            console.error('Failed to load excerpt:', err);
            content.innerHTML = '<div class="excerpt-body"><p>Sorry, this excerpt could not be loaded.</p></div>';
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
}

function closeExcerpt() {
    document.getElementById('excerptModal').classList.remove('open');
    document.body.style.overflow = '';
}

// Expose to window for onclick handlers
window.openExcerpt = openExcerpt;
window.closeExcerpt = closeExcerpt;

// ============================================
// CONSOLIDATED SCROLL HANDLER
// ============================================

let ticking = false;
let wasInFairyZone = false;
let wasInWraithZone = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(() => {
            update();
            
            // Fairy zone management
            const scrollPercent = getScrollPercent();
            const inFairyZone = isInZone(scrollPercent, fairyZone);
            const inWraithZone = isInZone(scrollPercent, wraithZone);
            
            if (inFairyZone && !wasInFairyZone) {
                fairyTimeout = setTimeout(spawnFairy, 1000);
            } else if (!inFairyZone && wasInFairyZone) {
                stopFairies();
            }
            
            if (inWraithZone && !wasInWraithZone) {
                wraithTimeout = setTimeout(spawnWraith, 1500);
            } else if (!inWraithZone && wasInWraithZone) {
                stopWraiths();
            }
            
            wasInFairyZone = inFairyZone;
            wasInWraithZone = inWraithZone;
            
            ticking = false;
        });
        ticking = true;
    }
});

// Escape key closes excerpt
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeExcerpt(); });

// Initialize
update();
