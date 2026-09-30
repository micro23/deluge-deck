"""Build Terminal's narrow CRT face from the bundled OFL Share Tech Mono.
Run with fonttools installed. The original font and other themes are untouched.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

root = Path(__file__).resolve().parent.parent
font = TTFont(root / 'src/assets/fonts/ShareTechMono-Regular.ttf')
glyphs = font.getGlyphSet()
outlines = {}
for name in font.getGlyphOrder():
    pen = TTGlyphPen(glyphs)
    glyphs[name].draw(TransformPen(pen, (0.78, 0, 0, 1, 0, 0)))
    outlines[name] = pen.glyph()
    advance, bearing = font['hmtx'].metrics[name]
    font['hmtx'].metrics[name] = (round(advance * 0.78), round(bearing * 0.78))
for name, glyph in outlines.items():
    font['glyf'][name] = glyph
for record in font['name'].names:
    names = {1: 'Deck CRT Mono', 2: 'Regular', 3: 'DeckCRTMono-Regular-1.0',
             4: 'Deck CRT Mono Regular', 6: 'DeckCRTMono-Regular'}
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
font.save(root / 'src/assets/fonts/DeckCRTMono-Regular.ttf')
