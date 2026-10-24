# Génère les illustrations vectorielles du site (src/assets/illustrations/*.svg).
# Dessinées pour le club à partir de formes simples et de la palette de la charte : aucun droit à vérifier.
#   python3 scripts/generate-illustrations.py
import os
import os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','src','assets','illustrations')
CREME='#fff6ee'; PECHE='#fde4d4'; PECHE2='#f8cdb6'; TERRA='#b95b43'; TERRA_D='#9a4936'
SAUGE='#7e9b7b'; SAUGE_C='#c9d9c4'; MAUVE='#9b5f78'; MAUVE_C='#e6cbd8'; BRUN='#6b3f36'; OR='#e8b86d'; BLANC='#ffffff'; ROSE='#e9a597'

def svg(w,h,body,bg=None):
    fond=f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">{fond}{body}</svg>'

def tasse(x,y,s=1,couleur=BLANC,cafe=BRUN,vapeur=True):
    v=''
    if vapeur:
        v=f'<path d="M{x-12*s} {y-62*s} q{-10*s} {-14*s} 0 {-26*s} t0 {-26*s}" fill="none" stroke="{TERRA}" stroke-width="{4*s}" stroke-linecap="round" opacity=".55"/><path d="M{x+14*s} {y-66*s} q{-10*s} {-14*s} 0 {-26*s} t0 {-26*s}" fill="none" stroke="{TERRA}" stroke-width="{4*s}" stroke-linecap="round" opacity=".55"/>'
    return (f'<ellipse cx="{x}" cy="{y+34*s}" rx="{70*s}" ry="{14*s}" fill="{PECHE2}"/>'
            f'<path d="M{x-50*s} {y-30*s} h{100*s} v{38*s} a{50*s} {44*s} 0 0 1 {-100*s} 0z" fill="{couleur}" stroke="{BRUN}" stroke-width="{3*s}"/>'
            f'<ellipse cx="{x}" cy="{y-30*s}" rx="{50*s}" ry="{11*s}" fill="{cafe}"/>'
            f'<path d="M{x+50*s} {y-18*s} a{22*s} {22*s} 0 1 1 0 {34*s}" fill="none" stroke="{BRUN}" stroke-width="{7*s}" stroke-linecap="round"/>'+v)

def plante(x,y,s=1,pot=TERRA):
    f=''
    for a,l in [(-40,70),(-15,95),(10,100),(35,75),(0,60)]:
        f+=f'<g transform="translate({x} {y-30*s}) rotate({a})"><path d="M0 0 C{-14*s} {-l*s*.5} {-8*s} {-l*s} 0 {-l*s} C{8*s} {-l*s} {14*s} {-l*s*.5} 0 0z" fill="{SAUGE}"/><path d="M0 0 V{-l*s*.85}" stroke="{SAUGE_C}" stroke-width="{2*s}"/></g>'
    return f+f'<path d="M{x-28*s} {y-30*s} h{56*s} l{-8*s} {52*s} h{-40*s}z" fill="{pot}"/><rect x="{x-32*s}" y="{y-36*s}" width="{64*s}" height="{10*s}" rx="{4*s}" fill="{TERRA_D}"/>'

def fleurs_seches(x,y,s=1):
    t=''
    for i,(dx,h,c) in enumerate([(-28,150,OR),(-10,185,ROSE),(10,170,OR),(30,140,ROSE),(0,120,SAUGE)]):
        t+=f'<path d="M{x+dx*s*.3} {y} Q{x+dx*s} {y-h*s*.5} {x+dx*s*1.4} {y-h*s}" stroke="{BRUN}" stroke-width="{3*s}" fill="none" stroke-linecap="round"/>'
        for k in range(6):
            t+=f'<ellipse cx="{x+dx*s*1.4+ (k%3-1)*7*s}" cy="{y-h*s+ (k//3)*-10*s - 6*s}" rx="{6*s}" ry="{9*s}" fill="{c}"/>'
    return t

