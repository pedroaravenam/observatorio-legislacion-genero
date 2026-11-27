import csv,sys,numpy as np,re,unicodedata,warnings
warnings.filterwarnings('ignore')
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import average_precision_score, roc_auc_score
S=sys.argv[1]; npz=np.load(sys.argv[2]); ids=list(npz['ids']); E=npz['emb']; ix={b:i for i,b in enumerate(ids)}
cat={r['boletin']:r['titulo'] for r in csv.DictReader(open('datos/referencia/titulos-boletines-1990-2026.csv',encoding='utf-8-sig'))}
def clave(t):
    t=unicodedata.normalize('NFKD',t.casefold()); t=''.join(c for c in t if not unicodedata.combining(c)); return ' '.join(re.findall(r'\w+',t))
H=[l.rstrip('\n').split('\t') for l in open(S+'/humanos.tsv')]; H=[h for h in H if h[0] in ix]
hb=[h[0] for h in H]; hy=np.array([int(h[1]) for h in H]); hg=[clave(cat[b]) for b in hb]
A=[l.rstrip('\n').split('\t') for l in open(S+'/auto.tsv')]; A=[a for a in A if a[0] in ix and a[0] not in set(hb)]
print('humanos',len(hb),'positivos',hy.sum(),'| auto',len(A))
# pesos por fuente
def peso(a):
    cod,niv,inc=a[4],a[2],int(a[1])
    if not inc: return 0.1
    if niv.startswith(('T1','T2')): return 0.2
    return 0.5
aw=np.array([peso(a) for a in A]); ay=np.array([int(a[1]) for a in A]); ab=[a[0] for a in A]
ae=E[[ix[b] for b in ab]]; atit=[cat[b] for b in ab]; agr=[clave(t) for t in atit]
he=E[[ix[b] for b in hb]]; htit=[cat[b] for b in hb]
def run(nombre,fit_pred,reps=5):
    aps=[];aucs=[]
    for r in range(reps):
        sk=StratifiedGroupKFold(5,shuffle=True,random_state=r); p=np.zeros(len(hy))
        for tr,te in sk.split(he,hy,hg):
            p[te]=fit_pred(tr,te)
        aps.append(average_precision_score(hy,p)); aucs.append(roc_auc_score(hy,p))
    print(f'{nombre:44s} AP {np.mean(aps):.3f} ±{np.std(aps):.3f}  AUC {np.mean(aucs):.3f}')
print('AP de azar =',round(hy.mean(),3))
def tfidf_h(tr,te,C=1.0):
    v=TfidfVectorizer(ngram_range=(1,2),sublinear_tf=True,strip_accents='unicode'); X=v.fit_transform([htit[i] for i in tr])
    return LogisticRegression(C=C,max_iter=2000,class_weight='balanced').fit(X,hy[tr]).predict_proba(v.transform([htit[i] for i in te]))[:,1]
def emb_h(tr,te,C=1.0):
    return LogisticRegression(C=C,max_iter=2000,class_weight='balanced').fit(he[tr],hy[tr]).predict_proba(he[te])[:,1]
def emb_auto(tr,te,C=1.0,w=1.0,hum=3.0):
    gtr=set(hg[i] for i in tr); m=np.array([g not in gtr for g in agr])
    X=np.vstack([he[tr],ae[m]]); y=np.r_[hy[tr],ay[m]]; sw=np.r_[np.full(len(tr),hum),aw[m]*w]
    return LogisticRegression(C=C,max_iter=2000,class_weight='balanced').fit(X,y,sample_weight=sw).predict_proba(he[te])[:,1]
def tfidf_auto(tr,te,C=1.0):
    gtr=set(hg[i] for i in tr); m=np.array([g not in gtr for g in agr])
    v=TfidfVectorizer(ngram_range=(1,2),sublinear_tf=True,strip_accents='unicode')
    txt=[htit[i] for i in tr]+[t for t,k in zip(atit,m) if k]; X=v.fit_transform(txt)
    y=np.r_[hy[tr],ay[m]]; sw=np.r_[np.full(len(tr),3.0),aw[m]]
    return LogisticRegression(C=C,max_iter=2000,class_weight='balanced').fit(X,y,sample_weight=sw).predict_proba(v.transform([htit[i] for i in te]))[:,1]
run('TF-IDF, solo humanos',tfidf_h)
run('Embeddings, solo humanos',emb_h)
for C in (0.1,10): run(f'Embeddings, solo humanos C={C}',lambda a,b:emb_h(a,b,C))
run('TF-IDF + auto ponderado',tfidf_auto)
run('Embeddings + auto ponderado',emb_auto)
run('Embeddings + auto (peso auto x0.3)',lambda a,b:emb_auto(a,b,w=0.3))
run('Embeddings + auto (humanos x10)',lambda a,b:emb_auto(a,b,hum=10))
