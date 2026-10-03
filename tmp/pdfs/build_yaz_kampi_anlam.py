from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import white, black, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

SOURCE = Path(r"G:\YKS\YAZ_KAMPI.pdf")
OUTPUT = Path(r"E:\SG_EDUCOACH\output\pdf\YAZ_KAMPI_SOZCUKTE_VE_CUMLEDE_ANLAM.pdf")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

reader = PdfReader(str(SOURCE))
page = reader.pages[0]
width = float(page.mediabox.width)
height = float(page.mediabox.height)

font_path = Path(r"C:\Windows\Fonts\arialbd.ttf")
pdfmetrics.registerFont(TTFont("ArialBold", str(font_path)))

overlay_buffer = BytesIO()
c = canvas.Canvas(overlay_buffer, pagesize=(width, height))

# Remove only the old subject title while preserving the original cover artwork.
c.setFillColor(white)
c.rect(135, 285, 390, 185, stroke=0, fill=1)

c.setFillColor(black)
c.setFont("ArialBold", 28)
c.drawCentredString(330, 420, "SÖZCÜKTE ANLAM")
c.setFillColor(HexColor("#B52E20"))
c.setFont("ArialBold", 17)
c.drawCentredString(330, 386, "VE")
c.setFillColor(black)
c.setFont("ArialBold", 28)
c.drawCentredString(330, 350, "CÜMLEDE ANLAM")
c.setFont("ArialBold", 18)
c.drawCentredString(330, 316, "SORU DERLEMESİ")
c.save()

overlay_buffer.seek(0)
overlay = PdfReader(overlay_buffer).pages[0]
page.merge_page(overlay)

writer = PdfWriter()
writer.add_page(page)
for source_page in reader.pages[1:]:
    writer.add_page(source_page)

with OUTPUT.open("wb") as stream:
    writer.write(stream)

check = PdfReader(str(OUTPUT))
if len(check.pages) != len(reader.pages):
    raise RuntimeError(f"Page count mismatch: {len(check.pages)} != {len(reader.pages)}")

print(f"OUTPUT={OUTPUT}")
print(f"PAGES={len(check.pages)}")
print(f"SIZE={OUTPUT.stat().st_size}")
