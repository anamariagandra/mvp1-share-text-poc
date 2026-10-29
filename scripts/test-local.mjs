import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createStaticServer } from "./serve-local.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath));
const manifest = JSON.parse(read("manifest.webmanifest"));

assert.equal(manifest.share_target.method, "GET");
assert.equal(manifest.share_target.params.text, "text");
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.equal(manifest.share_target.action, "./");
console.log("PASS: manifesto declara destino GET de texto e caminhos relativos.");

const projectBase = "https://example.github.io/poc/";
assert.equal(new URL(manifest.start_url, projectBase + "manifest.webmanifest").href, projectBase);
assert.equal(new URL(manifest.scope, projectBase + "manifest.webmanifest").href, projectBase);
assert.equal(new URL(manifest.share_target.action, projectBase + "manifest.webmanifest").href, projectBase);
console.log("PASS: start_url, scope e action resolvem dentro do caminho de projeto GitHub Pages.");

for (const relativePath of [
  "index.html", "app.js", "sw.js", "styles.css", "manifest.webmanifest",
  "icons/app.svg", "icons/app-192.png", "icons/app-512.png"
]) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `arquivo ausente: ${relativePath}`);
}

for (const [relativePath, expectedSize] of [["icons/app-192.png", 192], ["icons/app-512.png", 512]]) {
  const png = read(relativePath);
  assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a", `${relativePath} não é PNG`);
  assert.equal(png.readUInt32BE(16), expectedSize, `${relativePath}: largura inesperada`);
  assert.equal(png.readUInt32BE(20), expectedSize, `${relativePath}: altura inesperada`);
}
console.log("PASS: arquivos referenciados existem; ícones PNG têm 192x192 e 512x512.");

const appSource = read("app.js").toString("utf8");
function loadApp(href) {
  const elements = {
    "#status": { textContent: "" },
    "#shared-text": { textContent: "" },
    "#clear-button": {
      hidden: true,
      addEventListener(type, callback) {
        assert.equal(type, "click");
        this.onClick = callback;
      }
    }
  };
  const window = {
    location: { href },
    history: {
      replaceState(_state, _title, url) {
        this.replacedUrl = String(url);
      }
    }
  };

  vm.runInNewContext(appSource, {
    document: { querySelector: (selector) => elements[selector] },
    window,
    navigator: {},
    URL
  });
  return { elements, window };
}

const sample = "Olá, mãe! ✨\nPontuação:?!";
const received = loadApp(`https://example.test/?text=${encodeURIComponent(sample)}`);
assert.equal(received.elements["#shared-text"].textContent, sample);
assert.equal(received.elements["#clear-button"].hidden, false);
console.log("PASS: lógica da interface preserva acentos, emoji, pontuação e quebra de linha.");

for (const query of ["", "?text=", "?text=%20%20"]) {
  const invalid = loadApp(`https://example.test/${query}`);
  assert.match(invalid.elements["#status"].textContent, /Nenhum texto válido/);
  assert.equal(invalid.elements["#shared-text"].textContent, "");
}
console.log("PASS: texto ausente, vazio ou só com espaços recebe orientação.");

const markupLike = loadApp("https://example.test/?text=%3Cimg%20src%3Dx%3E");
assert.equal(markupLike.elements["#shared-text"].textContent, "<img src=x>");
console.log("PASS: conteúdo semelhante a HTML é tratado como texto (textContent).");

received.elements["#clear-button"].onClick();
assert.equal(received.elements["#shared-text"].textContent, "");
assert.equal(received.elements["#clear-button"].hidden, true);
assert.equal(new URL(received.window.history.replacedUrl).search, "");
console.log("PASS: limpar apaga a tela e remove os parâmetros da URL atual.");

const serviceWorker = read("sw.js").toString("utf8");
assert.match(serviceWorker, /key\.startsWith\("share-text-poc-"\)/);
assert.match(serviceWorker, /caches\.open\(CACHE_NAME\)/);
assert.match(serviceWorker, /if \(requestUrl\.search\)/);
console.log("PASS: revisão estática confirma limpeza isolada do cache e bypass de URL com consulta.");

const server = createStaticServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  for (const [route, expectedType] of [
    ["/", "text/html; charset=utf-8"],
    ["/manifest.webmanifest", "application/manifest+json"],
    ["/sw.js", "text/javascript; charset=utf-8"],
    ["/styles.css", "text/css; charset=utf-8"],
    ["/icons/app-192.png", "image/png"],
    ["/icons/app-512.png", "image/png"],
    ["/icons/app.svg", "image/svg+xml"]
  ]) {
    const response = await fetch(baseUrl + route);
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get("content-type"), expectedType, route);
    assert.ok((await response.arrayBuffer()).byteLength > 0, route);
  }
  const sharedRoute = await fetch(`${baseUrl}/?text=Teste%20local`);
  assert.equal(sharedRoute.status, 200);
  assert.match(sharedRoute.headers.get("content-type"), /text\/html/);
  const rejectedMethod = await fetch(baseUrl, { method: "POST" });
  assert.equal(rejectedMethod.status, 405);
  console.log("PASS: servidor local serve rotas, tipos MIME e GET com query; rejeita POST (405).");
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log("\nVerificações locais concluídas. Elas não simulam instalação nem o seletor Android/WhatsApp.");
