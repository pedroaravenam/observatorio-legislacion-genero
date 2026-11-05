#!/usr/bin/env bash
# Monitor externo del sitio: lo corre GitHub Actions cada 30 minutos, fuera del VPS, para avisar cuando el VPS no puede.
# Uso: comprobar.sh <url base>. Variable: UMBRAL_HORAS (72): antigüedad máxima de la última consulta exitosa al Senado.
# Imprime dos líneas, «sitio=ok|falla:<motivo>» y «datos=ok|atrasado:<motivo>|desconocido». Siempre termina en 0;
# quien lo llama decide qué hacer con el resultado.
set -u
url=${1:?Indique la URL base}
url=${url%/}
umbral=${UMBRAL_HORAS:-72}
curl_base=(curl -s -m 20 -A 'observatorio-monitor (+https://github.com/pedroaravenam/observatorio-legislacion-genero)')

# Tres intentos espaciados: una falla de red de un solo momento no debe abrir un aviso.
sitio='falla:sin respuesta'
estado_json=''
for intento in 1 2 3; do
  codigo=$("${curl_base[@]}" -o /dev/null -w '%{http_code}' "$url/") || codigo=000
  if [[ $codigo == 200 ]]; then
    cuerpo=$("${curl_base[@]}" -f "$url/estado.json") && estado_json=$cuerpo
    if [[ -n $estado_json ]] && jq -e '(.proyectos | type == "number") and .proyectos >= 1000' <<<"$estado_json" >/dev/null 2>&1; then
      sitio=ok
      break
    fi
    sitio='falla:la portada responde pero /estado.json no trae el número esperado de proyectos'
  else
    sitio="falla:la portada respondió HTTP $codigo"
  fi
  ((intento < 3)) && sleep "${ESPERA_REINTENTO:-20}"
done
echo "sitio=$sitio"

if [[ $sitio != ok ]]; then
  echo 'datos=desconocido'
  exit 0
fi
consultado=$(jq -r '.consultado // empty' <<<"$estado_json")
if [[ -z $consultado ]] || ! marca=$(date -d "$consultado" +%s 2>/dev/null); then
  echo 'datos=desconocido'
  exit 0
fi
horas=$((($(date +%s) - marca) / 3600))
if ((horas > umbral)); then
  echo "datos=atrasado:la última consulta exitosa al Senado fue hace $horas horas (umbral $umbral)"
else
  echo 'datos=ok'
fi
exit 0
