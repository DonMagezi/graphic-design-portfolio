/* Motion layer: loader, split-text, smooth scroll, theme switching, hero shader, reveals */
(() => {
    const root = document.documentElement;
    const body = document.body;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];

    /* ── Smooth scroll (Lenis) ── */
    let lenis = null;
    if (window.Lenis && !reduce) {
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        window.lenis = lenis;
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
        $$('a[href^="#"]').forEach(a => {
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            a.addEventListener('click', (e) => {
                const target = $(id);
                if (!target) return;
                e.preventDefault();
                lenis.scrollTo(target, { offset: id === '#hero' ? 0 : 0, duration: 1.4 });
            });
        });
        const pause = () => {
            const locked = $('#projectModal')?.classList.contains('active') || $('#contactModal')?.classList.contains('active') || $('.navbar')?.classList.contains('active');
            locked ? lenis.stop() : lenis.start();
        };
        ['#projectModal', '#contactModal', '.navbar'].forEach(sel => {
            const el = $(sel);
            if (el) new MutationObserver(pause).observe(el, { attributes: true, attributeFilter: ['class'] });
        });
    } else {
        root.style.scrollBehavior = reduce ? 'auto' : 'smooth';
    }

    /* ── Split text ── */
    const splitEls = $$('[data-split]');
    splitEls.forEach(el => {
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        const mode = el.dataset.split;
        el.setAttribute('aria-label', text);
        el.textContent = '';
        let i = 0;
        text.split(' ').forEach((word, wi, arr) => {
            const w = document.createElement('span');
            w.setAttribute('aria-hidden', 'true');
            w.style.cssText = 'display:inline-block;white-space:nowrap';
            if (mode === 'chars') {
                [...word].forEach(ch => {
                    const s = document.createElement('span');
                    s.className = 'split-unit'; s.style.setProperty('--i', i++); s.textContent = ch;
                    w.appendChild(s);
                });
            } else {
                const s = document.createElement('span');
                s.className = 'split-unit'; s.style.setProperty('--i', i++); s.textContent = word;
                w.appendChild(s);
            }
            el.appendChild(w);
            if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
        });
        el.classList.add('split-hidden');
    });
    const reveal = (el) => el.classList.add('split-in');
    const heroTitle = $('#hero h1[data-split]');
    const splitIO = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) { reveal(en.target); splitIO.unobserve(en.target); } });
    }, { threshold: 0.35 });
    splitEls.filter(el => el !== heroTitle).forEach(el => splitIO.observe(el));

    /* ── Loader + hero entrance ── */
    const loader = $('.loader');
    const startHero = () => {
        body.classList.add('hero-ready');
        if (heroTitle) reveal(heroTitle);
        lenis && lenis.start();
        body.style.overflow = '';
    };
    if (loader && !reduce) {
        lenis ? lenis.stop() : (body.style.overflow = 'hidden');
        window.scrollTo(0, 0);
        setTimeout(() => loader.classList.add('done'), 1500);
        setTimeout(startHero, 1950);
        setTimeout(() => loader.classList.add('gone'), 2700);
    } else {
        loader && loader.classList.add('gone');
        body.classList.add('no-loader');
        startHero();
        splitEls.forEach(reveal);
    }

    /* ── Theme switching by section ── */
    const themeIO = new IntersectionObserver((entries) => {
        entries.forEach(en => {
            if (en.isIntersecting) body.dataset.theme = en.target.dataset.themeSection;
        });
    }, { rootMargin: '-50% 0px -50% 0px' });
    $$('[data-theme-section]').forEach(s => themeIO.observe(s));

    /* ── Gallery clip-path reveal ── */
    const tiles = $$('.gallery-item');
    tiles.forEach((t, i) => { if (i % 2) t.classList.add('from-br'); });
    const tileIO = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); tileIO.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    tiles.forEach(t => tileIO.observe(t));

    /* ── Scroll-linked: parallax + rail ── */
    const heroBg = $('.hero-bg');
    const rail = $('.scroll-rail');
    const thumb = $('.scroll-thumb');
    let railTimer;
    const onScroll = () => {
        const y = window.scrollY;
        const vh = window.innerHeight;
        if (!reduce && y < vh * 1.3) {
            if (heroTitle) heroTitle.style.transform = `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0)`;
            if (heroBg) heroBg.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`;
        }
        if (rail && thumb) {
            const max = document.documentElement.scrollHeight - vh;
            const p = max > 0 ? Math.min(1, y / max) : 0;
            const r = rail.clientHeight, th = thumb.clientHeight;
            thumb.style.transform = `translate3d(0, ${(p * (r - th)).toFixed(1)}px, 0)`;
            rail.classList.add('on');
            clearTimeout(railTimer);
            railTimer = setTimeout(() => rail.classList.remove('on'), 1100);
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ── Hero shader: warm, flowing stripes that bend around the pointer ── */
    const canvas = $('.hero-canvas');
    const hero = $('#hero');
    if (canvas && hero) {
        const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
        if (gl) {
            const vsSrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
            const fsSrc = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uPush;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.)),f.x),f.y);}
vec3 pal(float r){
  vec3 c=vec3(.60,.07,.05);
  c=mix(c,vec3(.95,.46,.12),step(.1667,r));
  c=mix(c,vec3(.07,.03,.06),step(.3333,r));
  c=mix(c,vec3(.88,.68,.28),step(.5,r));
  c=mix(c,vec3(.36,.64,.60),step(.6667,r));
  c=mix(c,vec3(.22,.03,.10),step(.8333,r));
  return c;
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y;
  float t=uTime*.06;
  vec2 q=uv;
  q.x+=(n(vec2(uv.y*2.2,t*3.))-.5)*.30+(n(vec2(uv.y*5.+3.,t*5.))-.5)*.09;
  vec2 d=(uv-uMouse)*vec2(asp,1.);
  float m=exp(-dot(d,d)*8.)*uPush;
  q+=d*m*.55/vec2(asp,1.);
  float s=q.x*asp*5.2+n(vec2(q.x*3.,t))*1.4;
  float f=fract(s); float id=floor(s);
  vec3 a=pal(h(vec2(id,1.7))); vec3 b=pal(h(vec2(id+1.,1.7)));
  vec3 col=mix(a,b,smoothstep(.15,.85,f));
  col*=.78+.4*n(vec2(q.x*38.,q.y*.9+t*2.));
  col*=.62+.5*smoothstep(1.2,.2,length((uv-.5)*vec2(1.,1.1)));
  col=pow(col,vec3(1.9))*1.15;
  gl_FragColor=vec4(col,1.);
}`;
            const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
            const prog = gl.createProgram();
            gl.attachShader(prog, mk(gl.VERTEX_SHADER, vsSrc));
            gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fsSrc));
            gl.linkProgram(prog);
            if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                gl.useProgram(prog);
                const buf = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
                const loc = gl.getAttribLocation(prog, 'p');
                gl.enableVertexAttribArray(loc);
                gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
                const u = (n) => gl.getUniformLocation(prog, n);
                const uRes = u('uRes'), uTime = u('uTime'), uMouse = u('uMouse'), uPush = u('uPush');

                const scale = 0.5;
                const resize = () => {
                    canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale));
                    canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale));
                    gl.viewport(0, 0, canvas.width, canvas.height);
                };
                resize();
                window.addEventListener('resize', resize);

                const target = { x: 0.5, y: 0.5 }, cur = { x: 0.5, y: 0.5 };
                let push = 0.25, pushTarget = 0.25, last = performance.now(), idleAt = 0;
                hero.addEventListener('pointermove', (e) => {
                    const r = hero.getBoundingClientRect();
                    const nx = (e.clientX - r.left) / r.width, ny = 1 - (e.clientY - r.top) / r.height;
                    pushTarget = Math.min(1, 0.35 + Math.hypot(nx - target.x, ny - target.y) * 14);
                    target.x = nx; target.y = ny; idleAt = performance.now() + 120;
                });

                let running = false, visible = true, t0 = performance.now();
                const frame = (now) => {
                    if (!running) return;
                    cur.x += (target.x - cur.x) * 0.08; cur.y += (target.y - cur.y) * 0.08;
                    if (now > idleAt) pushTarget = 0.25;
                    push += (pushTarget - push) * 0.06;
                    gl.uniform2f(uRes, canvas.width, canvas.height);
                    gl.uniform1f(uTime, (now - t0) / 1000);
                    gl.uniform2f(uMouse, cur.x, cur.y);
                    gl.uniform1f(uPush, push);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                    requestAnimationFrame(frame);
                };
                const start = () => { if (!running && visible && !document.hidden && !reduce) { running = true; requestAnimationFrame(frame); } };
                const stop = () => { running = false; };

                // First frame immediately so the canvas never shows empty
                gl.uniform2f(uRes, canvas.width, canvas.height);
                gl.uniform1f(uTime, 8);
                gl.uniform2f(uMouse, 0.5, 0.5);
                gl.uniform1f(uPush, 0.25);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                canvas.classList.add('ready');
                heroBg.classList.add('gl');

                new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(hero);
                document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
                start();
            }
        }
    }
})();
