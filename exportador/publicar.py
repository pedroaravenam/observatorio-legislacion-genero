#!/usr/bin/env python3
"""Publica en Cloudflare D1 los boletines que cambiaron desde la última publicación.

Uso:
  python3 -I publicar.py              exporta los cambios desde la última publicación exitosa
  python3 -I publicar.py --faltantes  carga solo los boletines que aún no existen en D1
  python3 -I publicar.py --desde 2026-11-01T00:00:00Z

El estado queda en ~/.local/state/observatorio-publico/ultima-publicacion. El plan gratuito de D1
permite 100.000 filas escritas al día (cada boletín escribe unas 6), por eso se corta en MAXIMO.
"""
import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SITIO = AQUI.parent / "sitio"
WRANGLER = SITIO / "node_modules" / ".bin" / "wrangler"
ESTADO = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local/state")) / "observatorio-publico"
ARCHIVO_ESTADO = ESTADO / "ultima-publicacion"
POR_ARCHIVO = 150      # sentencias por archivo enviado a D1
MAXIMO = 14000         # boletines por ejecución (~84.000 filas escritas)
SOLAPE = dt.timedelta(hours=6)


def wrangler(*args: str) -> str:
    r = subprocess.run([str(WRANGLER), *args], cwd=SITIO, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"wrangler falló: {' '.join(args[:4])}\n{r.stderr[-2000:]}{r.stdout[-2000:]}")
    return r.stdout


def boletines_remotos() -> set[str]:
    salida = wrangler("d1", "execute", "DB", "--remote", "--json", "--command", "SELECT boletin FROM proyecto")
    return {f["boletin"] for f in json.loads(salida)[0]["results"]}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--faltantes", action="store_true")
    ap.add_argument("--desde")
    a = ap.parse_args()

    inicio = dt.datetime.now(dt.timezone.utc)
    if a.faltantes:
        desde = "1900-01-01T00:00:00Z"
    elif a.desde:
        desde = a.desde
    elif ARCHIVO_ESTADO.exists():
        previo = dt.datetime.fromisoformat(ARCHIVO_ESTADO.read_text().strip())
        desde = (previo - SOLAPE).strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        raise SystemExit("No hay publicación previa registrada: use --desde o --faltantes.")

    with tempfile.TemporaryDirectory(prefix="observatorio-publicar-") as tmp:
        exportado = Path(tmp) / "exportado.sql"
        subprocess.run([str(AQUI / "con-base.sh"), str(AQUI / "exportar-proyectos.sql"), str(exportado)],
                       env={**os.environ, "DESDE": desde}, check=True)
        lineas = exportado.read_text(encoding="utf-8").splitlines(keepends=True)
        proyectos = [l for l in lineas if l.startswith("INSERT INTO proyecto ")]
        otras = [l for l in lineas if not l.startswith("INSERT INTO proyecto ")]

        if a.faltantes:
            remotos = boletines_remotos()
            proyectos = [l for l in proyectos
                         if re.match(r"INSERT INTO proyecto \(.*?\) VALUES \('([^']+)'", l).group(1) not in remotos]

        completo = len(proyectos) <= MAXIMO
        proyectos = proyectos[:MAXIMO]
        print(f"desde {desde}: {len(proyectos)} boletines por publicar", flush=True)

        for i in range(0, len(proyectos), POR_ARCHIVO):
            parte = Path(tmp) / f"parte-{i // POR_ARCHIVO:04d}.sql"
            parte.write_text("".join(proyectos[i:i + POR_ARCHIVO]), encoding="utf-8")
            wrangler("d1", "execute", "DB", "--remote", "--yes", "--file", str(parte))
        if otras:
            parte = Path(tmp) / "publicacion.sql"
            parte.write_text("".join(otras), encoding="utf-8")
            wrangler("d1", "execute", "DB", "--remote", "--yes", "--file", str(parte))

    if completo and not a.faltantes:
        ESTADO.mkdir(parents=True, exist_ok=True)
        ARCHIVO_ESTADO.write_text(inicio.isoformat())
    if not completo:
        print(f"Quedaron boletines pendientes por el límite diario; vuelva a ejecutar mañana.", file=sys.stderr)
    print("publicación terminada", flush=True)


if __name__ == "__main__":
    main()
