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

Générer une clé SSH dédiée sur votre machine locale :

```powershell
ssh-keygen -t ed25519 -C "github-actions" -f $env:USERPROFILE\.ssh\github_deploy
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

### Encoder la clé privée en base64

> [!IMPORTANT]
> La clé doit être encodée en base64 pour éviter les problèmes de formatage.

```powershell
$key = Get-Content $env:USERPROFILE\.ssh\github_deploy -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($key)
$base64 = [Convert]::ToBase64String($bytes)
Set-Clipboard -Value $base64
```

### Créer les 4 secrets

| Nom                      | Valeur                                |
| ------------------------ | ------------------------------------- |
| `ALWAYSDATA_SSH_HOST`    | `ssh-geozero.alwaysdata.net`          |
| `ALWAYSDATA_SSH_USER`    | `geozero`                             |
| `ALWAYSDATA_SSH_KEY_B64` | Clé privée encodée en base64 (Ctrl+V) |
| `ALWAYSDATA_DEPLOY_PATH` | `/home/geozero/www/`                  |

## ⚙️ Workflow

Le fichier `.github/workflows/deploy.yml` :

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
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.ALWAYSDATA_SSH_KEY_B64 }}" | base64 -d > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.ALWAYSDATA_SSH_HOST }} >> ~/.ssh/known_hosts
      - name: Deploy via rsync
        run: |
          rsync -avzr --delete \
            -e "ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no" \
            dist/ \
            ${{ secrets.ALWAYSDATA_SSH_USER }}@${{ secrets.ALWAYSDATA_SSH_HOST }}:${{ secrets.ALWAYSDATA_DEPLOY_PATH }}
```

## 🚀 Utilisation

### Déploiement automatique

Chaque push sur `main` déclenche automatiquement le déploiement.

### Déploiement manuel

1. Aller sur GitHub → **Actions**
2. Sélectionner "Build and Deploy to AlwaysData"
3. Cliquer sur **Run workflow**

## 🐛 Dépannage

| Problème             | Solution                                                                      |
| -------------------- | ----------------------------------------------------------------------------- |
| `error in libcrypto` | Ré-encoder la clé en base64 et recréer le secret                              |
| `Permission denied`  | Vérifier que la clé publique est dans `~/.ssh/authorized_keys` sur AlwaysData |
| Page blanche         | Vérifier que le type de site est "Fichiers statiques"                         |
