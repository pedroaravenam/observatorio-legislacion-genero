import sys,re,unicodedata,numpy as np
from fastembed import TextEmbedding
S=sys.argv[1]
R=[l.rstrip('\n').split('\t') for l in open(S+'/val.tsv')]; y=np.array([int(r[1]) for r in R]); T=[r[2] for r in R]
VAC=set('proyecto ley modifica establece sobre para otras otros materia materias entre texto codigo normas norma dicta crea regula declara artculo'.split())
def pal(t):
    t=''.join(c for c in unicodedata.normalize('NFD',t) if not unicodedata.combining(c)).lower()
    return {w for w in re.findall(r'[a-z]{4,}',t) if w not in VAC}
P=[pal(t) for t in T]
def vecinos_pal(i,k=5):
    sc=[(len(P[i]&P[j]),j) for j in range(len(T)) if j!=i and len(P[i]&P[j])>0]
    sc.sort(key=lambda x:-x[0]); return [j for _,j in sc[:k]]
def evalua(nombre,vec):
    acc=[];cobertura=0;concor=[]
    for i in range(len(T)):
        v=vec(i)
        if not v: continue
        cobertura+=1; concor.append(np.mean(y[v]==y[i]))
        acc.append((np.mean(y[v])>=0.5)==bool(y[i]))
    print(f'{nombre:34s} cobertura {cobertura}/{len(T)}  voto mayoritario acierta {np.mean(acc):.3f}  vecinos con igual veredicto {np.mean(concor):.3f}')
print('base: proporción de incluye',round(y.mean(),3))
evalua('palabras compartidas (actual)',vecinos_pal)
for m in ['sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2','sentence-transformers/paraphrase-multilingual-mpnet-base-v2']:
    E=np.array(list(TextEmbedding(m).embed(T))); E/=np.linalg.norm(E,axis=1,keepdims=True); Sim=E@E.T; np.fill_diagonal(Sim,-1)
    evalua(m.split('/')[1][:34],lambda i:list(np.argsort(-Sim[i])[:5]))
