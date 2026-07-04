# AccessTrip - Brief projet

**Document de cadrage a destination de l'equipe**
Version 1 - 4 juillet 2026
Auteur : Guillaume Kone
Contexte : Hackathon Capgemini

---

## 1. Le projet en une phrase

AccessTrip est une plateforme d'orchestration de voyage pilotee par IA pour les voyageurs en situation de handicap : elle planifie, confirme, surveille et re-confirme en continu chaque maillon d'un trajet, et reagit automatiquement quand un imprevu menace l'accessibilite.

---

## 2. Le probleme

Pour une personne en situation de handicap, un voyage n'est pas une suite de reservations : c'est une chaine de dependances fragiles. Un seul maillon casse (un train retarde, une chambre re-attribuee, un taxi non adapte) et tout l'aval s'effondre. Aujourd'hui, la charge de verifier, rappeler, re-confirmer et trouver des solutions de repli repose entierement sur le voyageur ou son aidant.

Concretement :

- Les besoins d'accessibilite (transfert assiste, itineraire sans marche, douche a l'italienne, assistance embarquement) sont rarement traces de bout en bout.
- Une confirmation obtenue a J-14 n'a aucune valeur si personne ne la re-confirme a J-1.
- Quand un incident survient, il n'existe aucun systeme qui recalcule le plan en preservant les contraintes d'accessibilite.

Le cout de l'echec n'est pas un desagrement : c'est un voyageur bloque sur un quai, sans solution.

---

## 3. La vision et la proposition de valeur

AccessTrip transforme une chaine de reservations passives en un systeme vivant, surveille et auto-correcteur.

Trois promesses :

