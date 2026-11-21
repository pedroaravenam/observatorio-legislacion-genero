"""Descarga documentos de ingreso del Senado para el piloto local."""

import argparse
import csv
import io
import json
import re
import shutil
import subprocess
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

SERVICIO = 'https://tramitacion.senado.cl/wspublico/tramitacion.php'
DOMINIOS = {'tramitacion.senado.cl', 'www.senado.cl'}
LIMITE_BYTES = 20 * 1024 * 1024
DOCUMENTO_WORD = 'word/document.xml'
WORD = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
LIB_CLASIFICADOR = (Path(__file__).resolve().parents[1] / 'lib.mjs').as_uri()


def verificar_url(url):
    partes = urlsplit(url)
    if partes.scheme != 'https' or partes.netloc not in DOMINIOS:
        raise ValueError(f'Destino fuera de la lista del Senado: {partes.hostname}')


class RedireccionSenado(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        verificar_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def descargar(url):
    verificar_url(url)
    req = Request(url, headers={'User-Agent': 'ObservatorioLegislacionGenero/1.0'})
    with build_opener(RedireccionSenado()).open(req, timeout=65) as respuesta:
        contenido = respuesta.read(LIMITE_BYTES + 1)
    if len(contenido) > LIMITE_BYTES:
        raise ValueError('El archivo supera el límite de descarga')
    return contenido


def url_documento(xml, boletin):
    raiz = ElementTree.fromstring(xml)
    for proyecto in raiz.findall('./proyecto/descripcion'):
        if (proyecto.findtext('boletin') or '').strip() == boletin:
            url = (proyecto.findtext('link_mensaje_mocion') or '').strip()
            if not url:
                raise ValueError('Ficha sin documento de ingreso')
            return url.replace('http://', 'https://', 1) if url.startswith('http://') else url
    raise ValueError('La ficha no contiene el boletín solicitado')


def leer_pdf(contenido, ocr):
    texto = subprocess.run(
        ['pdftotext', '-enc', 'UTF-8', '-', '-'],
        input=contenido, capture_output=True, check=True, timeout=60,
    ).stdout.decode('utf-8')
    if not ocr or len(' '.join(texto.split())) >= 500:
        return texto
    with tempfile.TemporaryDirectory() as directorio:
        prefijo = str(Path(directorio) / 'pagina')
        subprocess.run(
            ['pdftoppm', '-f', '1', '-l', '3', '-r', '180', '-gray', '-', prefijo],
            input=contenido, capture_output=True, check=True, timeout=60,
        )
        paginas = sorted(Path(directorio).glob('pagina-*.pgm'))
        return '\n'.join(
            subprocess.run(
                ['tesseract', str(pagina), 'stdout', '-l', 'spa'],
                capture_output=True, check=True, timeout=45,
            ).stdout.decode('utf-8')
            for pagina in paginas
        )


def extraer_texto(contenido, ocr=False):
    if not contenido.strip():
        raise ValueError('El enlace oficial devolvió un documento vacío')
    if contenido.startswith(b'%PDF-'):
        texto = leer_pdf(contenido, ocr)
    elif contenido.startswith(b'PK'):
        with ZipFile(io.BytesIO(contenido)) as docx:
            if docx.getinfo(DOCUMENTO_WORD).file_size > LIMITE_BYTES:
                raise ValueError('El XML de Word supera el límite de extracción')
            raiz = ElementTree.fromstring(docx.read(DOCUMENTO_WORD))
        texto = '\n'.join(
            ''.join(nodo.text or '' for nodo in parrafo.iter(WORD + 't'))
            for parrafo in raiz.iter(WORD + 'p')
        )
    elif contenido.startswith(b'{\\rtf'):
        codigo = (
            f'import {{ textoRtf }} from {json.dumps(LIB_CLASIFICADOR)};'
            'import { readFileSync } from "node:fs";'
            'process.stdout.write(textoRtf(readFileSync(0).toString("latin1")));'
        )
        texto = subprocess.run(
            ['node', '--input-type=module', '-e', codigo],
            input=contenido, capture_output=True, check=True, timeout=60,
        ).stdout.decode('utf-8')
    elif contenido.startswith(b'\xd0\xcf\x11\xe0'):
        # El servicio añade CRLF CRLF a algunos Word binarios, que ocupan sectores de 512 bytes.
        if len(contenido) % 512 == 4 and contenido.endswith(b'\r\n\r\n'):
            contenido = contenido[:-4]
        if shutil.which('antiword'):
            with tempfile.NamedTemporaryFile(suffix='.doc') as archivo:
                archivo.write(contenido)
                archivo.flush()
                texto = subprocess.run(
                    ['antiword', '-m', 'UTF-8.txt', archivo.name],
                    capture_output=True, check=True, timeout=60,
                ).stdout.decode('utf-8')
        else:
            texto = subprocess.run(
                ['catdoc', '-w', '-s', 'cp1252', '-d', 'utf-8'],
                input=contenido, capture_output=True, check=True, timeout=60,
            ).stdout.decode('utf-8')
    else:
        raise ValueError('Formato de documento desconocido')
    texto = ' '.join(texto.split())
    if len(texto) < 500:
        raise ValueError('Documento sin suficiente texto extraíble')
    return texto


def reunir(boletin, carpeta, ocr=False):
    if not re.fullmatch(r'\d{1,6}-\d{2}', boletin):
        raise ValueError(f'Boletín inválido: {boletin}')
    salida = carpeta / f'{boletin}.json'
    if salida.is_file():
        return
    numero = boletin.split('-')[0]
    url = url_documento(descargar(f'{SERVICIO}?boletin={numero}'), boletin)
    texto = extraer_texto(descargar(url), ocr=ocr)
    with tempfile.NamedTemporaryFile(
        mode='w', encoding='utf-8', dir=carpeta, delete=False,
    ) as archivo:
        temporal = Path(archivo.name)
    try:
        temporal.write_text(json.dumps(
            {'boletin': boletin, 'fuente': url, 'texto': texto}, ensure_ascii=False,
        ), encoding='utf-8')
        temporal.replace(salida)
    finally:
        temporal.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('entrada', type=Path, help='JSON de veredictos o CSV de boletines')
    parser.add_argument('carpeta', type=Path, help='Carpeta de documentos extraídos')
    parser.add_argument('--limite', type=int, default=5, help='Cantidad de boletines nuevos')
    parser.add_argument('--ocr', action='store_true', help='OCR en español para PDF escaneados')
    parser.add_argument('--paralelo', type=int, choices=range(1, 4), default=1)
    args = parser.parse_args()
    if args.limite < 1:
        parser.error('--limite debe ser positivo')
    with args.entrada.open(encoding='utf-8-sig', newline='') as archivo:
        filas = json.load(archivo) if args.entrada.suffix == '.json' else list(csv.DictReader(archivo))
    boletines = list(dict.fromkeys(fila['boletin'] for fila in filas))
    if not all(re.fullmatch(r'\d{1,6}-\d{2}', boletin) for boletin in boletines):
        parser.error('La entrada contiene boletines con formato inválido')
    args.carpeta.mkdir(parents=True, exist_ok=True)
    pendientes = [b for b in boletines if not (args.carpeta / f'{b}.json').is_file()]
    cargados = 0

    def procesar(boletin):
        try:
            reunir(boletin, args.carpeta, ocr=args.ocr)
            print(f'{boletin}: texto guardado')
            return 'guardado'
        except HTTPError as error:
            print(f'{boletin}: HTTP {error.code}')
            if error.code in (401, 403, 429, 503):
                return 'detener'
        except (URLError, TimeoutError) as error:
            print(f'{boletin}: problema de conexión: {error}')
            return 'conexion'
        except (ValueError, KeyError, ElementTree.ParseError, BadZipFile, OSError, subprocess.SubprocessError) as error:
            print(f'{boletin}: {error}')
        return 'sin_texto'

    lote = pendientes[:args.limite]
    fallas_consecutivas = 0
    detenido = False
    with ThreadPoolExecutor(max_workers=args.paralelo) as ejecutor:
        for inicio in range(0, len(lote), args.paralelo):
            resultados = list(ejecutor.map(procesar, lote[inicio:inicio + args.paralelo]))
            cargados += resultados.count('guardado')
            for estado in resultados:
                fallas_consecutivas = fallas_consecutivas + 1 if estado == 'conexion' else 0
            if 'detener' in resultados or fallas_consecutivas >= 3:
                print('Descarga detenida por problemas de acceso al servicio')
                detenido = True
                break
            time.sleep(1)
    print(f'Textos disponibles: {len(boletines) - len(pendientes) + cargados}/{len(boletines)}')
    return int(detenido or bool(pendientes and not cargados))


if __name__ == '__main__':
    raise SystemExit(main())
