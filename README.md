# SouFIT

SouFIT é um PWA responsivo (PC + mobile) construído com **React + Vite + Material UI**, integrando **Firebase Auth, Firestore e Storage** para autenticação e persistência de dados. O foco é um fluxo simples para até 10 usuários, com treinos guiados por orientações visuais (GIFs ou vídeos do YouTube).

## Rodando localmente

1. Defina as variáveis de ambiente em um arquivo `.env` na raiz (consulte os nomes em `src/services/firebase.ts`).
2. Instale dependências e execute:

```bash
npm install
npm run dev
```

3. O Vite serve a aplicação e registra o `manifest.json` para habilitar a instalação como PWA.

## Configuração do Firebase

1. Copie `.env.example` para `.env` e preencha as chaves `VITE_FIREBASE_*` fornecidas pelo console Firebase (Auth/Firestore/Storage).
2. As variáveis são utilizadas em `src/services/firebase.ts`; se algum valor estiver ausente, a aplicação mostra "Configure o Firebase no .env" durante a inicialização.
3. Depois de configurar, rode novamente `npm run dev` para testar o login e cadastro.

## Modelo de dados

O Firestore mantém semanas de treino pelo documento `userWeeks/{uid}_{weekId}` e cada treino possui dias com itens:

```ts
items: [
  {
    name: "Supino reto",
    done: false,
    media: {
      type: "gif" | "youtube",
      url: "https://..."
    },
    tips: [
      "Mantenha os pés firmes no chão",
      "Desça de forma controlada",
      "Expire ao subir"
    ]
  }
]
```

## Adicionando novos exercícios

1. Abra `src/services/workoutGenerator.ts`.
2. Acrescente a chave do exercício em `exerciseLibrary` com `media` (opcional) e `tips`.
3. Atualize `seedPlan` para incluir o nome no dia desejado.

O generator já associa `media` e `tips` ao construir o treino, e as dicas padrão aparecem caso o exercício não tenha entrada específica.

## Incluir GIF ou vídeo do YouTube

- **GIFs locais**: coloque o arquivo em `public/gifs/` e referencie a URL relativa (`/gifs/agachamento.gif`) em `exerciseLibrary`.
- **Vídeos do YouTube**: use o link do embed (`https://www.youtube.com/embed/ID`) para não carregar o player completo.
- A mídia só é renderizada quando o usuário expande o cartão, evitando downloads simultâneos.

## Firebase e fluxo mínimo

- `src/services/firebase.ts`: inicialização e exportação de `auth`, `firestore` e `storage`.
- `src/services/workoutService.ts`: funções auxiliares para salvar e carregar semanas (`userWeeks/{uid}_{weekId}`), garantindo compatibilidade com o modelo de dados atualizado.

## Funcionalidades implementadas

- **Onboarding guiado** (`src/pages/OnboardingPage.tsx`): wizard em 3 etapas que coleta idade, peso, objetivo, frequência, grupos musculares, nível e playlist pessoal, salvando em `users/{uid}` e atualizando `onboardingComplete`.
- **Semana atual e plano automático** (`src/services/workoutGenerator.ts` + `src/services/weekService.ts`): ao logar (ou assim que o onboarding é concluído) geramos o `weekId` ISO, criamos `userWeeks/{uid}_{weekId}` com treinos pré-definidos (GIF/YouTube + dicas), checklist de dieta e zera os pontos da semana se rolou reset na segunda-feira.
- **Home / Workout / Diet / Progress / Settings**:  
  - `/home`: resumo de treinos, dieta concluída, pontos da semana, objetivos e peso atuais.  
  - `/workout`: lista o treino do dia, permite marcar exercícios e assistir mídia somente quando expande (lazy load) e gera +10 pontos ao concluir.  
  - `/diet`: upload de PDF direto para Storage (`users/{uid}/diet/current_<timestamp>.pdf`), checklist diário com +5 pontos por dia, e botão “Abrir dieta”.  
  - `/progress`: registro histórico de peso (`users/{uid}/progress/{YYYY-MM-DD}`) e visualização em lista.  
  - `/settings`: edição de objetivo, peso e playlist do YouTube.
- **Contexto e hooks**: `AuthContext` sincroniza o perfil em tempo real e garante que o doc semanal seja criado assim que o Firestore estiver pronto; o hook `useWeeklyPlan` expõe o plano atual a qualquer tela.
- **PWA**: o build usa `vite-plugin-pwa` e o manifest é gerado automaticamente, garantindo instalação do app com o mesmo base `/FIT2.0/` usado no GitHub Pages.

