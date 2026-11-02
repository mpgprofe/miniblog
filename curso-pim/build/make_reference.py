"""Crea reference.odt (estilos para pandoc) a partir del de pandoc por defecto."""
import re, zipfile, shutil, subprocess, os

subprocess.run(['pandoc', '-o', 'ref_default.odt', '--print-default-data-file', 'reference.odt'], check=True)
zin = zipfile.ZipFile('ref_default.odt')
files = {n: zin.read(n) for n in zin.namelist()}
s = files['styles.xml'].decode('utf8')

SANS, MONO = 'Liberation Sans', 'Liberation Mono'

# Tipografías
s = s.replace('<office:font-face-decls>', f'''<office:font-face-decls>
<style:font-face style:name="{SANS}" svg:font-family="'{SANS}'" style:font-family-generic="swiss" style:font-pitch="variable" />
<style:font-face style:name="{MONO}" svg:font-family="'{MONO}'" style:font-family-generic="modern" style:font-pitch="fixed" />''', 1)
s = s.replace('style:font-name="Courier New"', f'style:font-name="{MONO}"').replace('style:font-name="Arial"', f'style:font-name="{SANS}"')

def replace_style(name, new_xml):
    global s
    pat = re.compile(r'<style:style style:name="%s"[^>]*?(?:/>|>.*?</style:style>)' % re.escape(name), re.S)
    if pat.search(s):
        s = pat.sub(lambda m: new_xml, s, count=1)
    else:
        s = s.replace('</office:styles>', new_xml + '\n</office:styles>', 1)

def pstyle(name, display, parent='Text_20_body', para='', text='', nxt=None, extra=''):
    return (f'<style:style style:name="{name}" style:display-name="{display}" style:family="paragraph" '
            f'style:parent-style-name="{parent}"{f" style:next-style-name={chr(34)}{nxt}{chr(34)}" if nxt else ""} {extra}>'
            f'<style:paragraph-properties {para}/><style:text-properties {text}/></style:style>')

replace_style('Standard', f'<style:style style:name="Standard" style:family="paragraph" style:class="text"><style:paragraph-properties fo:line-height="125%" fo:orphans="2" fo:widows="2"/><style:text-properties style:font-name="{SANS}" fo:font-size="10.5pt" fo:language="es" fo:country="ES"/></style:style>')
replace_style('Text_20_body', pstyle('Text_20_body', 'Text body', 'Standard', 'fo:margin-top="0cm" fo:margin-bottom="0.22cm" fo:text-align="justify"'))
replace_style('First_20_paragraph', pstyle('First_20_paragraph', 'First paragraph', 'Text_20_body'))
replace_style('Heading_20_1', pstyle('Heading_20_1', 'Heading 1', 'Heading', 'fo:break-before="page" fo:margin-top="0cm" fo:margin-bottom="0.5cm" fo:padding-bottom="0.15cm" fo:border-bottom="1.5pt solid #1d4ed8"', 'fo:font-size="21pt" fo:font-weight="bold" fo:color="#1e3a8a"', 'Text_20_body', 'style:default-outline-level="1" style:class="text"'))
replace_style('Heading_20_2', pstyle('Heading_20_2', 'Heading 2', 'Heading', 'fo:margin-top="0.6cm" fo:margin-bottom="0.25cm"', 'fo:font-size="15pt" fo:font-weight="bold" fo:font-style="normal" fo:color="#1d4ed8"', 'Text_20_body', 'style:default-outline-level="2" style:class="text"'))
replace_style('Heading_20_3', pstyle('Heading_20_3', 'Heading 3', 'Heading', 'fo:margin-top="0.45cm" fo:margin-bottom="0.2cm"', 'fo:font-size="12.5pt" fo:font-weight="bold" fo:color="#334155"', 'Text_20_body', 'style:default-outline-level="3" style:class="text"'))
replace_style('Preformatted_20_Text', pstyle('Preformatted_20_Text', 'Preformatted Text', 'Standard',
    'fo:margin-left="0.1cm" fo:margin-right="0.1cm" fo:margin-top="0cm" fo:margin-bottom="0cm" fo:background-color="#f1f5f9" fo:padding="0.15cm" fo:border="0.5pt solid #cbd5e1" fo:line-height="115%" fo:text-align="start"',
    f'style:font-name="{MONO}" fo:font-size="8.3pt" fo:color="#0f172a"', None, 'style:class="html"'))
