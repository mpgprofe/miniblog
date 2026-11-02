#!/usr/bin/env python3
"""Construye, para cada tema: un .odt autodidacta y un paquete SCORM 1.2 (.zip) para Moodle.

Uso:  python3 build/build.py [tema1 tema2 ...]
Requisitos: pandoc, LibreOffice (soffice + python-uno), Python 3.
"""
import json, re, shutil, subprocess, sys, zipfile, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # curso-pim/
BUILD = ROOT / 'build'
TEMAS = ROOT / 'temas'
IMG = ROOT / 'img'
DIST = ROOT / 'dist'
WORK = BUILD / '_work'

META = {
    'tema1': ('Tema 1. Gestión del proyecto en pareja', 'tema1-gestion-proyecto-pareja'),
    'tema2': ('Tema 2. Elección y uso del stack', 'tema2-eleccion-uso-stack'),
    'tema3': ('Tema 3. Calidad, seguridad y accesibilidad', 'tema3-calidad-seguridad-accesibilidad'),
    'tema4': ('Tema 4. IA en el desarrollo', 'tema4-ia-en-el-desarrollo'),
}
LETTERS = 'ABCDEFGH'


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode:
        raise RuntimeError(f'{" ".join(map(str, cmd))}\n{r.stderr}')
    return r.stdout


def split_quiz_section(md):
    """Separa el texto del tema de la sección final '# Autoevaluación'."""
    i = md.index('\n# Autoevaluación')
    return md[:i], md[i:]


def quiz_markdown(quiz):
    out = []
    for n, q in enumerate(quiz['questions'], 1):
        out.append(f'**Pregunta {n}.** {q["q"]}\n')
        for j, o in enumerate(q['options']):
            out.append(f'- ☐ **{LETTERS[j]})** {o}')
        out.append('')
    out.append('\n## Soluciones razonadas\n')
    out.append(f'Cuenta tus aciertos: **{len(quiz["questions"])} preguntas · aprobado a partir del {quiz["passScore"]} %.** Si fallas alguna, relee el apartado correspondiente antes de seguir.\n')
    for n, q in enumerate(quiz['questions'], 1):
        ans = ', '.join(LETTERS[a] for a in q['answer'])
        out.append(f'**{n}.** Respuesta correcta: **{ans}**. {q["why"]}\n')
    return '\n'.join(out)


def build_odt(key, title):
    md = (TEMAS / f'{key}.md').read_text(encoding='utf8')
    quiz = json.loads((TEMAS / f'{key}.quiz.json').read_text(encoding='utf8'))
    full = md.rstrip() + '\n\n' + quiz_markdown(quiz) + '\n'
    tmp = WORK / f'{key}_odt.md'
    tmp.write_text(full, encoding='utf8')
    out = DIST / f'{META[key][1]}.odt'
    run(['pandoc', str(tmp), '-f', 'markdown+emoji', '-o', str(out), f'--reference-doc={BUILD / "reference.odt"}',
         '--toc', '--toc-depth=2', f'--resource-path={TEMAS}', '--metadata', 'toc-title=Índice'])
    return out


def build_scorm(key, title):
    md = (TEMAS / f'{key}.md').read_text(encoding='utf8')
    quiz = json.loads((TEMAS / f'{key}.quiz.json').read_text(encoding='utf8'))
    body_md, _ = split_quiz_section(md)
    pkg = WORK / f'{key}_scorm'
    shutil.rmtree(pkg, ignore_errors=True)
    (pkg / 'img').mkdir(parents=True)
    # imágenes realmente usadas
    used = sorted(set(re.findall(r'\.\./img/([\w\-.]+)', body_md)))
    for f in used:
        shutil.copy(IMG / f, pkg / 'img' / f)
    body_md = body_md.replace('../img/', 'img/')
    src = WORK / f'{key}_scorm.md'
    src.write_text(body_md, encoding='utf8')
    # Plantilla HTML con título de página
    tpl = (BUILD / 'scorm' / 'template.html').read_text(encoding='utf8').replace('$pagetitle$', html.escape(title))
    tpl_path = WORK / 'template_filled.html'
    tpl_path.write_text(tpl, encoding='utf8')
    out_html = pkg / 'index.html'
    run(['pandoc', str(src), '-f', 'markdown+emoji', '-t', 'html5', '-s', '--toc', '--toc-depth=2', f'--template={tpl_path}',
         '--highlight-style=tango', '--wrap=none', '-o', str(out_html)])
    h = out_html.read_text(encoding='utf8')
    # custom-style -> clases CSS cortas (ya vienen como class="ejemplo" etc.) ; "En la empresa" -> .empresa
    h = h.replace('<script>window.QUIZ = /*QUIZ_JSON*/;</script>', '<script>window.QUIZ = ' + json.dumps(quiz, ensure_ascii=False).replace('</', '<\\/') + ';</script>')
    # el título del documento ya está en la cabecera: evita duplicar el h1.title si pandoc lo emitió
    out_html.write_text(h, encoding='utf8')
    shutil.copy(BUILD / 'scorm' / 'scorm.js', pkg / 'scorm.js')
    # manifest
    files = sorted(str(p.relative_to(pkg)).replace('\\', '/') for p in pkg.rglob('*') if p.is_file())
    ident = META[key][1]
    res_files = '\n      '.join(f'<file href="{f}"/>' for f in files)
    manifest = f'''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-{ident}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-{ident}">
    <organization identifier="ORG-{ident}">
      <title>{html.escape(title)}</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true">
        <title>{html.escape(title)}</title>
        <adlcp:masteryscore>{quiz["passScore"]}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      {res_files}
    </resource>
  </resources>
</manifest>
'''
    (pkg / 'imsmanifest.xml').write_text(manifest, encoding='utf8')
    zpath = DIST / f'{ident}-scorm12.zip'
    if zpath.exists():
        zpath.unlink()
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(pkg / 'imsmanifest.xml', 'imsmanifest.xml')   # el manifest en la raíz
        for p in sorted(pkg.rglob('*')):
            if p.is_file() and p.name != 'imsmanifest.xml':
                z.write(p, str(p.relative_to(pkg)))
    return zpath


def main():
    keys = sys.argv[1:] or list(META)
    DIST.mkdir(exist_ok=True)
    WORK.mkdir(exist_ok=True)
    odts = []
    for k in keys:
        title, ident = META[k]
        print(f'== {k}: {title}')
        odt = build_odt(k, title)
        odts.append(f'{odt}|{title}|Proyecto Intermodular DAW|Departamento de Informática')
        z = build_scorm(k, title)
        print('   SCORM:', z.name, f'{z.stat().st_size // 1024} KB')
    run([sys.executable, str(BUILD / 'uno_post.py'), *odts])
    for o in odts:
        p = Path(o.split('|')[0])
        print('   ODT:', p.name, f'{p.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