1. **Traçabilite** : chaque etape possede un registre de confirmations (qui a confirme quoi, par quel canal, quand, avec quelle reference). C'est la preuve d'accessibilite, pas une simple reservation.
2. **Surveillance continue** : des agents IA veillent sur le trajet, detectent les perturbations (retard SNCF, chambre indisponible) et alertent avant que le voyageur ne soit impacte.
3. **Remediation automatique** : en cas d'incident, un agent planificateur recalcule un plan de repli qui ne fait jamais de compromis sur l'accessibilite, puis declenche les actions (nouveau creneau d'assistance, taxi re-route, appel de re-confirmation).

Le point de bascule cle : l'IA peut **passer un vrai appel telephonique** a un prestataire (hotel, gare) pour re-confirmer ou trouver une alternative, transcrire l'echange, en extraire une confirmation structuree, et l'inscrire au registre.

---

## 4. La persona de demonstration

Nous travaillons avec une voyageuse unique et un trajet unique, codes en dur, pour une demo nette et reproductible.

**Camille Moreau**, 34 ans.

- Fauteuil roulant electrique (Permobil M3, 140 kg, batterie Lithium-ion conforme IATA). Ne peut pas se transferer sans aide.
- Besoins fonctionnels : itineraire sans marche, douche a l'italienne (roll-in), assistance embarquement et debarquement train.
- Aidant : Julien Moreau (conjoint, acces lecture seule).

**Le trajet : Paris vers Nice, du 12 au 15 septembre.** Sept etapes enchainees :

1. Assistance gare Paris Gare de Lyon (Assist'enGare)
2. TGV 6173 Paris vers Nice, place PMR voiture 3 (SNCF)
3. Assistance arrivee gare de Nice-Ville (Assist'enGare)
4. Taxi adapte gare vers hotel (Nice Taxi PMR)
5. Hotel Beau Rivage, chambre 104 accessible, douche italienne
6. Restaurant Le Galet, acces de plain-pied
7. Retour TGV 6176 Nice vers Paris

L'etape 5 (l'hotel) est le point sensible : c'est elle qui declenche l'appel de re-confirmation, coeur de la demo.

---

## 5. Le produit : trois ecrans

Une seule application, trois vues, mises a jour en direct (SSE) :

- **Vue Voyageuse (`/`)** : l'experience de Camille, presentee dans un cadre de telephone. La timeline verticale du trajet (chaque etape avec son statut colore et ses reçus), et le passeport d'accessibilite (besoins, equipement, aidant).
- **Vue Centre de controle (`/ops`)** : le poste de pilotage. Surveillance des etapes, journal des agents (feed facon terminal ou chaque agent narre son raisonnement), registre des confirmations, panneau d'appel et de remediation.
- **Vue Demo (`/demo`)** : la telecommande du presentateur. Reinitialisation en un clic, injection de perturbation, declenchement de l'appel, et surcharges manuelles de secours pour la scene.

**L'accessibilite n'est pas une finition, c'est une exigence** : HTML semantique, landmarks, `aria-live` sur la timeline et le journal, navigation clavier complete, focus visible, contraste WCAG AA, interface 100 % en français. L'application sera demontree avec VoiceOver.

---

## 6. Les trois flux de demo : le produit, c'est ces trois flux

Toute la valeur se prouve en scene par trois enchaînements. Ils doivent etre repetes jusqu'a etre parfaits.

### Flux A : la cascade d'imprevu

Un bouton injecte une perturbation : "TGV 6173 retarde de 55 min" (avec branchement optionnel sur l'API SNCF reelle pour le train 6173). L'agent de veille capte l'incident, l'agent planificateur recalcule : les etapes 3 et 4 passent "a risque" avec leurs motifs, un plan de remediation est propose sous forme de carte (nouveau creneau d'assistance, taxi repousse, hotel prevenu du retard). Un clic sur "appliquer" repasse tout au vert avec les nouveaux horaires, et les confirmations sont ajoutees au registre. Le planificateur utilise Claude, avec un plan de repli code en dur si l'API echoue : **la demo ne casse jamais.**

### Flux B : l'appel en direct (le final)

Un bouton declenche un **vrai appel telephonique** (via Vapi) vers un numero reel, au sujet de la re-confirmation de la chambre 104. Le webhook diffuse la transcription en direct, affichee en bulles a l'ecran. A la fin de l'appel, l'agent extracteur analyse la transcription : si la chambre n'est plus disponible, l'etape 5 passe en "echec", le journal montre l'escalade, et le planificateur propose une solution de repli pre-preparee (Hotel Aston, chambre accessible equivalente, taxi re-route). Un clic applique, tout repasse au vert. Le registre archive l'appel complet : transcription, JSON extrait, lien audio.

### Flux C : les atouts pour le Q&A

- **Vision** : on televerse une photo, Claude la compare aux besoins de Camille et rend un verdict avec niveau de confiance et citation de preuve ("ressaut de douche estime a 15 cm, non conforme a une douche a l'italienne, signale").
- **Auto-remplissage** : un bouton lance un script (Playwright, mode visible) qui remplit sous les yeux du jury un formulaire PRM replique, champ par champ, a partir du passeport de Camille.

---

## 7. Architecture technique

Volontairement simple et robuste pour un contexte hackathon.

- **Un seul depot, un seul processus Node** servant a la fois l'API et le frontend.
- **Backend** : Express. **Frontend** : React + Vite. **Temps reel** : Server-Sent Events, un unique flux `/events`.
- **Etat** : en memoire avec persistance dans un fichier JSON. Pas de base de donnees, pas d'authentification, pas de Docker.
- **Reinitialisation en un clic** vers l'etat initial, indispensable pour repeter la demo.
- **Agents IA** (dossier `server/agents/`) : planner (planification et re-planification), watchdog (veille SNCF et incidents), caller (declenchement d'appel Vapi et webhooks), extractor (transcription vers confirmation structuree), vision (photo plus profil vers verdict d'accessibilite).

Contrat d'evenements SSE diffuses en direct : `step_updated`, `agent_log`, `transcript_chunk`, `ledger_entry`, `disruption`, `replan_proposed`, `vision_verdict`.

Statuts d'une etape : identifie, contacte, confirme, re-confirme (nuances de vert), a risque (ambre), echec (rouge), en cours, termine.

---

## 8. Stack et contraintes

**Stack** : Node, Express, React, Vite, SSE, Claude (API Anthropic), Vapi (appel vocal), Playwright (auto-remplissage), API SNCF (optionnelle).

**Contraintes non negociables** :

- Tout doit tourner en local et etre reinitialisable en un clic.
- Le systeme doit survivre a une demo de 5 minutes en scene, appel telephonique reel compris.
- Interface 100 % en français.
- Accessibilite de niveau WCAG AA, testee avec VoiceOver.
- Chaque flux critique dispose d'un plan de repli code en dur : aucun appel externe ne doit pouvoir casser la demo.

**Variables d'environnement (`.env`)** : `ANTHROPIC_API_KEY`, `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`, `RECEPTIONIST_PHONE`, `SNCF_API_KEY` (optionnelle), `PUBLIC_URL` (URL ngrok pour les webhooks).

> Note technique : le dossier de travail contient un caractere ":" qui perturbe le PATH. Les scripts npm appellent directement `node <entrypoint>` pour contourner ce probleme. Lancer avec `npm run dev` (UI sur le port 5173, API sur le port 3000).

---

## 9. Les agents IA

Chaque agent narre son raisonnement en français dans le journal, en lignes courtes, pour rendre l'intelligence du systeme visible en scene.

- **Planificateur** : reçoit le profil, les etapes et leurs dependances, et un evenement de perturbation. Determine les etapes a risque et propose un plan de remediation minimal, sans jamais transiger sur le transfert assiste, le sans-marche et la douche a l'italienne. Rend un JSON et un message rassurant pour la voyageuse.
- **Extracteur** : transforme une transcription d'appel en confirmation structuree (interlocuteur, chambre disponible ou non, numero de chambre, douche italienne, reference, engagements, signaux d'alerte). Si l'interlocuteur est evasif, il marque le point concerne comme incertain et leve une alerte.
- **Assistante vocale (Vapi)** : appelle au nom de l'assureur pour Camille, annonce qu'elle est une assistante automatisee et que l'appel est enregistre, obtient la confirmation, le nom de l'interlocuteur et une reference. Si la chambre n'est plus disponible, elle reste calme, demande les alternatives accessibles et indique qu'un conseiller rappellera.
- **Vision** : compare une photo aux besoins fonctionnels et rend un verdict argumente.

---

## 10. Jalons : de M1 a M6

Regle d'or : on construit un jalon, on le teste, puis on passe au suivant. Jamais tout d'un coup.

| Jalon  | Contenu                                                                                                                             | Critere de reussite                                             | Statut                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------- |
| **M1** | Colonne vertebrale : serveur, etat, seed, SSE, timeline voyageuse, layout ops, panneau demo avec Reset                              | La timeline s'affiche verte depuis le seed, le reset fonctionne | **Termine et verifie** |
| **M2** | Journal des agents, watchdog, bouton chaos, planificateur (avec repli code en dur), cascade, carte de re-planification, application | Le Flux A tourne de bout en bout hors ligne                     | A faire                |
| **M3** | Integration Vapi, declenchement d'appel, webhook, panneau de transcription en direct                                                | Un vrai telephone sonne et les bulles defilent                  | A faire                |
| **M4** | Extracteur en fin d'appel, ecriture au registre, bascule d'etape, escalade avec plan de repli                                       | Le Flux B tourne de bout en bout avec un appel test             | A faire                |
| **M5** | Endpoint vision et carte verdict, formulaire PRM replique, auto-remplissage Playwright visible                                      | Les deux fonctionnent depuis le panneau demo                    | A faire                |
| **M6** | Passe VoiceOver, verification aria-live, parcours 100 % clavier, surcharges manuelles de chaque evenement (assurance invisible)     | Tout est robuste et pilotable en scene                          | A faire                |

**Etat au 4 juillet 2026 : M1 livre et verifie** (endpoints, smoke test, rendu navigateur, flux de reset, zero erreur console).

---

## 11. Repartition des roles (a valider ensemble)

Proposition de decoupage. A ajuster selon les disponibilites.

| Role                      | Perimetre                                                                       | Responsable             |
| ------------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| Lead technique et backend | Serveur, SSE, etat, agents, robustesse, fallbacks                               | [a attribuer]           |
| Frontend et accessibilite | Les trois vues, aria-live, navigation clavier, contraste, passe VoiceOver       | [a attribuer]           |
| Integration voix          | Vapi, webhook, ngrok, panneau de transcription en direct                        | [a attribuer]           |
| Agents IA                 | Prompts planner, extractor, vision, qualite des sorties JSON                    | [a attribuer]           |
| Receptionniste (scene)    | Joue l'interlocuteur de l'hotel pendant l'appel live, repete les trois branches | [a attribuer]           |
| Pitch et narration        | Deroule des 5 minutes, message, coordination scene                              | Guillaume ? [a valider] |

Le role de receptionniste est crucial : c'est un teammate qui repond au telephone en scene. Trois branches a repeter :

- **B1 (heureux)** : confirme la chambre 104, donne le nom "Mme Laurent".
- **B2 (branche scene)** : "la 104 a ete re-attribuee, nous n'avons plus de chambre accessible ce soir-la", poli, un peu gene, ne propose rien. **C'est cette branche que l'on joue en scene.**
- **B3 (evasif)** : "il faudrait voir avec ma collegue demain", pour tester le chemin des signaux d'alerte.

---

## 12. Planning propose

| Phase    | Objectif                                           | Cible  |
| -------- | -------------------------------------------------- | ------ |
| Sprint 1 | M2 termine, Flux A rejouable hors ligne            | [date] |
| Sprint 2 | M3 et M4, l'appel live fonctionne de bout en bout  | [date] |
| Sprint 3 | M5, les atouts vision et auto-remplissage          | [date] |
| Gel      | M6, durcissement, repetitions, pas de nouveau code | [date] |

Regle : **la derniere heure appartient aux repetitions, pas au code.** On gele a M6. Si un jalon bloque plus de 45 minutes, on active le plan de repli prevu et on avance.

---

## 13. Risques et plans de repli

| Risque                                         | Impact                  | Parade                                                                         |
| ---------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| L'appel Vapi echoue en scene                   | Perte du final          | Surcharge manuelle depuis le panneau demo qui rejoue les evenements de l'appel |
| L'API Claude ne repond pas                     | Pas de re-planification | Plan de repli code en dur, deja pret                                           |
| Le reseau tombe                                | Flux B impossible       | Flux A tourne 100 % hors ligne, on bascule dessus                              |
| Le webhook ngrok se coupe                      | Pas de transcription    | Redemarrage rapide ngrok, ou surcharge manuelle                                |
| Un jalon prend du retard                       | Demo incomplete         | Ordre de coupe pre-negocie, on protege M1 a M4 en priorite                     |
| Le caractere ":" du dossier casse les binaires | Rien ne se lance        | Deja resolu, scripts qui appellent `node` directement                          |

Principe directeur : **chaque element visible en scene doit pouvoir etre declenche manuellement.** C'est l'assurance invisible du jalon M6.

---

## 14. Ce qu'il reste a faire

Immediat :

1. Valider ce brief et la repartition des roles.
2. Recuperer les cles : compte Vapi, numero de telephone, assistant configure, cle Anthropic.
3. Fixer les dates des trois sprints.
4. Demarrer M2 (cascade d'imprevu), qui tourne entierement hors ligne et ne depend d'aucune cle externe.

A preparer en parallele :

- Le numero reel du teammate receptionniste et les repetitions des trois branches.
- La configuration ngrok pour les webhooks Vapi.
- Le deroule des 5 minutes de pitch.

---

## 15. Reperes

- Depot et code : dossier `AccessTrip/`.
- Specification technique detaillee : [`docs/architecture/spec.md`](../architecture/spec.md).
- Lancement : `npm install` puis `npm run dev`, ouvrir http://localhost:5173.
- Reinitialisation : vue `/demo`, bouton Reset.

---

_Ce document est une base de cadrage. Il evoluera au fil des sprints. Toute remarque est bienvenue avant le lancement de M2._