replace_style('Quotations', pstyle('Quotations', 'Quotations', 'Standard', 'fo:margin-left="0.8cm" fo:margin-right="0.4cm" fo:margin-top="0.2cm" fo:margin-bottom="0.3cm" fo:border-left="2.5pt solid #94a3b8"', 'fo:font-style="italic" fo:color="#475569"', None, 'style:class="html"'))
replace_style('Table_20_Contents', pstyle('Table_20_Contents', 'Table Contents', 'Standard', 'fo:margin-top="0.04cm" fo:margin-bottom="0.04cm"', 'fo:font-size="9pt"', None, 'style:class="extra"'))
replace_style('Table_20_Heading', pstyle('Table_20_Heading', 'Table Heading', 'Table_20_Contents', 'fo:margin-top="0.04cm" fo:margin-bottom="0.04cm"', 'fo:font-weight="bold" fo:font-size="9pt"', None, 'style:class="extra"'))
replace_style('Caption', pstyle('Caption', 'Caption', 'Standard', 'fo:margin-top="0.1cm" fo:margin-bottom="0.3cm" fo:text-align="center"', 'fo:font-size="9pt" fo:font-style="italic" fo:color="#475569"', None, 'style:class="extra"'))
replace_style('Figure', pstyle('Figure', 'Figure', 'Caption', 'fo:text-align="center"', '', None, 'style:class="extra"'))
replace_style('Title', pstyle('Title', 'Title', 'Standard', 'fo:margin-top="3cm" fo:margin-bottom="0.4cm" fo:text-align="center"', 'fo:font-size="30pt" fo:font-weight="bold" fo:color="#1e3a8a"', 'Subtitle', 'style:class="chapter"'))
replace_style('Subtitle', pstyle('Subtitle', 'Subtitle', 'Standard', 'fo:margin-bottom="0.8cm" fo:text-align="center"', 'fo:font-size="13pt" fo:color="#475569"', None, 'style:class="chapter"'))
replace_style('Author', pstyle('Author', 'Author', 'Standard', 'fo:text-align="center" fo:margin-bottom="0.2cm"', 'fo:font-size="11pt" fo:color="#475569"', None, 'style:class="text"'))
replace_style('Date', pstyle('Date', 'Date', 'Standard', 'fo:text-align="center"', 'fo:font-size="10pt" fo:color="#64748b"', None, 'style:class="text"'))

boxes = {
    'Consejo': ('Consejo', '#f0fdf4', '#16a34a'),
    'Aviso': ('Aviso', '#fef2f2', '#dc2626'),
    'Ejemplo': ('Ejemplo', '#eff6ff', '#2563eb'),
    'En_20_la_20_empresa': ('En la empresa', '#fff7ed', '#ea580c'),
    'Reto': ('Reto', '#faf5ff', '#7c3aed'),
}
for name, (disp, bg, bd) in boxes.items():
    replace_style(name, pstyle(name, disp, 'Standard',
        f'fo:margin-left="0.2cm" fo:margin-right="0.2cm" fo:margin-top="0.15cm" fo:margin-bottom="0.15cm" fo:background-color="{bg}" fo:padding="0.2cm" fo:border-left="3pt solid {bd}" fo:border-top="none" fo:border-bottom="none" fo:border-right="none" fo:text-align="start" fo:keep-together="always"', '', None, 'style:class="text"'))

# Página A4 con márgenes de 2 cm
s = re.sub(r'fo:page-width="[^"]*"', 'fo:page-width="21cm"', s)
s = re.sub(r'fo:page-height="[^"]*"', 'fo:page-height="29.7cm"', s)
s = re.sub(r'fo:margin-(top|bottom|left|right)="1in"', r'fo:margin-\1="2cm"', s)
files['styles.xml'] = s.encode('utf8')

with zipfile.ZipFile('reference.odt', 'w') as z:
    z.writestr(zipfile.ZipInfo('mimetype'), files['mimetype'])
    for n, d in files.items():
        if n != 'mimetype':
            z.writestr(n, d, compress_type=zipfile.ZIP_DEFLATED)
print('reference.odt creado')
