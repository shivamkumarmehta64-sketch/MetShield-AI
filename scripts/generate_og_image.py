"""Generate the social share card for MetShield AI (public/og.png).

1200x630, the Open Graph / Twitter summary_large_image size. Drawn with PIL so
the asset is reproducible from source instead of being an opaque export.

The card restates what the site actually is: a deterministic QC layer over AWS
telemetry. It carries the BENCHMARK data-mode label on purpose — a share card
that looked live would repeat the exact claim the README retracts.
"""

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630

NAVY = (15, 23, 42)        # --color-navy
SKY = (56, 189, 248)       # --color-sky
SLATE_300 = (203, 213, 225)
SLATE_400 = (148, 163, 184)
AMBER = (245, 158, 11)     # --color-warning
SAFFRON = (255, 153, 51)
GREEN = (19, 136, 8)
WHITE = (255, 255, 255)

FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_REG = r"C:\Windows\Fonts\arial.ttf"


def tracked(draw, xy, text, font, fill, tracking=0):
    """Draw text with manual letter-spacing; PIL has no tracking support."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking
    return x


def wrap(draw, text, font, max_width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


img = Image.new("RGB", (W, H), NAVY)
d = ImageDraw.Draw(img)

# Tricolor bar — same three stops as the landing page's institutional strip.
seg = W // 3
d.rectangle([0, 0, seg, 16], fill=SAFFRON)
d.rectangle([seg, 0, seg * 2, 16], fill=WHITE)
d.rectangle([seg * 2, 0, W, 16], fill=GREEN)

# Left column: label, title, subtitle.
f_label = ImageFont.truetype(FONT_BOLD, 20)
f_title = ImageFont.truetype(FONT_BOLD, 64)
f_sub = ImageFont.truetype(FONT_REG, 27)
f_foot = ImageFont.truetype(FONT_REG, 19)
f_foot_b = ImageFont.truetype(FONT_BOLD, 19)

tracked(d, (90, 150), "AUTOMATIC WEATHER STATION QUALITY CONTROL", f_label, SKY, tracking=3)
d.text((90, 190), "MetShield AI", font=f_title, fill=WHITE)

sub_lines = wrap(
    d,
    "Know whether the atmosphere changed — or the sensor did.",
    f_sub,
    620,
)
y = 290
for line in sub_lines:
    d.text((90, y), line, font=f_sub, fill=SLATE_300)
    y += 38

# Right column: a pressure trace with the storm dip. Art only — no plotted
# data, no numbers, so nothing here can be misread as a measurement.
trace = [
    (780, 235), (820, 233), (860, 236), (900, 232), (940, 238),
    (960, 250), (975, 285), (990, 305), (1005, 295), (1025, 272),
    (1050, 262), (1080, 258), (1110, 255),
]
d.line([(780, 235), (1110, 235)], fill=SLATE_400, width=1)  # baseline
d.line(trace, fill=SKY, width=5, joint="curve")
d.ellipse([990 - 7, 305 - 7, 990 + 7, 305 + 7], fill=(249, 115, 22))  # event marker

# Footer: attribution line + honest data-mode label.
d.line([(90, 552), (1110, 552)], fill=(30, 41, 59), width=1)
d.text((90, 572), "Team AEROTECH1 · SIH 2026 · Ministry of Earth Sciences / IMD", font=f_foot, fill=SLATE_400)
tag = "BENCHMARK DATA MODE"
tw = d.textlength(tag, font=f_foot_b)
d.text((1110 - tw, 572), tag, font=f_foot_b, fill=AMBER)

img.save("public/og.png")
print("wrote public/og.png", img.size)
