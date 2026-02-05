# GeoZero 🌍

Application web de recherche d'offres d'emploi géolocalisées dans le domaine SIG/Géomatique.

## ✨ Fonctionnalités

- 🗺️ Carte interactive des offres d'emploi (Leaflet)
- 🔍 Recherche par ville avec rayon personnalisable
- 📡 Flux RSS auto-actualisé toutes les 5 minutes
- 🏷️ Filtres par type de contrat (CDI, CDD, Stage, Alternance...)
- 📍 Géocodage automatique des villes françaises
- 📱 Interface responsive (desktop + mobile)

## 🛠️ Stack Technique

| Technologie     | Usage                |
| --------------- | -------------------- |
| **React 19**    | Framework UI         |
| **TypeScript**  | Typage statique      |
| **Vite**        | Bundler & dev server |
| **Leaflet**     | Cartographie         |
| **TailwindCSS** | Styles               |
| **HeroUI**      | Composants UI        |

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/votre-username/geozero.git
cd geozero

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build production
npm run build
```

## 🔄 CI/CD

Le projet utilise **GitHub Actions** pour le déploiement automatique vers AlwaysData.

- **Trigger** : Push sur la branche `main`
- **Actions** : Build → Deploy via rsync/SSH
- **Cible** : https://geozero.alwaysdata.net

Voir [docs/deployment.md](./docs/deployment.md) pour la configuration complète.

## 📚 Documentation

La documentation technique se trouve dans le dossier [`/docs`](./docs/README.md) :

- [Cartographie (Leaflet)](./docs/libs/leaflet.md)
- [UI & Styles](./docs/libs/style.md)
- [Parsing RSS](./docs/libs/rss-parser.md)
- [Stack Core](./docs/libs/core-stack.md)
- [Tests E2E](./docs/libs/playwright.md)
- [Déploiement CI/CD](./docs/deployment.md)

## 📁 Structure

```
geozero/
├── src/
│   ├── components/     # Composants React (Map, UI)
│   ├── services/       # Logique métier (RSS, Géocodage)
│   ├── types/          # Types TypeScript
│   └── utils/          # Utilitaires
├── docs/               # Documentation technique
├── tests/              # Tests E2E Playwright
└── .github/workflows/  # CI/CD GitHub Actions
```

## 📄 Licence

MIT
