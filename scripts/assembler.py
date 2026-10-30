#!/usr/bin/env python3
"""Assemble les sorties brutes du prompt du rédacteur en edition.json.

Usage :
    python3 scripts/assembler.py essais/2026-10-30/lot.json [--sortie edition.json]

Le lot (lot.json) donne la date, le numéro, les tendances et, pour chaque nouvelle,
le fichier de sortie brute du prompt et l'étiquette de source.

Le script calcule les formes « barres » et « initiales » à partir du nom réel ;
seules les trois formes masquées sont écrites dans edition.json, jamais le nom réel.
Il s'arrête sur toute erreur bloquante (balise inconnue, nom réel en clair, refus).
"""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

MOTS_PAR_MINUTE = 230
LONGUEUR_MIN, LONGUEUR_MAX = 1100, 1300
PETITS_MOTS = {"de", "du", "des", "la", "le", "les", "l", "d", "et", "by"}
BALISE = re.compile(r"\[\[([A-Z_]+)\]\]")


def caviarder(nom, initiales=False):
    def mot(m):
        w = m.group(0)
        if not initiales:
            return "█" * len(w)
        if w.lower() in PETITS_MOTS:
            return w
        return w[0] + "█" * (len(w) - 1)
    return re.sub(r"\w+", mot, nom)


def bloc(texte, nom):
    m = re.search(rf"<{nom}>\s*(.*?)\s*</{nom}>", texte, re.S)
    return m.group(1) if m else None


def slug(titre):
    s = unicodedata.normalize("NFKD", titre).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def lire_sortie(chemin):
    texte = chemin.read_text(encoding="utf-8")
    refus = bloc(texte, "refus")
    if refus:
        raise SystemExit(f"{chemin.name} : le rédacteur a refusé ({refus})")

    fiche = {}
    for ligne in (bloc(texte, "fiche") or "").splitlines():
        if ":" in ligne:
            cle, val = ligne.split(":", 1)
            fiche[cle.strip().lower()] = val.strip()
    for champ in ("titre", "trope", "accroche", "depeche"):
        if not fiche.get(champ):
            raise SystemExit(f"{chemin.name} : champ « {champ} » manquant dans <fiche>")

    masques = {}
    for ligne in (bloc(texte, "masques") or "").splitlines():
        if not ligne.strip():
            continue
        parts = [p.strip() for p in ligne.split("|")]
        if len(parts) != 4:
            raise SystemExit(f"{chemin.name} : ligne de masque mal formée : {ligne}")
        cle, reelle, nom, peri = parts
        if nom not in reelle:
            raise SystemExit(f"{chemin.name} : « {nom} » absent de « {reelle} » ({cle})")
        masques[cle] = {"reelle": reelle, "nom": nom, "periphrase": peri}

    nouvelle = bloc(texte, "nouvelle")
    if not nouvelle:
        raise SystemExit(f"{chemin.name} : bloc <nouvelle> manquant")
    paragraphes = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", nouvelle) if p.strip()]
    return fiche, masques, paragraphes


def controler(nom_fichier, fiche, masques, paragraphes):
    alertes = []
    textes = [fiche["depeche"]] + paragraphes
    tout = "\n".join(textes)

    for cle in set(BALISE.findall(tout)):
        if cle not in masques:
            raise SystemExit(f"{nom_fichier} : balise [[{cle}]] sans masque")
    for cle in masques:
        if f"[[{cle}]]" not in tout:
            alertes.append(f"masque {cle} défini mais jamais utilisé")
    for cle, m in masques.items():
        if re.search(rf"\b{re.escape(m['nom'])}\b", BALISE.sub("", tout)):
            raise SystemExit(f"{nom_fichier} : nom réel en clair : « {m['nom']} »")

    rendu = BALISE.sub(lambda x: masques[x.group(1)]["periphrase"], " ".join(paragraphes))
    mots = len(re.findall(r"\w+(?:[’'-]\w+)*", rendu))
    if not LONGUEUR_MIN <= mots <= LONGUEUR_MAX:
        alertes.append(f"{mots} mots (cible {LONGUEUR_MIN}–{LONGUEUR_MAX})")
    if len(fiche["accroche"].split()) > 15:
        alertes.append("accroche de plus de 15 mots")
    return mots, alertes


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("lot", type=Path)
    parser.add_argument("--sortie", type=Path, default=Path("edition.json"))
    args = parser.parse_args()

    lot = json.loads(args.lot.read_text(encoding="utf-8"))
    dossier = args.lot.parent
    edition = {
        "date": lot["date"],
        "numero": lot["numero"],
        "demo": lot.get("demo", False),
        "tendances": lot.get("tendances", []),
        "masques": {},
        "nouvelles": [],
    }
    if lot.get("bandeau"):
        edition["bandeau"] = lot["bandeau"]

    for entree in lot["nouvelles"]:
        fiche, masques, paragraphes = lire_sortie(dossier / entree["fichier"])
        mots, alertes = controler(entree["fichier"], fiche, masques, paragraphes)

        for cle, m in masques.items():
            formes = {
                "barres": m["reelle"].replace(m["nom"], caviarder(m["nom"])),
                "initiales": m["reelle"].replace(m["nom"], caviarder(m["nom"], initiales=True)),
                "periphrase": m["periphrase"],
            }
            deja = edition["masques"].get(cle)
            if deja and deja != formes:
                raise SystemExit(f"{entree['fichier']} : la clé {cle} existe déjà avec d’autres formes")
            edition["masques"][cle] = formes

        edition["nouvelles"].append({
            "id": slug(fiche["titre"]),
            "titre": fiche["titre"],
            "trope": fiche["trope"],
            "accroche": fiche["accroche"],
            "duree": f"{max(1, round(mots / MOTS_PAR_MINUTE))} min de lecture",
            "source": entree["source"],
            "depeche": fiche["depeche"],
            "paragraphes": paragraphes,
        })
        etat = "ok" if not alertes else "à revoir : " + " ; ".join(alertes)
        print(f"{entree['fichier']} — « {fiche['titre']} », {mots} mots — {etat}")

    args.sortie.write_text(json.dumps(edition, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"→ {args.sortie} écrit ({len(edition['nouvelles'])} nouvelles)")


if __name__ == "__main__":
    sys.exit(main())
