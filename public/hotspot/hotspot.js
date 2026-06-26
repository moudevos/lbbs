(function () {
  "use strict";

  // Archivo estático para MikroTik. Cambiar manualmente si el dominio final cambia.
  var HOTSPOT_API_URL = "https://labajaditabarberstudio.com/api/public/hotspot/visits";
  var DEFAULT_BRANCH_CODE = "SED-002";

  var form = document.getElementById("hotspot-data-form");
  var message = document.getElementById("hotspot-message");
  var button = document.getElementById("continueButton");
  var branchSelect = document.getElementById("branchCode");

  function cleanMikrotikValue(value) {
    if (!value || String(value).indexOf("$(") !== -1) return null;
    return String(value);
  }

  function setMessage(text, type) {
    message.textContent = text || "";
    message.className = "message" + (type ? " " + type : "");
  }

  function branchFromQuery() {
    var params = new URLSearchParams(window.location.search);
    return (params.get("branch") || params.get("branchCode") || "").toUpperCase();
  }

  function applyInitialBranch() {
    var branch = branchFromQuery() || DEFAULT_BRANCH_CODE;
    if (branch && branchSelect.querySelector('option[value="' + branch + '"]')) {
      branchSelect.value = branch;
    }
  }

  function submitMikrotik() {
    var mikrotikForm = document.getElementById("mikrotik-login-form");
    if (typeof window.submitMikrotikLogin === "function") {
      window.submitMikrotikLogin();
      return;
    }
    mikrotikForm.submit();
  }

  async function submitData(event) {
    event.preventDefault();
    setMessage("", "");

    var phone = document.getElementById("phone").value.replace(/\D/g, "");
    var payload = {
      branchCode: branchSelect.value,
      name: document.getElementById("name").value.trim(),
      phone: phone,
      acceptedTerms: document.getElementById("acceptedTerms").checked,
      acceptedMarketing: document.getElementById("acceptedMarketing").checked,
      source: "mikrotik_hotspot",
      mac: cleanMikrotikValue(window.MIKROTIK_CONTEXT && window.MIKROTIK_CONTEXT.mac),
      ip: cleanMikrotikValue(window.MIKROTIK_CONTEXT && window.MIKROTIK_CONTEXT.ip),
      username: cleanMikrotikValue(window.MIKROTIK_CONTEXT && window.MIKROTIK_CONTEXT.username),
      linkLoginOnly: cleanMikrotikValue(window.MIKROTIK_CONTEXT && window.MIKROTIK_CONTEXT.linkLoginOnly),
      linkOrig: cleanMikrotikValue(window.MIKROTIK_CONTEXT && window.MIKROTIK_CONTEXT.linkOrig),
      userAgent: navigator.userAgent
    };

    if (!payload.branchCode) return setMessage("Selecciona una sede.", "error");
    if (payload.name.length < 2) return setMessage("Ingresa tu nombre completo.", "error");
    if (!/^9\d{8}$/.test(phone)) return setMessage("Ingresa un WhatsApp peruano válido de 9 dígitos.", "error");
    if (!payload.acceptedTerms || !payload.acceptedMarketing) return setMessage("Acepta los términos y comunicaciones para continuar.", "error");

    button.disabled = true;
    button.textContent = "REGISTRANDO...";
    try {
      var response = await fetch(HOTSPOT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo registrar la visita.");
      }
      setMessage("Visita registrada. Conectando...", "ok");
      setTimeout(submitMikrotik, 600);
    } catch (error) {
      setMessage((error && error.message) || "No se pudo validar la visita. Solicita apoyo en recepción.", "error");
      button.disabled = false;
      button.textContent = "CONTINUAR";
    }
  }

  applyInitialBranch();
  form.addEventListener("submit", submitData);
})();