def vase(x,y,s=1):
    return f'<path d="M{x-30*s} {y-60*s} q{-14*s} {50*s} 0 {90*s} h{60*s} q{14*s} {-40*s} 0 {-90*s}z" fill="{BLANC}" stroke="{BRUN}" stroke-width="{3*s}" opacity=".95"/>'+fleurs_seches(x,y-56*s,s)

def bougie(x,y,s=1,c=PECHE2):
    return (f'<rect x="{x-24*s}" y="{y-50*s}" width="{48*s}" height="{70*s}" rx="{8*s}" fill="{c}" stroke="{BRUN}" stroke-width="{3*s}"/>'
            f'<path d="M{x} {y-92*s} q{14*s} {22*s} 0 {36*s} q{-14*s} {-14*s} 0 {-36*s}z" fill="{OR}"/><circle cx="{x}" cy="{y-70*s}" r="{34*s}" fill="{OR}" opacity=".18"/>')

def pelote(x,y,s=1,c=TERRA):
    t=f'<circle cx="{x}" cy="{y}" r="{46*s}" fill="{c}"/>'
    for i in range(5):
        t+=f'<path d="M{x-44*s} {y+(i-2)*14*s} q{44*s} {-22*s} {88*s} 0" fill="none" stroke="{ROSE}" stroke-width="{3*s}" opacity=".8"/>'
    return t

def palette(x,y,s=1):
    t=f'<path d="M{x-90*s} {y} c0 {-60*s} {70*s} {-80*s} {120*s} {-60*s} c{50*s} {20*s} {60*s} {80*s} {10*s} {96*s} c{-40*s} {12*s} {-30*s} {-30*s} {-70*s} {-24*s} c{-40*s} {6*s} {-60*s} {44*s} {-60*s} {-12*s}z" fill="{BLANC}" stroke="{BRUN}" stroke-width="{3*s}"/>'
    for i,c in enumerate([TERRA,OR,SAUGE,MAUVE,'#5b8db8']):
        t+=f'<circle cx="{x-60*s+i*28*s}" cy="{y-30*s+(0 if i%2==0 else 18*s)}" r="{11*s}" fill="{c}"/>'
    return t

def ciseaux(x,y,s=1,rot=-25):
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M-6 -70 L4 10 M6 -70 L-4 10" stroke="{BRUN}" stroke-width="6" stroke-linecap="round"/><circle cx="-16" cy="30" r="18" fill="none" stroke="{TERRA}" stroke-width="8"/><circle cx="16" cy="30" r="18" fill="none" stroke="{TERRA}" stroke-width="8"/></g>'

def carnet(x,y,s=1,coeur=True):
    t=f'<g transform="translate({x} {y}) rotate(-6) scale({s})"><rect x="-120" y="-80" width="240" height="160" rx="10" fill="{BLANC}" stroke="{BRUN}" stroke-width="4"/><rect x="-120" y="-80" width="26" height="160" rx="8" fill="{TERRA}"/>'
    for i in range(5): t+=f'<path d="M-70 {-46+i*24} h150" stroke="{PECHE2}" stroke-width="3" stroke-linecap="round"/>'
    if coeur: t+=f'<path d="M30 40 c-14 -16 -34 4 0 26 c34 -22 14 -42 0 -26z" fill="{TERRA}" opacity=".8"/>'
    return t+'</g>'

def ordinateur(x,y,s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-130 70 h260 l20 18 h-300z" fill="{BRUN}"/><rect x="-110" y="-90" width="220" height="160" rx="10" fill="{BRUN}"/><rect x="-98" y="-78" width="196" height="136" rx="4" fill="{PECHE}"/>'
            f'<rect x="-84" y="-62" width="80" height="10" rx="4" fill="{MAUVE}"/><rect x="-84" y="-42" width="150" height="8" rx="4" fill="{MAUVE_C}"/><rect x="-84" y="-26" width="120" height="8" rx="4" fill="{MAUVE_C}"/><path d="M-84 40 l30 -30 l24 18 l36 -40 l40 52z" fill="{SAUGE}" opacity=".8"/></g>')

