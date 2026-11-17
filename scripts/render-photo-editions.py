#!/usr/bin/env python3
"""Create photo editions from the credited journal photos and unchanged source narration."""
import argparse
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("originals", type=Path, help="Folder with original HD clips named <slug>.mp4")
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
output = root / "assets" / "photo-editions"
output.mkdir(exist_ok=True)
photos = root / "assets" / "field" / "journal-photos"
slugs = ("mca", "bsc", "hse", "sslc", "bluegen", "skybrisk", "codtech")
for slug in slugs:
    original = args.originals / f"{slug}.mp4"
    image = photos / f"{slug}.webp"
    path = output / f"{slug}.mp4"
    # Keep the complete photograph legible even for panoramas. The matching
    # dark plate makes a letterbox feel intentional without inventing scenery.
    canvas = ("[0:v]scale=860:380:force_original_aspect_ratio=decrease:"
              "force_divisible_by=2,pad=960:480:(ow-iw)/2:(oh-ih)/2:color=0x142124,"
              "pad=960:540:0:30:color=0x101819,setsar=1,format=yuv420p[photo]")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", "12",
         "-i", str(image), "-i", str(original), "-filter_complex", canvas,
         "-map", "[photo]", "-map", "1:a:0", "-threads", "2", "-c:v", "libx264",
         "-preset", "fast", "-tune", "stillimage", "-crf", "28", "-c:a", "copy",
         "-shortest", "-movflags", "+faststart", str(path)],
        check=True,
    )
