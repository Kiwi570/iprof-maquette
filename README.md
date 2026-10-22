# iProf — maquette

Maquette statique du futur site iProf (formation et assistance Mac, iPad, iPhone).
HTML, CSS et JavaScript sans étape de construction, prête pour Vercel.

## Pages
- `index.html` — accueil
- `cours-individuels.html`, `conseils.html`, `tarifs.html`
- `a-propos.html`, `contact.html`, `mentions-legales.html`

## À compléter avant la mise en ligne
- Nom du prof (Beat Haechler, repris du logo) et photo de la page contact : à confirmer
- Logo en version vectorielle (SVG ou PDF) si disponible
- Horaires, outil de visioconférence, règle de calcul du déplacement
- Pourcentage du rabais forfait (10 % annoncé, environ 11 % en réalité)
- Impressum et déclaration de confidentialité (nLPD)
- Liste complète des thèmes de cours, dates du parcours
- Deux images d’ambiance manquantes : `theme-virus` et `visio` (dessins provisoires en attendant)
- Les scènes d’ambiance montrent une enseignante : à régénérer si le client préfère y voir un homme

## Images
Logo et portrait : site actuel. Photos d’ambiance : générées par IA (ChatGPT), sans personne ni marque réelle, dans `assets/img/ia-*.webp` (3 tailles chacune).

## Technique
GSAP 3.15 (ScrollTrigger, SplitText, DrawSVG, Flip), Lenis, OGL (WebGL).
Polices Fraunces, Atkinson Hyperlegible Next, Caveat (SIL OFL), en WOFF2 dans `assets/fonts`.
Page 404, robots.txt et balise noindex : la maquette n’est pas indexée par les moteurs de recherche (à retirer pour le vrai site).
Mode calme et « réduire les animations » respectés. Formulaires simulés : rien n’est envoyé.
