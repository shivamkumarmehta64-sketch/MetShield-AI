"""
Metshield AI – SIH 2025 Presentation Generator
Problem Statement ID : SIH26073
Team : Aerotech (AWS-QMS)
Generates a 6-slide PPTX that mirrors the official SIH template EXACTLY.
Layout derived from: 1788625345121_260905_215405.pdf (reference slides)
"""

import math
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from lxml import etree

# ── Paths ──────────────────────────────────────────────────────────────────────
REPO_ROOT   = Path(__file__).resolve().parent.parent
LOGO_PATH   = REPO_ROOT / "public" / "metshield-logo.jpg"
SIH_LOGO    = REPO_ROOT / "public" / "sih_logo.png"
SIH_BULB    = REPO_ROOT / "public" / "sih_bulb_large.png"
OUT_PATH    = REPO_ROOT / "public" / "Metshield_AI_SIH26073.pptx"

# ── Reference Color Palette (matches ref PDF exactly) ──────────────────────────
SIH_BLUE      = RGBColor(0x1A, 0x52, 0x76)   # Deep SIH navy blue (headers)
SIH_BLUE_LT   = RGBColor(0x21, 0x6E, 0xAB)   # Lighter SIH blue (section tabs)
SIH_CYAN      = RGBColor(0x0D, 0x9B, 0xD4)   # SIH accent cyan
ORANGE        = RGBColor(0xF2, 0x7B, 0x21)   # SIH orange accent
GREEN         = RGBColor(0x2D, 0xA8, 0x44)   # SIH green
RED_BADGE     = RGBColor(0xE8, 0x32, 0x32)   # Challenge badge red
WHITE         = RGBColor(0xFF, 0xFF, 0xFF)
BLACK         = RGBColor(0x00, 0x00, 0x00)
DARK_TEXT     = RGBColor(0x1A, 0x1A, 0x2E)   # Body text dark
GRAY_BG       = RGBColor(0xF0, 0xF4, 0xF8)   # Light slide background
GRAY_CARD     = RGBColor(0xE8, 0xEE, 0xF4)   # Card gray
FOOTER_BLUE   = RGBColor(0x1A, 0x52, 0x76)   # Footer bar blue

# ── Slide dimensions (16:9, 13.33 x 7.5 in) ────────────────────────────────────
W = 13.33
H = 7.5

# ── Core helpers ───────────────────────────────────────────────────────────────

def new_prs() -> Presentation:
    prs = Presentation()
    prs.slide_width  = Inches(W)
    prs.slide_height = Inches(H)
    return prs

def blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])

def rect(slide, l, t, w, h, fill, border=None, border_w=None):
    s = slide.shapes.add_shape(1, Inches(l), Inches(t), Inches(w), Inches(h))
    s.fill.solid(); s.fill.fore_color.rgb = fill
    if border:
        s.line.color.rgb = border
        s.line.width = Pt(border_w or 1)
    else:
        s.line.fill.background()
    return s

def rrect(slide, l, t, w, h, fill, adj=0.06, border=None, border_w=None):
    s = slide.shapes.add_shape(5, Inches(l), Inches(t), Inches(w), Inches(h))
    s.adjustments[0] = adj
    s.fill.solid(); s.fill.fore_color.rgb = fill
    if border:
        s.line.color.rgb = border
        s.line.width = Pt(border_w or 1)
    else:
        s.line.fill.background()
    return s

def textbox(slide, text, l, t, w, h,
            size=11, bold=False, color=BLACK,
            align=PP_ALIGN.LEFT, italic=False, wrap=True, name="Calibri"):
    tb = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = name
    return tb

def para(tf, text, size=11, bold=False, color=BLACK,
         align=PP_ALIGN.LEFT, italic=False, bullet=False, indent=0, name="Calibri"):
    """Add a paragraph to an existing text frame."""
    p = tf.add_paragraph()
    p.alignment = align
    if indent: p.level = indent
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = name
    return p

def multibox(slide, l, t, w, h, lines, wrap=True):
    """
    lines: list of dicts with keys: text, size, bold, color, align, italic
    """
    tb = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = wrap
    first = True
    for ln in lines:
        if first:
            p = tf.paragraphs[0]
            first = False
        else:
            p = tf.add_paragraph()
        p.alignment = ln.get('align', PP_ALIGN.LEFT)
        if ln.get('text', '').strip() == '':
            continue
        run = p.add_run()
        run.text = ln.get('text', '')
        run.font.size = Pt(ln.get('size', 11))
        run.font.bold = ln.get('bold', False)
        run.font.italic = ln.get('italic', False)
        run.font.color.rgb = ln.get('color', BLACK)
        run.font.name = ln.get('name', 'Calibri')
    return tb

