// app.js — arranque de la aplicación

import { initTabDiario } from "./tabDiario.js";
import { initTabCostos } from "./tabCostos.js";
import { initTabProductos } from "./tabProductos.js";

function initTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");
    });
  });
}

function initOnlinePill() {
  const pill = document.getElementById("offline-pill");
  function update() {
    const online = navigator.onLine;
    pill.classList.add("show");
    pill.classList.toggle("offline", !online);
    pill.querySelector(".label").textContent = online ? "En línea" : "Sin conexión";
  }
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

function initInstallPrompt() {
  const btn = document.getElementById("install-btn");
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn.classList.add("show");
  });
  btn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.classList.remove("show");
  });
  window.addEventListener("appinstalled", () => btn.classList.remove("show"));
}

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      // Ruta relativa: funciona tanto en la raíz de un dominio como en un
      // subpath de GitHub Pages (https://usuario.github.io/repo/).
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.error("No se pudo registrar el service worker:", err);
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initOnlinePill();
  initInstallPrompt();
  initServiceWorker();
  initTabDiario();
  initTabCostos();
  initTabProductos();
});
