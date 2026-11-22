"use strict";

/* ==========================================================
   Banco de Perguntas Pessoais
   Armazenamento: localStorage, chave "bank_questions"
   ========================================================== */

const STORAGE_KEY = "bank_questions";
const CATEGORIAS = ["Geral", "Estudos", "Programação", "Ciências", "Línguas", "Outra"];

/* ---------- Estado ---------- */
let perguntas = [];        // todas as perguntas
let filtroAtual = "Todas"; // filtro da aba "Todas as perguntas"
let ordemTeste = [];       // ids pela ordem do modo de teste
let indiceTeste = 0;       // pergunta atual no modo de teste
let temporizadorMsg = null;

/* ---------- Atalhos DOM ---------- */
const $ = (id) => document.getElementById(id);
const form = $("form-pergunta");

/* ==========================================================
   Armazenamento
   ========================================================== */
function carregar() {
  try {
    const dados = JSON.parse(localStorage.getItem(STORAGE_KEY));
    perguntas = Array.isArray(dados) ? dados : [];
  } catch (erro) {
    console.error("Erro ao ler localStorage:", erro);
    perguntas = [];
    mostrarMensagem("Não foi possível ler os dados guardados.", true);
  }
}

function guardar() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perguntas));
  } catch (erro) {
    console.error("Erro ao gravar localStorage:", erro);
    mostrarMensagem("Não foi possível guardar os dados.", true);
  }
}

/* ==========================================================
   Mensagens
   ========================================================== */
function mostrarMensagem(texto, ehErro = false) {
  const el = $("mensagem");
  el.textContent = texto;
  el.classList.toggle("erro-msg", ehErro);
  el.hidden = false;
  clearTimeout(temporizadorMsg);
  temporizadorMsg = setTimeout(() => { el.hidden = true; }, 3000);
}

/* ==========================================================
   Navegação por abas
   ========================================================== */
function mostrarAba(nome) {
  document.querySelectorAll(".tab").forEach((botao) => {
    const ativa = botao.dataset.tab === nome;
    botao.classList.toggle("active", ativa);
    botao.setAttribute("aria-selected", ativa);
  });
  document.querySelectorAll(".painel").forEach((painel) => {
    painel.classList.toggle("active", painel.id === nome);
  });
  if (nome === "teste") iniciarTeste();
  if (nome === "lista") renderLista();
}

/* ==========================================================
   Preencher selects de categoria
   ========================================================== */
function preencherCategorias() {
  const selForm = $("categoria");
  selForm.innerHTML = "";
  const opcaoVazia = new Option("Escolhe uma categoria", "");
  selForm.add(opcaoVazia);
  CATEGORIAS.forEach((c) => selForm.add(new Option(c, c)));

  const selFiltro = $("filtro-categoria");
  selFiltro.innerHTML = "";
  selFiltro.add(new Option("Todas", "Todas"));
  CATEGORIAS.forEach((c) => selFiltro.add(new Option(c, c)));
}

/* ==========================================================
   Validação do formulário
   ========================================================== */
function limparErros() {
  ["pergunta", "resposta", "categoria"].forEach((campo) => {
    $("erro-" + campo).textContent = "";
    $(campo).classList.remove("invalido");
  });
}

function marcarErro(campo, texto) {
  $("erro-" + campo).textContent = texto;
  $(campo).classList.add("invalido");
}

function validar(dados) {
  limparErros();
  let valido = true;
  if (dados.pergunta.length < 3) { marcarErro("pergunta", "Escreve a pergunta (mínimo 3 caracteres)."); valido = false; }
  if (dados.resposta === "")     { marcarErro("resposta", "Escreve a resposta."); valido = false; }
  if (!CATEGORIAS.includes(dados.categoria)) { marcarErro("categoria", "Escolhe uma categoria."); valido = false; }
  return valido;
}

/* ==========================================================
   CRUD
   ========================================================== */
// CREATE e UPDATE (mesmo formulário)
function aoSubmeter(evento) {
  evento.preventDefault();
  const dados = {
    pergunta: $("pergunta").value.trim(),
    resposta: $("resposta").value.trim(),
    categoria: $("categoria").value,
  };
  if (!validar(dados)) return;

  const id = $("pergunta-id").value;
  if (id) {
    const alvo = perguntas.find((p) => p.id === Number(id));
    if (alvo) Object.assign(alvo, dados);
    mostrarMensagem("Pergunta atualizada.");
  } else {
    perguntas.push({ id: Date.now(), ...dados });
    mostrarMensagem("Pergunta guardada.");
  }
  guardar();
  sairModoEdicao();
  mostrarAba("lista");
}

// UPDATE: carregar dados no formulário
function editar(id) {
  const p = perguntas.find((item) => item.id === id);
  if (!p) return;
  $("pergunta-id").value = p.id;
  $("pergunta").value = p.pergunta;
  $("resposta").value = p.resposta;
  $("categoria").value = p.categoria;
  $("titulo-form").textContent = "Editar pergunta";
  $("btn-guardar").textContent = "Guardar alterações";
  $("btn-cancelar").hidden = false;
  limparErros();
  mostrarAba("adicionar");
  $("pergunta").focus();
}

function sairModoEdicao() {
  form.reset();
  $("pergunta-id").value = "";
  $("titulo-form").textContent = "Adicionar pergunta";
  $("btn-guardar").textContent = "Guardar pergunta";
  $("btn-cancelar").hidden = true;
  limparErros();
}

