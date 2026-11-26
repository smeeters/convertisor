/* Icônes par type de token (tracés simples, trait 2 px) + logo provisoire. */
'use strict';
const TYPES = {
  borderRadius: { label: 'Rayon', svg: '<path d="M5 20V12a7 7 0 0 1 7-7h8"/>' },
  spacing: { label: 'Espacement', svg: '<path d="M4 5v14M20 5v14M8 12h8M10 10l-2 2 2 2M14 10l2 2-2 2"/>' },
  sizing: { label: 'Taille', svg: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M9 15l6-6M11 9h4v4"/>' },
  dimension: { label: 'Dimension', svg: '<rect x="3" y="9" width="18" height="6" rx="1"/><path d="M7 9v3M11 9v2M15 9v3M19 9v2"/>' },
  borderWidth: { label: 'Épaisseur de trait', svg: '<path d="M4 6h16" stroke-width="1"/><path d="M4 12h16" stroke-width="2.5"/><path d="M4 18.5h16" stroke-width="4"/>' },
  fontSizes: { label: 'Taille de police', svg: '<path d="M3 19l5-12 5 12M5 14h6M15 19l3-7 3 7M16 17h4"/>' },
  letterSpacing: { label: 'Interlettrage', svg: '<path d="M3 5v14M21 5v14M8 17l4-10 4 10M9.5 13h5"/>' },
  typography: { label: 'Typographie', svg: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>' },
};
function icType(type) {
  const t = TYPES[type];
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${t ? t.svg : ''}</svg>`;
}
const LOGO = `<svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
<rect x="4" y="14" width="22" height="22" rx="5" fill="none" stroke="#FFF487" stroke-width="3"/>
<rect x="22" y="8" width="22" height="30" rx="7" fill="none" stroke="#EEEBF5" stroke-width="3"/>
</svg>`;
