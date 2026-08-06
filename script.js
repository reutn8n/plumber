document.querySelectorAll('.nav-toggle').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var nav = document.getElementById(btn.getAttribute('aria-controls'));
    if (!nav) return;
    var isOpen = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });
});

document.querySelectorAll('nav a').forEach(function (link) {
  link.addEventListener('click', function () {
    var nav = link.closest('nav');
    if (!nav) return;
    nav.classList.remove('open');
    var btn = document.querySelector('.nav-toggle[aria-controls="' + nav.id + '"]');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
});