// DELETE
function eliminar(id) {
  if (!confirm("Tens a certeza de que queres eliminar esta pergunta?")) return;
  perguntas = perguntas.filter((p) => p.id !== id);
  guardar();
  renderLista();
  mostrarMensagem("Pergunta eliminada.");
}

/* ==========================================================
   READ: renderizar a lista (com filtro por categoria)
   ========================================================== */
function criarBotao(texto, classe, acao, id) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn " + classe;
  b.textContent = texto;
  b.dataset.acao = acao;
  b.dataset.id = id;
  return b;
}

function renderLista() {
  const ul = $("lista-perguntas");
  ul.innerHTML = "";

  const visiveis = filtroAtual === "Todas"
    ? perguntas
    : perguntas.filter((p) => p.categoria === filtroAtual);

  if (visiveis.length === 0) {
    const li = document.createElement("li");
    li.className = "vazio";
    li.textContent = perguntas.length === 0
      ? "Ainda não tens perguntas. Usa a aba \"Adicionar pergunta\" para criar a primeira."
      : "Não há perguntas nesta categoria.";
    ul.appendChild(li);
    return;
  }

  visiveis.forEach((p) => {
    const li = document.createElement("li");
    li.className = "cartao";

    const tag = document.createElement("p");
    tag.className = "categoria-tag";
    tag.textContent = p.categoria;

    const pergunta = document.createElement("p");
    pergunta.className = "pergunta";
    pergunta.textContent = p.pergunta;

    const resposta = document.createElement("p");
    resposta.className = "resposta";
    resposta.textContent = p.resposta;
    resposta.hidden = true;

    const acoes = document.createElement("div");
    acoes.className = "acoes";
    acoes.append(
      criarBotao("Ver resposta", "", "toggle", p.id),
      criarBotao("Editar", "", "editar", p.id),
      criarBotao("Eliminar", "perigo", "eliminar", p.id)
    );

    li.append(tag, pergunta, resposta, acoes);
    ul.appendChild(li);
  });
}

// Eventos da lista (delegação de eventos)
function aoClicarLista(evento) {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;
  const id = Number(botao.dataset.id);

  switch (botao.dataset.acao) {
    case "toggle": {
      const resposta = botao.closest(".cartao").querySelector(".resposta");
      resposta.hidden = !resposta.hidden;
      botao.textContent = resposta.hidden ? "Ver resposta" : "Ocultar resposta";
      break;
    }
    case "editar":   editar(id); break;
    case "eliminar": eliminar(id); break;
  }
}

/* ==========================================================
   Modo de teste
   ========================================================== */
function iniciarTeste() {
  ordemTeste = perguntas.map((p) => p.id);
  indiceTeste = 0;
  renderTeste();
}

function renderTeste() {
  const vazio = ordemTeste.length === 0;
  $("teste-vazio").hidden = !vazio;
  $("teste-area").hidden = vazio;
  if (vazio) return;

  const p = perguntas.find((item) => item.id === ordemTeste[indiceTeste]);
  $("teste-contador").textContent = `Pergunta ${indiceTeste + 1} de ${ordemTeste.length}`;
  $("teste-categoria").textContent = p.categoria;
  $("teste-pergunta").textContent = p.pergunta;
  $("teste-resposta").textContent = p.resposta;
  $("teste-resposta").hidden = true;
  $("btn-mostrar").textContent = "Mostrar resposta";
  $("btn-anterior").disabled = indiceTeste === 0;
  $("btn-seguinte").disabled = indiceTeste === ordemTeste.length - 1;
}

function alternarResposta() {
  const r = $("teste-resposta");
  r.hidden = !r.hidden;
  $("btn-mostrar").textContent = r.hidden ? "Mostrar resposta" : "Ocultar resposta";
}

function mover(passo) {
  const novo = indiceTeste + passo;
  if (novo < 0 || novo >= ordemTeste.length) return;
  indiceTeste = novo;
  renderTeste();
}

// Baralhar (algoritmo Fisher-Yates)
function baralhar() {
  for (let i = ordemTeste.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ordemTeste[i], ordemTeste[j]] = [ordemTeste[j], ordemTeste[i]];
  }
  indiceTeste = 0;
  renderTeste();
  mostrarMensagem("Perguntas baralhadas.");
}

/* ==========================================================
   Inicialização e ligação de eventos
   ========================================================== */
function iniciar() {
  preencherCategorias();
  carregar();
  renderLista();

  document.querySelectorAll(".tab").forEach((botao) => {
    botao.addEventListener("click", () => {
      if (botao.dataset.tab !== "adicionar") sairModoEdicao();
      mostrarAba(botao.dataset.tab);
    });
  });

  form.addEventListener("submit", aoSubmeter);
  $("btn-cancelar").addEventListener("click", () => { sairModoEdicao(); mostrarAba("lista"); });
  $("lista-perguntas").addEventListener("click", aoClicarLista);
  $("filtro-categoria").addEventListener("change", (e) => { filtroAtual = e.target.value; renderLista(); });

  $("btn-mostrar").addEventListener("click", alternarResposta);
  $("btn-anterior").addEventListener("click", () => mover(-1));
  $("btn-seguinte").addEventListener("click", () => mover(1));
  $("btn-baralhar").addEventListener("click", baralhar);
  $("ir-adicionar").addEventListener("click", () => mostrarAba("adicionar"));
}

document.addEventListener("DOMContentLoaded", iniciar);