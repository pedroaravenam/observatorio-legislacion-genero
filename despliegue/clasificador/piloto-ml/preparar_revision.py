"""Prepara una revisión ciega local a partir del CSV y los documentos del Senado."""

import argparse
import csv
import json
import re
from pathlib import Path

from evaluar import leer_documento
from reunir_textos import verificar_url


def preparar(muestra, carpeta_textos, salida):
    with muestra.open(encoding='utf-8-sig', newline='') as archivo:
        filas = list(csv.DictReader(archivo))
    datos = []
    for fila in filas:
        boletin = fila['boletin']
        if not re.fullmatch(r'\d{1,6}-\d{2}', boletin):
            raise ValueError(f'Boletín inválido: {boletin}')
        documento = leer_documento(carpeta_textos, boletin)
        verificar_url(fila['ficha_senado'])
        if documento:
            verificar_url(documento['fuente'])
        datos.append({
            'boletin': boletin,
            'anio': fila['anio'],
            'titulo': fila['titulo'],
            'ficha_senado': fila['ficha_senado'],
            'incluye': fila['incluye'],
            'razon': fila['razon'],
            'documento': documento['fuente'] if documento else '',
            'extracto': documento['texto'][:6000] if documento else '',
        })
    if not datos:
        raise ValueError('La muestra está vacía')
    plantilla = Path(__file__).with_name('revision.html').read_text(encoding='utf-8')
    contenido = json.dumps(datos, ensure_ascii=False).replace('<', '\\u003c')
    with salida.open('x', encoding='utf-8') as archivo:
        archivo.write(plantilla.replace('/* DATOS */[]', contenido))
    return len(datos), sum(bool(dato['extracto']) for dato in datos)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('muestra', type=Path)
    parser.add_argument('textos', type=Path)
    parser.add_argument('salida', type=Path)
    args = parser.parse_args()
    total, con_texto = preparar(args.muestra, args.textos, args.salida)
    print(f'Muestra preparada: {total} boletines, {con_texto} con extracto')


if __name__ == '__main__':
    main()
