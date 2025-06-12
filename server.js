const express = require('express');
const snmp = require('net-snmp');

const app = express();
const porta = 3000;

function formatarVelocidade(bitsPorSegundo) {
  const bps = Math.max(0, bitsPorSegundo);
  if (isNaN(bps)) {
    return 'Calculando...';
  }
  if (bps >= 1_000_000_000) {
    return (bps / 1_000_000_000).toFixed(2) + ' Gbps';
  } else if (bps >= 1_000_000) {
    return (bps / 1_000_000).toFixed(2) + ' Mbps';
  } else if (bps >= 1_000) {
    return (bps / 1_000).toFixed(2) + ' Kbps';
  } else {
    return bps.toFixed(0) + ' bps';
  }
}

const host = '192.168.88.1';
const community = 'public';
const interfaceIndex = '4'; 

const oidRx = `1.3.6.1.2.1.31.1.1.1.6.${interfaceIndex}`;
const oidTx = `1.3.6.1.2.1.31.1.1.1.10.${interfaceIndex}`;

const session = snmp.createSession(host, community, { version: snmp.Version2c });

let anteriorRx = null;
let anteriorTx = null;
let ultimaHora = 0;

let ultimaResposta = {
  hora: new Date().toLocaleTimeString(),
  rx: 'Iniciando...',
  tx: 'Iniciando...'
};

function atualizarDados() {
  session.get([oidRx, oidTx], (erro, varbinds) => {
    if (erro) {
      console.error('Erro na requisição SNMP:', erro);
      return;
    }

    if (!varbinds || varbinds.length < 2 || varbinds[0].type === snmp.ObjectType.NoSuchObject) {
      console.error('Erro: OID não encontrado no roteador.');
      return;
    }
    
    try {
      const agora = Date.now();
      const atualRx = varbinds[0].value.readUIntBE(0, varbinds[0].value.length);
      const atualTx = varbinds[1].value.readUIntBE(0, varbinds[1].value.length);

      if (anteriorRx === null) {
        anteriorRx = atualRx;
        anteriorTx = atualTx;
        ultimaHora = agora;
        console.log('Valores base de 64 bits definidos com sucesso. Aguardando próximo ciclo para calcular a taxa.');
        return;
      }

      const intervalo = (agora - ultimaHora) / 1000;
      if (intervalo <= 0) return;

      const taxaRx = (atualRx - anteriorRx) / intervalo;
      const taxaTx = (atualTx - anteriorTx) / intervalo;

      anteriorRx = atualRx;
      anteriorTx = atualTx;
      ultimaHora = agora;
      
      ultimaResposta = {
        hora: new Date().toLocaleTimeString(),
        rx: formatarVelocidade(taxaRx * 8),
        tx: formatarVelocidade(taxaTx * 8)
      };

      console.log('Dados atualizados:', ultimaResposta);

    } catch (e) {
      console.error("Erro ao processar o valor do SNMP (Buffer). O valor recebido pode ser nulo.", e);
    }
  });
}

app.get('/dados', (req, res) => {
  res.json(ultimaResposta);
});

app.use(express.static('.'));

app.listen(porta, () => {
  console.log(`Servidor rodando em http://localhost:${porta}`);
  setInterval(atualizarDados, 1000);
});