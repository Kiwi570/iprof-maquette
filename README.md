# iProf — maquette

Maquette statique du futur site iProf (formation et assistance Mac, iPad, iPhone).
HTML, CSS et JavaScript sans étape de construction, prête pour Vercel.

## Pages
- `index.html` — accueil
- `cours-individuels.html`, `conseils.html`, `tarifs.html`
- `a-propos.html`, `contact.html`, `mentions-legales.html`

## À compléter avant la mise en ligne
- Nom du prof (Beat Haechler, repris du logo) et photo de la page contact : à confirmer
- Licence des deux photos de banque d’images reprises du site actuel
- Logo en version vectorielle (SVG ou PDF) si disponible
- Horaires, outil de visioconférence, règle de calcul du déplacement
- Pourcentage du rabais forfait (10 % annoncé, environ 11 % en réalité)
- Impressum et déclaration de confidentialité (nLPD)
- Liste complète des thèmes de cours, dates du parcours
- Images définitives : chaque emplacement porte le nom du fichier attendu (« photo à venir · nom »)

## Technique
GSAP 3.15 (ScrollTrigger, SplitText, DrawSVG, Flip), Lenis, OGL (WebGL).
Polices Fraunces, Atkinson Hyperlegible Next, Caveat (SIL OFL), hébergées dans `assets/fonts`.
Mode calme et « réduire les animations » respectés. Formulaires simulés : rien n’est envoyé.
