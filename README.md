# POC — compartilhamento de texto para PWA

Aplicação estática mínima para investigar se uma PWA instalada no Android aparece como destino ao compartilhar texto pelo WhatsApp. Não inclui IA, áudio, histórico, backend ou armazenamento de mensagens.

## Como o recebimento funciona

O manifesto declara `share_target` com `method: "GET"` e mapeia o campo de texto compartilhado para o parâmetro `text`. O navegador abre a aplicação com uma URL semelhante a `/?text=mensagem`. `URLSearchParams` decodifica o valor, e a interface o exibe usando `textContent` com quebras de linha preservadas. A aplicação não grava mensagens em armazenamento local ou remoto. O botão **Limpar texto** apaga a tela e remove a consulta da URL atual.

O método GET é previsto para texto, título e URL simples no Web Share Target API. O manifesto desta POC aceita somente texto. A especificação não define um limite universal de caracteres para o parâmetro; limites práticos podem variar entre o Android, navegador e sistema que constrói ou abre a URL. Textos longos podem ser truncados ou recusados. O texto na URL pode ficar visível no histórico, em capturas de tela ou em registros técnicos; use somente mensagens fictícias. Limpar a URL da tela reduz exposição posterior, mas não apaga cópias que possam ter sido registradas antes.

## Arquivos

- `index.html`, `styles.css`, `app.js`: tela, estilos e leitura do conteúdo recebido.
- `manifest.webmanifest`: metadados de instalação e destino de compartilhamento.
- `sw.js`: cache apenas dos arquivos estáticos da aplicação; URLs com conteúdo compartilhado não são adicionadas ao cache.
- `icons/app-192.png`, `icons/app-512.png` e `icons/app.svg`: ícones da instalação e favicon vetorial. Os tamanhos PNG 192×192 e 512×512 atendem aos requisitos de ícone recomendados para instalação no Chromium.

## Executar e verificar localmente

Requer Node.js 18 ou superior, sem dependências npm. O comando `node` precisa estar disponível no `PATH` do terminal. Na pasta do projeto, execute o verificador:

```powershell
node --version
node --check app.js
node --check sw.js
node --check scripts/test-local.mjs
node --check scripts/serve-local.mjs
node scripts/test-local.mjs
```

O script verifica o formato do manifesto e seus caminhos relativos, a presença e dimensões dos ícones, a lógica de leitura/limpeza com DOM simulado, o uso de `textContent`, além de iniciar um servidor HTTP temporário para verificar rotas, MIME types, consulta GET e rejeição de POST. Isso testa código e arquivos localmente; o DOM simulado não substitui uma inspeção visual num navegador.

Para abrir a aplicação no navegador e observar a tela, inicie o servidor estático local:

```powershell
node scripts/serve-local.mjs
```

Abra `http://127.0.0.1:8000/` e depois `http://127.0.0.1:8000/?text=Ol%C3%A1%2C%20mundo%21%0ALinha%202%20%F0%9F%91%8B`. Verifique o texto, a quebra de linha, o estado sem conteúdo e o botão **Limpar texto**. Encerre o servidor com `Ctrl+C`. A instalação e o destino de compartilhamento devem ser verificados após publicar em HTTPS; localhost no computador não valida o WhatsApp no Android.

## Publicar no GitHub Pages

1. Antes de tornar público, revise todos os arquivos e o histórico Git que será enviado. Não publique dados pessoais, tokens, senhas, chaves, arquivos privados ou mensagens reais. Um repositório público e o site publicado ficam acessíveis pela internet. O nome e e-mail usados como autor dos commits também ficam visíveis; considere usar o e-mail noreply do GitHub. Remover um segredo em commit posterior não apaga sua cópia do histórico.
2. Crie ou selecione um repositório público no GitHub. Para o primeiro push deste repositório local, crie o remoto vazio, sem README, licença, `.gitignore` ou outros arquivos iniciais. Se o remoto já tiver commits próprios, será necessário sincronizar os históricos antes do primeiro push. Esta POC não cria repositório nem serviço.
3. Confira o que entrará no primeiro commit antes de adicioná-lo:

   ```powershell
   git status --short
   git add README.md app.js index.html manifest.webmanifest scripts/serve-local.mjs scripts/test-local.mjs styles.css sw.js icons/
   git status --short
   ```

   Revise a lista. Somente depois da sua aprovação, faça o commit e configure o remoto com a URL do repositório que você criou:

   ```powershell
   git commit -m "Add text sharing PWA proof of concept"
   git remote add origin https://github.com/OWNER/REPOSITORY.git
   git push -u origin master
   ```

   Substitua `OWNER/REPOSITORY` pela URL real e confirme que `master` é a branch escolhida. Estes comandos são instruções para publicação futura; não foram executados.
