# Transportadora — API REST de entregas

Implementação do tema Transportadora (CMP2304, Prova 24), conforme a imagem fornecida. Recurso: `entrega`, com `id`, `destinatario`, `cidade` e `status`.

## Executar

Requisitos: Node.js 22.9 ou superior e um servidor MySQL/MariaDB acessível. O módulo `mysql` solicitado pelo enunciado precisa de uma conta com autenticação compatível; MariaDB é uma opção para executar este projeto.

1. Abra o terminal nesta pasta e execute `npm ci`.
2. Execute `sql/schema.sql` no seu cliente MySQL/MariaDB, como MySQL Workbench, HeidiSQL ou terminal. O script cria o banco `transportadora` e a tabela `entrega` sem apagar dados existentes.
3. Copie `.env.example` para `.env` (`Copy-Item .env.example .env` no PowerShell).
4. Preencha host, porta, usuário e senha do banco no `.env`.
5. Execute `npm start` e acesse `http://localhost:3000/entrega`.

Para desenvolvimento com reinício automático: `npm run dev`. O `.env` não deve ser enviado ao GitHub.

## Rotas

| Método | Rota | Resultado |
| --- | --- | --- |
| GET | /entrega | Lista todas as entregas, 200 |
| GET | /entrega/:id | Busca uma entrega, 200 ou 404 |
| POST | /entrega | Cria uma entrega, 201 e cabeçalho Location |
| PUT | /entrega/:id | Substitui os três campos, 200 ou 404 |
| DELETE | /entrega/:id | Exclui a entrega, 200 com mensagem JSON ou 404 |

POST e PUT recebem `Content-Type: application/json`:

```json
{
  "destinatario": "Maria Silva",
  "cidade": "Goiânia",
  "status": "pendente"
}
```

O id é gerado pelo banco. Os três campos são textos obrigatórios e não vazios: destinatario até 150 caracteres, cidade até 100 e status até 50. Status é texto livre, pois o enunciado não define uma lista de valores. Espaços nas extremidades são removidos. PUT exige todos os campos. Campos extras são ignorados.

Erros retornam JSON com `erro`: 400 para dados/id/JSON inválidos; 404 para recurso ou rota inexistente; 413 para corpo acima de 100 KB; 503 para falha de conexão/configuração do banco; 500 para outras falhas de execução. Consultas usam placeholders e valores separados, sem concatenar entrada do usuário na SQL.

## Postman

Importe `postman/transportadora.postman_collection.json`. Execute na ordem da coleção. A variável `baseUrl` começa em `http://localhost:3000`; a criação salva automaticamente o `id` para as próximas requisições. A última requisição confirma 404 após a exclusão.

## Testes

Execute `npm test`. Os testes fazem requisições HTTP reais ao Express em porta temporária e usam um banco simulado: verificam o fluxo CRUD, registro ausente, PUT sem mudanças, validação, binding de entrada com conteúdo SQL, falhas de conexão/execução, JSON malformado, limite de corpo e CORS.

Não foi possível validar o script e as consultas em um servidor MySQL/MariaDB real neste ambiente: os executáveis do banco e Docker não estavam disponíveis no terminal. A coleção Postman permite validar a integração depois de configurar seu banco. A aplicação usa MySQL/MariaDB de verdade ao executar `npm start`; o banco simulado existe somente nos testes.

## Arquivos

- `server.js`: inicialização HTTP e encerramento das conexões.
- `app.js`: Express, CORS, morgan, body-parser e tratamento de erros.
- `config/database.js`: pool de conexões usando o módulo mysql.
- `routes/entrega.js`: CRUD e validação.
- `sql/schema.sql`: criação do banco e tabela.
- `test/api.test.js`: testes automatizados.

## Entrega acadêmica

O enunciado fotografado solicita um repositório público no GitHub, o link no formulário do Teams e o nome completo do aluno. Revise o código e informe sua identificação no formulário de entrega. O envio ao Teams deve ser feito pelo aluno. Não publique `.env` nem `node_modules`.
