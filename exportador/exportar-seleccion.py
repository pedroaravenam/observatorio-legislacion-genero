#!/usr/bin/env python3
"""Genera sentencias SQLite (D1) con la selección temática preliminar a partir del CSV versionado.

Uso: python3 -I exportar-seleccion.py ../datos/seleccion/candidatos-genero-v5.csv > seleccion.sql
"""
import csv
import re
import sys

ruta = sys.argv[1]
version = re.search(r"(v\d+)\.csv$", ruta).group(1)


def lit(v: str) -> str:
    return "'" + v.replace("'", "''") + "'"


print("DELETE FROM seleccion_genero;")
with open(ruta, newline="", encoding="utf-8") as f:
    filas = list(csv.DictReader(f))
for fila in filas:
    print(f"INSERT INTO seleccion_genero (boletin, nivel_senal, version) VALUES "
          f"({lit(fila['boletin'])}, {lit(fila['nivel_senal'])}, {lit(version)});")
print(f"-- {len(filas)} boletines", file=sys.stderr)
