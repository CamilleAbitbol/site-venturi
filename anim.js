/* Animations du site Venturi — sans dépendance.
   Tout ce qui est visuel est en CSS (venturi.css) ; ce fichier ne fait que
   poser des classes (.vu, .colle, .fondu, .actif) et des variables (--p, --mx…). */

(() => {
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tactile = matchMedia('(hover: none)').matches;

  /* 1. Titres mot par mot : chaque mot dans <span class="mot"><span>…</span></span>.
        Les balises internes (<em>) sont conservées. */
  document.querySelectorAll('[data-mots]').forEach((titre) => {
    let n = 0;
    const decoupe = (noeud) => {
      [...noeud.childNodes].forEach((enfant) => {
        if (enfant.nodeType === 3) {
          const frag = document.createDocumentFragment();
          enfant.textContent.split(/(\s+)/).forEach((morceau) => {
            if (!morceau) return;
            if (/^\s+$/.test(morceau)) { frag.append(' '); return; }
            const mot = document.createElement('span');
            mot.className = 'mot';
            const dedans = document.createElement('span');
            dedans.textContent = morceau;
            dedans.style.setProperty('--m', n++);
            mot.append(dedans);
            frag.append(mot);
          });
          enfant.replaceWith(frag);
        } else if (enfant.nodeType === 1) {
          decoupe(enfant);
        }
      });
    };
    decoupe(titre);
  });

  /* 2. Apparition au défilement */
  const io = new IntersectionObserver((entrees) => {
    entrees.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('vu');
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.revele, [data-mots], .observe').forEach((el) => io.observe(el));

  /* Le hero s'anime dès le chargement */
  requestAnimationFrame(() => document.querySelectorAll('.hero .revele, .hero [data-mots]').forEach((el) => el.classList.add('vu')));

  /* 3. Effets liés au défilement : nav, progression, VSL, ligne de méthode, arc final */
  const nav = document.querySelector('.nav');
  const barre = document.querySelector('.progression');
  const vsl = document.querySelector('.vsl');
  const ligne = document.querySelector('.methode');
  const pas = [...document.querySelectorAll('.pas')];
  const appel = document.querySelector('.appel');
  const borne = (x) => Math.min(1, Math.max(0, x));

  const auDefilement = () => {
    const y = scrollY;
    const h = innerHeight;
    nav.classList.toggle('colle', y > 40);
    barre.style.setProperty('--p', y / (document.documentElement.scrollHeight - h));

    if (vsl) {
      const r = vsl.getBoundingClientRect();
      vsl.style.setProperty('--p', calme ? 1 : borne((h - r.top) / (h * 0.75)));
    }
    if (ligne) {
      const r = ligne.getBoundingClientRect();
      const p = borne((h * 0.8 - r.top) / (r.height + h * 0.3));
      ligne.style.setProperty('--p', p);
      pas.forEach((el, i) => el.classList.toggle('actif', p >= i / pas.length + 0.02));
    }
    if (appel) {
      const r = appel.getBoundingClientRect();
      appel.style.setProperty('--p', borne((h - r.top) / h));
    }
  };
  let attente = false;
  addEventListener('scroll', () => {
    if (attente) return;
    attente = true;
    requestAnimationFrame(() => { auDefilement(); attente = false; });
  }, { passive: true });
  auDefilement();

  /* 3 bis. Lucioles du grand cercle du hero : chaque point a une profondeur z
            (0 = loin, 1 = près) qui règle sa taille, son flou, sa vitesse et son
            décalage sous le curseur. */
  const lueur = (coeur, halo) => {
    const s = document.createElement('canvas');
    s.width = s.height = 128;
    const c = s.getContext('2d');
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(255,255,255,${coeur})`);
    g.addColorStop(0.18, `rgba(255,236,214,${halo})`);
    g.addColorStop(1, 'rgba(255,236,214,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    return s;
  };
  const nette = lueur(1, 0.7);
  const floue = lueur(0.5, 0.3);
  let vise = { x: 0, y: 0 };
  if (!calme) addEventListener('pointermove', (e) => {
    vise = { x: e.clientX / innerWidth - 0.5, y: e.clientY / innerHeight - 0.5 };
  }, { passive: true });

  document.querySelectorAll('.lucioles').forEach((toile) => {
    const ctx = toile.getContext('2d');
    const boite = toile.parentElement;
    const densite = +toile.dataset.densite || 4200;
    let L = 0, H = 0, points = [];
    const regard = { x: 0, y: 0 };

    const naitre = (p = {}) => Object.assign(p, {
      z: Math.random() ** 1.8,
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00012, vy: -(0.00004 + Math.random() * 0.0001),
      phase: Math.random() * Math.PI * 2,
      pouls: 0.6 + Math.random() * 1.6,
    });
    const dimensionner = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      L = boite.clientWidth; H = boite.clientHeight;
      toile.width = L * dpr; toile.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(480, L * H / densite));
      while (points.length < n) points.push(naitre());
      points.length = n;
      points.sort((a, b) => a.z - b.z);
    };
    const dessiner = (t) => {
      ctx.clearRect(0, 0, L, H);
      ctx.globalCompositeOperation = 'lighter';
      regard.x += (vise.x - regard.x) * 0.04;
      regard.y += (vise.y - regard.y) * 0.04;
      for (const p of points) {
        const vitesse = 0.3 + p.z * 1.7;
        p.x += (p.vx + Math.sin(t / 2600 + p.phase) * 0.00006) * vitesse;
        p.y += (p.vy + Math.cos(t / 3100 + p.phase) * 0.00004) * vitesse;
        if (p.y < -0.08 || p.x < -0.08 || p.x > 1.08) { naitre(p); p.y = 1.06; }
        const decal = 6 + p.z * 46;
        const x = p.x * L - regard.x * decal;
        const y = p.y * H - regard.y * decal;
        const taille = 2.5 + p.z * p.z * 46;
        const scintille = 0.55 + 0.45 * Math.sin(t / 1000 * p.pouls + p.phase);
        ctx.globalAlpha = Math.min(1, (0.4 + p.z * 0.75) * scintille);
        ctx.drawImage(p.z > 0.72 ? floue : nette, x - taille / 2, y - taille / 2, taille, taille);
      }
      ctx.globalAlpha = 1;
    };

    /* Variante « espace » (?espace dans l'adresse) : les étoiles viennent du fond,
       depuis derrière la VSL, et grossissent en filant vers l'écran. */
    const espace = new URLSearchParams(location.search).has('espace');
    const fuite = { x: 0, y: 0 };
    let avant = 0;
    const etoile = (s = {}, loin = true) => Object.assign(s, {
      x: (Math.random() - 0.5) * 3.4, y: (Math.random() - 0.5) * 3.4,
      z: loin ? 1 : 0.05 + Math.random() * 0.95, e: true,
    });
    const placerFuite = () => {
      const r = boite.getBoundingClientRect();
      const v = document.querySelector('.vsl')?.getBoundingClientRect();
      fuite.x = v ? v.left + v.width / 2 - r.left : L / 2;
      fuite.y = v ? v.top + v.height / 2 - r.top : H / 2;
    };
    const dessinerEspace = (t) => {
      const dt = Math.min(50, t - avant || 16); avant = t;
      ctx.clearRect(0, 0, L, H);
      ctx.globalCompositeOperation = 'lighter';
      regard.x += (vise.x - regard.x) * 0.04;
      regard.y += (vise.y - regard.y) * 0.04;
      const cx = fuite.x - regard.x * 60, cy = fuite.y - regard.y * 60;
      const f = Math.max(L, H) * 0.32;
      ctx.lineCap = 'round';
      for (const s of points) {
        if (!s.e) etoile(s, false);
        const pz = s.z;
        s.z -= dt * 0.00011;
        const x = cx + (s.x / s.z) * f, y = cy + (s.y / s.z) * f;
        if (s.z <= 0.02 || x < -40 || x > L + 40 || y < -40 || y > H + 40) { etoile(s); continue; }
        const px = cx + (s.x / pz) * f, py = cy + (s.y / pz) * f;
        const pres = 1 - s.z;
        ctx.globalAlpha = Math.min(1, pres * pres * 1.4 + 0.3);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1 + pres * pres * 3.4;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        if (pres > 0.55) {
          const taille = pres * pres * 26;
          ctx.drawImage(floue, x - taille / 2, y - taille / 2, taille, taille);
        }
      }
      ctx.globalAlpha = 1;
    };

    dimensionner();
    if (espace) placerFuite();
    new ResizeObserver(() => { dimensionner(); if (espace) placerFuite(); }).observe(boite);
    const peindre = espace ? dessinerEspace : dessiner;
    if (calme) { peindre(0); return; }
    let visible = false, boucle = 0;
    const tour = (t) => { peindre(t); boucle = visible ? requestAnimationFrame(tour) : 0; };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !boucle) boucle = requestAnimationFrame(tour);
    }).observe(boite);
  });

  if (calme) return;

  /* 4. Trame du hero qui s'éclaire sous le curseur */
  const hero = document.querySelector('.hero');
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
    hero.style.setProperty('--my', `${e.clientY - r.top}px`);
  });

  if (!tactile) {
    /* 5. Boutons magnétiques */
    document.querySelectorAll('.aimant').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * 0.18;
        const dy = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.translate = `${dx}px ${dy}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });

    /* 6. Inclinaison 3D des tuiles et maquettes */
    document.querySelectorAll('.incline').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty('--rx', `${-y * 7}deg`);
        c.style.setProperty('--ry', `${x * 9}deg`);
      });
      c.addEventListener('pointerleave', () => {
        c.style.setProperty('--rx', '0deg');
        c.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* 7. Fusion des abonnements : se joue à l'arrivée, rejouable */
  const fusion = document.querySelector('.fusion');
  if (fusion) {
    new IntersectionObserver(([e], obs) => {
      if (e.isIntersecting) { setTimeout(() => fusion.classList.add('fondu'), 500); obs.disconnect(); }
    }, { threshold: 0.5 }).observe(fusion);
    fusion.querySelector('.rejouer').addEventListener('click', () => {
      fusion.classList.remove('fondu');
      setTimeout(() => fusion.classList.add('fondu'), 900);
    });
  }

  /* 8. Agent IA : la conversation s'écrit toute seule, en boucle */
  const fil = document.querySelector('.fil');
  if (fil) {
    const bulles = [...fil.children];
    const textes = bulles.map((b) => b.textContent);
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    const ecrire = async (b, texte) => {
      b.textContent = '';
      b.classList.add('montre', 'ecrit');
      for (let i = 1; i <= texte.length; i++) {
        b.textContent = texte.slice(0, i);
        await pause(texte[i - 1] === ' ' ? 18 : 24);
      }
      b.classList.remove('ecrit');
    };
    const joue = async () => {
      for (;;) {
        bulles.forEach((b) => { b.classList.remove('montre'); b.textContent = ''; });
        await pause(600);
        for (const [i, b] of bulles.entries()) {
          if (b.classList.contains('bulle--agent')) await ecrire(b, textes[i]);
          else { b.textContent = textes[i]; b.classList.add('montre'); }
          await pause(b.classList.contains('bulle--client') ? 900 : 650);
        }
        await pause(4200);
      }
    };
    new IntersectionObserver(([e], obs) => {
      if (e.isIntersecting) { joue(); obs.disconnect(); }
    }, { threshold: 0.4 }).observe(fil);
  }
})();
