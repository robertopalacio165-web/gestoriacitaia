"""
Style packs = the two reel styles extracted from the user's reference video.
Both are OVERLAY styles: the footage and its own audio (voice + music) are kept as shot.
Only motion graphics, captions/typography and motion sound effects are added. Never add music.
"""

STYLES = {
    "full_screen": {
        "title": "Full Screen Talking Head", "family": "overlay",
        "desc": "Calm and clean: no flashes, no zooms. Face high up, captions always at the bottom (thick, outlined, "
                "spoken word yellow), BIG dark-glass checklist cards placed above the heads that tick to coral checks as each point is said.",
        "cut": {"beat": 0, "speed": 1.0, "zoom": [[1.0, 1.0]], "transitions": ["cut"]},
        "captions": {"preset": "bottom_bold", "y": 0.79, "max_words": 3, "font_option": "tajawal"},
        "grade": {"preset": "none", "grain": 0, "vignette": False, "sharpen": False},
        "sound": {"sfx_volume": 0.25}, "progress_bar": None, "fx": {}, "stickers_every": 0,
        "graphics": ["checklists"],
    },
    "split_screen": {
        "title": "Educational Split Screen", "family": "overlay",
        "desc": "Top half: graphic panels on paper/grid that change about every second (huge condensed headline, stat "
                "with animated bar chart, yellow card with mono tags, photo card). Bottom half: the speaker. Captions always at "
                "the bottom (thick, outlined, spoken word yellow).",
        "cut": {"beat": 0, "speed": 1.0, "zoom": [[1.0, 1.0]], "transitions": ["cut"]},
        "captions": {"preset": "bottom_bold", "y": 0.82, "max_words": 3, "font_option": "tajawal"},
        "grade": {"preset": "none", "grain": 0, "vignette": False, "sharpen": False},
        "sound": {"sfx_volume": 0.3}, "progress_bar": None, "fx": {}, "stickers_every": 0,
        "graphics": ["split"],
    },
    # THE USER'S HOUSE STYLE (approved 60 s Roberto/Mido Black Friday reel) - use by default for every new video
    "house": {
        "title": "House style (MIDO CARS x PALACIO CARS)", "family": "overlay",
        "desc": "Full screen footage + big checklists above the heads + short split-screen cards + GSAP motion (kinetic title, "
                "price counter, lower thirds, flags, CTA, light wipe) + Google animated emoji + full-screen offer posters. "
                "No captions, no music, nothing over car shots, Tajawal Arabic, audible whoosh/click/pop on every motion.",
        "cut": {"beat": 0, "speed": 1.0, "zoom": [[1.0, 1.0]], "transitions": ["cut"]},
        "captions": {"enabled": False},
        "grade": {"preset": "none", "grain": 0, "vignette": False, "sharpen": False},
        "sound": {"sfx_volume": 0.6}, "progress_bar": None, "fx": {}, "stickers_every": 0,
        "graphics": ["checklists", "split", "motion", "lotties", "inserts"],
    },
}
