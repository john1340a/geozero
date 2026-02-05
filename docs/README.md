# Documentation du Projet GeoZero

Bienvenue dans la documentation technique du projet **GeoZero**.

## 📚 Bibliothèques et Outils

Vous trouverez ci-dessous les détails sur les principales bibliothèques utilisées dans ce projet :

- [**🌍 Cartographie**](./libs/leaflet.md) : Leaflet & React-Leaflet
- [**🎨 UI & Styles**](./libs/style.md) : HeroUI & Tailwind CSS (et CSS modules)
- [**🔄 Données**](./libs/rss-parser.md) : Fast XML Parser (Parsing RSS)
- [**⚙️ Core Stack**](./libs/core-stack.md) : React, Vite, TypeScript
- [**🧪 Tests**](./libs/playwright.md) : Playwright (E2E Testing)
- [**🚀 Déploiement**](./deployment.md) : CI/CD GitHub Actions → AlwaysData

## 🏗️ Structure du Projet

- `/src` : Code source de l'application
- `/src/components` : Composants React (UI, Map)
- `/src/services` : Logique métier (Parsing RSS, Géocodage, Base de données villes)
- `/src/types` : Définitions TypeScript
- `/tests` : Tests E2E Playwright
- `/.github/workflows` : Pipelines CI/CD
