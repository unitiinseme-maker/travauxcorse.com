# Veille privée des autorisations d’urbanisme

## Source et fonctionnement

Source : SDES, Sitadel3, jeu officiel « Liste des permis de construire et autres autorisations d’urbanisme », identifiant `6513f0189d7d312c80ec5b5b`.

- Présentation : https://www.statistiques.developpement-durable.gouv.fr/donnees-des-permis-de-construire-et-autres-autorisations-durbanisme
- API : https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/apidoc.html
- Métadonnées : https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datasets/6513f0189d7d312c80ec5b5b
- Communes : API officielle `geo.api.gouv.fr`, pour traduire les codes INSEE. L’adresse du terrain n’est pas utilisée pour deviner la commune administrative.

Quatre fichiers : logements PC/DP, locaux PC/DP, PA, PD. Première importation limitée aux dates d’autorisation des 90 derniers jours et aux départements 2A / 2B. Seuls les états 2 (autorisé) et 5 (commencé) sont admis pour de nouveaux dossiers. Les annulations et achèvements ultérieurs sont conservés pour l’historique mais exclus par défaut des opportunités.

Vérification chaque lundi à 05:00 UTC via Vercel Cron, plus bouton manuel. La source est mensuelle : il ne s’agit pas d’une alerte quotidienne en temps réel. `CRON_SECRET` protège le déclenchement planifié ; le déclenchement manuel exige la session admin et le jeton CSRF.

Après le premier import, un millésime inchangé n’est pas téléchargé à nouveau. Un nouveau lot utilise `DPC_DERN` à partir du mois de couverture précédent, y compris ce mois pour reprendre les corrections tardives. Cette colonne est une chaîne YYYY-MM dans trois fichiers et un entier YYYYMM pour les démolitions ; la requête respecte chaque schéma. Les nouvelles autorisations plus anciennes que 90 jours sont ignorées ; les dossiers déjà suivis sont mis à jour quelle que soit leur ancienneté. L’API ne propose pas de flux de suppression : les retraits physiques sans état d’annulation ne peuvent pas être détectés par ce filtre incrémental.

Le numéro d’autorisation et son type constituent l’identité stable, condensée en SHA-256. Les présences dans plusieurs fichiers sont fusionnées. Les données de chaque source sont conservées séparément pour éviter de perdre les attributs d’un dossier mixte logement/local lors d’une correction. Première récupération et dernière modification sont distinctes. Une empreinte évite de traiter un lot identique comme un nouveau permis.

## Données et limites

Champs disponibles selon le dossier : type et numéro, état, décision initiale, dépôt, ouverture/achèvement, commune et département, adresse du terrain, références cadastrales, nature des travaux, surfaces, logements, indicateurs d’extension, piscine et photovoltaïque. L’absence d’un champ s’affiche « Non disponible ». Les indicateurs vides ne sont pas inventés. Les noms, coordonnées et identifiants des demandeurs ne sont ni demandés à l’API ni stockés.

Les DP sans création de logement ou de local ne sont pas exhaustivement couvertes ; certaines piscines, façades et petites rénovations peuvent manquer. Les remontées des collectivités sont décalées et peuvent être corrigées. Le 14 novembre 2026, le lot 2026-10 couvre jusqu’au 30 septembre 2026 : les zéros sur 7/30 jours ne signifient donc pas qu’aucun projet récent n’existe.

La carte est volontairement non activée : aucune coordonnée précise vérifiée n’est présente dans les fichiers utilisés. Aucun géocodage ou enrichissement de données personnelles n’est réalisé.

## Estimation et suivi

Règles déterministes, explicables dans chaque fiche. Le potentiel dépend notamment du nombre de logements et des surfaces créées ou issues de transformations ; les dossiers sans données suffisantes ne sont pas surévalués. Les suggestions de métiers reposent sur la nature déclarée ; piscine et photovoltaïque sont proposés seulement lorsqu’un indicateur explicite existe. Ce ne sont ni un devis, ni la certitude que chaque métier sera nécessaire.