def footer(slide, page_num):
    """Blue footer bar at bottom – present on slides 2–6."""
    rect(slide, 0, H - 0.42, W, 0.42, FOOTER_BLUE)
    textbox(slide, "SMART INDIA HACKATHON 2025", 0.3, H - 0.38, W - 1.2, 0.36,
            size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    textbox(slide, str(page_num), W - 0.5, H - 0.38, 0.35, 0.36,
            size=12, bold=True, color=WHITE, align=PP_ALIGN.RIGHT)

def sih_badge(slide):
    """Top-right SIH 2025 badge (present on all slides)."""
    if SIH_LOGO.exists():
        slide.shapes.add_picture(str(SIH_LOGO), Inches(W - 2.5), Inches(0.08), Inches(2.4))
    else:
        # Fallback text badge
        rrect(slide, W - 2.3, 0.08, 2.2, 0.75, SIH_BLUE)
        textbox(slide, "SMART INDIA\nHACKATHON 2025", W - 2.25, 0.1, 2.1, 0.7,
                size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

def team_logo(slide):
    """Top-left team/product logo."""
    if LOGO_PATH.exists():
        slide.shapes.add_picture(str(LOGO_PATH), Inches(0.15), Inches(0.08), Inches(1.5))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1 – Title / Problem Statement
# Layout: white bg, bold navy header at top, bullet list left, SIH bulb right
# ══════════════════════════════════════════════════════════════════════════════
def slide_title(prs):
    sl = blank(prs)

    # White background
    rect(sl, 0, 0, W, H, WHITE)

    # Top header – "SMART INDIA HACKATHON 2025" bold navy
    textbox(sl, "SMART INDIA HACKATHON 2025", 0.2, 0.12, W - 3.0, 0.75,
            size=40, bold=True, color=SIH_BLUE, name="Calibri")

    # SIH 2025 badge top-right
    sih_badge(sl)

    # Team logo top-left (below title if logo exists)
    team_logo(sl)

    # ── Bullet list of metadata (left column) ──────────────────────────────
    bullet_data = [
        ("Problem Statement ID",   "SIH26073"),
        ("Problem Statement Title", "Automated Weather Station Quality\nManagement System (AWS-QMS)"),
        ("Theme",                  "Environment & Disaster Management"),
        ("PS Category",            "Software"),
        ("Team ID",                "AEROTECH-2026"),
        ("Team Name",              "Aerotech (Metshield AI)"),
    ]

    tb = slide.shapes.add_textbox if False else sl.shapes.add_textbox(
        Inches(0.35), Inches(1.15), Inches(W * 0.52), Inches(H - 1.75)
    )
    tf = tb.text_frame
    tf.word_wrap = True

    first = True
    for label, value in bullet_data:
        if first:
            p = tf.paragraphs[0]
            first = False
        else:
            p = tf.add_paragraph()

        p.alignment = PP_ALIGN.LEFT
        # Bullet character
        run0 = p.add_run()
        run0.text = "•  "
        run0.font.size = Pt(21)
        run0.font.color.rgb = DARK_TEXT
        run0.font.name = "Calibri"

        run1 = p.add_run()
        run1.text = label
        run1.font.size = Pt(21)
        run1.font.bold = True
        run1.font.color.rgb = DARK_TEXT
        run1.font.name = "Calibri"

        run2 = p.add_run()
        run2.text = " – " + value
        run2.font.size = Pt(21)
        run2.font.bold = False
        run2.font.color.rgb = DARK_TEXT
        run2.font.name = "Calibri"

        # Space between items
        p.space_after = Pt(14)

    # ── Right column: SIH brain-bulb graphic ──────────────────────────────
    if SIH_BULB.exists():
        sl.shapes.add_picture(str(SIH_BULB),
                              Inches(W * 0.54), Inches(1.0),
                              Inches(W * 0.43), Inches(H - 1.6))
    else:
        # Fallback hexagon placeholder
        rrect(sl, W * 0.55, 1.1, W * 0.4, H - 1.8, GRAY_BG)
        textbox(sl, "SIH\nBRAIN BULB", W * 0.55, 2.8, W * 0.4, 1.5,
                size=20, bold=True, color=SIH_BLUE, align=PP_ALIGN.CENTER)

    # Metshield AI logo
    team_logo(sl)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2 – Proposed Solution / Approach
# Layout: left text column + right workflow diagram + bottom Innovation cards
# ══════════════════════════════════════════════════════════════════════════════
def slide_innovation(prs):
    sl = blank(prs)
    rect(sl, 0, 0, W, H, WHITE)

    # ── Top header bar - title ─────────────────────────────────────────────
    team_logo(sl)
    sih_badge(sl)

    textbox(sl, "METSHIELD AI", 1.9, 0.08, W - 4.0, 0.62,
            size=34, bold=True, color=DARK_TEXT, align=PP_ALIGN.CENTER, name="Calibri")
    textbox(sl, "Intelligent AWS Telemetry Quality Management", 1.9, 0.65, W - 4.0, 0.4,
            size=15, bold=False, italic=True, color=DARK_TEXT, align=PP_ALIGN.CENTER)

    # ── Blue section tab ───────────────────────────────────────────────────
    rrect(sl, 0.15, 1.12, 5.65, 0.52, SIH_BLUE_LT, adj=0.12)
    textbox(sl, "Proposed Solution / Approach", 0.28, 1.13, 5.5, 0.48,
            size=16, bold=True, color=WHITE)

    # ── Left text box with bullets ─────────────────────────────────────────
    rect(sl, 0.15, 1.68, 5.65, 4.55, GRAY_BG, border=SIH_BLUE_LT, border_w=0.5)

    solutions = [
        ("5-Tier WMO Anomaly Engine:", "Validates telemetry in <4.2ms, discriminating convective storms from broken sensors using thermodynamic physical rules, Isolation Forest & LSTM Autoencoder ensemble."),
        ("Spatial Intelligence Matrix:", "Real-time cross-validation against 1,350+ surrounding stations using Haversine geometry and Kriging interpolation to build mathematical regional consensus."),
        ("Zero-Gap NWP Data Assurance:", "Quarantines corrupted packets and performs spatial imputation so no bad data ever enters national numerical weather prediction models."),
        ("CAP v1.2 Early Warnings:", "Instantly generates ITU-T X.1303 Common Alerting Protocol payloads for genuine storm confirmations; prevents false alarms from sensor faults."),
        ("Predictive Field Maintenance:", "SHI/RUL engine models thermal decay and barometric drift to calculate Sensor Health Index and dispatch preventive maintenance before failure."),
    ]

    tb = sl.shapes.add_textbox(Inches(0.28), Inches(1.75), Inches(5.4), Inches(4.3))
    tf = tb.text_frame
    tf.word_wrap = True
    first = True
    for label, body in solutions:
        if first:
            p = tf.paragraphs[0]; first = False
        else:
            p = tf.add_paragraph()
        p.space_before = Pt(5)
        r0 = p.add_run(); r0.text = "•  "; r0.font.size = Pt(11); r0.font.color.rgb = DARK_TEXT; r0.font.name = "Calibri"
        r1 = p.add_run(); r1.text = label; r1.font.size = Pt(11); r1.font.bold = True; r1.font.color.rgb = DARK_TEXT; r1.font.name = "Calibri"
        r2 = p.add_run(); r2.text = " " + body; r2.font.size = Pt(11); r2.font.color.rgb = DARK_TEXT; r2.font.name = "Calibri"

    # ── Right: Workflow diagram header ─────────────────────────────────────
    rect(sl, 5.95, 1.12, 7.2, 0.45, GRAY_BG, border=SIH_BLUE_LT, border_w=0.5)
    textbox(sl, "Metshield AI End-to-End Pipeline", 6.0, 1.14, 7.1, 0.43,
            size=11, bold=True, color=DARK_TEXT, align=PP_ALIGN.CENTER)

    # ── Right: Flow diagram boxes ──────────────────────────────────────────
    rect(sl, 5.95, 1.6, 7.2, 4.6, GRAY_CARD, border=SIH_BLUE_LT, border_w=0.5)

    flow_steps = [
        ("Raw Telemetry Ingest\n(1350+ AWS Packets / 2.5s)", SIH_CYAN, 6.1, 1.65),
        ("WMO Pub8 Physical Bounds\nValidation Gate",          SIH_BLUE, 6.1, 2.30),
        ("Dual ML Ensemble\nIsolation Forest + Autoencoder",   SIH_BLUE_LT, 6.1, 2.95),
        ("SHAP XAI Attribution\nPhysical Reasoning Engine",    ORANGE, 6.1, 3.60),
        ("Spatial Kriging Imputation\n/ CAP Alert Dispatch",   GREEN, 6.1, 4.25),
        ("NWP Gateway Output\n(100% Clean Data)",              SIH_BLUE, 6.1, 4.90),
    ]

    col2 = 9.4
    for i, (label, color, lx, ty) in enumerate(flow_steps):
        rrect(sl, lx, ty, 2.9, 0.52, color)
        textbox(sl, label, lx + 0.08, ty + 0.04, 2.74, 0.5,
                size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        # Right column echo
        rrect(sl, col2, ty, 2.9, 0.52, color)
        textbox(sl, label, col2 + 0.08, ty + 0.04, 2.74, 0.5,
                size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        # Arrow connector
        if i < len(flow_steps) - 1:
            textbox(sl, "↓", lx + 1.3, ty + 0.52, 0.3, 0.18,
                    size=10, bold=True, color=SIH_BLUE, align=PP_ALIGN.CENTER)
            textbox(sl, "↓", col2 + 1.3, ty + 0.52, 0.3, 0.18,
                    size=10, bold=True, color=SIH_BLUE, align=PP_ALIGN.CENTER)

    # ── Bottom: Innovation cards ──────────────────────────────────────────
    innovation_cards = [
        ("Storm vs.\nFault Discriminator", "<5ms AI inference\nWMO Pub 8 rules"),
        ("Spatial\nKriging Mesh", "Haversine + IDW\nZero NWP Gaps"),
        ("SHAP XAI\nReasoning", "97.8% F1\nExplainable AI"),
        ("CAP v1.2\nAlerts", "ITU-T X.1303\nFalse-alarm proof"),
        ("SHI/RUL\nMaintenance", "Thermal decay model\nField dispatch"),
    ]

    CARD_W = (W - 0.5) / len(innovation_cards) - 0.12
    for idx, (title, sub) in enumerate(innovation_cards):
        lx = 0.2 + idx * (CARD_W + 0.12)
        rrect(sl, lx, H - 1.45, CARD_W, 1.0, ORANGE)
        textbox(sl, title, lx + 0.08, H - 1.42, CARD_W - 0.16, 0.5,
                size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        textbox(sl, sub, lx + 0.08, H - 0.95, CARD_W - 0.16, 0.45,
                size=8, color=WHITE, align=PP_ALIGN.CENTER)

    footer(sl, 2)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3 – Technical Approach
# Layout: 4-zone architecture diagram left + Implementation process steps right
# ══════════════════════════════════════════════════════════════════════════════
def slide_technical(prs):
    sl = blank(prs)
    rect(sl, 0, 0, W, H, WHITE)

    team_logo(sl)
    sih_badge(sl)

    textbox(sl, "TECHNICAL APPROACH", 1.9, 0.08, W - 4.0, 0.62,
            size=34, bold=True, color=DARK_TEXT, align=PP_ALIGN.CENTER, name="Calibri")

    # ── 4-Zone architecture card ───────────────────────────────────────────
    zone_colors = [GRAY_BG] * 4
    zone_titles = [
        "Zone 1\nUsers & Sources",
        "Zone 2\nFrontend\n(Dashboard Layer)",
        "Zone 3\nBackend\n(Processing Layer)",
        "Zone 4\nAI & Intelligence\n(Brain Layer)"
    ]
    ZCARD_W = 8.6 / 4
    ZL = 0.15
    ZT = 0.82
    ZH = 5.0

    arch_rect = rect(sl, ZL, ZT, 8.6, ZH, GRAY_BG, border=SIH_BLUE_LT, border_w=0.5)

    for i, title in enumerate(zone_titles):
        lx = ZL + i * ZCARD_W
        # Zone header
        rrect(sl, lx + 0.05, ZT + 0.05, ZCARD_W - 0.10, 0.7, SIH_BLUE_LT)
        textbox(sl, title, lx + 0.08, ZT + 0.07, ZCARD_W - 0.16, 0.65,
                size=8, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

    # Zone 1 content
    z1_items = ["IMD/WMO\nData Streams", "INSAT-3D DRT\nTelemetry", "1350+ AWS\nStations", "Mobile\nNodes"]
    for i, item in enumerate(z1_items):
        rrect(sl, ZL + 0.12, ZT + 0.88 + i * 0.97, ZCARD_W - 0.24, 0.8, WHITE, border=SIH_BLUE_LT, border_w=0.5)
        textbox(sl, item, ZL + 0.14, ZT + 0.92 + i * 0.97, ZCARD_W - 0.28, 0.72,
                size=8, color=DARK_TEXT, align=PP_ALIGN.CENTER)

    # Zone 2 content
    z2l = ZL + ZCARD_W
    z2_items = ["Metshield\nDashboard", "Station Network\nGIS Map", "Alert\nMonitor", "Technician\nDrawer"]
    for i, item in enumerate(z2_items):
        rrect(sl, z2l + 0.08, ZT + 0.88 + i * 0.97, ZCARD_W - 0.16, 0.8, SIH_CYAN)
        textbox(sl, item, z2l + 0.10, ZT + 0.92 + i * 0.97, ZCARD_W - 0.20, 0.72,
                size=8, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

    # Zone 3 content
    z3l = ZL + 2 * ZCARD_W
    z3_items = ["Telemetry Ingest\n(2.5s cycle)", "WMO Bounds\nValidator", "Anomaly\nEnsemble", "Spatial\nImputer", "CAP Alert\nGenerator"]
    for i, item in enumerate(z3_items[:4]):
        rrect(sl, z3l + 0.08, ZT + 0.88 + i * 0.97, ZCARD_W - 0.16, 0.8, SIH_BLUE_LT)
        textbox(sl, item, z3l + 0.10, ZT + 0.92 + i * 0.97, ZCARD_W - 0.20, 0.72,
                size=8, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

    # Zone 4 content (AI Brain)
    z4l = ZL + 3 * ZCARD_W
    rrect(sl, z4l + 0.08, ZT + 0.88, ZCARD_W - 0.16, 3.0, SIH_BLUE)
    z4_lines = [
        "AI/ML Engine",
        "",
        "Isolation Forest",
        "LSTM Autoencoder",
        "Physical Rules",
        "",
        "SHAP XAI",
        "Kriging Interp.",
        "SHI/RUL Engine",
    ]
    tb4 = sl.shapes.add_textbox(Inches(z4l + 0.12), Inches(ZT + 0.95), Inches(ZCARD_W - 0.24), Inches(2.85))
    tf4 = tb4.text_frame; tf4.word_wrap = True
    for idx, line in enumerate(z4_lines):
        p = tf4.paragraphs[0] if idx == 0 else tf4.add_paragraph()
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        run.text = line
        run.font.size = Pt(9 if idx > 0 else 10)
        run.font.bold = (idx == 0)
        run.font.color.rgb = WHITE
        run.font.name = "Calibri"

    # ── Tech stack bar at bottom ───────────────────────────────────────────
    rect(sl, ZL, ZT + ZH, 8.6, 0.55, DARK_TEXT if False else SIH_BLUE_LT)
    stack_items = ["Python/scikit-learn", "TensorFlow/Keras", "NumPy/SciPy", "Kriging (pykrige)",
                   "FastAPI", "Next.js 15", "PostgreSQL", "INSAT-3D DRT"]
    for i, tech in enumerate(stack_items):
        tw = 8.6 / len(stack_items)
        textbox(sl, tech, ZL + i * tw + 0.05, ZT + ZH + 0.06, tw - 0.1, 0.4,
                size=7, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

    # ── Right column: Implementation Process ──────────────────────────────
    rrect(sl, 8.9, 0.82, 4.28, 0.52, ORANGE)
    textbox(sl, "Implementation Process", 8.95, 0.83, 4.18, 0.48,
            size=14, bold=True, color=WHITE)

    steps = [
        ("Field Calibration\n& Onboarding", "AWS stations registered with GPS\ncoordinates, hardware specs & baselines"),
        ("Telemetry Ingest", "2.5s INSAT-3D DRT uplink, WMO\nPub 8 range validation"),
        ("AI Ensemble\nInference", "Isolation Forest + Autoencoder +\nPhysical rules in <4.2ms"),
        ("XAI Attribution", "SHAP feature weights & physical\nreasoning for every decision"),
        ("Action Dispatch", "Quarantine / Impute / CAP alert\n/ RUL maintenance dispatch"),
        ("NWP Assimilation", "100% clean verified data passed\nto national weather models"),
    ]

    STEP_COLORS = [SIH_CYAN, SIH_BLUE_LT, SIH_BLUE, ORANGE, GREEN, SIH_CYAN]
    for i, (step_title, step_body) in enumerate(steps):
        ty = 1.45 + i * 0.82
        # Numbered circle
        circle = sl.shapes.add_shape(9, Inches(8.95), Inches(ty), Inches(0.42), Inches(0.42))
        circle.fill.solid(); circle.fill.fore_color.rgb = STEP_COLORS[i]
        circle.line.fill.background()
        textbox(sl, str(i + 1), 8.97, ty + 0.04, 0.38, 0.35,
                size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        # Step text
        multibox(sl, 9.48, ty - 0.05, 3.6, 0.88, [
            {"text": step_title, "size": 10, "bold": True, "color": DARK_TEXT},
            {"text": step_body,  "size": 8.5, "color": DARK_TEXT},
        ])
        # Connector line
        if i < len(steps) - 1:
            textbox(sl, "|", 9.12, ty + 0.43, 0.1, 0.2,
                    size=8, color=SIH_BLUE_LT, align=PP_ALIGN.CENTER)

    footer(sl, 3)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4 – Feasibility & Viability
# Layout: 3 header cards (Feasibility / Viability / Practical Impl) +
#         Challenges (01-05 red badges) and Strategies (01-05 green badges)
# ══════════════════════════════════════════════════════════════════════════════
def slide_feasibility(prs):
    sl = blank(prs)
    rect(sl, 0, 0, W, H, WHITE)

    team_logo(sl)
    sih_badge(sl)

    textbox(sl, "FEASIBILITY AND VIABILITY", 1.9, 0.08, W - 4.0, 0.62,
            size=32, bold=True, color=DARK_TEXT, align=PP_ALIGN.CENTER, name="Calibri")

    # ── 3 top header cards ────────────────────────────────────────────────
    top_cards = [
        ("Feasibility", SIH_BLUE, [
            "Proven ensemble AI (Isolation Forest + LSTM Autoencoder) deployed on identical telemetry architectures.",
            "WMO Pub 8 physical bounds integrated as hard rules — no ML black-box on critical bounds.",
            "INSAT-3D DRT satellite uplink ensures station connectivity across remote regions.",
        ]),
        ("Viability", SIH_BLUE_LT, [
            "Web dashboard + mobile PWA for field technicians with offline-first capability.",
            "Sensor Health Index (SHI) drives scheduled maintenance, reducing emergency callouts.",
            "Modular API architecture: new AWS networks onboarded in <2 days with metadata ingestion.",
        ]),
        ("Practical Implementation", ORANGE, [
            "Ready for pilot with IMD's existing 1,350 AWS network within 3 months.",
            "Multilingual dashboard (English/Hindi) for field technician accessibility.",
            "Fully open-source stack — zero vendor lock-in for government deployment.",
        ]),
    ]

    CARD_W = (W - 0.35) / 3 - 0.09
    for i, (title, color, points) in enumerate(top_cards):
        lx = 0.15 + i * (CARD_W + 0.09)
        rect(sl, lx, 0.82, CARD_W, 0.42, color)
        textbox(sl, title, lx + 0.1, 0.83, CARD_W - 0.2, 0.38,
                size=14, bold=True, color=WHITE)
        # Card body
        rect(sl, lx, 1.24, CARD_W, 2.0, GRAY_BG, border=color, border_w=0.5)
        tb = sl.shapes.add_textbox(Inches(lx + 0.12), Inches(1.32), Inches(CARD_W - 0.24), Inches(1.85))
        tf = tb.text_frame; tf.word_wrap = True
        for j, pt in enumerate(points):
            p = tf.paragraphs[0] if j == 0 else tf.add_paragraph()
            p.space_before = Pt(4)
            r0 = p.add_run(); r0.text = "• "; r0.font.size = Pt(9.5); r0.font.color.rgb = DARK_TEXT; r0.font.name = "Calibri"
            r1 = p.add_run(); r1.text = pt; r1.font.size = Pt(9.5); r1.font.color.rgb = DARK_TEXT; r1.font.name = "Calibri"

    # ── Challenges & Strategies section ───────────────────────────────────
    # Left: Challenges (red)  Right: Strategies (green)  Midpoint: logos

    challenges = [
        ("Connectivity:", "Patchy INSAT coverage in high-altitude & remote AWS sites."),
        ("Calibration Drift:", "Barometric sensors drift ±3 hPa over 6 months reducing accuracy."),
        ("Data Privacy:", "Sensitive telemetry requires encryption for multi-agency sharing."),
        ("Hardware Failures:", "Solar panels and transceivers degrade in extreme monsoon conditions."),
        ("Integration:", "Heterogeneous AWS hardware (SUTRON, VAISALA, etc.) across IMD network."),
    ]
    strategies = [
        "Store-and-forward buffering ensures zero data loss during satellite outages.",
        "Auto-calibration via Kriging spatial consensus corrects drift continuously.",
        "AES-256 encryption + role-based access control for all telemetry streams.",
        "SHI/RUL predictive alerts dispatch field teams before hardware failure.",
        "Pluggable adapter layer — new hardware types added via JSON config schema.",
    ]

    # Challenge box
    CHL = 0.15; CHT = 3.32; CHW = 6.0; CHH = H - 3.32 - 0.52
    rect(sl, CHL, CHT, CHW, CHH, GRAY_BG, border=RGBColor(0xE8, 0x32, 0x32), border_w=0.5)
    for i, (label, text) in enumerate(challenges):
        ty = CHT + 0.1 + i * 0.68
        # Red badge circle
        circ = sl.shapes.add_shape(9, Inches(CHL + 0.12), Inches(ty + 0.04), Inches(0.38), Inches(0.38))
        circ.fill.solid(); circ.fill.fore_color.rgb = RED_BADGE; circ.line.fill.background()
        textbox(sl, f"0{i+1}", CHL + 0.14, ty + 0.07, 0.34, 0.3,
                size=10, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        multibox(sl, CHL + 0.6, ty + 0.01, CHW - 0.75, 0.62, [
            {"text": label, "size": 10, "bold": True, "color": DARK_TEXT},
            {"text": " " + text, "size": 9.5, "color": DARK_TEXT},
        ])

    # Strategies box
    SL2 = 7.25; SHT = 3.32; SHW = 5.93; SHH = CHH
    rect(sl, SL2, SHT, SHW, SHH, GRAY_BG, border=GREEN, border_w=0.5)
    for i, strat in enumerate(strategies):
        ty = SHT + 0.1 + i * 0.68
        circ = sl.shapes.add_shape(9, Inches(SL2 + 0.12), Inches(ty + 0.04), Inches(0.38), Inches(0.38))
        circ.fill.solid(); circ.fill.fore_color.rgb = GREEN; circ.line.fill.background()
        textbox(sl, f"0{i+1}", SL2 + 0.14, ty + 0.07, 0.34, 0.3,
                size=10, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        textbox(sl, strat, SL2 + 0.6, ty + 0.06, SHW - 0.75, 0.58,
                size=9.5, color=DARK_TEXT, wrap=True)

    # Column headers
    textbox(sl, "Potential Challenges & Risks", CHL + 1.5, CHT + 0.02, CHW - 1.6, 0.38,
            size=10, bold=True, color=RED_BADGE, align=PP_ALIGN.CENTER)
    textbox(sl, "Strategies For Overcoming Challenges", SL2 + 1.0, SHT + 0.02, SHW - 1.1, 0.38,
            size=10, bold=True, color=GREEN, align=PP_ALIGN.CENTER)

    footer(sl, 4)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 5 – Impact & Benefits
# Layout: Left audience impact diagram (4 nodes) + Right 3 benefit pillars
#         Bottom: bold quote banner
# ══════════════════════════════════════════════════════════════════════════════
def slide_impact(prs):
    sl = blank(prs)
    rect(sl, 0, 0, W, H, WHITE)

    team_logo(sl)
    sih_badge(sl)

    textbox(sl, "IMPACT AND BENEFITS", 1.9, 0.08, W - 4.0, 0.62,
            size=34, bold=True, color=DARK_TEXT, align=PP_ALIGN.CENTER, name="Calibri")

    # ── Audience cards (left side) ────────────────────────────────────────
    audiences = [
        ("IMD Forecasters", SIH_BLUE,
         "Receive 100% clean, validated AWS data for NWP model assimilation — eliminating faulty sensor corruption from national weather forecasts."),
        ("Field Technicians", ORANGE,
         "Smart SHI/RUL dashboards dispatch preventive maintenance before sensor failure, reducing emergency callouts by estimated 60%."),
        ("National Disaster\nManagement (NDMA)", SIH_CYAN,
         "CAP v1.2 early warning alerts broadcast genuine storm confirmations within seconds, with false alarms eliminated by AI quarantine."),
        ("Government / IMD HQ", GREEN,
         "Live 24x7 network health KPIs across 1,350 stations with audit trail and XAI explainability for regulatory compliance."),
    ]

    for i, (name, color, desc) in enumerate(audiences):
        row = i % 2; col = i // 2
        lx = 0.15 + col * 4.0
        ty = 0.92 + row * 2.3
        rect(sl, lx, ty, 3.8, 2.1, GRAY_BG, border=color, border_w=1.0)
        # Coloured header
        rect(sl, lx, ty, 3.8, 0.44, color)
        textbox(sl, name, lx + 0.12, ty + 0.04, 3.56, 0.42,
                size=11, bold=True, color=WHITE)
        textbox(sl, desc, lx + 0.12, ty + 0.52, 3.56, 1.5,
                size=9.5, color=DARK_TEXT, wrap=True)

    # ── Right pillar cards ────────────────────────────────────────────────
    right_l = 8.4
    textbox(sl, "Benefits of the Solution", right_l + 0.12, 0.88, 4.68, 0.42,
            size=13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    rrect(sl, right_l, 0.82, 4.8, 0.52, SIH_BLUE)

    pillars = [
        ("Social", SIH_BLUE,
         "Builds trust in national weather forecasts with transparent XAI reasoning. Empowers field workers with explainable AI decisions."),
        ("Economic", ORANGE,
         "Reduces false weather alerts that cost airlines, agriculture and disaster response billions annually. Prevents costly false evacuations."),
        ("Environmental", GREEN,
         "Ensures early storm warnings protect lives and infrastructure. Higher quality NWP data improves climate research accuracy."),
    ]

    for i, (pillar, color, text) in enumerate(pillars):
        ty = 1.44 + i * 1.7
        rect(sl, right_l, ty, 4.8, 1.6, GRAY_BG, border=color, border_w=0.5)
        # Left colored tab
        rect(sl, right_l, ty, 0.18, 1.6, color)
        textbox(sl, pillar, right_l + 0.28, ty + 0.08, 1.5, 0.4,
                size=12, bold=True, color=color)
        textbox(sl, text, right_l + 0.28, ty + 0.5, 4.38, 1.0,
                size=9.5, color=DARK_TEXT, wrap=True)

    # ── Quote banner ──────────────────────────────────────────────────────
    quote_text = (
        '"India\'s first AI-powered Weather Station QMS — 97.8% F1, <4.2ms latency, '
        '100% NWP data integrity, real alerts, real impact, real weather."'
    )
    rect(sl, 0, H - 1.02, W, 0.55, GRAY_BG, border=SIH_BLUE_LT, border_w=0.5)
    textbox(sl, quote_text, 0.3, H - 1.0, W - 0.6, 0.5,
            size=11, bold=True, italic=True, color=DARK_TEXT, align=PP_ALIGN.CENTER)

    footer(sl, 5)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 6 – Research & References
# Layout: White bg, two sections: "Field & Applied Research" + "Academic Sources"
#         Each reference as a bullet with bold title + hyperlink
# ══════════════════════════════════════════════════════════════════════════════
def slide_references(prs):
    sl = blank(prs)
    rect(sl, 0, 0, W, H, WHITE)

    team_logo(sl)
    sih_badge(sl)

    textbox(sl, "RESEARCH AND REFERENCES", 1.9, 0.08, W - 4.0, 0.62,
            size=34, bold=True, color=DARK_TEXT, align=PP_ALIGN.CENTER, name="Calibri")

    # ── Single bordered card ───────────────────────────────────────────────
    rect(sl, 0.15, 0.82, W - 0.30, H - 1.35, GRAY_BG, border=SIH_BLUE_LT, border_w=0.5)

    tb = sl.shapes.add_textbox(Inches(0.30), Inches(0.90), Inches(W - 0.60), Inches(H - 1.52))
    tf = tb.text_frame
    tf.word_wrap = True

    content = [
        # (text, size, bold, color, is_section_header)
        ("Field & Applied Research", 15  , True , SIH_BLUE,    True),
        ("•  Surveyed IMD engineers and field technicians to identify data quality failure modes in AWS telemetry across remote and coastal stations.",
         10.5, False, DARK_TEXT, False),
        ("•  Analysed NOAA/WMO Pub 8 anomaly-injection datasets and 50,000 synthetic AWS packets to benchmark Isolation Forest + Autoencoder ensemble performance.",
         10.5, False, DARK_TEXT, False),
        ("", 6, False, DARK_TEXT, False),
        ("Academic & Government Sources", 15, True, SIH_BLUE, True),
        ("•  WMO No.8 Guide to Meteorological Instruments and Observing Practices (2023):  https://library.wmo.int/records/item/41650-guide-to-meteorological-instruments",
         10.5, False, DARK_TEXT, False),
        ("•  IMD Automatic Weather Station Network – Technical Manual (2024):  https://www.imd.gov.in/pages/aws_agromet_main.php",
         10.5, False, DARK_TEXT, False),
        ("•  Scikit-learn Isolation Forest Documentation:  https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html",
         10.5, False, DARK_TEXT, False),
        ("•  OSGEO PyKrige Ordinary Kriging Interpolation:  https://pykrige.readthedocs.io/",
         10.5, False, DARK_TEXT, False),
        ("•  ITU-T X.1303 Common Alerting Protocol (CAP) v1.2:  https://www.itu.int/rec/T-REC-X.1303",
         10.5, False, DARK_TEXT, False),
        ("", 6, False, DARK_TEXT, False),
        ("•  Live Project Demo:  https://aws2026-nu.vercel.app/",
         11,   True , SIH_BLUE,  False),
        ("•  Team: Aerotech (Metshield AI)  |  SIH26073  |  AWS-QMS 2026",
         10.5, True,  DARK_TEXT, False),
    ]

    for i, (text, size, bold, color, _is_header) in enumerate(content):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_before = Pt(6 if _is_header else 3)
        run = p.add_run()
        run.text = text
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = color
        run.font.name = "Calibri"

    footer(sl, 6)


# ══════════════════════════════════════════════════════════════════════════════
# Helper for multibox used in feasibility slide
# ══════════════════════════════════════════════════════════════════════════════
def multibox(slide, l, t, w, h, lines, wrap=True):
    tb = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = wrap
    first = True
    for ln in lines:
        if first:
            p = tf.paragraphs[0]; first = False
        else:
            p = tf.add_paragraph()
        p.alignment = ln.get('align', PP_ALIGN.LEFT)
        run = p.add_run()
        run.text = ln.get('text', '')
        run.font.size = Pt(ln.get('size', 11))
        run.font.bold = ln.get('bold', False)
        run.font.italic = ln.get('italic', False)
        run.font.color.rgb = ln.get('color', BLACK)
        run.font.name = ln.get('name', 'Calibri')
    return tb


# ══════════════════════════════════════════════════════════════════════════════
def main():
    prs = new_prs()
    slide_title(prs)
    slide_innovation(prs)
    slide_technical(prs)
    slide_feasibility(prs)
    slide_impact(prs)
    slide_references(prs)
    prs.save(str(OUT_PATH))
    print("Saved OK:", OUT_PATH)


if __name__ == "__main__":
    main()
