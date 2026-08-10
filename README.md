# La Sainte Bible (v1)

Site ultra-léger pour les **quatre Évangiles** et la **Messe du jour** : lecture contemplative, mode sombre, HTML/CSS/JS purs.

## Lancer en local

Les modules ES nécessitent HTTP (pas de `file://`) :

```bash
cd /path/to/laSainteBible
python3 -m http.server 8080
```

Ouvrir [http://127.0.0.1:8080/](http://127.0.0.1:8080/).

## Structure

```
index.html              Messe du jour
lire/                   Lecteur livre entier (Mt, Mc, Lc, Jn)
css/                    tokens, base, messe, lecteur
js/                     modules ES (data-loader, render, messe, expand, gestures, aelf…)
data/evangiles/         JSON PD par livre
data/lectures/sample.json   Fallback lectures
scripts/build-data.py   Conversion one-shot (hors runtime)
ls1910/                 Sources brutes getbible (non servies nécessaires au runtime)
```

## Textes (domaine public)

| Élément | Détail |
|--------|--------|
| Version | **Louis Segond 1910** |
| API d’origine | [https://api.getbible.net/v2](https://api.getbible.net/v2) — translation `ls1910` |
| Fichiers bruts | `ls1910/40.json` … `43.json` (Matthieu → Jean) |
| Fichiers runtime | `data/evangiles/{matthieu,marc,luc,jean}.json` |
| Licence | Domaine public |

Régénérer les JSON runtime :

```bash
python3 scripts/build-data.py
```

## Messe du jour / AELF

- Tentative live : `https://api.aelf.org/v1/messes/{date}/france` (date Europe/Paris).
- En cas d’échec réseau/CORS : **fallback** `data/lectures/sample.json` + message discret.
- Le texte intégral des livres reste **toujours** le PD local (Segond). AELF ne sert qu’aux références / libellés du jour.
- Dilatation limitée aux passages des 4 Évangiles.

### Interactions (Messe du jour)

| Geste | Effet |
|-------|--------|
| Clic sur un passage d’Évangile | **Dilatation in-place** : le cadre-masque dévoile le chapitre entier (PD) autour de l’extrait liturgique |
| Re-clic | Remasque l’extrait et **restaure le scroll** d’origine |
| Clic nom d’apôtre (bas de page / NT) | Menu sobre des chapitres (`Mt14`…) |

Swipe / mode livre depuis la messe : **plus tard**.

## Périmètre v1

Inclus : 4 Évangiles, messe du jour, dilatation, swipe, sombre, responsive.  
Exclus : recherche, notes, surlignage, progression, calendrier multi-jours, multi-versions UI.

## Stack

HTML5 + CSS3 + JavaScript ES modules. Aucun framework, aucun bundler requis.
