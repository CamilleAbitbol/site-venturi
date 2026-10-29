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
