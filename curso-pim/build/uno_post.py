"""Post-procesa un ODT con LibreOffice (UNO): bordes de tablas, actualizar índice, metadatos."""
import sys, time, subprocess, os
import uno
from com.sun.star.beans import PropertyValue

def pv(n, v):
    p = PropertyValue(); p.Name = n; p.Value = v; return p

def connect(port=2002):
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver', local)
    for _ in range(60):
        try:
            return resolver.resolve(f'uno:socket,host=localhost,port={port};urp;StarOffice.ComponentContext')
        except Exception:
            time.sleep(0.5)
    raise RuntimeError('no se pudo conectar con LibreOffice')

def line(color, width=18):
    b = uno.createUnoStruct('com.sun.star.table.BorderLine2')
    b.Color = color; b.OuterLineWidth = width; b.LineStyle = 0
    return b

def process(ctx, path, title, subject, author):
    smgr = ctx.ServiceManager
    desktop = smgr.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)
    url = uno.systemPathToFileUrl(os.path.abspath(path))
    doc = desktop.loadComponentFromURL(url, '_blank', 0, (pv('Hidden', True),))
    grey = 0xCBD5E1
    tables = doc.TextTables
    for i in range(tables.Count):
        t = tables.getByIndex(i)
        tb = t.TableBorder2
        for side in ('TopLine', 'BottomLine', 'LeftLine', 'RightLine', 'HorizontalLine', 'VerticalLine'):
            setattr(tb, side, line(grey))
        for valid in ('IsTopLineValid', 'IsBottomLineValid', 'IsLeftLineValid', 'IsRightLineValid', 'IsHorizontalLineValid', 'IsVerticalLineValid'):
            setattr(tb, valid, True)
        t.TableBorder2 = tb
        try: t.RepeatHeadline = True; t.HeaderRowCount = 1
        except Exception: pass
        for name in t.CellNames:
            c = t.getCellByName(name)
            c.LeftBorderDistance = c.RightBorderDistance = 120
            c.TopBorderDistance = c.BottomBorderDistance = 40
            if name[1:] == '1':
                c.BackColor = 0xE2E8F0
    for i in range(doc.DocumentIndexes.Count):
        doc.DocumentIndexes.getByIndex(i).update()
    info = doc.DocumentProperties
    info.Title = title; info.Subject = subject; info.Author = author
    doc.store()
    doc.close(True)
    return tables.Count if False else None

if __name__ == '__main__':
    port = 2002
    proc = subprocess.Popen(['soffice', '--headless', '--invisible', '--norestore', f'--accept=socket,host=localhost,port={port};urp;'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ctx = connect(port)
        for spec in sys.argv[1:]:
            path, title, subject, author = spec.split('|')
            process(ctx, path, title, subject, author)
            print('ODT post-procesado:', path)
        try: ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', ctx).terminate()
        except Exception: pass
    finally:
        time.sleep(1); proc.terminate()
