const statusElement = document.querySelector("#status");
const textElement = document.querySelector("#shared-text");
const clearButton = document.querySelector("#clear-button");

function clearSharedText({ updateUrl = true } = {}) {
  textElement.textContent = "";
  clearButton.hidden = true;
  statusElement.textContent = "Aguardando conteúdo compartilhado.";

  if (updateUrl) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.search = "";
    cleanUrl.hash = "";
    window.history.replaceState({}, "", cleanUrl);
  }
}

function showSharedText() {
  const sharedText = new URL(window.location.href).searchParams.get("text");

  if (sharedText === null || sharedText.trim().length === 0) {
    statusElement.textContent = "Nenhum texto válido foi recebido. Compartilhe uma mensagem de texto para testar.";
    return;
  }

  textElement.textContent = sharedText;
  clearButton.hidden = false;
  statusElement.textContent = "Texto recebido. Ele fica somente nesta tela enquanto a página estiver aberta.";
}

clearButton.addEventListener("click", () => clearSharedText());
showSharedText();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {
      // A interface ainda funciona quando o navegador não permite instalar o service worker.
    });
  });
}
