"""Piloto reproducible sobre decisiones editoriales públicas y títulos del Senado."""

import argparse
import csv
import json
import random
import re
import unicodedata
from datetime import date
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, confusion_matrix
from sklearn.model_selection import StratifiedGroupKFold, cross_val_predict
from sklearn.pipeline import make_pipeline

RAIZ = Path(__file__).resolve().parents[3]
MEDICIONES = RAIZ / 'docs/mediciones'
SEMILLA = 42


def clave_titulo(titulo):
    texto = unicodedata.normalize('NFKD', titulo.casefold())
    sin_tildes = ''.join(c for c in texto if not unicodedata.combining(c))
    return ' '.join(re.findall(r'\w+', sin_tildes))


def cargar_datos():
    ruta = RAIZ / 'datos/referencia/titulos-boletines-1990-2026.csv'
    with ruta.open(encoding='utf-8-sig', newline='') as archivo:
        catalogo = {fila['boletin']: fila for fila in csv.DictReader(archivo)}
    ruta = MEDICIONES / 'veredictos-cola-2026-11-18.json'
    veredictos = json.loads(ruta.read_text(encoding='utf-8'))
    return catalogo, veredictos


def decision_agente(veredicto):
    razon = veredicto['razon']
    if razon.endswith(': coincide con el agente.'):
        return veredicto['incluye']
    if razon.endswith(': discrepa del agente.'):
        return not veredicto['incluye']
    raise ValueError(f"No se puede reconstruir la decisión para {veredicto['boletin']}")


def matriz(etiquetas, predicciones):
    vn, fp, fn, vp = confusion_matrix(etiquetas, predicciones, labels=[False, True]).ravel()
    return dict(vn=int(vn), fp=int(fp), fn=int(fn), vp=int(vp))


def modelo():
    return make_pipeline(
        TfidfVectorizer(strip_accents='unicode', ngram_range=(1, 2), sublinear_tf=True),
        LogisticRegression(max_iter=1000),
    )


def grupos_comunes(titulos, documentos):
    """Mantiene juntos los boletines con el mismo título o documento de ingreso."""
    anteriores = {}
    grupos = list(range(len(titulos)))

    def raiz(indice):
        while grupos[indice] != indice:
            indice = grupos[indice]
        return indice

    for indice, (titulo, documento) in enumerate(zip(titulos, documentos)):
        claves = [('titulo', clave_titulo(titulo))]
        if documento:
            claves.extend([('fuente', documento['fuente']), ('texto', documento['texto'])])
        for clave in claves:
            anterior = anteriores.setdefault(clave, indice)
            grupos[raiz(indice)] = raiz(anterior)
    return [raiz(i) for i in range(len(titulos))]


def evaluar_modelo(textos, etiquetas, pliegues):
    puntajes = cross_val_predict(
        modelo(), textos, etiquetas, cv=pliegues, method='predict_proba'
    )[:, 1]
    return resumir_puntajes(etiquetas, puntajes)


def resumir_puntajes(etiquetas, puntajes):
    # Umbrales ilustrativos, fijados antes de la corrida. No se usan en producción.
    incluir = puntajes >= 0.65
    excluir = puntajes <= 0.35
    revision = ~(incluir | excluir)
    ordenados = np.sort(puntajes)[::-1]
    cortes_revision = {}
    for porcentaje in (25, 50):
        posicion = (len(puntajes) * porcentaje + 99) // 100 - 1
        prioridad = puntajes >= ordenados[posicion]
        cortes_revision[f'primer_{porcentaje}_por_ciento'] = {
            'revisados': int(prioridad.sum()),
            'pertinentes_encontrados': int((prioridad & etiquetas).sum()),
        }
    return {
        'precision_promedio_modelo': round(float(average_precision_score(etiquetas, puntajes)), 3),
        'modelo_umbral_0.5': matriz(etiquetas, puntajes >= 0.5),
        'priorizacion': cortes_revision,
        'derivacion_ilustrativa': {
            'incluye': int(incluir.sum()),
            'excluye': int(excluir.sum()),
            'revision': int(revision.sum()),
            'inclusiones_erroneas': int((incluir & ~etiquetas).sum()),
            'exclusiones_erroneas': int((excluir & etiquetas).sum()),
        },
    }


def leer_documento(carpeta, boletin):
    ruta = carpeta / f'{boletin}.json'
    if not ruta.is_file():
        return None
    documento = json.loads(ruta.read_text(encoding='utf-8'))
    if documento['boletin'] != boletin or not documento['fuente'] or len(documento['texto'].strip()) < 500:
        raise ValueError(f'Documento inválido para {boletin}')
    return documento


