from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
for grade in ("9", "10"):
    files = sorted((root / "tmp" / "pdfs" / f"samples{grade}").glob("*.jpg"))
    for group_start in range(0, len(files), 10):
        group = files[group_start:group_start + 10]
        thumbs = []
        for index, path in enumerate(group, start=group_start + 1):
            img = Image.open(path).convert("RGB")
            img.thumbnail((300, 430))
            cell = Image.new("RGB", (320, 470), "white")
            cell.paste(img, ((320-img.width)//2, 28))
            ImageDraw.Draw(cell).text((10, 7), f"Sayfa {index}", fill="black")
            thumbs.append(cell)
        sheet = Image.new("RGB", (320*5, 470*2), "#dddddd")
        for i, thumb in enumerate(thumbs):
            sheet.paste(thumb, ((i % 5)*320, (i // 5)*470))
        sheet.save(root / "tmp" / "pdfs" / f"contact_{grade}_{group_start+1:02d}_{group_start+len(group):02d}.jpg", quality=90)
