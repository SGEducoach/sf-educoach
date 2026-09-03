"""Read the original XLS without modifying it; emit a private JSON roster."""
import json
import re
import sys
from pathlib import Path

import xlrd

source = Path(sys.argv[1])
target = Path(sys.argv[2])
book = xlrd.open_workbook(source)
rows = []
statuses = set()
for sheet in book.sheets():
    class_name = None
    for index in range(sheet.nrows):
        values = sheet.row_values(index)
        heading = re.search(r'(\d+)\.\s*Sınıf\s*/\s*(\S+)\s*Şubesi', str(values[0]))
        if heading:
            class_name = f'{heading[1]}-{heading[2]}'
        if not isinstance(values[0], (int, float)) or not isinstance(values[1], (int, float)):
            continue
        if not class_name or not values[3] or not values[7]:
            raise ValueError(f'Incomplete student row {index + 1}')
        status = str(values[13]).strip()
        statuses.add(status)
        if status not in ('', 'Yatılı'):
            raise ValueError(f'Unknown boarding status {status!r}')
        if values[1] != int(values[1]):
            raise ValueError('Non-integer student number')
        rows.append(dict(ad=f'{values[3]} {values[7]}'.strip(), okulNo=str(int(values[1])),
                         sinif=class_name, yurtOgrencisi=status == 'Yatılı', kaynakSatir=index + 1))
if not rows or len({r['okulNo'] for r in rows}) != len(rows):
    raise ValueError('Empty roster or duplicate student numbers')
target.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(dict(ogrenci=len(rows), yatili=sum(r['yurtOgrencisi'] for r in rows),
                     siniflar=sorted({r['sinif'] for r in rows})), ensure_ascii=True))
