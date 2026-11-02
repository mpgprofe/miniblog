/* Runtime SCORM 1.2 + cuestionario de autoevaluación. Sin dependencias. */
(function () {
  'use strict';
  // ---------- API SCORM 1.2 ----------
  var api = null, connected = false;
  function findAPI(win) {
    var tries = 0;
    while (win && !win.API && win.parent && win.parent !== win && tries++ < 10) win = win.parent;
    return win && win.API ? win.API : null;
  }
  api = findAPI(window) || (window.opener ? findAPI(window.opener) : null);
  function call(fn, a, b) { try { return api[fn](a, b); } catch (e) { return ''; } }
  var lms = document.getElementById('lms');
  if (api) {
    connected = String(call('LMSInitialize', '')) === 'true';
    lms.textContent = connected ? 'Conectado a Moodle' : 'Error al conectar con el LMS';
    var st = call('LMSGetValue', 'cmi.core.lesson_status');
    if (!st || st === 'not attempted') call('LMSSetValue', 'cmi.core.lesson_status', 'incomplete');
    call('LMSCommit', '');
  } else {
    lms.textContent = 'Modo sin LMS: la nota no se guardará';
  }
  function set(k, v) { if (connected) call('LMSSetValue', k, String(v)); }
  function commit() { if (connected) call('LMSCommit', ''); }
  var finished = false;
  function finish() { if (connected && !finished) { finished = true; call('LMSFinish', ''); } }
  window.addEventListener('beforeunload', function () { commit(); finish(); });
  window.addEventListener('pagehide', function () { commit(); finish(); });

  // ---------- Navegación ----------
  var body = document.body;
  document.getElementById('menu').addEventListener('click', function () { body.classList.toggle('nav'); });
  var links = [].slice.call(document.querySelectorAll('#TOC a'));
  links.forEach(function (a) { a.addEventListener('click', function () { body.classList.remove('nav'); }); });
  var bar = document.querySelector('#bar i');
  var maxPct = 0;
  function onScroll() {
    var h = document.documentElement;
    var pct = Math.min(100, Math.round(100 * (h.scrollTop + h.clientHeight) / h.scrollHeight));
    bar.style.width = pct + '%';
    maxPct = Math.max(maxPct, pct);
    var cur = null;
    links.forEach(function (a) {
      var el = document.getElementById(decodeURIComponent((a.getAttribute('href') || '').slice(1)));
      if (el && el.getBoundingClientRect().top < 120) cur = a;
      a.classList.remove('on');
    });
    if (cur) cur.classList.add('on');
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var lastLoc = '';
  setInterval(function () {
    var loc = String(maxPct);
    if (connected && loc !== lastLoc) { lastLoc = loc; set('cmi.core.lesson_location', loc); commit(); }
  }, 15000);

  // ---------- Cuestionario ----------
  var Q = window.QUIZ.questions, pass = window.QUIZ.passScore;
  document.getElementById('pass').textContent = pass;
  var box = document.getElementById('quiz');
  var checked = [];
  var letters = 'ABCDEFGH';
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function render() {
    box.innerHTML = ''; checked = Q.map(function () { return false; });
    Q.forEach(function (q, i) {
      var multi = q.type === 'multi';
      var div = document.createElement('div'); div.className = 'q'; div.id = 'q' + i;
      var html = '<h3>' + (i + 1) + '. ' + esc(q.q) + '</h3><div role="' + (multi ? 'group' : 'radiogroup') + '" aria-label="Pregunta ' + (i + 1) + '">';
      q.options.forEach(function (o, j) {
        html += '<label><input type="' + (multi ? 'checkbox' : 'radio') + '" name="q' + i + '" value="' + j + '"> <span><strong>' + letters[j] + ')</strong> ' + esc(o) + '</span></label>';
      });
      html += '</div><p><button class="btn sec" data-i="' + i + '">Comprobar</button></p><div class="fb" id="fb' + i + '" hidden></div>';
      div.innerHTML = html; box.appendChild(div);
    });
    box.querySelectorAll('button[data-i]').forEach(function (b) { b.addEventListener('click', function () { check(+b.dataset.i); }); });
    document.getElementById('result').style.display = 'none';
    document.getElementById('retry').hidden = true;
    document.getElementById('finish').disabled = false;
  }
  function selected(i) {
    return [].slice.call(box.querySelectorAll('input[name=q' + i + ']:checked')).map(function (x) { return +x.value; }).sort();
  }
  function isRight(i) {
    var a = selected(i), c = Q[i].answer.slice().sort();
    return a.length === c.length && a.every(function (v, k) { return v === c[k]; });
  }
  function check(i) {
    var right = isRight(i), q = Q[i];
    checked[i] = true;
    box.querySelectorAll('input[name=q' + i + ']').forEach(function (inp) {
      var lab = inp.parentElement, isAns = q.answer.indexOf(+inp.value) >= 0;
      lab.classList.remove('ok', 'bad');
      if (isAns) lab.classList.add('ok'); else if (inp.checked) lab.classList.add('bad');
    });
    var fb = document.getElementById('fb' + i);
    fb.hidden = false; fb.className = 'fb ' + (right ? 'ok' : 'bad');
    fb.innerHTML = (right ? '✅ <strong>¡Correcto!</strong> ' : '❌ <strong>Incorrecto.</strong> Respuesta correcta: ' + q.answer.map(function (x) { return letters[x]; }).join(', ') + '. ') + esc(q.why);
  }
  function finishQuiz() {
    var ok = 0, unanswered = 0;
    Q.forEach(function (q, i) { if (!selected(i).length) unanswered++; });
    if (unanswered && !window.confirm('Te quedan ' + unanswered + ' preguntas sin contestar. ¿Enviar de todas formas?')) return;
    Q.forEach(function (q, i) { if (isRight(i)) ok++; check(i); });
    var score = Math.round(100 * ok / Q.length), passed = score >= pass;
    // Interacciones (Moodle las muestra en los informes)
    Q.forEach(function (q, i) {
      var p = 'cmi.interactions.' + i + '.';
      set(p + 'id', 'q' + (i + 1));
      set(p + 'type', q.type === 'multi' ? 'choice' : (q.type === 'tf' ? 'true-false' : 'choice'));
      set(p + 'student_response', selected(i).map(function (x) { return letters[x].toLowerCase(); }).join(','));
      set(p + 'correct_responses.0.pattern', q.answer.map(function (x) { return letters[x].toLowerCase(); }).join(','));
      set(p + 'result', isRight(i) ? 'correct' : 'wrong');
    });
    set('cmi.core.score.min', 0); set('cmi.core.score.max', 100); set('cmi.core.score.raw', score);
    set('cmi.core.lesson_status', passed ? 'passed' : 'failed');
    set('cmi.core.lesson_location', 'quiz');
    commit();
    var r = document.getElementById('result');
    r.className = passed ? 'pass' : 'fail'; r.style.display = 'block';
    r.innerHTML = (passed ? '🎉 <strong>¡Aprobado!</strong> ' : '📚 <strong>Todavía no.</strong> ') + 'Has acertado ' + ok + ' de ' + Q.length + ' (' + score + ' %). ' +
      (passed ? '' : 'Repasa los apartados de las preguntas falladas y vuelve a intentarlo.') +
      (connected ? ' Tu nota se ha enviado a Moodle.' : ' (Sin LMS: la nota no se ha guardado.)');
    document.getElementById('retry').hidden = false;
    r.scrollIntoView({ block: 'center' });
  }
  document.getElementById('finish').addEventListener('click', finishQuiz);
  document.getElementById('retry').addEventListener('click', function () { render(); box.scrollIntoView(); });
  render();
})();
