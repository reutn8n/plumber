const PAGE_LABELS = {
  '/': 'עמוד הבית',
  '/about.html': 'אודות יאיר',
  '/expertise.html': 'מומחיות ופרויקטים',
  '/blog.html': 'בלוג (עמוד ראשי)',
  '/leak-detection-thermal-camera.html': 'איתור נזילות במצלמה תרמית',
  '/unclogging-drains.html': 'פתיחת סתימות',
  '/faucets-toilets-repair.html': 'ברזים וניאגרות',
  '/water-pressure-issues.html': 'לחץ מים',
  '/renovation-plumbing.html': 'שיפוצים',
  '/emergency-plumbing.html': 'קריאות חירום',
  '/home-plumbing-inspection.html': 'בדק בית',
  '/nezila-nistara-simanim.html': 'מאמר: סימנים לנזילה נסתרת',
  '/stima-kiyor-ambatya.html': 'מאמר: סתימה בכיור ואמבטיה',
  '/laghatz-mayim-namuch-sibot.html': 'מאמר: לחץ מים נמוך',
  '/berez-notef-nyagera-rotza.html': 'מאמר: ברז נוטף וניאגרה רצה',
  '/bdika-instalatzia-lifney-kniyat-dira.html': 'מאמר: בדיקת אינסטלציה לפני קניית דירה',
};

const KNOWN_PAGES = Object.keys(PAGE_LABELS);

function pageLabel(path) {
  return PAGE_LABELS[path] || path;
}

module.exports = { PAGE_LABELS, KNOWN_PAGES, pageLabel };