def evaluar(catalogo, veredictos, carpeta_textos=None):
    disponibles = [v for v in veredictos if v['boletin'] in catalogo]
    faltantes = [v['boletin'] for v in veredictos if v['boletin'] not in catalogo]
    sin_documento = []
    documentos = []
    if carpeta_textos is not None:
        pares = []
        for veredicto in disponibles:
            documento = leer_documento(carpeta_textos, veredicto['boletin'])
            if documento:
                pares.append(veredicto)
                documentos.append(documento)
            else:
                sin_documento.append(veredicto['boletin'])
        disponibles = pares
    titulos = [catalogo[v['boletin']]['titulo'] for v in disponibles]
    etiquetas = np.array([v['incluye'] for v in disponibles], dtype=bool)
    grupos = grupos_comunes(titulos, documentos) if documentos else [clave_titulo(t) for t in titulos]
    resultado = {
        'casos_evaluados': len(disponibles),
        'sin_titulo_en_catalogo': faltantes,
        'incluidos_por_el_desarrollador': int(etiquetas.sum()),
    }
    if carpeta_textos is not None:
        resultado['sin_documento'] = sin_documento
    if any(len({g for g, y in zip(grupos, etiquetas) if y == clase}) < 5 for clase in (False, True)):
        resultado['estado'] = 'Datos insuficientes para 5 pliegues agrupados'
        return resultado
    divisor = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEMILLA)
    pliegues = list(divisor.split(titulos, etiquetas, grupos))
    if any(len(set(etiquetas[entrenamiento])) < 2 for entrenamiento, _ in pliegues):
        resultado['estado'] = 'Un pliegue de entrenamiento contiene una sola clase'
        return resultado
    resultado.update(
        precision_promedio_puntaje_constante=round(float(etiquetas.mean()), 3),
        agente_historico_mismos_boletines=matriz(etiquetas, [decision_agente(v) for v in disponibles]),
        solo_titulo=evaluar_modelo(titulos, etiquetas, pliegues),
    )
    if documentos:
        textos = [f"{titulo}\n{doc['texto'][:6000]}" for titulo, doc in zip(titulos, documentos)]
        resultado['titulo_y_texto_de_ingreso'] = evaluar_modelo(textos, etiquetas, pliegues)
    return resultado


def seleccionar_muestra(catalogo, veredictos):
    controles = RAIZ / 'despliegue/clasificador/casos-control.json'
    decisiones_anteriores = MEDICIONES / 'casos-a-validar-respuestas-2026-11-05.md'
    revisados = {v['boletin'] for v in veredictos}
    revisados.update(json.loads(controles.read_text(encoding='utf-8')))
    revisados.update(re.findall(r'\b\d+-\d{2}\b', decisiones_anteriores.read_text(encoding='utf-8')))
    titulos_revisados = {clave_titulo(catalogo[b]['titulo']) for b in revisados if b in catalogo}
    candidatos = [
        fila for boletin, fila in sorted(catalogo.items())
        if fila['anio'] == '2026' and boletin not in revisados
        and clave_titulo(fila['titulo']) not in titulos_revisados
    ]
    return random.Random(SEMILLA).sample(candidatos, 100)


def guardar_muestra(ruta, catalogo, veredictos):
    muestra = seleccionar_muestra(catalogo, veredictos)
    with ruta.open('x', encoding='utf-8', newline='') as archivo:
        campos = ['boletin', 'anio', 'titulo', 'ficha_senado', 'incluye', 'razon']
        escritor = csv.DictWriter(archivo, fieldnames=campos)
        escritor.writeheader()
        for fila in muestra:
            ficha = 'https://tramitacion.senado.cl/appsenado/templates/tramitacion/index.php'
            escritor.writerow({
                'boletin': fila['boletin'],
                'anio': fila['anio'],
                'titulo': fila['titulo'],
                'ficha_senado': f"{ficha}?boletin_ini={fila['boletin']}",
            })


def leer_muestra_etiquetada(ruta, catalogo, veredictos):
    esperados = {fila['boletin'] for fila in seleccionar_muestra(catalogo, veredictos)}
    with ruta.open(encoding='utf-8-sig', newline='') as archivo:
        filas = list(csv.DictReader(archivo))
    if len(filas) != len(esperados) or {f['boletin'] for f in filas} != esperados:
        raise ValueError('La muestra debe contener los mismos 100 boletines, sin repetidos')
    etiquetas = {'sí': True, 'si': True, 'no': False, 'dudoso': None}
    casos = []
    for fila in filas:
        etiqueta = (fila.get('incluye') or '').strip().casefold()
        if etiqueta not in etiquetas:
            raise ValueError(f"{fila['boletin']}: completa incluye con sí, no o dudoso")
        casos.append({'boletin': fila['boletin'], 'incluye': etiquetas[etiqueta]})
    return casos