4. No GitHub, abra **Settings → Pages**. Em **Build and deployment**, escolha **Deploy from a branch**, selecione `master` e `/(root)`, e salve.
5. Aguarde a publicação e abra a URL mostrada em Pages. Confirme HTTPS antes de instalar no Android.
6. Atualizações enviadas à branch selecionada serão publicadas pelo Pages.

### Caminho do site de projeto

Um site de projeto costuma ser servido em um caminho como `https://usuario.github.io/nome-do-repositorio/`, em vez da raiz do domínio. O manifesto usa `start_url`, `scope` e `share_target.action` relativos (`./`), e HTML, ícone e service worker também usam caminhos relativos. Isso mantém os caminhos dentro do diretório do projeto, sem codificar o nome do repositório. A instalação deve começar pela URL com `/nome-do-repositorio/`; o service worker fica no mesmo diretório e seu escopo é limitado a ele. Não mova o service worker para uma subpasta sem rever seu escopo.

## Roteiro de verificação

### Verificação local (não valida o Android)

- Servir por `localhost` e conferir interface responsiva.
- Abrir URL de exemplo com acentos, emoji, pontuação e quebra de linha; confirmar que o conteúdo é exibido sem alteração visível.
- Abrir sem parâmetro, com `?text=` e com somente espaços; confirmar orientação de conteúdo ausente/inválido.
- Acionar **Limpar texto**; confirmar tela limpa e remoção do parâmetro da URL.
- Abrir uma segunda URL com outro texto; confirmar que só o novo valor aparece.
- Conferir no painel de aplicação do navegador se o service worker foi registrado e os recursos estáticos foram carregados.

### Verificação após publicação e instalação

- Confirmar HTTPS e abrir a URL no Chrome do aparelho Android.
- Instalar a PWA pelo menu do navegador e abrir pelo ícone instalado.
- No WhatsApp, enviar/usar uma mensagem fictícia e escolher Compartilhar. Verificar primeiro se a PWA aparece no seletor do Android.
- Se aparecer, selecionar a PWA e conferir texto, acentos, emojis, pontuação e quebras de linha.
- Compartilhar outra mensagem e confirmar que a tela mostra apenas a nova.
- Testar conteúdo vazio ou incompatível, se o app de origem permitir, e registrar a orientação exibida ou o comportamento observado.
- Repetir uma vez após fechar e reabrir a PWA. Registrar navegador, versão do Android, modelo do aparelho, resultado e observações.

Só os resultados observados no aparelho poderão validar instalação, presença no seletor, transmissão real pelo WhatsApp e preservação do conteúdo nesse fluxo. Os testes de código e servidor descritos nesta seção não simulam o seletor nativo nem o comportamento do WhatsApp.

## Estado dos critérios de aceitação

| Critério | Status atual | Evidência |
|---|---|---|
| Sintaxe, manifesto, referências e ícones | Aprovado localmente | `node --check` e `node scripts/test-local.mjs` concluídos sem erro. |
| Leitura, conteúdo vazio, limpeza e texto tratado como texto | Aprovado em simulação local | Verificações do `scripts/test-local.mjs` com DOM simulado; não é teste em navegador real. |
| Rotas HTTP, tipos MIME, GET com consulta e rejeição de POST | Aprovado localmente | Servidor temporário exercitado pelo `scripts/test-local.mjs`. |
| Conferência visual manual no navegador local | Aprovado localmente | Realizada no Chrome com simulação responsiva de 400 × 608 px; isso não valida o compartilhamento real no Android. |
| Instalação no Android | Não testado | Ainda não publicado no GitHub Pages nem instalado no aparelho. |
| PWA aparece como destino no WhatsApp | Não testado | Depende de publicação, instalação e observação no seletor Android. |
| Texto chega pelo WhatsApp e preserva caracteres no aparelho | Não testado | Exige compartilhamento observado no Android real. |
| Segunda mensagem substitui a anterior no fluxo Android | Não testado | Exige duas mensagens compartilhadas no aparelho. |
| Procedimento de publicação e teste documentado | Aprovado como documentação | Passos locais e futuros de publicação/Android estão descritos neste README. |

## Limitações conhecidas

- Suporte ao Web Share Target e a inclusão da PWA no seletor dependem do navegador, da instalação e do app que compartilha. A compatibilidade com WhatsApp não está confirmada.
- A POC recebe apenas um campo de texto via GET. Não recebe nem processa áudio, imagens ou arquivos.
- Não há tamanho máximo universal documentado para a mensagem; o tamanho efetivo precisa ser observado no dispositivo.
- O texto passa temporariamente pela URL e pelo DOM. O service worker não o grava no cache, e a aplicação não o persiste, mas não pode controlar registros do navegador ou da plataforma.
- A publicação pública do GitHub Pages torna o código e o site acessíveis a qualquer pessoa.