def ampoule(x,y,s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><circle cx="0" cy="0" r="60" fill="{OR}" opacity=".25"/><path d="M0 -44 a32 32 0 0 1 18 58 v14 h-36 v-14 a32 32 0 0 1 18 -58z" fill="{OR}" stroke="{BRUN}" stroke-width="4"/>'
            f'<rect x="-14" y="30" width="28" height="9" rx="3" fill="{BRUN}"/><rect x="-10" y="42" width="20" height="8" rx="3" fill="{BRUN}"/></g>')

def bulles(x,y,s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M0 0 h110 a20 20 0 0 1 20 20 v28 a20 20 0 0 1 -20 20 h-70 l-26 22 v-22 h-14 a20 20 0 0 1 -20 -20 v-28 a20 20 0 0 1 20 -20z" fill="{BLANC}" stroke="{TERRA}" stroke-width="4"/>'
            f'<path d="M60 52 c-14 -16 -34 4 0 26 c34 -22 14 -42 0 -26z" transform="translate(-6 -22) scale(.9)" fill="{TERRA}"/></g>')

def personne(x,y,s,robe,cheveux,chapeau=False,bras_leves=False,skin='#f2c8a8'):
    t=f'<g transform="translate({x} {y}) scale({s})">'
    t+=f'<path d="M-34 0 C-34 -90 -22 -120 0 -120 C22 -120 34 -90 34 0z" fill="{robe}"/>'
    if bras_leves:
        t+=f'<path d="M-26 -100 L-52 -170" stroke="{robe}" stroke-width="16" stroke-linecap="round"/><path d="M26 -100 L52 -170" stroke="{robe}" stroke-width="16" stroke-linecap="round"/><circle cx="-52" cy="-174" r="8" fill="{skin}"/><circle cx="52" cy="-174" r="8" fill="{skin}"/>'
    t+=f'<circle cx="0" cy="-142" r="22" fill="{cheveux}"/><path d="M-20 -150 C-20 -170 20 -170 20 -150 L20 -90 L-20 -90z" fill="{cheveux}"/><ellipse cx="0" cy="-138" rx="15" ry="18" fill="{skin}" opacity=".0"/>'
    if chapeau: t+=f'<ellipse cx="0" cy="-160" rx="38" ry="8" fill="#c9a06a"/><path d="M-20 -160 q20 -34 40 0z" fill="#b88a52"/>'
    return t+'</g>'

def paysage_coucher(w,h):
    t=f'<defs><linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c3a4"/><stop offset=".55" stop-color="#fbd9bf"/><stop offset="1" stop-color="#fde9d6"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#ciel)"/>'
    t+=f'<circle cx="{w*.72}" cy="{h*.52}" r="{h*.16}" fill="{OR}" opacity=".85"/>'
    t+=f'<path d="M0 {h*.62} Q{w*.2} {h*.46} {w*.4} {h*.62} T{w*.8} {h*.6} T{w} {h*.55} V{h} H0z" fill="{SAUGE_C}"/><path d="M0 {h*.74} Q{w*.25} {h*.62} {w*.5} {h*.76} T{w} {h*.7} V{h} H0z" fill="{SAUGE}"/><path d="M0 {h*.88} Q{w*.3} {h*.8} {w*.6} {h*.9} T{w} {h*.86} V{h} H0z" fill="#5f7f5c"/>'
    return t

FICHIERS={}
# 1. Atelier créatif : vue de dessus
w,h=1200,675
corps=(f'<rect width="{w}" height="{h}" fill="{PECHE}"/><rect x="0" y="470" width="{w}" height="205" fill="{PECHE2}" opacity=".5"/>'
  f'<rect x="420" y="170" width="380" height="300" rx="10" transform="rotate(-4 610 320)" fill="#d9b48c" stroke="{BRUN}" stroke-width="3"/>'
  + bougie(130,420,1.5) + bougie(250,470,1.2,BLANC) + pelote(980,200,1.8) + pelote(1090,330,1.1,SAUGE) + palette(330,250,1.6)
  + ciseaux(760,430,1.7,30) + fleurs_seches(1010,640,1.4) + fleurs_seches(120,200,1.0) + tasse(650,560,1.0,BLANC,BRUN,False))
