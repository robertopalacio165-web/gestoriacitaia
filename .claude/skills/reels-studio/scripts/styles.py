"""
Style packs = the three reel styles extracted from the user's reference video.
All three are OVERLAY styles: the footage and its own audio (voice + music) are kept as shot.
Only motion graphics, captions/typography and motion sound effects are added. Never add music.
"""

STYLES = {
    "full_screen": {
        "title": "Full Screen Talking Head", "family": "overlay",
        "desc": "Calm and clean: no flashes, no zooms. Face high up, ONE word at a time just under the mouth "
                "(small white Inter), dark-glass checklist cards at the bottom that tick to coral checks as each point is said.",
        "cut": {"beat": 0, "speed": 1.0, "zoom": [[1.0, 1.0]], "transitions": ["cut"]},
        "captions": {"preset": "word_mouth", "y": 0.62, "max_words": 1},
        "grade": {"preset": "none", "grain": 0, "vignette": False, "sharpen": False},
        "sound": {"sfx_volume": 0.25}, "progress_bar": None, "fx": {}, "stickers_every": 0,
        "graphics": ["checklists"],
    },
    "split_screen": {
        "title": "Educational Split Screen", "family": "overlay",
        "desc": "Top half: graphic panels on paper/grid that change about every second (huge condensed headline, stat "
                "with animated bar chart, yellow card with mono tags, photo card). Bottom half: the speaker. Captions on the "
                "seam: 1-2 uppercase mono words, white on a black box.",
        "cut": {"beat": 0, "speed": 1.0, "zoom": [[1.0, 1.0]], "transitions": ["cut"]},
        "captions": {"preset": "mono_box", "y": 0.5, "max_words": 2},
        "grade": {"preset": "none", "grain": 0, "vignette": False, "sharpen": False},
        "sound": {"sfx_volume": 0.3}, "progress_bar": None, "fx": {}, "stickers_every": 0,
        "graphics": ["split"],
    },
    "cinematic": {
        "title": "Cinematic", "family": "overlay",
        "desc": "Black & white film look with grain and a warm orange light leak. The caption line builds word by word "
                "(unspoken words dim), keywords in a serif italic. Huge red stretched condensed words appear BEHIND the person.",
        "cut": {"beat": 0, "speed": 1.0, "zoom": [[1.0, 1.0]], "transitions": ["cut"]},
        "captions": {"preset": "cine_build", "y": 0.64, "max_words": 5},
        "grade": {"preset": "none", "grain": 9, "vignette": True, "sharpen": False},
        "sound": {"sfx_volume": 0.25}, "progress_bar": None, "fx": {}, "stickers_every": 0,
        "graphics": ["behind_texts"], "look": "cinematic",
    },
}