Les notes, responsable, statut, prochaine action/date et première analyse sont privés. L’ouverture marque le dossier consulté sans le considérer analysé. L’enregistrement du suivi marque la première analyse. Les indicateurs portent sur les dossiers autorisés/commencés conservés dans la veille, indépendamment des filtres ; les cartes sont paginées par 20.

La conversion manuelle crée une seule fiche `requests/permit-<id>.json`, avec titre « Veille à qualifier ». Les coordonnées restent vides. Le texte indique explicitement qu’il ne s’agit pas encore d’une demande client. Aucun email/SMS ni affectation d’artisan n’est déclenché. L’administrateur doit obtenir les coordonnées et l’accord du client par le parcours habituel.

## Stockage et sécurité

Réutilisation du Blob privé existant ; aucun abonnement ou service ajouté. `private-permits/state.json` contient dossiers, suivis et état de synchronisation. Toutes les lectures et écritures passent par une API protégée. La page publique de connexion ne contient aucun dossier ni note. Réponses `no-store`, refus 401 sans session, contrôle Origin + CSRF pour les mutations. Affichage DOM avec `textContent`, sans injection HTML des données.

Les écritures conditionnelles ETag empêchent les pertes de notes entre une synchronisation et un enregistrement. Une version de suivi détecte deux éditions simultanées. Un verrou à durée limitée empêche deux imports concurrents ; un échec conserve le dernier import complet. Les erreurs de source ne se transforment pas en faux résultat vide. Seule la réponse officielle spécifique 400 « Le fichier est vide. » est traitée comme un jeu vide. Les erreurs temporaires 429/502/503/504 font l’objet de tentatives limitées.

## Vérification reproductible

- `npm test` : suite existante et tests de sécurité, classement, doublons, filtres, fiche, notes et conversion idempotente.
- `python scripts/check.py` : liens locaux et structure HTML.
- `node scripts/test-permits-real.cjs` : récupération officielle réelle, contrôle 2A/2B et réimport sans doublons, sans écriture de production.

Essai réel du 14/11/2026 : 83 lignes logements, 47 locaux, 6 PA et 2 PD ; 138 lignes, 134 autorisations uniques (72 en 2A, 62 en 2B). Types uniques : 109 PC, 17 DP, 6 PA, 2 PD. Deuxième import : 0 ajout et 0 modification. Essai réel du filtre de modifications mensuelles : 184 lignes, 0 nouveau dossier et 0 modification des 134 autorisations suivies. Les dossiers anciens retournés par ce filtre ne sont pas importés.

## Fichiers

- Interface : `admin/permis/index.html`, `admin/permis.css`, `admin/permis.js` ; entrée de menu dans `admin/index.html`.
- API : `lib/permit-api.js`, `lib/permit-cron.js`, routées par `api/submissions.js` et les réécritures Vercel. Ce regroupement respecte la limite de 12 fonctions de l’hébergement Hobby existant.
- Logique : `lib/permit-source.js`, `lib/permit-model.js`, `lib/permit-store.js`, `lib/permit-sync.js`.
- Planification : `vercel.json`.
- Vérification : `tests/permits.test.cjs`, `scripts/test-permits-real.cjs`.
- Présent rapport : `docs/permis-construire.md`.

Les contrôles automatisés ne remplacent pas une validation visuelle dans une session administrateur authentifiée sur téléphone, tablette et ordinateur.

## Mise en service du 14 novembre 2026

Publication de production confirmée sur `www.travauxcorse.com`. Premier import serveur réussi à 11 h 38, heure de Paris : 134 autorisations enregistrées dans le Blob privé. Les premières tentatives ont rencontré une indisponibilité réseau temporaire ; aucune donnée partielle n’a été publiée. La récupération prévoit désormais aussi des reprises limitées sur les erreurs réseau.

