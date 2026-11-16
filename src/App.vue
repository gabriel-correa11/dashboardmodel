<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import BarraFiltros from './components/BarraFiltros.vue'
import LinhaDoTempo from './components/LinhaDoTempo.vue'
import VisaoEpisodios from './components/VisaoEpisodios.vue'
import VisaoPaises from './components/VisaoPaises.vue'
import QuadroResumo from './components/QuadroResumo.vue'
import VisaoMetodo from './components/VisaoMetodo.vue'
import { base, aba, iniciarFiltros } from './application/estadoPainel'
import { exportarDadosCsv } from './application/exportarDadosCsv'
import { carregarBase } from './infrastructure/carregarBase'
import { baixarArquivoCsv } from './infrastructure/baixarArquivoCsv'
import { config, preencher } from './config'

/** Liga o id de cada aba (config/painel.json) ao componente que a desenha. */
const componentesPorAba: Record<string, Component> = {
  episodios: VisaoEpisodios,
  paises: VisaoPaises,
  medidas: QuadroResumo,
  metodo: VisaoMetodo,
}

const erro = ref<string | null>(null)
onMounted(async () => {
  try {
    const dadosCarregados = await carregarBase()
    iniciarFiltros(dadosCarregados)
    base.value = dadosCarregados
  } catch (erroCarregamento) {
    erro.value = erroCarregamento instanceof Error ? erroCarregamento.message : String(erroCarregamento)
  }
})

const subtitulo = computed(() =>
  preencher(config.subtitulo, {
    episodios: (base.value?.episodios ?? []).map((episodio) => episodio.rotulo).join(', '),
  }),
)
const portaisFontes = computed(() => [...new Set((base.value?.series ?? []).map((serie) => serie.fonte.portal))].join(', '))
function baixarDadosCsv() {
  exportarDadosCsv(baixarArquivoCsv)
}
</script>

<template>
  <div class="pagina">
    <header class="topo">
      <div>
        <h1>{{ config.titulo }}</h1>
        <p v-if="base" class="secundario sub">
          {{ subtitulo }}
          <span v-if="base.edicao.ilustrativo" class="ilustrativo">{{ config.aviso_ilustrativo }}</span>
        </p>
      </div>
      <button v-if="base" type="button" class="controle exportar" @click="baixarDadosCsv">Baixar dados (CSV)</button>
    </header>

    <p v-if="erro" class="erro">Não foi possível carregar os dados: {{ erro }}</p>
    <p v-else-if="!base" class="secundario">Carregando dados…</p>

    <template v-else>
      <LinhaDoTempo class="secao-tempo" />

      <div class="controles">
      <nav class="abas" aria-label="Visões">
        <button
          v-for="a in config.abas"
          :key="a.id"
          type="button"
          :aria-current="aba === a.id ? 'page' : undefined"
          @click="aba = a.id"
        >
          {{ a.nome }}
        </button>
      </nav>

      <BarraFiltros />
      </div>

      <main>
        <component :is="componentesPorAba[aba]" />
      </main>

      <footer class="nota">
        Fontes: {{ portaisFontes }}. Datas das recessões: NBER. Edição {{ base.edicao.id_edicao }}, gerada em {{ base.edicao.gerado_em.slice(0, 10) }}.
      </footer>
    </template>
  </div>
</template>

<style scoped>
/*
 * A página é compacta no topo para que o primeiro visual apareça inteiro em 1366 × 768 (RNF10):
 * 16–24px entre cabeçalho, linha do tempo e controles; os visuais ficam em superfícies (.painel).
 */
.pagina {
  max-width: 1320px;
  margin: 0 auto;
  padding: var(--esp-4) var(--esp-6) var(--esp-8);
}
.topo {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--esp-6);
}
.sub {
  margin-top: 2px;
  font-size: var(--t-4);
  color: var(--texto-2);
}
.ilustrativo {
  display: block;
  color: var(--aviso);
  font-size: var(--t-5);
}
.exportar {
  flex: none;
  font-size: var(--t-4);
  cursor: pointer;
}
.secao-tempo {
  margin-top: var(--esp-3);
}
.controles {
  margin-top: var(--esp-3);
}
.abas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1) var(--esp-6);
  border-bottom: 1px solid var(--texto);
}
.abas button {
  font-size: var(--t-4);
  font-weight: 500;
  background: none;
  border: 0;
  padding: 0 0 6px;
  margin-bottom: -1px;
  cursor: pointer;
  color: var(--texto-3);
  border-bottom: 3px solid transparent;
  transition: color var(--transicao), border-color var(--transicao);
}
.abas button:hover {
  color: var(--texto);
}
.abas button[aria-current='page'] {
  color: var(--texto);
  font-weight: 600;
  border-bottom-color: var(--texto);
}
main {
  padding-top: var(--esp-3);
}
footer {
  margin-top: var(--esp-8);
  padding-top: var(--esp-3);
  border-top: 1px solid var(--linha);
}
.erro {
  color: var(--texto);
}
@media (max-width: 900px) {
  .pagina {
    padding: var(--esp-4);
  }
  .topo {
    flex-direction: column;
  }
  .ilustrativo {
    display: block;
    margin-left: 0;
  }
}
</style>
