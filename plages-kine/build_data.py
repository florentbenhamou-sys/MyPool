#!/usr/bin/env python3
"""Intègre l'onglet « Calendrier » d'un emploi du temps xlsx dans index.html.

Usage : python3 build_data.py Emploi_du_temps_BENHAMOU_Q1_Q2.xlsx [modele.html] [sortie.html]
(par défaut : index.html -> dist/index.html, dossier non versionné)

Produit { "AAAA-MM-JJ": [[debut_min, fin_min, "matiere", "type"], ...] } pour les
jours ouvrés du 12/10/2026 au 18/12/2026 et le place dans <script id="edt-data">.
"""
import datetime as dt
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

DU = dt.date(2026, 10, 12)
AU = dt.date(2026, 12, 18)


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return s.strip().lower()


def to_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    if isinstance(v, (int, float)):  # numéro de série Excel
        return dt.date(1899, 12, 30) + dt.timedelta(days=int(v))
    s = str(v or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d %H:%M:%S"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def to_min(v):
    if isinstance(v, dt.datetime):
        v = v.time()
    if isinstance(v, dt.time):
        return v.hour * 60 + v.minute + round(v.second / 60)
    if isinstance(v, dt.timedelta):
        return round(v.total_seconds() / 60)
    if isinstance(v, (int, float)):  # fraction de jour Excel
        return round((v % 1) * 1440)
    m = re.match(r"^\s*(\d{1,2})[:hH](\d{2})(?::(\d{2}))?", str(v or ""))
    if m:
        return int(m.group(1)) * 60 + int(m.group(2)) + round(int(m.group(3) or 0) / 60)
    return None


def main():
    src = Path(sys.argv[1])
    html = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).with_name("index.html")
    out = Path(sys.argv[3]) if len(sys.argv) > 3 else Path(__file__).parent / "dist" / "index.html"
    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    ws = wb["Calendrier"]
    rows = ws.iter_rows(values_only=True)

    header = None
    for r in rows:
        names = [norm(c) for c in r]
        if {"date", "debut", "fin"} <= set(names):
            header = names
            break
    if header is None:
        sys.exit("En-têtes Date / Début / Fin introuvables dans l'onglet Calendrier")
    ix = {k: header.index(k) for k in ("date", "debut", "fin")}
    ix["matiere"] = header.index("matiere") if "matiere" in header else None
    ix["type"] = header.index("type") if "type" in header else None

    data, skipped = {}, 0
    for r in rows:
        if r is None or all(c is None for c in r):
            continue
        d = to_date(r[ix["date"]])
        a, b = to_min(r[ix["debut"]]), to_min(r[ix["fin"]])
        if d is None or a is None or b is None or b <= a:
            skipped += 1
            continue
        if not (DU <= d <= AU) or d.weekday() > 4:
            continue
        mat = str(r[ix["matiere"]] or "").strip() if ix["matiere"] is not None else ""
        typ = str(r[ix["type"]] or "").strip() if ix["type"] is not None else ""
        data.setdefault(d.isoformat(), []).append([a, b, mat, typ])

    data = {k: sorted(v) for k, v in sorted(data.items())}
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    text = html.read_text(encoding="utf-8")
    new, n = re.subn(
        r'(<script id="edt-data" type="application/json">)(.*?)(</script>)',
        lambda m: m.group(1) + "\n" + payload + "\n" + m.group(3),
        text, count=1, flags=re.S,
    )
    if n != 1:
        sys.exit("Bloc <script id=\"edt-data\"> introuvable dans " + str(html))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(new, encoding="utf-8")
    nb = sum(len(v) for v in data.values())
    print(f"{nb} occupations sur {len(data)} jours intégrées dans {out} ({skipped} lignes ignorées)")


if __name__ == "__main__":
    main()
