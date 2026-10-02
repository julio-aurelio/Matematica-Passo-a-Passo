# Matemática Passo a Passo (jogo 2, guiado)

Mesmo objetivo do jogo 1, mas para alunos com neurodivergência ou dificuldade de aprendizagem. **Sem cronômetro.**
Cada partida tem 5 contas, sempre **armadas** (uma embaixo da outra), resolvidas **passo a passo**, com **bolinhas** para contar — tocar nas bolinhas é só uma ajuda visual, nunca obrigatório: dá para digitar a resposta direto. Layout responsivo (celular, tablet, notebook/Chromebook: a conta e a área de ajuda ficam lado a lado em telas maiores).

## Fluxo de telas
1. **Qual é o seu ano?** (6º, 7º, 8º ou 9º). Cada ano tem o seu próprio ranking.
2. **Quem está jogando?** apelido e turma (ficam lembrados no aparelho).
3. **O que vamos treinar?** Somar, Subtrair, Multiplicar ou Dividir.
4. **Nível** (1, 2 ou 3), **jogo** com 5 contas e **resultado**.

Em todas as telas (menos a primeira) há os botões **← Voltar** e **🏠 Início**. O ranking pode ser aberto na 1ª tela ou ao fim de cada partida, com abas por ano e por operação. Em Multiplicar/Dividir aparece um botão **📋 Tabuada** com a tabuada do número em jogo.

## Como a criança é guiada
- **Soma (começa pela unidade):** soma a coluna → se der 10 ou mais, as 10 bolinhas viram 1 da casa ao lado → escreve o que sobrou embaixo e o **"vai"** aparece no quadradinho verde da próxima coluna.
- **Subtração (começa pela unidade):** pergunta "dá para tirar?" → se não dá, botão **pedir emprestado 1 dezena**: o número de cima é riscado, aparece o novo valor e a unidade ganha 10 (método usado no Brasil) → risca as bolinhas e escreve a resposta.
- **Multiplicação (começa pela unidade, por 1 algarismo):** mesma lógica da soma — multiplica a coluna pelo número de baixo, o "vai" passa pro lado do mesmo jeito.
- **Divisão (por 1 algarismo, sempre exata):** aqui o jeito natural é ir da esquerda pra direita, como no método armado em chave — "quantas vezes o divisor cabe aqui?", depois "quanto sobra?", desce o próximo número e repete.
- Toque nas bolinhas para contar/riscar se ajudar, ou use **Contar pra mim** / **Tirar pra mim** — ou simplesmente digite a resposta, sem tocar em nada.
- Erros nunca são punidos com bronca: 1º erro = dica, 2º = as bolinhas são contadas junto, 3º = a resposta aparece pronta para digitar.
- O aluno avança no ritmo dele (botão "Continuar").

## Níveis
- **Soma/Subtração/Multiplicação:** nível 1 = 2 dígitos sem "vai"/sem emprestar; nível 2 = 2 dígitos com "vai"/emprestar; nível 3 = 3 dígitos com "vai"/emprestar.
- **Divisão:** nível 1 = dividendo de 2 dígitos; nível 2 = 3 dígitos; nível 3 = 4 dígitos (divisor sempre de 1 algarismo).

## Pontuação e ranking
Por conta: 20 pontos (nível 1), 30 (nível 2) ou 40 (nível 3), menos 4 por erro (mínimo 4). Ranking semanal separado por ano (6º–9º) e por operação,
usando o mesmo banco do jogo 1 (`variant = 'guiado'`, então os dois rankings não se misturam).

## Banco (Supabase)
`supabase/schema.sql` é o mesmo do jogo 1 e **já foi aplicado** (projeto "Materiais adaptados"). Não rode de novo se já rodou.
URL e chave ficam no `.env` (fora do Git; modelo em `.env.example`). `npm run build` gera `public/js/config.js` a partir dele.
Na Vercel, cadastre `SUPABASE_URL` e `SUPABASE_KEY` em **Settings > Environment Variables** — o build gera o config lá.

## Estrutura
```
public/          site (index.html, favicon.ico, css/, js/)
scripts/         gerar-config.js (.env -> public/js/config.js)
supabase/        schema.sql
```

## Rodar local
```
npm run dev
```

## Já no ar
https://jogo-matematica-guiado.vercel.app (publicado direto pelo Claude, sem repositório Git ainda).

## GitHub + Vercel
O repositório Git local já existe (branch `main`). Para subir: crie o repositório (privado) em https://github.com/new e rode
```
git remote add origin https://github.com/julio-aurelio/jogo-matematica-guiado.git
git push -u origin main
```
Na Vercel, em **Settings > Git**, conecte o repositório; em **Settings > Build**, Output Directory = `public`.
