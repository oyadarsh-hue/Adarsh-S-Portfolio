"""Render the portfolio's silent 16-second project reel. Requires Pillow + FFmpeg.

Direction: kinetic editorial collage, using the portfolio's existing conceptual
artwork, large ink typography, paper, coral, violet, cyan and lime. No fabricated
product footage. 960x540 / 24 fps / H.264, made for muted inline mobile playback.
Each shot enters for 0.42 s, holds, then clears in a 0.22 s paper wipe. All timing
derives from frame indices; original artwork is cached. Run from any directory:
    python scripts/render-reel.py
"""
from pathlib import Path
from functools import lru_cache
import math
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
W, H, FPS = 960, 540, 24
OUT = ROOT / 'assets/video/adarsh-project-reel.mp4'
OUT.parent.mkdir(parents=True, exist_ok=True)
INK, PAPER = '#242129', '#faf8f2'
FONT = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
BOLD = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
MONO = Path('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf')
SCENES = [
    dict(start=0, end=60, bg='#d6f277', tag='ADARSH S / SOFTWARE + CURIOSITY', title=['Build what', 'matters.'], color=INK, foot='FULL STACK  /  COMPUTER VISION  /  RESEARCH'),
    dict(start=60, end=115, bg='#ffb09b', tag='01 / ASSENTTAG', title=['Privacy,', 'by design.'], color=INK, foot='PRIVACY-AWARE PHOTO SHARING', image='project-assenttag.webp'),
    dict(start=115, end=170, bg='#c6b5f1', tag='02 / EPIGRAPHIX-AI', title=['Old scripts.', 'New ideas.'], color=INK, foot='PALM-LEAF OCR / RESEARCH PROTOTYPE', image='project-ocr.webp'),
    dict(start=170, end=226, bg='#a8dfdf', tag='03 / AEGISFORGE-X', title=['Look closer.', 'Build safer.'], color=INK, foot='SOURCE CODE SECURITY / REVIEW ASSISTANT', image='project-security.webp'),
    dict(start=226, end=279, bg='#edcc83', tag='04 / DECIPHERA', title=['Learn.', 'Simulate.', 'Explore.'], color=INK, foot='BITCOIN CONCEPTS / LEARNING SIMULATOR', image='project-ledger.webp'),
    dict(start=279, end=332, bg='#b8c4ef', tag='05 / QUIETNOTE', title=['A message.', 'A moment.'], color=INK, foot='EXPIRING, ONE-TIME NOTES', image='project-notes.webp'),
    dict(start=332, end=384, bg='#241c39', tag='ADARSH S / SELECTED WORK', title=['Curious?', 'Let’s build.'], color=PAPER, foot='EXPLORE THE CASE STUDIES / KEEP SCROLLING'),
]

@lru_cache(None)
def font(size, weight='regular'):
    return ImageFont.truetype(str({'regular':FONT, 'bold':BOLD, 'mono':MONO}[weight]), size)

ART = {s['image']: ImageOps.fit(Image.open(ROOT / 'assets/images' / s['image']).convert('RGB'), (520, 420)) for s in SCENES if 'image' in s}

def ease(t):
    return 1 - (1 - min(1, max(0, t))) ** 4

def star(draw, cx, cy, radius, angle, fill):
    points = []
    for i in range(24):
        r = radius if i % 2 == 0 else radius * .46
        a = angle + i * math.pi / 12
        points.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    draw.polygon(points, fill=fill)

def frame(n):
    s = next(s for s in SCENES if s['start'] <= n < s['end'])
    local = n - s['start']
    progress = local / (s['end'] - s['start'])
    enter = ease(local / (FPS * .42))
    canvas = Image.new('RGB', (W, H), s['bg'])
    d = ImageDraw.Draw(canvas)
    d.text((44, 29), s['tag'], font=font(12, 'mono'), fill=s['color'])
    d.line((44, 61, 916, 61), fill=s['color'], width=1)
    has_art = 'image' in s
    if has_art:
        # Concept art remains one continuous placement for its project shot.
        art = ART[s['image']]
        scale = 1 + .035 * progress
        ww, hh = round(520 * scale), round(420 * scale)
        art = ImageOps.fit(art.resize((ww, hh), Image.Resampling.LANCZOS), (420, 350))
        ax = round(495 + (1 - enter) * 100)
        ay = 97
        d.rounded_rectangle((ax + 7, ay + 8, ax + 427, ay + 358), radius=9, fill=INK)
        mask = Image.new('L', art.size)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 419, 349), radius=9, fill=255)
        canvas.paste(art, (ax, ay), mask)
        d = ImageDraw.Draw(canvas)
        d.rounded_rectangle((ax+13, ay+313, ax+407, ay+339), radius=4, fill=INK)
        d.text((ax+23, ay+319), 'CONCEPT ART / SEE CASE STUDY FOR DEMO', font=font(10,'mono'), fill=PAPER)
    else:
        star(d, 755, 265, 130, progress * .5, '#6b45ef' if s['bg'] != '#241c39' else '#d6f277')
        d.ellipse((627, 136, 883, 392), outline=s['color'], width=2)
    size = 55 if has_art else 76
    title_font = font(size, 'bold')
    max_width = 423 if has_art else 620
    while max(d.textlength(t, font=title_font) for t in s['title']) > max_width:
        size -= 1
        title_font = font(size, 'bold')
    line_height = round(size * 1.12)
    top = round(258 - len(s['title']) * line_height / 2)
    for i, line in enumerate(s['title']):
        p = ease((local - i * 2) / (FPS * .42))
        layer = Image.new('RGBA', (W, line_height + 10))
        ld = ImageDraw.Draw(layer)
        ld.text((0, round((1-p)*line_height)), line, font=title_font, fill=s['color'])
        canvas.paste(layer, (44, top + i*line_height), layer)
    d = ImageDraw.Draw(canvas)
    d.line((44, 478, 916, 478), fill=s['color'], width=1)
    d.text((44, 495), s['foot'], font=font(11,'mono'), fill=s['color'])
    d.text((862, 495), f'{SCENES.index(s)+1:02d}/07', font=font(11,'mono'), fill=s['color'])
    # A shared paper edge links projects without overlapping two reading states.
    remaining = s['end'] - n
    if remaining < 6:
        x = round(W * (1 - ease((6-remaining)/5)))
        d.rectangle((x, 0, W, H), fill=SCENES[(SCENES.index(s)+1)%len(SCENES)]['bg'])
    return canvas

if __name__ == '__main__':
    frame(30).save(ROOT / 'assets/images/reel-poster.webp', quality=88)
    p = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT)], stdin=subprocess.PIPE)
    for n in range(SCENES[-1]['end']):
        p.stdin.write(frame(n).tobytes())
    p.stdin.close()
    if p.wait():
        raise SystemExit('FFmpeg failed')
    print(f'Rendered {OUT.name}: {OUT.stat().st_size:,} bytes; 16 seconds; 960x540; 24 fps')