## Atualizações recentes

- Cabeçalho agora resgata o nome do usuário, mostra avatar e menu com atalhos para configurações e saída.
- Tema FIT com modos escuro/claro persistidos em `localStorage` e cards mais contrastantes/próximos ao estilo esportivo.
- Página Dieta ganhou o botão “Adicionar dieta”, upload de PDF com feedback via snackbar, coleta de observações e checklist diário com status.
- Treino permite ver mídias responsivas (GIF ou YouTube) via acordeão e personalizar o dia atual trocando ou adicionando exercícios em modal.
- Progresso traz gráfico com Recharts, lista de registros e home exibe mini-resumo (peso atual, diferença e sparkline).
- Sistema de níveis calcula XP por semana, expõe nível atual em home e mostra barra com pontos faltantes até o próximo nível.

## Próximos passos

1. Conectar autenticação com telas de login.
2. Sincronizar o estado `done` com Firestore.
3. Adicionar testes de usabilidade para mobile.

## Deploy no GitHub Pages

O repositório **FIT2.0** é publicado como site estático em `https://<seu-usuário>.github.io/FIT2.0/`, então todas as rotas do SPA usam o base path `/FIT2.0/`.

1. Garanta que `vite.config.ts` define `base: process.env.NODE_ENV === "production" ? "/FIT2.0/" : "/"`.
2. Crie um workflow em `.github/workflows/deploy.yml` com passos como:

   ```yaml
   name: Deploy SouFIT
   on:
     push:
       branches: [main]
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm install
         - run: npm run build
         - uses: peaceiris/actions-gh-pages@v5
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
             publish_branch: gh-pages
             keep_files: true
   ```

3. O build já respeita `src/assets` e `public/gifs` graças à base configurada, e o `public/404.html` garante que o GitHub Pages redirecione rotas SPA para `index.html`.

4. Após o deploy, verifique `https://<seu-usuário>.github.io/FIT2.0/home` para garantir que o SPA carrega sem 404.

## Utilizando as novidades

### Registrar medidas e progresso

- O onboarding grava automaticamente o primeiro registro em `users/{uid}/measurements/{YYYY-MM-DD}` com peso e, quando presentes, cintura, peito, quadril, braço e coxa. Esse documento serve de ponto de partida para o histórico usado no gráfico principal e no resumo da Home.
- A página `/progress` mantém o formulário obrigatório de peso e campos adicionais opcionais, escreve o documento do dia atual e recalcula o gráfico Recharts em tempo real (o helper `ensureInitialMeasurement` reforça a existência da primeira medida).
- O histórico lista cada entrada com chips para circunferências, e a Home mostra o peso atual, a diferença rumo ao primeiro registro e um mini sparkline de até cinco últimos pesos.

### Incluir mídia (GIF/Youtube) nos exercícios

- Cada exercício da `exerciseLibrary` em `src/services/workoutGenerator.ts` pode ter `media` (tipo `gif` ou `youtube`) e `tips`. Edite ou adicione entradas nessa lista para incluir novos vídeos, GIFs ou orientações.
- GIFs locais devem usar `import.meta.env.BASE_URL` ao construir a URL (por exemplo: ``${import.meta.env.BASE_URL}gifs/plank.gif``) para respeitar o `base` `/FIT2.0/`. Links do YouTube podem usar o embed (`https://www.youtube.com/embed/ID`) ou a própria playlist, que também é carregada quando o usuário abre o acordeão “Ver como fazer”.
- Se quiser que a playlist apareça diretamente na tela de treino, cole a URL da playlist nas configurações (`/settings`); o botão “Mostrar player” alterna o iframe incorporado sem disparar o player global.

### Cadastrar dieta por refeições

- Use o card “Plano de refeições” na página Dieta para detalhar cada refeição (café da manhã, lanche da manhã, almoço, lanche da tarde, jantar e ceia) informando horário, descrição e calorias. O botão agora diz “Adicionar/Editar dieta” para deixar claro que você pode atualizar o plano periodicamente.
- Ao salvar, o Firestore escreve em `users/{uid}/dietPlan/current` o objeto `{ meals: [{ name, time?, itemsText?, kcal? }], kcalPerDay?, updatedAt: serverTimestamp() }`. Ao reabrir a página, os campos são preenchidos com o mesmo payload.
- O checklist diário e o upload de PDF (`users/{uid}.diet.currentPdfUrl`) continuam disponíveis como alternativas rápidas, mas priorize o plano estruturado com metas de calorias.
