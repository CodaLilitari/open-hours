(() => {
    const root = document.getElementById('coda-silk-instrument');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    const svg = root.querySelector('.silk-web');
    const field = root.querySelector('.silk-field');
    const rings = root.querySelector('.silk-rings');
    const threadGroup = root.querySelector('.silk-threads');
    const hub = root.querySelector('.silk-hub');
    const slider = root.querySelector('[data-tension]');
    const output = root.querySelector('[data-tension-value]');
    const soundButton = root.querySelector('[data-sound]');
    const status = root.querySelector('.silk-status');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const offsets = [[0,-.41],[.29,-.29],[.41,0],[.29,.29],[0,.41],[-.29,.29],[-.41,0],[-.29,-.29]];
    const baseNotes = [130.8128,146.8324,164.8138,195.9977,220,261.6256,293.6648,329.6276];
    const ns = 'http://www.w3.org/2000/svg';
    const paths = offsets.map(() => {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('class', 'silk-thread');
      threadGroup.appendChild(p);
      return p;
    });
    const ringPaths = [.24,.43,.62,.81].map(() => {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('class', 'silk-ring');
      rings.appendChild(p);
      return p;
    });
    const active = new Map();
    const voices = [];
    let width = 320, tension = 1, frame = 0, audio = null, master = null;
    let sound = false, enabling = false, soundEpoch = 0;
    function restore(saved) {
      const value = saved;
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      tension = Math.max(.5, Math.min(2, value));
      slider.value = String(tension);
      output.textContent = tension.toFixed(2) + '×';
      slider.setAttribute('aria-valuetext', tension.toFixed(2) + ' times tension');
    }
    try {
      const saved = localStorage.getItem('coda-silk-tension');
      if (saved !== null) restore(Number(saved));
    } catch (_) { /* The instrument also works when storage is unavailable. */ }
    function save() {
      try { localStorage.setItem('coda-silk-tension', String(tension)); } catch (_) {} 
    }
    function draw(now = performance.now()) {
      const c = width / 2;
      paths.forEach((path, i) => {
        const at = active.get(i);
        const elapsed = at === undefined ? Infinity : now - at;
        if (elapsed > 850) active.delete(i);
        const live = active.has(i);
        path.classList.toggle('struck', live);
        const [dx,dy] = offsets[i];
        const length = Math.hypot(dx,dy);
        const amp = live && !reducedMotion.matches ? 5 * Math.exp(-elapsed / 210) : 0;
        const points = [];
        for (let j = 0; j <= 24; j++) {
          const f = j / 24;
          const wave = amp === 0 ? 0 : amp * Math.sin(Math.PI * f * 3) * Math.sin(elapsed * .04);
          points.push((c + dx * width * f - dy / length * wave).toFixed(2) + ',' + (c + dy * width * f + dx / length * wave).toFixed(2));
        }
        path.setAttribute('d', 'M' + points.join(' L'));
      });
    }
    function animate(now) {
      frame = 0;
      if (!root.isConnected || document.hidden) { active.clear(); return; }
      draw(now);
      if (active.size) frame = requestAnimationFrame(animate);
    }
    function resize() {
      width = field.getBoundingClientRect().width || 320;
      const c = width / 2;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + width);
      hub.setAttribute('cx', c);
      hub.setAttribute('cy', c);
      ringPaths.forEach((path, n) => {
        const scale = [.24,.43,.62,.81][n];
        path.setAttribute('d', 'M' + offsets.map(([x,y]) => (c+x*width*scale).toFixed(2)+','+(c+y*width*scale).toFixed(2)).join(' L') + ' Z');
      });
      draw();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    resize();
    function stopVoices() {
      voices.splice(0).forEach(v => v.stop());
    }
    function disableSound() {
      soundEpoch++;
      sound = false;
      stopVoices();
      soundButton.textContent = 'Enable sound';
      soundButton.setAttribute('aria-pressed', 'false');
    }
    function chime(frequency) {
      if (!sound || !audio || audio.state !== 'running') return false;
      while (voices.length >= 8) voices.shift().stop();
      const start = audio.currentTime;
      const gain = audio.createGain();
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(.14, start + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, start + 1.65);
      gain.connect(master);
      const oscillators = [1,2.01,3.98].map((ratio, index) => {
        const osc = audio.createOscillator();
        const partial = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency * ratio, start);
        partial.gain.value = [1,.22,.09][index];
        osc.connect(partial);
        partial.connect(gain);
        osc.start(start);
        osc.stop(start + 1.7);
        osc.onended = () => { osc.disconnect(); partial.disconnect(); };
        return osc;
      });
      let stopped = false;
      const voice = { stop() {
        if (stopped) return;
        stopped = true;
        gain.disconnect();
        oscillators.forEach(o => { try { o.stop(); } catch (_) {} });
      }};
      voices.push(voice);
      setTimeout(() => {
        voice.stop();
        const i = voices.indexOf(voice);
        if (i !== -1) voices.splice(i,1);
      }, 1800);
      return true;
    }
    root.querySelectorAll('[data-thread]').forEach(button => button.addEventListener('click', () => {
      const i = Number(button.dataset.thread);
      const frequency = baseNotes[i] * Math.sqrt(tension);
      active.set(i, performance.now());
      draw();
      if (!frame) frame = requestAnimationFrame(animate);
      const played = chime(frequency);
      status.textContent = 'Thread ' + (i+1) + ' · ' + Math.round(frequency) + ' Hz' + (played ? '' : ' · sound is off');
    }));
    slider.addEventListener('input', () => {
      tension = Number(slider.value);
      output.textContent = tension.toFixed(2) + '×';
      slider.setAttribute('aria-valuetext', tension.toFixed(2) + ' times tension');
    });
    slider.addEventListener('change', save);
    soundButton.addEventListener('click', async () => {
      if (enabling) return;
      if (sound) { disableSound(); status.textContent = 'Sound is off.'; return; }
      const epoch = ++soundEpoch;
      enabling = true;
      soundButton.disabled = true;
      try {
        const AudioEngine = window.AudioContext || window.webkitAudioContext;
        if (!AudioEngine) throw new Error('Audio unavailable');
        if (!audio) {
          audio = new AudioEngine();
          master = audio.createGain();
          master.gain.value = .28;
          const limiter = audio.createDynamicsCompressor();
          limiter.threshold.value = -18;
          limiter.ratio.value = 8;
          master.connect(limiter);
          limiter.connect(audio.destination);
        }
        await audio.resume();
        if (epoch !== soundEpoch || document.hidden || !root.isConnected) return;
        if (audio.state !== 'running') throw new Error('Audio unavailable');
        sound = true;
        soundButton.textContent = 'Mute sound';
        soundButton.setAttribute('aria-pressed', 'true');
        status.textContent = 'Sound is on.';
      } catch (_) {
        disableSound();
        status.textContent = 'Sound is unavailable in this view. The threads still respond.';
      } finally { enabling = false; soundButton.disabled = false; }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      disableSound();
      active.clear();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      draw();
      status.textContent = 'Sound is off.';
    });
  })();