function notify(type, extra) {
  try {
    fetch('/.netlify/functions/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ type: type, page: location.pathname }, extra)),
      keepalive: true,
    }).catch(function () {});
  } catch (err) {}
}

document.addEventListener('click', function (e) {
  var link = e.target.closest('a');
  if (!link) return;

  var href = link.getAttribute('href') || '';
  if (href.indexOf('tel:') === 0) {
    if (typeof gtag === 'function') gtag('event', 'phone_click', { link_url: href });
    notify('phone_click');
  } else if (href.indexOf('wa.me') !== -1 || href.indexOf('api.whatsapp.com') !== -1) {
    if (typeof gtag === 'function') gtag('event', 'whatsapp_click', { link_url: href });
    notify('whatsapp_click');
  }
});

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

var leadForm = document.getElementById('leadForm');
if (leadForm) {
  leadForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('lf-name').value.trim();
    var phone = document.getElementById('lf-phone').value.trim();
    var issue = document.getElementById('lf-issue').value.trim();
    if (!name || !phone) return;

    var message = 'שלום, שמי ' + name + ' (טלפון ליצירת קשר: ' + phone + ').';
    if (issue) {
      message += ' תיאור התקלה: ' + issue;
    } else {
      message += ' אשמח לתיאום ביקור.';
    }

    var url = 'https://api.whatsapp.com/send/?phone=972525005580&text=' + encodeURIComponent(message) + '&type=phone_number&app_absent=0';

    if (typeof gtag === 'function') {
      gtag('event', 'generate_lead', { method: 'contact_form' });
    }
    notify('generate_lead', { name: name, phone: phone, issue: issue });

    window.open(url, '_blank', 'noopener');
  });
}
