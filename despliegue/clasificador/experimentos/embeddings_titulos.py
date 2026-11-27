import csv,sys,numpy as np,re,unicodedata
from fastembed import TextEmbedding
S=sys.argv[1]; modelo=sys.argv[2]; salida=sys.argv[3]
cat={r['boletin']:r['titulo'] for r in csv.DictReader(open('datos/referencia/titulos-boletines-1990-2026.csv',encoding='utf-8-sig'))}
ids=[]
for f in ('humanos','auto'):
    for l in open(f'{S}/{f}.tsv'):
        b=l.split('\t')[0]
        if b in cat and b not in ids: ids.append(b)
m=TextEmbedding(modelo)
E_=np.array(list(m.embed([cat[b] for b in ids],batch_size=64)))
np.savez(salida,ids=np.array(ids),emb=E_)
print(modelo,E_.shape)
