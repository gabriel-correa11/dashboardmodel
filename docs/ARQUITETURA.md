# Arquitetura do painel

Este repositório contém a interface do TCC, não o pipeline completo. A plataforma prevista executa localmente, usa Python para coleta e tratamento, Airflow para orquestração e Parquet/DuckDB para as camadas do lakehouse. O painel recebe apenas os arquivos publicados pela Gold; fontes externas e transformações não são responsabilidade da interface.

Na interface, o projeto usa quatro áreas com responsabilidades explícitas. É uma arquitetura em camadas leve, inspirada em Clean Architecture e portas e adaptadores; “arquitetura quadrangular” não é um nome padrão único.

## Áreas

| Área | Responsabilidade | Local |
| --- | --- | --- |
| Apresentação | Renderizar a interface, receber eventos e ligar as abas | `src/App.vue`, `src/components/` |
| Aplicação | Estado compartilhado e coordenação das ações do painel | `src/application/` |
| Domínio | Tipos do contrato com o ETL e formatação reutilizável | `src/domain/` |
| Infraestrutura | Acesso a JSON, APIs do navegador e download de arquivos | `src/infrastructure/` |

## Fluxo de dados e limites deste repositório

O pipeline do TCC deve consultar as fontes públicas pelas APIs (FRED/ALFRED, Ipeadata, SGS e Comex Stat), guardar os dados originais na Bronze com manifesto e hash, padronizar as séries na Silver e publicar na Gold o modelo dimensional de constelação de Kimball. O painel lê os arquivos JSON descritos em `CONTRATO.md`; `src/domain/contrato.ts` tipa os registros de série, data, valores e edição usados pela interface.

Essas etapas do pipeline não estão implementadas aqui. Este repositório contém somente um gerador Python de dados **ilustrativos** para desenvolvimento da interface. Não trate seus JSONs como observações oficiais. A API FRED requer chave gratuita e deve respeitar o limite de 120 requisições por minuto indicado no TCC; a chave pertence à configuração local do pipeline e nunca deve ser commitada.

O painel usa D3 (`d3-array`, `d3-scale` e `d3-shape`) para escalas e formas SVG. A biblioteca é usada na camada de apresentação, não adiciona uma linguagem ao pipeline e evita implementar manualmente essas operações gráficas. Os pacotes de fonte Inter e Source Serif 4 têm licença OFL-1.1 e são servidos localmente pelo bundle, permitindo uso offline depois da instalação das dependências.

## Tipografia e cores

Use os tokens em `src/styles/tokens.css`; não fixe cores nos componentes. A interface usa Inter; títulos da página e conclusões dos gráficos usam Source Serif 4. Os tamanhos vêm dos tokens `--t-1` a `--t-5` (26, 20, 17, 14 e 12,5 px). Números usam algarismos tabulares.

No tema claro, o papel é branco, a tinta principal é `#1C1E21`, a tinta secundária é `#5A6069`, o dado em foco é `#0F5C6E` e as comparações são `#6F7985`; fios, grades e faixas usam os tokens neutros de papel. Use `--comparacao` em linhas e marcas de dados, não em texto: seu contraste sobre branco é 4,42:1, abaixo do mínimo de 4,5:1 para texto, mas acima de 3:1 para elementos gráficos. `--texto-2` (#5A6069) é a cor de rótulos e notas. Cores de estado ficam restritas aos estados da tabela de execuções e ao aviso de dados ilustrativos.

## Direção das dependências

- O domínio não importa Vue, componentes, navegador, rede ou arquivos.
- A aplicação pode usar domínio e configuração, mas não faz `fetch` nem manipula o DOM.
- A infraestrutura implementa tarefas externas e depende dos tipos do domínio.
- A apresentação monta a aplicação e conecta adaptadores concretos, como o download CSV.

## Convenções para a equipe

- Use nomes descritivos em português para variáveis, funções e parâmetros relacionados ao negócio. Evite abreviações como `b`, `r`, `v` e `comps` fora de callbacks muito curtos.
- Preserve nomes matemáticos convencionais (`x`, `y`) dentro dos cálculos de gráficos, onde a notação reduz a ambiguidade.
- Mantenha funções de domínio puras: mesmas entradas, mesmas saídas, sem alterar estado compartilhado.
- Faça leituras externas em `infrastructure/`; não chame `fetch` dentro de componentes.
- Deixe componentes focados na apresentação e nos eventos, sem regras de cálculo.
- Não introduza camadas ou abstrações sem uma responsabilidade concreta que possa ser explicada à equipe.

## Mapa atual

- `application/estadoPainel.ts`: filtros, seleção da aba e consultas derivadas.
- `application/manchetes.ts`: conclusões e rótulos calculados a partir das medidas.
- `application/exportarDadosCsv.ts`: prepara os dados de exportação e recebe um adaptador de download.
- `domain/contrato.ts`: tipos dos JSONs publicados pelo ETL.
- `domain/formatos.ts`: formatação pt-BR.
- `infrastructure/carregarBase.ts`: carrega os JSONs ou os dados embutidos.
- `infrastructure/baixarArquivoCsv.ts`: serializa e baixa o CSV no navegador.
