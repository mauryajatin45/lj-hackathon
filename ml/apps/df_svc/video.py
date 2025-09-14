# video_detect.py
import os, tempfile
import numpy as np, cv2, mediapipe as mp
from moviepy.editor import VideoFileClip
import librosa
import onnxruntime as ort

# Optional DF model (set path via env)
_DF_ONNX = os.getenv("DEEPFAKE_ONNX", "")  # path/to/dfdc_efficientnet.onnx (optional)
_ORT_SESS = None
def _load_onnx():
    global _ORT_SESS
    if _ORT_SESS is not None or not _DF_ONNX or not os.path.exists(_DF_ONNX):
        return _ORT_SESS
    try:
        _ORT_SESS = ort.InferenceSession(_DF_ONNX, providers=["CUDAExecutionProvider","CPUExecutionProvider"])
    except Exception:
        _ORT_SESS = None
    return _ORT_SESS

mp_face = mp.solutions.face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)

def _sample_faces(video_path, target_fps=1, face_size=224):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    stride = max(1, int(round(fps / target_fps)))
    frames, faces = [], []
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok: break
        if i % stride == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = mp_face.process(rgb)
            if res.multi_face_landmarks:
                h, w = frame.shape[:2]
                xs, ys = [], []
                for lm in res.multi_face_landmarks[0].landmark:
                    xs.append(int(lm.x*w)); ys.append(int(lm.y*h))
                x1, y1, x2, y2 = max(0,min(xs)), max(0,min(ys)), min(w,max(xs)), min(h,max(ys))
                pad = 20; x1=max(0,x1-pad); y1=max(0,y1-pad); x2=min(w,x2+pad); y2=min(h,y2+pad)
                face = frame[y1:y2, x1:x2]
                face = cv2.resize(face, (face_size, face_size))
                faces.append(face)
        i += 1
    cap.release()
    return faces

def _onnx_frame_scores(faces):
    sess = _load_onnx()
    if sess is None or not faces:
        return []
    X = np.stack([cv2.cvtColor(f, cv2.COLOR_BGR2RGB).astype(np.float32)/255.0 for f in faces])  # N,H,W,3
    X = np.transpose(X, (0,3,1,2))  # N,3,H,W
    scores = []
    inp = {sess.get_inputs()[0].name: X}
    outs = sess.run(None, inp)[0]  # assume output Nx1 logit or prob
    out = outs.squeeze()
    if out.ndim == 0: out = np.array([float(out)])
    # Map to [0,1] prob that it's fake (tweak if your model outputs logits)
    if (out.min() < 0) and (out.max() > 1.0):  # looks like logits
        out = 1/(1+np.exp(-out))
    for p in np.atleast_1d(out):
        scores.append(float(np.clip(p, 0, 1)))
    return scores

def _blink_stats(video_path, target_fps=10):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    stride = max(1, int(round(fps/target_fps)))
    blinks = 0
    ear_series = []
    i=0
    while True:
        ok, frame = cap.read()
        if not ok: break
        if i % stride == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = mp_face.process(rgb)
            if res.multi_face_landmarks:
                lm = res.multi_face_landmarks[0].landmark
                h, w = frame.shape[:2]
                def p(idx): 
                    pt = lm[idx]; return np.array([pt.x*w, pt.y*h], dtype=np.float32)
                # Eye landmarks (MediaPipe indices for left eye)
                L = [33, 160, 158, 133, 153, 144]  # around left eye
                pts = [p(j) for j in L]
                # EAR: (||p2-p6|| + ||p3-p5||) / (2||p1-p4||)
                def dist(a,b): return np.linalg.norm(a-b)
                ear = (dist(pts[1],pts[5]) + dist(pts[2],pts[4])) / (2.0*dist(pts[0],pts[3]) + 1e-6)
                ear_series.append(ear)
        i+=1
    cap.release()
    if len(ear_series) < 5:
        return {"blinks_per_min": 0.0, "abnormality": 0.0}
    ear = np.array(ear_series)
    thr = max(0.15, np.percentile(ear, 25)*0.8)
    closed = ear < thr
    # Count transitions closed->open as blinks
    blinks = int(np.sum((~closed[:-1]) & (closed[1:])))
    dur_sec = len(ear)/target_fps
    bpm = 60.0*blinks/max(1.0, dur_sec)
    # Abnormal if <5 bpm or extremely flat variance
    abnormal = 0.0
    if bpm < 5: abnormal += 0.6
    if np.std(ear) < 0.015: abnormal += 0.4
    return {"blinks_per_min": float(bpm), "abnormality": float(np.clip(abnormal,0,1))}