def leer_veredictos_exportados(ruta, catalogo, entrenamiento):
    filas = json.loads(ruta.read_text(encoding='utf-8-sig'))
    if not isinstance(filas, list):
        raise ValueError('La exportación debe ser una lista de veredictos')
    entrenados = {fila['boletin'] for fila in entrenamiento}
    vistos = set()
    catalogo_ampliado = catalogo.copy()
    reservas = []
    descartados = []
    for fila in filas:
        if not isinstance(fila, dict):
            raise ValueError('La exportación contiene una fila inválida')
        boletin = fila.get('boletin')
        if not isinstance(boletin, str) or not re.fullmatch(r'\d{1,6}-\d{2}', boletin):
            raise ValueError(f'Boletín inválido en la exportación: {boletin!r}')
        if boletin in vistos or type(fila.get('incluye')) is not bool:
            raise ValueError(f'Veredicto repetido o inválido para {boletin}')
        try:
            date.fromisoformat(fila['validado'])
        except (ValueError, TypeError, KeyError):
            raise ValueError(f'Fecha de validación inválida para {boletin}') from None
        vistos.add(boletin)
        if boletin in entrenados:
            continue
        if boletin not in catalogo_ampliado:
            titulo = fila.get('titulo')
            if not isinstance(titulo, str) or not titulo.strip():
                descartados.append(boletin)
                continue
            catalogo_ampliado[boletin] = {'titulo': titulo.strip()}
        reservas.append(fila)
    return catalogo_ampliado, reservas, {
        'veredictos_exportados': len(filas),
        'boletines_ya_usados': len(vistos & entrenados),
        'sin_titulo': descartados,
    }


def evaluar_muestra(catalogo, veredictos, muestra, carpeta_textos):
    entrenamiento = [v for v in veredictos if v['boletin'] in catalogo]
    casos = [v for v in muestra if v['incluye'] is not None]
    filas = entrenamiento + muestra
    titulos = [catalogo[v['boletin']]['titulo'] for v in filas]
    documentos = [
        leer_documento(carpeta_textos, v['boletin']) if carpeta_textos is not None else None
        for v in filas
    ]
    grupos = grupos_comunes(titulos, documentos)
    corte = len(entrenamiento)
    grupos_reservados = set(grupos[corte:])
    indices_sin_cruces = [i for i in range(corte) if grupos[i] not in grupos_reservados]
    indices_prueba = [i for i in range(corte, len(filas)) if filas[i]['incluye'] is not None]
    informe = {
        'total_muestra': len(muestra),
        'dudosos_por_revision_humana': len(muestra) - len(casos),
        'incluidos_por_revision_humana': sum(v['incluye'] for v in casos),
        'entrenamiento_apartado_por_duplicados': corte - len(indices_sin_cruces),
    }

    def medir(serie, indices_entrenamiento, indices_evaluacion):
        y_entrenamiento = [filas[i]['incluye'] for i in indices_entrenamiento]
        y_prueba = np.array([filas[i]['incluye'] for i in indices_evaluacion], dtype=bool)
        if len(set(y_entrenamiento)) < 2 or len(set(y_prueba)) < 2:
            return {'estado': 'Se requieren ambas clases en entrenamiento y evaluación'}
        clasificador = modelo().fit([serie[i] for i in indices_entrenamiento], y_entrenamiento)
        puntajes = clasificador.predict_proba([serie[i] for i in indices_evaluacion])[:, 1]
        return resumir_puntajes(y_prueba, puntajes)

    informe['solo_titulo_muestra_completa'] = medir(titulos, indices_sin_cruces, indices_prueba)
    if carpeta_textos is not None:
        con_texto_entrenamiento = [i for i in indices_sin_cruces if documentos[i]]
        con_texto_prueba = [i for i in indices_prueba if documentos[i]]
        ampliados = [
            f"{titulo}\n{doc['texto'][:6000]}" if doc else titulo
            for titulo, doc in zip(titulos, documentos)
        ]
        informe['comparacion_pareada'] = {
            'casos_entrenamiento': len(con_texto_entrenamiento),
            'casos_evaluados': len(con_texto_prueba),
            'incluidos_por_revision_humana': sum(filas[i]['incluye'] for i in con_texto_prueba),
            'solo_titulo': medir(titulos, con_texto_entrenamiento, con_texto_prueba),
            'titulo_y_texto_de_ingreso': medir(ampliados, con_texto_entrenamiento, con_texto_prueba),
        }
    return informe


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--muestra', type=Path, help='Crear CSV de 100 boletines de 2026 para revisión ciega')
    parser.add_argument('--textos', type=Path, help='Comparar ambos modelos en el subconjunto con documento de ingreso')
    parser.add_argument('--muestra-etiquetada', type=Path, help='Evaluar el CSV ciego una vez revisados los 100 casos')
    parser.add_argument('--veredictos-exportados', type=Path, help='Evaluar veredictos de la base que no estaban en el lote de entrenamiento')
    args = parser.parse_args()
    catalogo, veredictos = cargar_datos()
    resultado = evaluar(catalogo, veredictos, args.textos)
    if args.muestra_etiquetada:
        try:
            muestra = leer_muestra_etiquetada(args.muestra_etiquetada, catalogo, veredictos)
        except ValueError as error:
            parser.error(str(error))
        resultado['muestra_independiente'] = evaluar_muestra(catalogo, veredictos, muestra, args.textos)
    if args.veredictos_exportados:
        try:
            catalogo_exportado, reservas, inventario = leer_veredictos_exportados(
                args.veredictos_exportados, catalogo, veredictos
            )
        except ValueError as error:
            parser.error(str(error))
        resultado['veredictos_reservados'] = inventario | evaluar_muestra(
            catalogo_exportado, veredictos, reservas, args.textos
        )
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    if args.muestra:
        guardar_muestra(args.muestra, catalogo, veredictos)


if __name__ == '__main__':
    main()
