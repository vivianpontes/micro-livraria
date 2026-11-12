# Imagem para testes com Cypress

Para gerar uma nova imagem, basta rodar o seguinte comando na raiz do projeto:

```bash
docker build -t micro-livraria -f cypress/Dockerfile .
```

Para executar a aplicação completa via Docker
```bash
docker run -ti -p 3000:3000 -p 5000:5000 micro-livraria
```

--------------------------------------------------------------------------------
## Atividade — Microsserviço de cupons e Docker

Esta implementação amplia a Micro-Livraria com um microsserviço de cupons de desconto e configura a execução da aplicação em containers com Docker Compose.

### Arquitetura

A aplicação possui cinco serviços, executados em containers separados:

| Serviço | Responsabilidade | Porta no container |
|---|---|---|
| Frontend | Apresentar os livros e permitir a interação com a aplicação | 5000 |
| Controller | Receber requisições REST e chamar os serviços internos por gRPC | 3000 |
| Inventory | Consultar os livros disponíveis no catálogo | 3002 |
| Shipping | Calcular um valor de frete simulado | 3001 |
| Coupons | Validar cupons e calcular descontos | 3003 |

O navegador acessa o Controller por HTTP/REST. O Controller se comunica com Inventory, Shipping e Coupons por gRPC. Os arquivos da pasta `proto` definem os contratos dessas chamadas.

O novo recurso segue este fluxo:

1. O cliente envia uma requisição HTTP com o código do cupom e o subtotal.
2. O Controller valida o subtotal e chama a operação `ApplyCoupon` por gRPC.
3. O serviço Coupons verifica o cupom e calcula o desconto.
4. O Controller devolve o resultado em JSON.

### Microsserviço Coupons

O serviço disponibiliza dois cupons de demonstração:

| Cupom | Desconto |
|---|---:|
| LIVRO10 | 10% |
| ESTUDANTE15 | 15% |

Os valores monetários são representados em centavos inteiros. Por exemplo, `10000` corresponde a R$ 100,00. O desconto é arredondado para o centavo mais próximo.

Arquivos adicionados para implementar o recurso:

- `proto/coupons.proto`: contrato gRPC da operação `ApplyCoupon`.
- `services/coupons/index.js`: implementação das regras de desconto.
- `services/controller/coupons.js`: cliente gRPC utilizado pelo Controller.

O arquivo `services/controller/index.js` recebeu a rota:

```text
GET /coupons/:code?subtotal_cents=VALOR
```

Exemplo:

```text
http://localhost:3000/coupons/LIVRO10?subtotal_cents=10000
```

Resposta esperada:

```json
{
  "code": "LIVRO10",
  "percentage": 10,
  "discount_cents": 1000,
  "total_cents": 9000
}
```

Nesse exemplo, um subtotal de R$ 100,00 recebe R$ 10,00 de desconto, resultando em R$ 90,00.

A API retorna HTTP 400 para subtotais inválidos e HTTP 404 para cupons inexistentes. O Controller também trata indisponibilidade e tempo limite de comunicação com o serviço.

### Configuração do Docker

Foram adicionados os arquivos:

- `Dockerfile`: define a imagem com Node.js, dependências e código da aplicação.
- `.dockerignore`: exclui arquivos desnecessários do contexto de construção.
- `compose.yaml`: configura a execução dos cinco serviços.

A mesma definição de imagem é utilizada pelos serviços, mas cada container executa seu próprio comando e processo.

Os endereços dos serviços internos são configurados no Controller pelas variáveis de ambiente:

| Variável | Endereço no Compose |
|---|---|
| INVENTORY_ADDRESS | inventory:3002 |
| SHIPPING_ADDRESS | shipping:3001 |
| COUPONS_ADDRESS | coupons:3003 |

O Inventory foi ajustado para escutar em `0.0.0.0:3002`, permitindo receber conexões de outros containers.

Somente as portas 5000 e 3000 são publicadas no computador. As portas dos serviços gRPC ficam acessíveis pela rede interna do Compose.

### Como executar

Pré-requisitos:

- Git.
- Docker Desktop com suporte a containers Linux e Docker Compose.

Clone este repositório:

```bash
git clone https://github.com/vivianpontes/micro-livraria.git
cd micro-livraria
```

Com o Docker Desktop em execução, valide a configuração:

```bash
docker compose config
```

Construa as imagens e inicie os containers:

```bash
docker compose up --build -d
```

Confira os serviços:

```bash
docker compose ps
```

Acesse a interface:

http://localhost:5000

Para consultar os logs:

```bash
docker compose logs --tail=100
```

Após alterações no código, reconstrua e atualize os containers:

```bash
docker compose up --build -d
```

Para encerrar a aplicação:

```bash
docker compose down
```

### Roteiro de testes

Com os serviços iniciados, acesse os endereços abaixo.

| Teste | URL | Resultado esperado |
|---|---|---|
| Listar livros | http://localhost:3000/products | Lista de livros em JSON |
| Calcular frete | http://localhost:3000/shipping/57000000 | Valor de frete simulado |
| Aplicar LIVRO10 | http://localhost:3000/coupons/LIVRO10?subtotal_cents=10000 | Desconto de 1000 e total de 9000 centavos |
| Aplicar ESTUDANTE15 | http://localhost:3000/coupons/ESTUDANTE15?subtotal_cents=10000 | Desconto de 1500 e total de 8500 centavos |
| Consultar cupom inexistente | http://localhost:3000/coupons/INVALIDO?subtotal_cents=10000 | HTTP 404 |
| Informar subtotal inválido | http://localhost:3000/coupons/LIVRO10?subtotal_cents=abc | HTTP 400 |

No PowerShell, é possível conferir o status HTTP com:

```powershell
curl.exe -i "http://localhost:3000/coupons/INVALIDO?subtotal_cents=10000"
```

### Evidências de execução

#### Containers da aplicação

![Containers da Micro-Livraria em execução](docs/imagens/containers.png)

#### Aplicação de cupom válido

![Resposta da API para o cupom LIVRO10](docs/imagens/cupom-valido.png)

#### Consulta de cupom inexistente

![Resposta da API para um cupom inexistente](docs/imagens/cupom-invalido.png)

#### Interface da Micro-Livraria

![Interface da Micro-Livraria](docs/imagens/interface.png)

### Limitações

Esta implementação possui finalidade didática:

- Os cupons são definidos no código, sem banco de dados.
- O novo serviço calcula descontos, mas não realiza pagamentos ou pedidos.
- O subtotal é informado pelo cliente para demonstrar a operação. Em uma compra real, ele precisaria ser calculado pelo backend com base nos produtos.
- A aplicação do cupom está disponível pela API, sem campo específico na interface.
- O comportamento original de compra simulada e frete aleatório foi mantido.