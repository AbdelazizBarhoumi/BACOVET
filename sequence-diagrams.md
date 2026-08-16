# Diagrammes de séquence — BACOVET

Version simplifiée des parcours les plus importants, écrite pour des
utilisateurs non techniques. Chaque diagramme montre le chemin complet d'une
action : l'écran (Frontend), le serveur (Backend) et la base de données.

Format PlantUML : `sequence-diagrams.puml`.

## Acteurs et systèmes

| Personnage | Rôle |
| ---------- | ---- |
| **Utilisateur** / **Administrateur** | la personne qui agit |
| **Frontend** | l'écran affiché dans le navigateur (l'interface) |
| **Backend** | le serveur de l'application (les règles, la sécurité, le calcul) |
| **Base de données** | le stockage permanent des informations |
| **Serveur de données** | la source externe de données (uniquement diagramme 4) |

## Notation

| Symbole | Signification |
| ------- | ------------- |
| `->`    | Une action (une demande envoyée) |
| `-->`   | Une réponse / un retour d'information |
| `alt … else` | Deux scénarios possibles : le cas normal et le cas d'échec |
| `opt`   | Une étape optionnelle qui n'a lieu que dans certaines situations |

---

## 1. Connexion et premier changement de mot de passe

L'utilisateur saisit son matricule (ou son email) et son mot de passe. Le
serveur vérifie le compte en base de données. À la toute première connexion,
le serveur demande de choisir un nouveau mot de passe avant d'ouvrir l'accès.

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Frontend
    participant B as Backend
    participant D as Base de données

    U->>F: Saisit matricule et mot de passe
    F->>B: Envoie les identifiants
    B->>D: Recherche le compte
    D-->>B: Compte trouvé
    B->>B: Vérifie le mot de passe
    alt Identifiants corrects et compte actif
        B->>D: Consigne la connexion (journal d'activité)
        opt Premier mot de passe
            B-->>F: Demande de choisir un nouveau mot de passe
            U->>F: Saisit le nouveau mot de passe
            F->>B: Envoie le nouveau mot de passe
            alt Nouveau mot de passe valide
                B->>D: Met à jour le mot de passe (journal d'activité)
                B-->>F: Mot de passe mis à jour
            else Nouveau mot de passe invalide
                B-->>F: Message d'erreur
                F-->>U: Affiche le message d'erreur
            end
        end
        B-->>F: Accès autorisé
        F-->>U: Affiche l'application
    else Identifiants incorrects
        B->>D: Consigne l'échec de connexion (journal d'activité)
        B-->>F: Message d'erreur
        F-->>U: Affiche le message d'erreur
    end
```

---

## 2. Créer ou modifier une page de tableau de bord

L'utilisateur ouvre le constructeur de pages, crée une nouvelle page, y
place ses graphiques et indicateurs, puis enregistre sa mise en page. Chaque
étape passe par le serveur et la base de données.

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Frontend
    participant B as Backend
    participant D as Base de données

    U->>F: Ouvre le constructeur de pages
    F->>B: Demande la liste des pages
    B->>D: Lit les pages existantes
    D-->>B: Liste des pages
    B-->>F: Pages disponibles
    F-->>U: Affiche la liste des pages

    U->>F: Crée une nouvelle page
    F->>B: Envoie la demande de création
    B->>D: Crée la page
    D-->>B: Page créée
    B->>D: Consigne l'action (journal d'activité)
    B-->>F: Page créée
    F-->>U: Ouvre l'éditeur de la page

    U->>F: Ajoute des graphiques et indicateurs
    U->>F: Enregistre la mise en page
    F->>B: Envoie la mise en page
    B->>D: Sauvegarde la mise en page
    D-->>B: Mise en page enregistrée
    B->>D: Consigne l'action (journal d'activité)
    B-->>F: Confirmation
    F-->>U: Page enregistrée
```

---

## 3. Créer une mesure avec l'assistant

L'assistant guide l'utilisateur pour construire un indicateur (mesure). Il
choisit ses données parmi celles disponibles, puis voit le résultat en
direct avant de l'enregistrer.

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Frontend
    participant B as Backend
    participant D as Base de données

    U->>F: Ouvre l'assistant de mesure
    F->>B: Demande les données disponibles
    B->>D: Lit les jeux de données
    D-->>B: Données disponibles
    B-->>F: Colonnes et données
    F-->>U: Propose les étapes de création

    U->>F: Choisit les données et l'opération
    F->>F: Calcule le résultat en direct
    F-->>U: Aperçu du résultat
    alt Le résultat est correct
        U->>F: Enregistre la mesure
        F->>B: Envoie la mesure
        B->>D: Sauvegarde la mesure
        D-->>B: Mesure enregistrée
        B->>D: Consigne l'action (journal d'activité)
        B-->>F: Confirmation
        F-->>U: Mesure enregistrée
    else Le résultat n'est pas correct
        U->>F: Modifie les données ou l'opération
        F-->>U: Nouvel aperçu
    end
```

---

## 4. Créer une source de données (endpoint)

L'administrateur enregistre une nouvelle source de données : il renseigne
son adresse, la teste auprès du serveur de données, puis l'enregistre pour
qu'elle soit disponible dans les tableaux de bord.

```mermaid
sequenceDiagram
    actor A as Administrateur
    participant F as Frontend
    participant B as Backend
    participant S as Serveur de données
    participant D as Base de données

    A->>F: Ouvre la gestion des sources de données
    F->>B: Demande la liste des sources
    B-->>F: Sources existantes
    F-->>A: Affiche la liste

    A->>F: Renseigne le nom et l'adresse de la source
    A->>F: Teste la connexion
    F->>B: Demande le test de connexion
    B->>S: Interroge la source de données
    alt La source répond correctement
        S-->>B: Données reçues
        B-->>F: Test réussi
        F-->>A: Affiche le résultat du test
        A->>F: Enregistre la source
        F->>B: Envoie la nouvelle source
        B->>D: Sauvegarde la source et ses données
        D-->>B: Source enregistrée
        B-->>F: Confirmation
        F-->>A: Source enregistrée et disponible
    else La source ne répond pas
        S-->>B: Erreur de connexion
        B-->>F: Message d'erreur
        F-->>A: Affiche le message d'erreur
    end
```

---

## 5. Ajouter un utilisateur

L'administrateur crée un compte pour un nouvel utilisateur : il renseigne
ses informations, le rôle et un mot de passe de départ. Le serveur vérifie
que les informations sont uniques, enregistre le compte et trace l'action.

```mermaid
sequenceDiagram
    actor A as Administrateur
    participant F as Frontend
    participant B as Backend
    participant D as Base de données

    A->>F: Ouvre la gestion des utilisateurs
    F->>B: Demande la liste des utilisateurs
    B->>D: Lit les comptes existants
    D-->>B: Liste des comptes
    B-->>F: Utilisateurs disponibles
    F-->>A: Affiche la liste

    A->>F: Saisit le nom, le matricule, l'email et le rôle
    A->>F: Saisit un mot de passe de départ
    A->>F: Valide la création
    F->>B: Envoie le nouveau compte
    B->>D: Vérifie que le matricule et l'email sont libres
    alt Toutes les informations sont valides
        D-->>B: Matricule et email libres
        B->>B: Protège le mot de passe
        B->>D: Crée le compte
        D-->>B: Compte créé
        B->>D: Consigne l'action (journal d'activité)
        B-->>F: Compte créé
        F-->>A: Affiche la confirmation
    else Le matricule ou l'email existe déjà
        D-->>B: Information déjà utilisée
        B-->>F: Message d'erreur
        F-->>A: Affiche le message d'erreur
    end
```