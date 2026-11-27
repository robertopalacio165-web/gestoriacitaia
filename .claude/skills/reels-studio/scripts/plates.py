"""
Dealer-plate blanking: finds advertising number plates (white plate with red/orange dealer branding, e.g. "KUBIKA")
and paints them plain white, with a short hold so a plate stays covered when one frame misses it.
plan["fx"]["blank_plates"] = true   (optional "plate_color": "#FAFAFA")
"""
import cv2,numpy as np
def _detect_orange(bgr, s=0.5):
    H,W=bgr.shape[:2]
    sm=cv2.resize(bgr,(int(W*s),int(H*s)),interpolation=cv2.INTER_AREA)
    hsv=cv2.cvtColor(sm,cv2.COLOR_BGR2HSV); h,sa,v=cv2.split(hsv)
    O=((h>=3)&(h<=16)&(sa>130)&(v>110)).astype(np.uint8)*255
    O=cv2.morphologyEx(O,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    Wm=((sa<70)&(v>165))
    polys=[]
    cs,_=cv2.findContours(O,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    for c in cs:
        a=cv2.contourArea(c)
        if a<35: continue
        (cx,cy),(rw,rh),ang=cv2.minAreaRect(c)
        if cy<0.45*sm.shape[0]: continue
        L,S=max(rw,rh),min(rw,rh)
        if S<3 or a/(rw*rh+1e-6)<0.55 or not(0.8<=L/S<=4.5): continue
        th=np.deg2rad(ang if rw>=rh else ang+90); u=np.array([np.cos(th),np.sin(th)]); n=np.array([-u[1],u[0]])
        best=None
        for sgn in (-1,1):
            ext=2.4*L; ctr=np.array([cx,cy])+sgn*u*(L/2+ext/2)
            pts=np.array([ctr+u*ext/2+n*S*0.55,ctr-u*ext/2+n*S*0.55,ctr-u*ext/2-n*S*0.55,ctr+u*ext/2-n*S*0.55],np.int32)
            mk=np.zeros(sm.shape[:2],np.uint8); cv2.fillConvexPoly(mk,pts,1)
            if mk.sum()<10: continue
            wf=Wm[mk>0].mean()
            if best is None or wf>best[0]: best=(wf,sgn)
        if best is None or best[0]<0.3: continue
        wf,sgn=best
        tot=L*3.4; ctr=np.array([cx,cy])+sgn*u*(L*1.2)
        pts=np.array([ctr+u*tot/2+n*S*0.68,ctr-u*tot/2+n*S*0.68,ctr-u*tot/2-n*S*0.68,ctr+u*tot/2-n*S*0.68])/s
        polys.append(pts.astype(np.int32))
    return polys

def _detect_rect(bgr,s=0.5,ws=60,wv=160):
    H,W=bgr.shape[:2]
    sm=cv2.resize(bgr,(int(W*s),int(H*s)),interpolation=cv2.INTER_AREA)
    hsv=cv2.cvtColor(sm,cv2.COLOR_BGR2HSV); h,sa,v=cv2.split(hsv)
    red=(((h<=16)|(h>=165))&(sa>110)&(v>90))
    wht=((sa<ws)&(v>wv))
    M=(red|wht).astype(np.uint8)*255
    M=cv2.morphologyEx(M,cv2.MORPH_CLOSE,np.ones((3,5),np.uint8))
    M=cv2.morphologyEx(M,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
    out=[]
    cs,_=cv2.findContours(M,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    for c in cs:
        a=cv2.contourArea(c)
        if a<60 or a>0.03*sm.shape[0]*sm.shape[1]: continue
        rect=cv2.minAreaRect(c); (cx,cy),(rw,rh),ang=rect
        L,S=max(rw,rh),min(rw,rh)
        edge = cx - L/2 < 3 or cx + L/2 > sm.shape[1] - 3
        if S<5 or not((1.3 if edge else 2.3)<=L/S<=7.5) or a/(rw*rh)<0.72: continue
        if cy<0.45*sm.shape[0]: continue
        mk=np.zeros(sm.shape[:2],np.uint8); cv2.drawContours(mk,[c],-1,1,-1); sel=mk>0
        rf,wf=red[sel].mean(),wht[sel].mean()
        if rf<0.08 or rf>0.97 or (wf<0.12 and not (rf>0.5 and wf>0.03 and L/S>=2.8)): continue
        # contrast with surroundings: ring around must be mostly not red/white (car body)
        ring=cv2.dilate(mk,np.ones((9,9),np.uint8))-mk
        if (red|wht)[ring>0].mean()>0.75: continue
        box=cv2.boxPoints(((cx,cy),(rw*1.12+4,rh*1.25+4),ang))/s
        out.append(box.astype(np.int32))
    return out


def _iou_center(a, b):
    ca, cb = a.mean(0), b.mean(0)
    ra = np.linalg.norm(a - ca, axis=1).max()
    return np.linalg.norm(ca - cb) < ra * 0.8


def _extend(bgr, poly):
    """Grow a plate polygon over the whole bright plate area around it (orange part, white part, letters),
    bounded by the dark car body: flood the bright (V>90, not dark) region connected to the seed."""
    rect = cv2.minAreaRect(poly.astype(np.float32))
    (cx, cy), (w, h), ang = rect
    L, S = max(w, h), min(w, h)
    big = cv2.boxPoints(((cx, cy), ((w * 3.2, h * 1.5) if w >= h else (w * 1.5, h * 3.2)), ang)).astype(np.int32)
    x, y, bw, bh = cv2.boundingRect(big)
    H, W = bgr.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + bw), min(H, y + bh)
    if x1 - x0 < 4 or y1 - y0 < 4:
        return poly
    roi = bgr[y0:y1, x0:x1]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    bright = ((hsv[:, :, 2] > 95) & ((hsv[:, :, 1] < 90) | (hsv[:, :, 0] <= 18) | (hsv[:, :, 0] >= 165))).astype(np.uint8)
    zone = np.zeros_like(bright); cv2.fillConvexPoly(zone, big - [x0, y0], 1)
    bright &= zone
    bright = cv2.morphologyEx(bright, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab = cv2.connectedComponents(bright)
    seed = np.zeros_like(bright); cv2.fillConvexPoly(seed, poly.astype(np.int32) - [x0, y0], 1)
    ids = set(np.unique(lab[(seed > 0) & (bright > 0)])) - {0}
    if not ids:
        return poly
    ys, xs = np.nonzero(np.isin(lab, list(ids)))
    pts = np.vstack([poly.reshape(-1, 2), np.stack([xs + x0, ys + y0], 1)]).astype(np.float32)
    r2 = cv2.minAreaRect(pts)
    (c2, (w2, h2), a2) = r2
    if max(w2, h2) > L * 2.4 or min(w2, h2) > S * 1.35 or max(w2, h2) / max(1, min(w2, h2)) < 2.2:   # leaked into the car body: keep the seed
        return poly
    return cv2.boxPoints((c2, (w2 + 6, h2 + 6), a2)).astype(np.int32)


class PlateBlanker:
    def __init__(self, hold=8, color=(250, 250, 250)):
        self.tracks = []          # [poly, frames_since_seen]
        self.hold, self.color = hold, color

    def __call__(self, bgr):
        g = cv2.resize(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY), (64, 114)).astype(np.float32)
        if getattr(self, "_prev", None) is not None and np.abs(g - self._prev).mean() > 28:
            self.tracks = []                       # scene cut: forget held plates
        self._prev = g
        det = _detect_rect(bgr)
        for p in _detect_rect(bgr, ws=85, wv=150) + _detect_orange(bgr):
            if not any(_iou_center(p, q) for q in det):
                det.append(p)
        det = [_extend(bgr, p) for p in det]
        new = []
        for p in det:
            new.append([p, 0])
        for p, age in self.tracks:
            if age + 1 <= self.hold and not any(_iou_center(p, q) for q in det):
                new.append([p, age + 1])
        self.tracks = new
        for p, _ in self.tracks:
            cv2.fillConvexPoly(bgr, p.astype(np.int32), self.color, lineType=cv2.LINE_AA)
        return bgr
