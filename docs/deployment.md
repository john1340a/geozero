# Déploiement CI/CD

Guide de configuration du déploiement automatique vers AlwaysData via GitHub Actions.

## 🔧 Prérequis

- Compte GitHub avec le repo GeoZero
- Compte AlwaysData avec accès SSH
- Site configuré en mode **Fichiers statiques** sur AlwaysData

## 📋 Configuration AlwaysData

### 1. Type de site

1. Aller sur https://admin.alwaysdata.com
2. Menu **Sites** → Éditer le site
3. **Type** : `Fichiers statiques`
4. **Répertoire racine** : `/www/`
5. Enregistrer

### 2. Clé SSH

Générer une clé SSH dédiée (sur votre machine locale) :

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy
```

Ajouter la clé publique sur AlwaysData :

```bash
ssh geozero@ssh-geozero.alwaysdata.net
mkdir -p ~/.ssh
echo "VOTRE_CLE_PUBLIQUE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 🔑 Secrets GitHub

Aller sur le repo GitHub → **Settings** → **Secrets and variables** → **Actions**.

Créer ces 4 secrets :

| Nom                      | Valeur                                         |
| ------------------------ | ---------------------------------------------- |
| `ALWAYSDATA_SSH_HOST`    | `ssh-geozero.alwaysdata.net`                   |
| `ALWAYSDATA_SSH_USER`    | `geozero`                                      |
| `ALWAYSDATA_SSH_KEY`     | Contenu de `~/.ssh/github_deploy` (clé privée) |
| `ALWAYSDATA_DEPLOY_PATH` | `/home/geozero/www/`                           |

## ⚙️ Workflow

Le fichier `.github/workflows/deploy.yml` gère le déploiement :

```yaml
name: Build and Deploy to AlwaysData

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: burnett01/rsync-deployments@7.0.1
        with:
          switches: -avzr --delete
          path: dist/
          remote_path: ${{ secrets.ALWAYSDATA_DEPLOY_PATH }}
          remote_host: ${{ secrets.ALWAYSDATA_SSH_HOST }}
          remote_user: ${{ secrets.ALWAYSDATA_SSH_USER }}
          remote_key: ${{ secrets.ALWAYSDATA_SSH_KEY }}
```

## 🚀 Utilisation

### Déploiement automatique

Chaque push sur `main` déclenche automatiquement le déploiement.

### Déploiement manuel

1. Aller sur GitHub → **Actions**
2. Sélectionner "Build and Deploy to AlwaysData"
3. Cliquer sur **Run workflow**

## 🐛 Dépannage

| Problème                        | Solution                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `Permission denied (publickey)` | Vérifier que la clé publique est dans `~/.ssh/authorized_keys` sur AlwaysData |
| `Host key verification failed`  | L'action rsync gère automatiquement, sinon ajouter le host dans known_hosts   |
| Page blanche sur le site        | Vérifier que le type de site est "Fichiers statiques"                         |
