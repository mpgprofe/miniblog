#!/usr/bin/env bash
# Genera salidas REALES de Git para las capturas del Tema 1.
set -e
W=$(mktemp -d); OUT="$(dirname "$(readlink -f "$0")")/out"; cd "$W"
export GIT_CONFIG_GLOBAL=/dev/null GIT_AUTHOR_DATE="2026-11-02T10:00:00" GIT_COMMITTER_DATE="2026-11-02T10:00:00"
git init -q --bare origin.git -b main
git clone -q origin.git ana 2>/dev/null; git clone -q origin.git luis 2>/dev/null
cfg(){ git config user.name "$1"; git config user.email "$2"; }
cd ana; cfg "Ana Ruiz" ana@campus.test
mkdir src; printf 'export const titulo = "CampusBlog";\n' > src/config.js; echo "# CampusBlog" > README.md
git add .; git commit -qm "chore: estructura inicial del proyecto"; git push -q origin main
cd ../luis; git pull -q origin main; cfg "Luis Mora" luis@campus.test
{
cd ../ana
git switch -q -c feat/login
echo "export const login = () => 'login';" > src/login.js
git add .; git commit -qm "feat(auth): añadir formulario de login"
echo "// validar email" >> src/login.js
git commit -qam "fix(auth): validar formato del email"
cd ../luis
git switch -q -c feat/listado-entradas
echo "export const listar = () => [];" > src/posts.js
git add .; git commit -qm "feat(posts): listado paginado de entradas"
git commit -q --allow-empty -m "docs: documentar endpoint GET /api/posts"
}
cd ../ana; git push -q origin feat/login 2>&1
cd ../luis; git push -q origin feat/listado-entradas 2>&1
cd ../ana; git switch -q main; git merge -q --no-ff feat/login -m "Merge PR #1: feat(auth): login" ; git push -q origin main
cd ../luis; git fetch -q origin; git switch -q main; git pull -q origin main
git merge -q --no-ff feat/listado-entradas -m "Merge PR #2: feat(posts): listado" ; git push -q origin main
cd ../ana; git pull -q origin main
{
echo '$ git log --oneline --graph --decorate --all'
git log --oneline --graph --decorate --all
} > "$OUT/git_log.txt"
{
echo '$ git commit -m "arreglo cosas"   # ❌ mensaje vago'
echo '$ git commit -m "fix(posts): evitar duplicados en la paginación"   # ✅ Conventional Commit'
} > "$OUT/git_commits.txt"
# --- Conflicto real ---
cd ../ana; git switch -q -c feat/titulo-ana; sed -i 's/CampusBlog/CampusBlog - IES Ejemplo/' src/config.js; git commit -qam "feat(ui): cambiar título de la web"
git switch -q main; git merge -q --no-ff feat/titulo-ana -m "Merge PR #3: título"; git push -q origin main
cd ../luis; git switch -q -c feat/titulo-luis; sed -i 's/CampusBlog/Campus Blog 2026/' src/config.js; git commit -qam "feat(ui): nuevo título con año"
git fetch -q origin
{
echo '$ git merge origin/main'
git merge origin/main 2>&1 || true
echo; echo '$ cat src/config.js'
cat src/config.js
} > "$OUT/git_conflict.txt"
printf 'export const titulo = "Campus Blog 2026 - IES Ejemplo";\n' > src/config.js
git add src/config.js; git commit -qm "merge: resolver conflicto del título"
{ echo '$ git log --oneline -4'; git log --oneline -4; } > "$OUT/git_resolved.txt"

cd "$W/luis"
{ echo '$ git shortlog -sn --all --no-merges'; git shortlog -sn --all --no-merges; echo; echo '$ git log --no-merges --format="%an  %s"'; git log --no-merges --all --format="%an  %s"; } > "$OUT/git_evidencias.txt"
