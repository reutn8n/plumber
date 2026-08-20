(function trackPageview() {
  try {
    var sid = sessionStorage.getItem('sid');
    if (!sid) {
      sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('sid', sid);
    }
    var isNew = !localStorage.getItem('visited');
    if (isNew) localStorage.setItem('visited', '1');

    var w = window.innerWidth;
    var device = w < 700 ? 'mobile' : w < 960 ? 'tablet' : 'desktop';

    fetch('/.netlify/functions/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: location.pathname,
        referrer: document.referrer || null,
        device: device,
        isNew: isNew,
        sid: sid,
      }),
      keepalive: true,
    }).catch(function () {});

    trackScrollDepth(sid);
  } catch (err) {}
})();

// Records how far down the page each visitor actually gets, so we can see where
// people give up rather than only that they left.
function trackScrollDepth(sid) {
  var milestones = [25, 50, 75, 100];
  var sent = {};

  function check() {
    var docHeight = document.body.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var pct = ((window.scrollY / docHeight) * 100);

    for (var i = 0; i < milestones.length; i++) {
      var m = milestones[i];
      if (pct >= m && !sent[m]) {
        sent[m] = true;
        fetch('/.netlify/functions/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: location.pathname, depth: m, sid: sid }),
          keepalive: true,
        }).catch(function () {});
      }
    }
    if (sent[100]) window.removeEventListener('scroll', onScroll);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    setTimeout(function () { ticking = false; check(); }, 300);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

// Invitation to call — held back until the visitor shows interest, so it reads
// as an offer rather than an interruption (and stays clear of Google's
// intrusive-interstitial penalty, which applies to popups on immediate load).
(function callInvite() {
  var WA_URL = 'https://api.whatsapp.com/send/?phone=972525005580&text=%D7%A9%D7%9C%D7%95%D7%9D%2C+%D7%90%D7%A9%D7%9E%D7%97+%D7%9C%D7%A7%D7%91%D7%9C+%D7%94%D7%A6%D7%A2%D7%AA+%D7%9E%D7%97%D7%99%D7%A8+%D7%9C%D7%A2%D7%91%D7%95%D7%93%D7%AA+%D7%90%D7%99%D7%A0%D7%A1%D7%98%D7%9C%D7%A6%D7%99%D7%94&type=phone_number&app_absent=0';

  try {
    if (sessionStorage.getItem('invite-dismissed')) return;
  } catch (err) { return; }

  var overlay = document.createElement('div');
  overlay.className = 'invite-overlay';
  overlay.innerHTML =
    '<div class="invite" role="dialog" aria-modal="true" aria-labelledby="invite-title">' +
      '<button class="invite-close" type="button" aria-label="סגירה">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<h2 id="invite-title">התקשרו עכשיו</h2>' +
      '<p>ללא התחייבות מצידכם — שיחה קצרה עם יאיר ותדעו בדיוק במה מדובר.</p>' +
      '<div class="invite-actions">' +
        '<a class="btn btn-amber" href="tel:0525005580">052-5005580</a>' +
        '<a class="btn btn-wa" href="' + WA_URL + '">שליחת הודעה בוואטסאפ</a>' +
      '</div>' +
      '<span class="invite-note">מענה אישי של יאיר · ללא מוקד וללא המתנה</span>' +
    '</div>';

  var shown = false;
  var timer;

  function dismiss() {
    overlay.classList.remove('is-open');
    try { sessionStorage.setItem('invite-dismissed', '1'); } catch (err) {}
    document.removeEventListener('keydown', onKey);
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
  }

  function onKey(e) {
    if (e.key === 'Escape') dismiss();
  }

  function show() {
    if (shown) return;
    shown = true;
    clearTimeout(timer);
    window.removeEventListener('scroll', onScroll);
    document.body.appendChild(overlay);
    // force a reflow so the transition runs from the starting state; rAF would
    // be throttled in a background tab and could leave this stuck invisible
    void overlay.offsetHeight;
    overlay.classList.add('is-open');
    document.addEventListener('keydown', onKey);
    var closeBtn = overlay.querySelector('.invite-close');
    closeBtn.addEventListener('click', dismiss);
    closeBtn.focus();
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) dismiss();
    });
    // choosing to call or message counts as answering the invitation
    overlay.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', dismiss);
    });
  }

  function onScroll() {
    // require real scrolling, not just a short page where the first screen
    // already covers a third of the document
    if (window.scrollY < 240) return;
    if ((window.scrollY + window.innerHeight) / document.body.scrollHeight > 0.33) show();
  }

  timer = setTimeout(show, 7000);
  window.addEventListener('scroll', onScroll, { passive: true });
})();

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
