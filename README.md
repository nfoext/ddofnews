# Dépêches du Cœur

Chaque jour, trois nouvelles sentimentales écrites par une IA à partir de l’actualité. Le lecteur en choisit une ; les deux autres se ferment jusqu’au lendemain.

## Contenu du dépôt

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page (structure) |
| `style.css` | L’apparence |
| `app.js` | Le comportement : lecture de l’édition, choix du jour, caviardage |
| `edition.json` | L’édition du jour : tendances, masques, trois nouvelles |

Pour changer le contenu, on ne modifie que `edition.json`. Le reste du site ne bouge pas d’un jour à l’autre.

## Mettre le site en ligne avec GitHub Pages

1. Dans le dépôt, cliquer sur **Add file › Upload files**, glisser les fichiers, puis **Commit changes**.
2. Aller dans **Settings › Pages**.
3. Sous **Build and deployment**, choisir **Source : Deploy from a branch**, puis la branche **main** et le dossier **/ (root)**. Cliquer sur **Save**.
4. Attendre une à deux minutes. L’adresse du site s’affiche en haut de la page **Pages** : `https://<ton-identifiant>.github.io/<nom-du-depot>/`.

Avec un compte GitHub gratuit, Pages ne fonctionne que si le dépôt est **public**.

## Tester sur son ordinateur

La page charge `edition.json` : l’ouvrir en double-cliquant sur `index.html` ne marche pas. Il faut un petit serveur local :

```
python3 -m http.server 8000
```

puis ouvrir `http://localhost:8000`.

## Format de `edition.json`

- `masques` : pour chaque clé, les trois formes `barres`, `initiales` et `periphrase`. Seules ces formes sont publiées, jamais le nom réel.
- `nouvelles[].depeche` et `nouvelles[].paragraphes` : le texte, avec des balises `[[CLE]]` remplacées à l’affichage selon le mode choisi par le lecteur.
- `demo: true` affiche le bandeau « Prototype » et le bouton « Rejouer ». À passer à `false` quand les éditions seront générées automatiquement.

## Prochaine étape

Un script lancé chaque nuit par GitHub Actions écrira `edition.json` : collecte des tendances, sélection de trois sujets, rédaction avec le prompt du rédacteur, contrôles, puis publication.
