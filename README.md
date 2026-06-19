# ✈ WhiteSky Travel Agency — Système de Facturation

## Installation (une seule fois)

### 1. Installer Node.js
Télécharge et installe Node.js depuis : https://nodejs.org  
(Prends la version LTS — bouton vert)

### 2. Extraire le dossier
Extrais le fichier ZIP où tu veux, par exemple :
```
C:\WhiteSky\
```

### 3. Installer les dépendances
Ouvre le terminal (cmd) dans le dossier, puis tape :
```
npm install
```

---

## Lancer l'application

Double-clique sur **START.bat** (Windows)  
OU dans le terminal :
```
node server.js
```

Tu verras :
```
✈  WhiteSky Travel Agency — Système de Facturation
🌐  Local:   http://localhost:3000
🌐  Réseau:  http://[VOTRE-IP]:3000
```

## Accéder depuis d'autres PCs (même réseau WiFi)

1. Sur le PC où tourne le serveur, note l'adresse IP :
   - Windows : ouvre cmd → tape `ipconfig` → cherche "Adresse IPv4"
   - Ex: 192.168.1.105
2. Sur les autres PCs, ouvrir le navigateur et aller sur :
   ```
   http://192.168.1.105:3000
   ```

---

## Comptes par défaut

| Utilisateur | Mot de passe   | Accès                          |
|-------------|----------------|--------------------------------|
| patron      | whitesky2024   | Tout — toutes les factures     |
| employe     | staff2024      | Ses propres factures uniquement|

Tu peux ajouter d'autres utilisateurs dans Paramètres (patron uniquement).

---

## Base de données

Les données sont stockées dans : `db/whitesky.db`  
C'est un fichier SQLite — **sauvegarde ce fichier régulièrement !**

Pour faire une sauvegarde : copie simplement `db/whitesky.db` ailleurs.

---

## Structure des fichiers

```
whitesky-app/
├── server.js          ← Serveur principal
├── package.json       ← Dépendances
├── START.bat          ← Lancer sur Windows
├── db/
│   └── whitesky.db   ← Base de données (créée au premier lancement)
└── public/
    ├── index.html     ← Interface principale
    ├── css/app.css    ← Styles
    └── js/app.js      ← Logique
```

---

## Fonctionnalités

- ✅ **Dashboard** — statistiques en temps réel
- ✅ **Clients** — ajout, modification, suppression
- ✅ **Factures** — format exact WhiteSky (PNR, Destination, Passenger, Airline, Date, Prix)
- ✅ **Devis** — convertibles en factures
- ✅ **Paiements** — enregistrement et suivi
- ✅ **Articles** — catalogue de prestations
- ✅ **Rapports** — revenus par mois, graphiques
- ✅ **Paramètres** — gestion des utilisateurs (patron uniquement)
- ✅ **Impression PDF** — via le navigateur (Ctrl+P)
- ✅ **Multi-utilisateurs** — sessions séparées, permissions par rôle
