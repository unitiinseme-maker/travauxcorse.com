# TravauxCorse

Plateforme de mise en relation en Corse, exploitée par UNITI INSEME LIMITED.

## Parcours en production

- Un visiteur sélectionne plusieurs métiers et dépose une demande avec ses coordonnées et, si nécessaire, des photos ou PDF. FormSubmit transmet le courriel à `contact.travauxcorse@gmail.com`; son webhook enregistre une copie textuelle dans Vercel Blob privé pour `/admin/demandes/`. Les pièces jointes restent dans le courriel.
- Une entreprise candidate via `/devenir-partenaire/`. L’API `/api/partner-application` envoie un courriel avec Gmail ou Resend et affiche la confirmation directement sur le site.
- L’administrateur enregistre des artisans réels dans `/admin/demandes/`, affecte une demande, puis leur envoie une notification automatique par e-mail. Les artisans répondent directement au courriel. Il n’existe pas de compte public client ou artisan.
- L’administration gère les partenaires, les catégories, les guides et les réalisations. Les comptes de démonstration et l’ancien portail ne sont plus actifs.

## Administration et stockage

Les pages privées sont `/admin/`, `/admin/demandes/`, `/admin/categories/` et `/admin/partenaires/`. Le mot de passe `CMS_ADMIN_PASSWORD` et la clé `CMS_SECRET` restent exclusivement dans les variables d’environnement Vercel. Les sessions sont signées, dans un cookie HttpOnly/Secure/SameSite ; les écritures contrôlent l’origine et le jeton CSRF. `CMS_GITHUB_TOKEN` permet de publier les guides et réalisations dans le dépôt. Ne jamais mettre ces secrets dans le navigateur ni dans Git.

Les catégories (`site/categories.json`), partenaires et demandes sont stockés dans Vercel Blob privé. `GET /api/categories` et `GET /api/partners` sont publics en lecture seule. Les écritures demandent une session admin. Le fichier `content/categories.json` sert uniquement de liste initiale si aucune liste n’a encore été enregistrée dans Blob. Il contient 23 métiers ; les catégories supplémentaires souhaitées doivent être ajoutées depuis l’administration.

Pour les notifications, définir `GMAIL_APP_PASSWORD` dans Vercel Production pour le compte `contact.travauxcorse@gmail.com`, ou `RESEND_API_KEY` et `RESEND_FROM` pour un domaine vérifié. La configuration Resend complète est prioritaire. Redéployer après un changement de variables.

## Vérification et publication

- `node scripts/build.cjs` pré-rend les pages principales, harmonise les en-têtes et pieds de page et régénère le sitemap.
- `python3 scripts/check.py` contrôle les pages HTML, leurs liens internes et les métadonnées.
- `npm test` couvre les API privées, le CMS, les catégories, les formulaires et les anciens accès désactivés.
- `/tests/responsive.html` vérifie les pages publiques sur neuf largeurs entre 320 et 1920 px. Les pages admin interdisent leur affichage en iframe pour des raisons de sécurité ; les ouvrir directement pour leur vérification visuelle.

Le dépôt GitHub `unitiinseme-maker/travauxcorse.com` est connecté au projet Vercel `travauxcorse-com`. Le site de production est `https://travauxcorse-com.vercel.app/`. Une publication GitHub doit être suivie d’une vérification du déploiement Vercel et des parcours publics avant d’être considérée comme terminée.
