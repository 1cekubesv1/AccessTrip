# AccessTrip - Runbook de démo (5 minutes)

Script scène par scène pour le jury. Objectif : montrer des agents IA qui font un
vrai travail, pas des écrans. Répète-le 3 fois avant de monter.

---

## 0. Avant de monter sur scène (checklist, 2 min)

- [ ] `cd AccessTrip && npm run dev` puis ouvrir **http://localhost:5173** (ou `npm run start` sur :3000).
- [ ] Cliquer **Démo → Réinitialiser la démo** (état propre).
- [ ] Navigateur en **plein écran**, zoom à 100 %.
- [ ] **Son de la salle activé** (la voix de l'IA passe par les haut-parleurs).
- [ ] Vérifier le bandeau **"Contexte réel"** (données SNCF + météo chargées).
- [ ] Onglet ouvert par défaut : **Flotte**.
- [ ] Si appel réel (Vapi) : ngrok lancé, `.env` rempli, le coéquipier "réception" prêt (branche B2). Sinon : mode simulation, rien à faire.
- [ ] Filet de sécurité connu : bouton **Démo guidée** + **Contrôles de secours** (onglet Démo).

**Accroche (30 s, à dire de mémoire) :**

> « Pour une personne en situation de handicap, un voyage n'est pas une suite de
> réservations, c'est une chaîne de dépendances fragiles. Un maillon casse et tout
> s'effondre. AccessTrip est une plateforme d'agents IA qui planifient, confirment,
> surveillent et réparent chaque étape, sans jamais transiger sur l'accessibilité.
> Et ce n'est pas pour une personne : c'est vendu à des assureurs et des agences. »

---

## 1. La flotte : l'échelle (45 s)

Écran : **Flotte**.

- Balayer les **12 voyageurs**, **5 clients** (AXA, Groupama, MAIF, Handi'Tour…), le **SLA accessibilité**.
- Pointer la diversité : _« moteur, visuel, auditif, cognitif, maladie chronique, âge, handicap temporaire. Chacun rattaché à un client B2B. »_
- Filtrer par client (ex. Handi'Tour) : _« un opérateur gère son portefeuille ici. »_
- Cliquer sur **Camille Moreau** (le point vert = en direct).

> « On zoome sur un cas réel : Camille, fauteuil électrique, Paris-Nice. »

## 2. La voyageuse : l'humain (30 s)

Écran : détail de Camille (cadre téléphone).

- Montrer la **timeline verte** + le **passeport d'accessibilité** (fauteuil 140 kg, douche à l'italienne).
- _« Tout est confirmé. Maintenant, la vraie vie s'en mêle. »_
- Aller à **Centre de contrôle**.

## 3. Le centre de contrôle + données réelles (20 s)

Écran : **Centre de contrôle**.

- Pointer **Contexte réel** : _« régularité réelle de l'axe Sud-Est via l'open data SNCF, météo réelle de Nice via Open-Meteo. »_
- Pointer l'**Orchestre d'agents** (les 5 agents).

---

## 4. FLUX A - la cascade d'imprévu (60 s) ⭐

- Onglet **Démo** → cliquer **Grève SNCF (train supprimé)**.
- Revenir sur **Centre de contrôle**. Narrer en direct :
  - _« La veille détecte l'incident et cite la donnée réelle SNCF. »_ (l'orchestre s'allume, le raisonnement défile)
  - _« Le planificateur recalcule, contrainte absolue : douche à l'italienne, transfert assisté, sans marche. »_ (s2 rouge, s3/s4/s5 ambre)
- La **carte de remédiation** apparaît → cliquer **Appliquer le plan**.
  - Tout repasse au vert, les KPIs bougent (**minutes récupérées**, **incident intercepté**).

> « Zéro action pour Camille. Un incident réseau absorbé en quelques secondes. »

## 5. FLUX B - l'appel IA en direct (90 s) ⭐⭐ le clou

- Onglet **Démo** → **Lancer l'appel IA - scénario scène** (B2).
- Revenir sur **Centre de contrôle**, panneau **Appel**.
  - **La voix de l'IA parle dans la salle**, les bulles défilent. (Si Vapi : un vrai téléphone sonne.)
  - Laisser jouer : la réception annonce que la chambre 104 est réattribuée.
- Fin d'appel : l'**extracteur** analyse → _« chambre perdue, signal rouge »_ → s5 **échec**.
- Le planificateur propose la **récupération** (Hôtel Aston) → **Appliquer**.
  - Le registre archive tout l'appel (transcription + JSON).

> « Un agent vocal a passé un vrai appel, compris un échec, et sécurisé une
> alternative accessible équivalente. En direct. »

## 6. FLUX C - la preuve visuelle (30 s)

- Panneau **Vérification visuelle** → **Analyser une photo** (choisir une photo de salle de bain).
  - Verdict : _« ressaut estimé à 15 cm, non conforme à une douche à l'italienne, signalé. »_
- (Bonus si le temps) **Remplir le formulaire PMR** → une fenêtre navigateur se remplit toute seule.

> « Quand un juge demande "comment vous savez que la chambre est vraiment
> accessible ?", voilà la réponse : la vision le vérifie. »

## 7. Clôture (25 s)

- Retour sur **Flotte**.
- *« Une personne, c'était la démo. Le produit, c'est ça : des centaines de

> voyageurs, plusieurs assureurs, une garantie d'accessibilité tenue de bout en
> bout. Merci. »*

---

## Assurance anti-panne (l'atout invisible)

| Si ça casse                        | Réflexe                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| Tu stresses / peu de temps         | Onglet Démo → **Lancer la démo guidée** : tout s'enchaîne automatiquement, narré. |
| L'appel Vapi échoue                | Il bascule seul en simulation (voix + bulles). Rien à faire.                      |
| Un événement live ne s'affiche pas | Onglet Démo → **Contrôles de secours** : forcer n'importe quelle étape à la main. |
| Réseau coupé                       | Le Flux A tourne 100 % hors ligne. Les données réelles ont un repli.              |
| Tout part en vrille                | **Réinitialiser la démo** et repartir sur la démo guidée.                         |

## Munitions Q&A (réponses prêtes)

- **« Ça passe à l'échelle ? »** → onglet Flotte : 12 voyageurs, 5 clients, filtres, SLA. Vendu aux assureurs/agences.
- **« Les données sont réelles ? »** → bandeau Contexte réel : open data SNCF + Open-Meteo, en direct.
- **« L'appel est truqué ? »** → non, agent vocal Vapi, vrai téléphone (ou simulation honnête avec la même logique).
- **« Et si l'IA se trompe ? »** → registre traçable (qui a confirmé quoi, par quel canal), + vérification vision, + validation humaine possible.
- **« Le handicap, c'est large ? »** → 8 catégories dans la flotte, y compris temporaire (jambe plâtrée) et cognitif (TSA).
- **« Accessibilité de l'app elle-même ? »** → navigable au clavier, aria-live, testée VoiceOver, la voix lit l'appel.

## Timing cible

| Segment                   | Durée       |
| ------------------------- | ----------- |
| Accroche + Flotte         | 0:00 - 1:15 |
| Voyageuse + Contexte réel | 1:15 - 1:45 |
| Flux A (cascade)          | 1:45 - 2:45 |
| Flux B (appel live)       | 2:45 - 4:15 |
| Flux C (vision)           | 4:15 - 4:45 |
| Clôture                   | 4:45 - 5:00 |

Répète Flux B jusqu'à ce qu'il soit fluide : c'est lui qui gagne le hackathon.
