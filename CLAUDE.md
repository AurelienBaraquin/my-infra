# CLAUDE.md

Guide de travail des agents IA dans ce dépôt. À lire en premier, à chaque session. En cas de
conflit avec une instruction plus ancienne, **ce fichier et les documents qu'il cite l'emportent**.

## 1. Projet

`my-infra` décrit et déploie tout ce qui tourne sur le VPS personnel d'Aurélien (`aurelienb.com`,
2 vCPU, 2 Go de RAM) : Cloudflare devant, Traefik v3, SSO Authelia, sites publics et dashboard
personnel en sous-modules, sauvegardes. Un push sur `main` redéploie le VPS.

- Brief — quoi construire, périmètre, priorités : `docs/brief.md`. **À lire au début de chaque
  session**.
- Le code des applications vit dans leurs dépôts (sous-modules) ; le dashboard a sa propre
  documentation dans `dashboard/app/`.

## 2. Carte

| Sujet | Fichier |
|---|---|
| Quoi construire : objectif, périmètre, priorités, critères de réussite | `docs/brief.md` |
| Index de toute la documentation | `docs/README.md` |
| Organisation, réseaux, conventions, ajouter un service | `docs/architecture.md` |
| Décisions et leurs raisons | `docs/adr/` · `.assistant/decisions-log.md` |
| Erreurs déjà commises et ce qui les empêche désormais | `.assistant/lessons.md` |

## 3. Règles impératives

1. Ne jamais committer de secrets, d'identifiants ou de fichiers `.env` ; les secrets viennent de
   l'environnement (fichiers de `secrets/`, générés par `scripts/bootstrap.sh`). Valider toute
   entrée externe à la frontière.
2. Tout service privé passe par le middleware `sso@file` ; aucun port d'application n'est publié
   sur l'hôte (seul Traefik publie 80 et 443).
3. Toute image est épinglée à une version exacte, et chaque service a une limite mémoire
   (`mem_limit`).
4. `docker compose config --quiet` doit passer avant qu'un changement soit terminé.
5. Committer directement sur `main`, en petits commits qui laissent chacun la configuration valide.
6. Les commits suivent Conventional Commits (`feat`, `fix`, `chore`, `docs`, `test`, `refactor`,
   `ci`, `perf`, `build`).
7. Les skills de `.claude/skills/` sont des copies du claude-project-kit ; les mettre à jour avec
   `install.sh --project .` du kit et ne pas les modifier sur place.
8. La vérification de la documentation (`node scripts/check-docs.mjs`) tourne avant chaque commit
   et échoue quand une surface n'a pas de document ; corriger ce qu'elle signale au lieu de la
   contourner.
9. La vérification de la documentation tourne aussi en CI.
10. Activer les hooks git une fois par clone avec `git config core.hooksPath .githooks` ; Claude
    Code refuse `git commit` tant qu'ils ne sont pas actifs.
11. Mode de travail : exécuter d'une traite et rendre compte à la fin. Le propriétaire peut
    changer de mode pour une tâche donnée.
12. Toujours demander avant : supprimer des données de production, supprimer un enregistrement DNS
    encore utilisé, changer les réglages SSL/TLS de Cloudflare.
13. Autonomie : sans demander, tu peux éditer la documentation, écrire des ADR et des entrées du
    journal de décisions, créer des branches, ouvrir et merger des pull requests, pousser sur
    `main` et déployer. Tout autre changement du dépôt ou du monde extérieur : demander d'abord.
14. La documentation et les commentaires sont en français ; identifiants, messages de commit et
    noms de branches en anglais.
15. Faire ce que la tâche demande, rien de plus.
16. Lire un fichier en entier avant de le modifier.
17. Ne jamais affirmer quelque chose sur le code sans l'avoir vérifié dans le code.
18. La documentation fait partie du « fini » : un changement n'est pas terminé tant que les
    documents qui décrivent ce qu'il touche ne sont pas à jour, dans le même changement.
19. Tout ce qui existe et que quelqu'un doit connaître pour construire, lancer, tester, livrer,
    exploiter ou utiliser le projet a un document, listé dans `docs/README.md`. Une nouvelle
    surface (service, stack, réseau, secret, technologie, pipeline, script, variable) reçoit son
    document dans le changement qui l'introduit. Un seul endroit par fait : lier, ne pas copier.

## 4. Commandes

```bash
git config core.hooksPath .githooks       # une fois par clone
./scripts/bootstrap.sh                    # secrets, dossiers, compte SSO (idempotent)
docker compose config --quiet             # valider la configuration
docker compose up -d --build --wait       # appliquer
docker compose ps                         # état
./scripts/deploy.sh                       # déploiement complet depuis origin/main
node scripts/check-docs.mjs               # vérification de la documentation
```

## 5. Protocole de documentation vivante

La documentation fait partie du produit. Tu es **autorisé, et attendu, à la tenir à jour sans
demander**, dans le même changement que la configuration.

| Quand | Faire |
|---|---|
| Tu arrives sur ce projet sans contexte (nouvelle session, ou sous-agent) | Lancer le skill `project-onboard` avant la tâche ; il ne fait que lire |
| Tu fais ou constates un choix structurel (service, image, réseau, outil, process) | Lancer le skill `adr-new` : un ADR s'il est architectural, sinon une ligne datée dans `.assistant/decisions-log.md` |
| Ton changement ajoute, déplace, supprime ou modifie un service, une stack, un réseau, un secret, une variable, un script, un pipeline, une technologie ou un comportement visible | Mettre à jour le document qui le couvre (`docs/README.md`), ou le créer si la surface est nouvelle — le skill `project-sync` décrit ce que chaque document doit contenir — dans le même changement |
| Le périmètre ou les priorités changent | Proposer, mettre à jour `docs/brief.md` une fois le propriétaire d'accord, l'enregistrer avec `adr-new` ; jamais en silence |
| Un document, une règle ou une décision passée s'avère faux ou périmé | Corriger le document ; pour une décision, un nouvel ADR qui remplace l'ancien |
| Une erreur a été détectée par la CI, un déploiement ou le propriétaire | Ajouter une entrée à `.assistant/lessons.md` ; si possible, proposer une vérification automatique |
| Avant d'ouvrir une PR, et à la fin d'une session de travail | Lancer le skill `project-sync` et corriger ce qu'il signale |

Ne décrire que ce qui existe. En cas de doute, l'écrire dans *Questions ouvertes* et demander.

## 6. Questions ouvertes

- Copie des sauvegardes hors du VPS : destination à choisir — Aurélien.
- `/home/gha-runner/actions-runner` : runner GitHub jamais configuré, probablement un reste du
  projet legacy ; à supprimer ? — Aurélien.
