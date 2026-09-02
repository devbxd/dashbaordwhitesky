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

### 4. Créer le fichier `.env`
Crée un fichier `.env` à la racine du projet avec au minimum :
```
DATABASE_URL=postgres://...
SESSION_SECRET=une-longue-chaine-aleatoire
```
Le serveur refuse de démarrer si l'une des deux manque (voir la section Configuration plus bas).

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

## Configuration (variables d'environnement)

Le serveur refuse de démarrer sans ces variables :

| Variable         | Rôle                                                        |
|------------------|--------------------------------------------------------------|
| `DATABASE_URL`   | Connexion PostgreSQL                                         |
| `SESSION_SECRET` | Clé de signature des sessions (obligatoire en production)    |

Optionnelles — ne fixent le mot de passe du compte que **la toute première fois** que ce compte est créé en base (jamais recréées ensuite) :

| Variable            | Compte créé au premier démarrage |
|---------------------|-----------------------------------|
| `PATRON_PASSWORD`   | `majd` (rôle patron — accès total) |
| `EMPLOYE_PASSWORD`  | `user` (rôle employé)              |
| `CYBER_PASSWORD`    | `boudy` (rôle cyber)               |

Si l'une d'elles n'est pas définie, un mot de passe aléatoire est généré et affiché **une seule fois** dans les logs du serveur au premier démarrage — note-le tout de suite, il ne sera plus jamais réaffiché.

Change ensuite les mots de passe depuis Paramètres (patron uniquement) pour les utilisateurs suivants.

---

## Base de données

Les données sont stockées dans PostgreSQL (variable `DATABASE_URL`). Fais des sauvegardes régulières via `pg_dump` — ce n'est plus un fichier unique à copier comme avec SQLite.

---

## Structure des fichiers

```
whitesky-app/
├── server.js          ← Serveur principal
├── package.json       ← Dépendances
├── START.bat          ← Lancer sur Windows
├── .env               ← DATABASE_URL, SESSION_SECRET (non commité)
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