FICHIERS['hero-atelier.svg']=svg(w,h,corps)
# 2. Papotages
w,h=800,480
FICHIERS['papotages.svg']=svg(w,h,f'<rect width="{w}" height="{h}" fill="{PECHE}"/><rect y="330" width="{w}" height="150" fill="{PECHE2}" opacity=".6"/>'+plante(90,350,1.6)+bulles(150,40,1.2)+bulles(470,90,1.0)+tasse(280,320,1.5)+tasse(540,330,1.5,MAUVE_C)+plante(730,360,1.2,MAUVE))
# 3. Créatif
FICHIERS['creatif.svg']=svg(w,h,f'<rect width="{w}" height="{h}" fill="#e8efe3"/><rect y="340" width="{w}" height="140" fill="{SAUGE_C}" opacity=".7"/>'+palette(260,260,2.0)+ciseaux(540,300,1.8,25)+fleurs_seches(690,430,1.6)+pelote(110,420,1.1)+bougie(430,420,0.9))
# 4. Business
FICHIERS['business.svg']=svg(w,h,f'<rect width="{w}" height="{h}" fill="#f1e3ea"/><rect y="340" width="{w}" height="140" fill="{MAUVE_C}" opacity=".7"/>'+ordinateur(330,260,1.5)+carnet(640,380,0.7)+tasse(120,380,1.1,BLANC)+ampoule(660,110,1.1)+plante(740,400,1.0,MAUVE))
# 5. Histoire hero : cinq femmes de dos, coucher de soleil
w,h=1200,620
t=paysage_coucher(w,h)
cols=[('#e9d8c8','#4a2e22'),('#d8a58a','#7a4a2a'),('#c9805e','#2f1d16'),('#8fb0c9','#3a2a1e'),('#f2e6d8','#a1683a')]
for i,(rb,ch) in enumerate(cols):
    t+=personne(260+i*170,560,2.0,rb,ch,chapeau=(i==3))
FICHIERS['histoire-groupe.svg']=svg(w,h,t)
# 6. Carnet
w,h=800,480
FICHIERS['histoire-carnet.svg']=svg(w,h,f'<rect width="{w}" height="{h}" fill="{PECHE}"/><rect y="340" width="{w}" height="140" fill="#d9b48c" opacity=".7"/>'+carnet(300,260,1.5)+tasse(600,330,1.4)+vase(720,350,1.2))
# 7. Néon : cœur lumineux + fleurs
w,h=800,512
FICHIERS['histoire-neon.svg']=svg(w,h,f'<rect width="{w}" height="{h}" fill="#6b4a40"/><rect y="400" width="{w}" height="112" fill="#8a6a56"/>'
  f'<g fill="none" stroke="{OR}" stroke-linecap="round" stroke-linejoin="round"><path d="M400 300 C250 200 280 90 400 150 C520 90 550 200 400 300z" stroke-width="18" opacity=".25"/><path d="M400 300 C250 200 280 90 400 150 C520 90 550 200 400 300z" stroke-width="7"/></g>'
  +vase(300,440,1.6)+plante(660,430,1.4,TERRA)+tasse(500,420,1.1))
# 8-10. Polaroïds
w,h=480,480
FICHIERS['polaroid-rencontres.svg']=svg(w,h,f'<rect width="{w}" height="{h}" fill="{PECHE}"/>'+bulles(60,60,1.3)+tasse(140,330,1.4)+tasse(340,340,1.4,MAUVE_C))
FICHIERS['polaroid-idees.svg']=svg(w,h,f'<rect width="{w}" height="{h}" fill="#f6ecc9"/>'+ampoule(240,150,1.7)+carnet(240,360,1.0))
FICHIERS['polaroid-aventure.svg']=svg(w,h,paysage_coucher(w,h)+''.join(personne(110+i*130,470,1.35,rb,ch,bras_leves=True) for i,(rb,ch) in enumerate(cols[:3])))
for n,c in FICHIERS.items():
    open(os.path.join(OUT,n),'w').write(c)
print(len(FICHIERS),'fichiers')
