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

## Próximos passos

1. Conectar autenticação com telas de login.
2. Sincronizar o estado `done` com Firestore.
3. Adicionar testes de usabilidade para mobile.
