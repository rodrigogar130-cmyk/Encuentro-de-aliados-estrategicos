const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzXpB0cj2a7BR3ZMQ1H7ZOU3Z5D3xrEBMiqUydedPki0mIR8idwBAZubz8INsjyR43M/exec';
const ENABLE_PUBLIC_REGISTRATION = true;

const form = document.getElementById('rsvpForm');
const formShell = document.getElementById('formContent');
const successState = document.getElementById('success');
const msg = document.getElementById('formMessage');
const btn = document.getElementById('sendBtn');
const submitLabel = document.querySelector('#sendBtn span:first-child');
const folio = document.getElementById('folioCode');

const isGitHubPages = window.location.hostname.endsWith('.github.io');
const appsScriptReady = ENABLE_PUBLIC_REGISTRATION &&
  /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec(?:\?.*)?$/.test(APPS_SCRIPT_WEB_APP_URL);

const fields = ['nombre', 'apellidos', 'empresa', 'cargo', 'sector', 'correo'];

function getField(name) {
  return form.elements.namedItem(name);
}

function setFieldError(name, message) {
  const input = getField(name);
  const error = document.getElementById(`${name}-error`);
  if (input instanceof RadioNodeList) {
    [...input].forEach((node) => node.setAttribute('aria-invalid', String(Boolean(message))));
  } else if (input) {
    input.setAttribute('aria-invalid', String(Boolean(message)));
  }
  if (error) error.textContent = message || '';
}

function fieldIsValid(name) {
  const input = getField(name);
  return input && String(input.value || '').trim().length > 0;
}

function validateForm() {
  let valid = true;
  fields.forEach((name) => {
    const input = getField(name);
    const label = input?.closest('.field')?.querySelector('label')?.textContent?.replace('*', '').trim() || name;
    if (!fieldIsValid(name)) {
      setFieldError(name, `Ingresa ${label.toLowerCase()}.`);
      valid = false;
    } else {
      setFieldError(name, '');
    }
  });

  const email = String(getField('correo')?.value || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    setFieldError('correo', 'Ingresa un correo electrónico válido.');
    valid = false;
  }

  const phone = String(getField('telefono')?.value || '').trim();
  if (phone && !/^[\d\s()+.\-]{7,25}$/.test(phone)) {
    setFieldError('telefono', 'Ingresa un teléfono válido o déjalo vacío.');
    valid = false;
  } else {
    setFieldError('telefono', '');
  }

  const confirmation = getField('confirmacion');
  if (!confirmation || ![...confirmation].some((option) => option.checked)) {
    setFieldError('confirmacion', 'Selecciona una opción de asistencia.');
    valid = false;
  } else {
    setFieldError('confirmacion', '');
  }

  const privacy = getField('privacidad');
  if (!privacy?.checked) {
    setFieldError('privacidad', 'Debes aceptar el aviso de privacidad para continuar.');
    valid = false;
  } else {
    setFieldError('privacidad', '');
  }

  return valid;
}

function setLoading(loading, label) {
  btn.disabled = loading;
  btn.classList.toggle('is-loading', loading);
  submitLabel.textContent = label;
}

function showMessage(text) {
  msg.textContent = text;
  msg.hidden = false;
}

function clearMessage() {
  msg.textContent = '';
  msg.hidden = true;
}

function showSuccess(recordFolio) {
  folio.textContent = recordFolio;
  formShell.hidden = true;
  successState.hidden = false;
  successState.setAttribute('tabindex', '-1');
  successState.focus();
}

form.addEventListener('input', (event) => {
  const target = event.target;
  if (target.name) setFieldError(target.name, '');
  clearMessage();
});

form.addEventListener('change', (event) => {
  const target = event.target;
  if (target.name) setFieldError(target.name, '');
  clearMessage();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  if (!validateForm()) {
    showMessage('Revisa los campos marcados antes de enviar tu respuesta.');
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  if (isGitHubPages) {
    if (!appsScriptReady) {
      showMessage('La recepción de registros requiere configuración por parte del equipo organizador.');
      return;
    }

    setLoading(true, 'Enviando confirmación…');
    form.action = APPS_SCRIPT_WEB_APP_URL;
    form.method = 'POST';
    form.enctype = 'application/x-www-form-urlencoded';
    form.submit();
    return;
  }

  setLoading(true, 'Guardando respuesta…');
  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.privacidad = Boolean(form.elements.privacidad.checked);

    const response = await fetch('/api/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const output = await response.json();

    if (!response.ok || !output.ok || !output.folio) {
      throw new Error(output.message || 'No pudimos registrar tu respuesta.');
    }

    showSuccess(output.folio);
  } catch (error) {
    showMessage(error.message || 'No pudimos registrar tu respuesta. Intenta nuevamente.');
    setLoading(false, 'Confirmar asistencia');
  }
});