def _lip_sync_mismatch(video_path):
    """
    Cheap lip-sync proxy: correlate mouth opening with audio energy.
    Not as strong as SyncNet, but fast and dependency-light.
    Returns 0..1 where 1 = very mismatched (suspicious).
    """
    clip = VideoFileClip(video_path)
    # Audio envelope
    if clip.audio is None:
        return 0.6  # no audio with talking head is suspicious
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmpa:
        clip.audio.write_audiofile(tmpa.name, fps=16000, verbose=False, logger=None)
        y, sr = librosa.load(tmpa.name, sr=16000, mono=True)
    env = np.abs(librosa.onset.onset_strength(y=y, sr=sr))
    env = (env - env.min())/(env.max()-env.min()+1e-9)

    # Mouth opening time-series at ~10 Hz
    ts_mouth = []
    step = max(1, int(round(clip.fps/10)))
    mp_lm = mp.solutions.face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)
    for ti, frame in enumerate(clip.iter_frames(fps=clip.fps)):
        if ti % step != 0: continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)  # moviepy gives RGB
        res = mp_lm.process(cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB))
        if res.multi_face_landmarks:
            h, w = frame.shape[:2]
            lm = res.multi_face_landmarks[0].landmark
            def pt(i): 
                p = lm[i]; return np.array([p.x*w, p.y*h], dtype=np.float32)
            # Upper/lower inner lip indices
            upper = pt(13); lower = pt(14)
            mouth_open = np.linalg.norm(upper - lower) / max(h,1)
            ts_mouth.append(mouth_open)
    clip.close()

    if len(ts_mouth) < 5 or len(env) < 5:
        return 0.5

    # Resample envelope to match mouth series length
    import numpy as np
    env_rs = np.interp(np.linspace(0,1,len(ts_mouth)), np.linspace(0,1,len(env)), env)
    # Check best lagged correlation in small window (+/- 300 ms)
    def corr(a,b):
        a=(a-np.mean(a))/(np.std(a)+1e-9); b=(b-np.mean(b))/(np.std(b)+1e-9)
        return float(np.mean(a*b))
    lags = range(-3,4)  # ~ +/- 300ms at 10 Hz
    best = max(corr(np.roll(env_rs, k), ts_mouth) for k in lags)
    # Map correlation (good sync ~0.5–0.8) to mismatch score
    mismatch = float(np.clip(1.0 - (best+1)/2.0, 0, 1))  # corr∈[-1,1] → [1,0]
    return mismatch

def deepfake_video_detector(video_path):
    """
    Returns (is_deepfake: bool, confidence: float 0..1)
    Fusion of: optional per-frame ONNX CNN, lip-sync mismatch, blink abnormality.
    """
    try:
        faces = _sample_faces(video_path, target_fps=1)
        cnn_scores = _onnx_frame_scores(faces)  # [] if no model
        cnn_med = float(np.median(cnn_scores)) if cnn_scores else 0.35  # conservative default

        lip_mismatch = _lip_sync_mismatch(video_path)   # 0 good -> 1 bad
        blink = _blink_stats(video_path)                 # has "abnormality" 0..1
        blink_abn = blink["abnormality"]

        # Simple fusion (weights you can tune later)
        agg = 0.5*cnn_med + 0.3*lip_mismatch + 0.2*blink_abn
        is_fake = agg >= 0.5
        return bool(is_fake), float(np.clip(agg,0,1))
    except Exception:
        return False, 0.1
