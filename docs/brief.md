# Brief

Ce que ce dépôt doit être : l'intention du propriétaire, et la source de vérité sur *quoi*
construire. Changer le périmètre ou les priorités est une décision : mettre à jour ce fichier et
l'enregistrer avec `adr-new`. Ne jamais le modifier en silence.

Rédigé le 2026-10-25 à partir des demandes d'Aurélien (session du 2026-10-24).

## Objectif

Décrire et déployer tout ce qui tourne sur le VPS personnel d'Aurélien (`aurelienb.com`) : réseau,
proxy, authentification, conteneurs, sauvegardes. Le 2026-10-24, Aurélien a demandé de refaire
entièrement l'ancienne infra (nginx + conteneurs) « sur des technos et des usages plus modernes »,
en vue de son dashboard personnel, accessible partout depuis un navigateur et protégé.

## Utilisateurs

Aurélien (propriétaire et seul administrateur) et les agents IA qui travaillent pour lui ; les
visiteurs de ses sites publics.

## Périmètre

Dans le périmètre :

- Le proxy d'entrée, le TLS et la protection (Cloudflare + Traefik).
- Le SSO avec double authentification devant tout ce qui est privé (Authelia).
- Le déploiement des sites publics (portfolio, PixelQuest, sites démo, Chinese Notebook) et du
  dashboard, chacun dans son dépôt en sous-module.
- Le déploiement continu, les sauvegardes, les secrets.

Hors périmètre :

- Le code des applications (chaque sous-module a son dépôt et sa documentation).
- L'agent Hermes (tourne sur l'hôte, hors Compose ; seule une config de référence est ici).
- Le projet « legacy » (kanban Epitech), Vikunja et ntfy : supprimés le 2026-10-24 à la demande
  d'Aurélien.

## Priorités

1. Sécurité : rien de privé sans SSO 2FA, aucun accès direct à l'origine, aucun secret dans git.
2. Fiabilité : healthchecks, déploiement reproductible, sauvegardes.
3. Simplicité d'extension : ajouter un service = quelques labels.
4. Sobriété : le VPS n'a que 2 vCPU et 2 Go de RAM.

## Critères de réussite

- Un push sur `main` déploie sans intervention et sans casser les services en place.
- Un nouveau service (public ou privé) se branche sans toucher au proxy.
- L'IP du VPS ne répond à personne d'autre que Cloudflare.

## Contraintes

- VPS RackNerd, Ubuntu 24.04, 2 vCPU, 2 Go de RAM, 39 Go de disque.
- DNS et TLS public chez Cloudflare (zone `aurelienb.com`).

## Questions ouvertes

- Copie des sauvegardes hors du VPS : reportée par Aurélien le 2026-10-25, suivie dans l'issue AurelienBaraquin/my-infra#4.
