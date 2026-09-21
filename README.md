# TravauxCorse

Plateforme locale de mise en relation entre particuliers, professionnels du bâtiment et fournisseurs partenaires en Corse.

## Fonctionnalités

- dépôt guidé d’un projet de travaux ;
- annuaire d’artisans et partenaires ;
- parcours rénovation énergétique ;
- espaces client, entreprise, fournisseur et administration ;
- suivi des dossiers, devis, documents et échanges.

## Déploiement

Site statique sans étape de compilation. Le point d’entrée est `index.html`.


## Demandes avec plusieurs métiers

L’accueil et la première étape de la demande proposent toutes les catégories actives sous forme de cases à cocher. Le brouillon conserve `categories` (tableau) et `category` (libellé compatible avec les anciennes fiches). Tous les métiers sont repris dans le récapitulatif et l’envoi FormSubmit. Les anciens brouillons à un seul métier sont migrés à la lecture.

## Administration des réalisations et guides

Accès : **Connexion → Je suis administrateur → Éditeur du site** pour retrouver tous les outils. Les publications restent également accessibles à `/admin/`. Les onglets **Réalisations** et **Conseils & guides** du portail historique conduisent aussi à cet éditeur.

L’éditeur permet de créer, modifier, prévisualiser, enregistrer un brouillon, publier, retirer du site et supprimer un contenu. Les six guides existants sont repris. Jusqu’à quatre photos JPG/PNG/WebP sont réduites dans le navigateur ; chaque photo peut recevoir une légende Avant/Après. Les pages publiées, les listes et le sitemap sont générés ensemble dans un commit GitHub ; le déploiement Vercel rend ensuite la version publique. Aucun compte de démonstration n’autorise une publication.

### Activation par le propriétaire — nécessaire avant le premier enregistrement

Dans Vercel, projet `travauxcorse-com` → Settings → Environment Variables → Production, ajouter :

| Variable | Valeur |
| --- | --- |
| `CMS_GITHUB_TOKEN` | Jeton GitHub à accès fin limité au dépôt `unitiinseme-maker/travauxcorse.com`, avec permission **Contents: Read and write**. Les protections de branche continuent de s’appliquer. |
| `CMS_ADMIN_PASSWORD` | Nouveau mot de passe privé de publication, aléatoire, au moins 20 caractères. Ne pas utiliser `admin` ni un mot de passe du portail de démonstration. |
| `CMS_SECRET` | Clé aléatoire d’au moins 32 caractères, à conserver dans un gestionnaire de mots de passe. Elle chiffre les brouillons et signe les sessions. Par exemple, générer localement avec `openssl rand -hex 32`. |
| `CMS_ALLOWED_ORIGIN` | Facultatif : `https://travauxcorse-com.vercel.app` par défaut. À modifier pour le domaine principal définitif, sans barre finale. |

Ne jamais mettre ces valeurs dans les fichiers publics, dans GitHub, ni dans le chat. Redéployer après l’ajout des variables. Ouvrir `/admin/`, saisir le mot de passe privé, enregistrer un brouillon, puis publier une première réalisation réelle. Attendre la fin du déploiement et vérifier la page dans une fenêtre privée.

La publication doit rester désactivée tant que ces paramètres ne sont pas présents. L’interface annonce alors clairement que la saisie n’est pas enregistrée. Le site et les demandes fonctionnent indépendamment.

### Stockage et limites

- `content/editorial.enc` : état chiffré AES-256-GCM des brouillons et versions publiées dans le dépôt. Conserver la même `CMS_SECRET` : la perdre rend les brouillons illisibles. Les contenus publiés restent dans leurs pages HTML.
- Les photos de brouillons restent dans cet état chiffré ; les photos publiées sont copiées dans `media/editorial/` et deviennent publiques. Le retrait d’une page ne purge pas les médias de l’historique Git. Ne publier que des photos autorisées.
- Une publication écrit atomiquement les pages, listes et sitemap, sans forcer la branche. Une modification concurrente provoque une erreur explicite ; recharger les contenus avant de réessayer.
- 100 contenus maximum ; 4 photos par contenu ; 1 Mo de photos après réduction par contenu ; 12 Mo pour l’état éditorial total. Cette solution vise un volume éditorial modéré, pas une photothèque.
- Session de publication en cookie HttpOnly/Secure/SameSite, contrôle d’origine et CSRF. Le frein aux essais de connexion est local à l’instance serveur ; conserver un mot de passe long et aléatoire. L’administration de publication est distincte des comptes de démonstration historiques.
- Enregistrer un brouillon d’un article déjà publié ne change pas sa page publique. Utiliser **Publier** pour la mettre à jour ou **Retirer du site** pour la dépublier.

### Vérification

`node --test tests/*.test.cjs` couvre la sélection multiple, la migration, le chiffrement, l’authentification, les contenus dangereux, la publication, le retrait, la suppression et les conflits. Les tests du dépôt GitHub utilisent un serveur simulé : l’accès réel GitHub doit être vérifié après configuration.

Documentation officielle : [fonctions Node.js Vercel](https://vercel.com/docs/functions/runtimes/node-js), [variables d’environnement Vercel](https://vercel.com/docs/environment-variables), [API GitHub Git Trees](https://docs.github.com/en/rest/git/trees).

## Audit de septembre 2026

- Reconstruire les pages publiques et leur navigation commune : `node scripts/build.cjs`.
- Vérifier les liens internes et la structure HTML : `python scripts/check.py`.
- Vérifier les parcours et la sécurité du CMS : `node --test tests/*.test.cjs`.
- Vérification responsive : `tests/responsive.html` (hors indexation). Les fenêtres sont testées à 320, 375, 390, 430, 768, 1024, 1280, 1440 et 1920 px. Ce test Chromium ne remplace pas un essai sur appareils Safari/Firefox réels.
- Les pages principales sont pré-rendues. Les anciens liens avec fragments restent compatibles. Le portail est chargé uniquement lors de l’accès aux espaces.
- Les demandes et candidatures utilisent FormSubmit. L’envoi réel nécessite une adresse destinataire activée chez ce prestataire ; la réception dans la boîte email ne peut pas être déduite d’un test de formulaire. Les demandes ne créent pas de dossier serveur dans les espaces de démonstration.
- Pièces jointes : 5 fichiers JPG/PNG/WebP/PDF, 8 Mo au total, contrôle de signature dans le navigateur. Les fichiers restent en mémoire jusqu’à l’envoi et doivent être sélectionnés à nouveau après rechargement. Ce contrôle n’est pas une analyse antivirus.
- Les réglages publics locaux sont séparés des brouillons et des comptes de session. Les nouveaux mots de passe de démonstration sont dérivés avec PBKDF2 et ne sont pas exportés dans les sauvegardes du site. Cela ne transforme pas les comptes locaux en authentification serveur.
- L’édition générale historique reste locale : elle ne publie pas les réglages pour les autres visiteurs. Le CMS de guides/réalisations est le seul outil de publication serveur et requiert les variables privées décrites ci-dessus. Un vrai portail partagé nécessite un service d’authentification, une base de dossiers et un stockage privé de documents.
- L’annuaire et les fournisseurs contiennent des exemples explicitement identifiés. Remplacer ces données par des partenaires confirmés avant présentation comme réseau réel. Les réalisations ne sont pas inventées : ajouter les premiers chantiers réels depuis le CMS une fois activé.
