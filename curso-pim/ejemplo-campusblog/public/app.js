const lista = document.querySelector('#lista');
const vacio = document.querySelector('#vacio');

async function cargar(q = '') {
    const res = await fetch(`/api/posts?limit=6&q=${encodeURIComponent(q)}`);
    const { items } = await res.json();
    lista.replaceChildren(
        ...items.map((p) => {
            const li = document.createElement('li');
            li.className = 'rounded-lg border border-slate-300 bg-white p-4 shadow-sm';
            const h2 = document.createElement('h2');
            h2.className = 'mb-1 text-lg font-semibold';
            h2.textContent = p.title; // textContent, nunca innerHTML con datos del usuario (XSS)
            const meta = document.createElement('p');
            meta.className = 'text-sm text-slate-700';
            meta.textContent = `Por ${p.author} · ${p.createdAt.slice(0, 10)}`;
            li.append(h2, meta);
            return li;
        }),
    );
    vacio.classList.toggle('hidden', items.length > 0);
}

document.querySelector('#buscador').addEventListener('submit', (e) => {
    e.preventDefault();
    cargar(new FormData(e.target).get('q') ?? '');
});
cargar();
