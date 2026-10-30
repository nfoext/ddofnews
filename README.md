# Dépêches du Cœur

Chaque jour, trois nouvelles sentimentales écrites par une IA à partir de l’actualité. Le lecteur en choisit une ; les deux autres se ferment jusqu’au lendemain.

## Contenu du dépôt

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page (structure) |
| `style.css` | L’apparence |
| `app.js` | Le comportement : lecture de l’édition, choix du jour, caviardage |
| `edition.json` | L’édition du jour : tendances, masques, trois nouvelles |
| `prompts/redacteur.md` | Le prompt qui transforme un article en nouvelle, et la grille de test |
| `scripts/assembler.py` | Assemble les sorties du prompt en `edition.json`, avec contrôles |
| `essais/<date>/` | Pour chaque édition : les entrées (résumés d’articles, sources), les sorties brutes du prompt et `lot.json` |

Pour changer le contenu, on ne modifie que `edition.json`. Le reste du site ne bouge pas d’un jour à l’autre.

## Fabriquer une édition

1. Choisir trois articles du jour et noter leurs résumés dans `essais/<date>/entrees.md`.
2. Passer chaque article dans le prompt de `prompts/redacteur.md`, avec un trope différent pour chacun. Enregistrer chaque réponse brute dans `essais/<date>/`.
3. Décrire le lot dans `essais/<date>/lot.json` (date, numéro, tendances, fichiers et sources).
4. Lancer `python3 scripts/assembler.py essais/<date>/lot.json`. Le script refuse une balise sans masque, un nom réel en clair ou un refus du rédacteur, et signale les longueurs hors cible.
5. Publier `edition.json`.

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
- `bandeau` (facultatif) : un message affiché sous les tendances. `demo: true` affiche le bouton « Rejouer », utile pour tester le choix du jour.

## Prochaine étape

Un script lancé chaque nuit par GitHub Actions écrira `edition.json` : collecte des tendances, sélection de trois sujets, rédaction avec le prompt du rédacteur, contrôles, puis publication.
