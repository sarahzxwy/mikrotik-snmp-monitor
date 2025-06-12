const ctx = document.getElementById('grafico').getContext('2d');

const grafico = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'RX', 
        data: [],
        borderColor: 'blue',
        tension: 0.2,
        fill: false
      },
      {
        label: 'TX', 
        data: [],
        borderColor: 'red',
        tension: 0.2,
        fill: false
      }
    ]
  },
  options: {
    animation: false,
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Hora'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Velocidade'
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            // context.dataset.label: 'RX' ou 'TX'
            // context.datasetIndex: 0 para RX, 1 para TX
            const indice = context.dataIndex;
            const dadoOriginal = grafico.config.options.dadosOriginais[context.datasetIndex][indice];
            return `${context.dataset.label}: ${dadoOriginal}`;
          }
        }
      }
    },
    dadosOriginais: [[], []]
  }
});

async function atualizarGrafico() {
  try {
    const resp = await fetch('/dados');
    if (!resp.ok) {
      console.error("Erro ao buscar dados do servidor:", resp.status);
      return;
    }
    const dados = await resp.json();

    console.log('Dados recebidos:', dados);

    const hora = dados.hora;

    // Extrai apenas o número da string
    const valorRx = parseFloat(dados.rx) || 0; 
    const valorTx = parseFloat(dados.tx) || 0; // Retorna 0 se não for um número

    console.log(`Valores numéricos extraídos: RX=${valorRx}, TX=${valorTx}`);
    
    grafico.data.labels.push(hora);
    grafico.data.datasets[0].data.push(valorRx);
    grafico.data.datasets[1].data.push(valorTx);

    grafico.config.options.dadosOriginais[0].push(dados.rx);
    grafico.config.options.dadosOriginais[1].push(dados.tx);

    const maxPontos = 20;
    if (grafico.data.labels.length > maxPontos) {
      grafico.data.labels.shift();
      grafico.data.datasets.forEach(dataset => {
        dataset.data.shift();
      });
      grafico.config.options.dadosOriginais.forEach(arr => arr.shift());
    }

    grafico.update();

  } catch (error) {
    console.error("Falha na atualização do gráfico:", error);
  }
}

atualizarGrafico();
setInterval(atualizarGrafico, 5000);