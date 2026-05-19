"use strict";

let activeItem = null;

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const modalBackdrop  = $('#modal-backdrop');
const modalTitle     = $('#modal-title');
const modalSubject   = $('#modal-subject');
const modalPreview   = $('#modal-preview');
const modalDesc      = $('#modal-desc');
const modalFileInfo  = $('#modal-file-info');
const downloadBtn    = $('#btn-download');
const toastContainer = $('#toast-container');
const gridNotes      = $('#grid-notes');
const gridAssignments= $('#grid-assignments');
const countNotes     = $('#count-notes');
const countAssignments = $('#count-assignments');

const TYPE_ICONS = { image: '🖼️', pdf: '📄', video: '🎬' };
const TYPE_LABELS = { image: 'Image', pdf: 'PDF', video: 'Video' };

function buildCard(item, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = `${index * 0.07}s`;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Open ${item.title}`);

  const icon = TYPE_ICONS[item.previewType] || '📁';
  const typeLabel = TYPE_LABELS[item.previewType] || item.previewType;

  card.innerHTML = `
    <div class="card-thumb-wrap">
      ${item.thumbnail
        ? `<img class="card-thumb" src="${item.thumbnail}" alt="${escHtml(item.title)}"
              loading="lazy" decoding="async"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
           <div class="card-thumb-placeholder" style="display:none">
             <span>${icon}</span>
             <p>No thumbnail</p>
           </div>`
        : `<div class="card-thumb-placeholder">
             <span>${icon}</span>
             <p>No thumbnail</p>
           </div>`
      }
      <div class="card-subject-badge">${escHtml(item.subject || 'Resource')}</div>
      <div class="card-type-badge">${icon} ${typeLabel}</div>
      <div class="card-thumb-overlay">
        <span class="overlay-tag">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Preview &amp; Download
        </span>
      </div>
    </div>
    <div class="card-body">
      <div class="card-title">${escHtml(item.title)}</div>
      <div class="card-desc">${escHtml(item.description)}</div>
    </div>
  `;

  card.addEventListener('click', () => openModal(item));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(item); });

  return card;
}

function renderSection(items, grid, countEl) {
  grid.innerHTML = '';
  if (!items || items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No resources yet</h3>
        <p>Add items in <code>data/resources.js</code> to see them here.</p>
      </div>`;
    if (countEl) countEl.textContent = '0';
    return;
  }
  items.forEach((item, i) => grid.appendChild(buildCard(item, i)));
  if (countEl) countEl.textContent = items.length;
}

function openModal(item) {
  activeItem = item;

  modalSubject.textContent = item.subject || 'Resource';
  modalTitle.textContent   = item.title;
  modalDesc.textContent    = item.description;
  modalFileInfo.innerHTML  = `File: <strong>${escHtml(item.downloadName || 'Unknown')}</strong>`;

  downloadBtn.disabled = false;
  downloadBtn.classList.remove('loading');
  downloadBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v12M8 11l4 4 4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"/>
    </svg>
    Download`;

  renderPreview(item);

  modalBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalBackdrop.focus();
}

function renderPreview(item) {
  modalPreview.innerHTML = '';

  if (!item.previewSrc) {
    showPreviewError('No preview source configured.');
    return;
  }

  if (item.previewType === 'pdf') {
    const src = item.previewSrc;
    const isLocal = !src.startsWith('http://') && !src.startsWith('https://');

    if (isLocal) {
      modalPreview.innerHTML = `
        <iframe
          src="${escAttr(src)}"
          title="PDF Preview"
          aria-label="PDF Preview of ${escHtml(item.title)}"
          type="application/pdf">
        </iframe>
        <p style="text-align:center;padding:.5rem;font-size:.78rem;color:var(--text-muted)">
          If the PDF doesn't show, use the download button below.
        </p>`;
    } else {
      const viewer = `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`;
      modalPreview.innerHTML = `
        <iframe
          src="${escAttr(viewer)}"
          title="PDF Preview"
          aria-label="PDF Preview of ${escHtml(item.title)}">
        </iframe>
        <p style="text-align:center;padding:.5rem;font-size:.78rem;color:var(--text-muted)">
          Powered by Google Docs Viewer. Download for full quality.
        </p>`;
    }

  } else if (item.previewType === 'image') {
    const img = document.createElement('img');
    img.alt = item.title;
    img.src = item.previewSrc;
    img.style.maxHeight = '460px';
    img.style.objectFit = 'contain';
    img.style.width = '100%';
    img.onerror = () => showPreviewError(
      `Could not load image.<br>Path: <code>${escHtml(item.previewSrc)}</code><br>Make sure the image is in the correct folder.`
    );
    modalPreview.appendChild(img);

  } else if (item.previewType === 'video') {
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = false;
    video.style.width = '100%';
    video.style.borderRadius = 'var(--radius)';

    const source = document.createElement('source');
    source.src = item.previewSrc;
    video.appendChild(source);

    video.onerror = () => showPreviewError(
      `Could not load video.<br>Path: <code>${escHtml(item.previewSrc)}</code>`
    );
    modalPreview.appendChild(video);

  } else {
    showPreviewError(`Unknown preview type: <strong>${escHtml(item.previewType)}</strong>`);
  }
}

function showPreviewError(msg) {
  modalPreview.innerHTML = `
    <div class="preview-error">
      <div class="preview-error-icon">⚠️</div>
      <p>${msg}</p>
    </div>`;
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  document.body.style.overflow = '';
  const video = modalPreview.querySelector('video');
  if (video) video.pause();
  const iframe = modalPreview.querySelector('iframe');
  if (iframe) iframe.src = '';
  setTimeout(() => { modalPreview.innerHTML = ''; }, 350);
  activeItem = null;
}

async function triggerDownload() {
  if (!activeItem || !activeItem.downloadFile) {
    showToast('⚠️', 'This file is not available right now.');
    return;
  }

  const url  = activeItem.downloadFile;
  const name = activeItem.downloadName || 'download';

  downloadBtn.classList.add('loading');
  downloadBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
         style="animation:spin .8s linear infinite">
      <circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/>
    </svg>
    Preparing…`;

  try {
    const isLocal = !url.startsWith('http://') && !url.startsWith('https://');

    if (isLocal) {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    }

    downloadBtn.classList.remove('loading');
    downloadBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      Downloaded!`;

    showToast('🎉', `<strong> Lal Salam Comrade !!!</strong>`);

  } catch (err) {
    downloadBtn.classList.remove('loading');
    downloadBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3v12M8 11l4 4 4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"/>
      </svg>
      Download`;
    showToast('⚠️', `Download failed. Try opening the file directly.`);
    console.error('Download error:', err);
  }
}

function showToast(icon, html) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span> ${html}`;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 4500);
}

function showSection(name) {
  $$('.section').forEach(s => s.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.getElementById(`tab-${name}`).classList.add('active');
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escAttr(str) { return escHtml(str); }

modalBackdrop.addEventListener('click', e => {
  if (e.target === modalBackdrop) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) closeModal();
});

downloadBtn.addEventListener('click', triggerDownload);

(function init() {
  if (typeof RESOURCES === 'undefined') {
    console.error('RESOURCES not loaded. Make sure data/resources.js is included before app.js');
    return;
  }

  renderSection(RESOURCES.notes,       gridNotes,       countNotes);
  renderSection(RESOURCES.assignments, gridAssignments, countAssignments);

  const yrEl = document.getElementById('footer-year');
  if (yrEl) yrEl.textContent = new Date().getFullYear();
})();

const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