48 tests automatisés réussis ; contrôle des liens et de la structure de 333 pages sans erreur. L’API en ligne refuse l’accès anonyme (HTTP 401). Après connexion sécurisée, le tableau de bord, la fiche détaillée, les métiers suggérés et les filtres ont été vérifiés dans le navigateur : 72 résultats pour 2A, 62 pour 2B, 4 pour la commune exacte de Borgo. La recherche textuelle « Borgo » retourne aussi un projet dont l’adresse contient ce terme, conformément à son périmètre. Une erreur de balisage du choix Haute-Corse a été corrigée et retestée.

Deuxième synchronisation serveur réussie à 11 h 42 (Paris) : 134 dossiers conservés, 0 ajout, 0 modification. La correction des écritures conditionnelles impose une réponse non compressée du Blob pour conserver un ETag fort ; les essais en production ont validé la lecture et la réécriture du lot complet. La conversion en projet et les notes ont été testées dans un stockage isolé, pour ne pas créer de faux prospects ni de fausses analyses commerciales en production.

Limite de validation restante : le rendu connecté a été contrôlé sur ordinateur. Les adaptations responsive sont intégrées, mais le contrôle visuel sur téléphone et tablette n’a pas été effectué et reste à confirmer. Aucun abonnement supplémentaire n’a été souscrit.

La couverture annoncée dans les métadonnées est le 30 septembre 2026 ; le lot contient néanmoins au moins une décision datée du 6 octobre 2026. Les dates officielles sont conservées telles quelles, sans extrapoler la complétude des semaines récentes.

## Complément contact et dossier commercial A4 — 14 novembre 2026

Ajout de la dénomination, du SIREN et du SIRET des personnes morales officiellement diffusées. Contrôle de la catégorie juridique (exclusion de la catégorie entrepreneur individuel), du SIREN et de la dénomination avant stockage. Les champs de localité/code postal du demandeur, noms de particuliers, domiciles privés, emails et téléphones non diffusés ne sont pas importés. Aucun rapprochement avec les réseaux sociaux.

Les coordonnées communiquées directement ou professionnelles publiques peuvent être saisies manuellement avec une provenance obligatoire. Indicateur et filtre de possibilité de contact ; suivi des renseignements publics à demander à la mairie. Aucune prise de contact automatique.

Export privé HTML imprimable en A4, individuel ou regroupant tous les projets des filtres appliqués, sans limitation à la page visible. Le commercial peut ouvrir le fichier puis choisir Imprimer / Enregistrer au format PDF. Chaque projet commence sur une nouvelle page ; les longues fiches peuvent occuper plusieurs pages. L'export contient le projet, l'identité professionnelle disponible, les contacts saisis, les suggestions métiers, le potentiel, le suivi, les notes et les sources. Les données absentes portent « Non disponible ». Le fichier téléchargé est confidentiel et n'est pas un lien public vers les données internes.

Tests : 49 tests automatisés réussis, dont accès anonyme interdit aux exports, échappement HTML, filtrage des personnes morales, exigence de provenance des contacts, export de 25 dossiers de test isolés au-delà de la pagination et filtre départemental. 333 pages contrôlées sans erreur structurelle. Essai réel : 138 lignes officielles / 134 projets uniques, 72 en 2A et 62 en 2B, 55 avec personne morale identifiée ; seconde fusion sans doublon ni modification. La migration relit une fois les 90 jours pour compléter les dossiers existants ; la fréquence hebdomadaire reste inchangée.

Fichiers de ce complément : `lib/permit-contact.js`, `lib/permit-export.js`, `lib/permit-api.js`, `lib/permit-model.js`, `lib/permit-source.js`, `lib/permit-sync.js`, `admin/permis.js`, `admin/permis.css`, `admin/permis/index.html`, `tests/permits.test.cjs`, ce rapport.
