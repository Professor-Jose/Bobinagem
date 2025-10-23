document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS DA INTERFACE ---
    const canvas = document.getElementById('canvas-bobinagem');
    const ctx = canvas.getContext('2d');
    const ranhurasInput = document.getElementById('ranhuras');
    const polosSelect = document.getElementById('polos');
    const tipoLigacaoSelect = document.getElementById('tipo-ligacao');
    const corDesenhoSelect = document.getElementById('cor-desenho');
    const limparBtn = document.getElementById('btn-limpar');
    const exportarBtn = document.getElementById('btn-exportar'); 
    const tituloDiagrama = document.getElementById('titulo-diagrama');
    const statusMessage = document.getElementById('status-message');
    const coresInputs = {
        R: document.getElementById('cor-r'),
        S: document.getElementById('cor-s'),
        T: document.getElementById('cor-t')
    };
    const infoDefasagemRS = document.getElementById('info-defasagem-rs');
    const infoDefasagemRT = document.getElementById('info-defasagem-rt');
    const infoAngEletrico = document.getElementById('info-ang-eletrico');

    // --- (ATUALIZADO) REFERÊNCIAS DO MENU DE CONTEXTO ---
    const menuBobina = document.getElementById('context-menu-bobina');
    const btnIsolarBobina = document.getElementById('btn-isolar-bobina');
    const btnIsolarFase = document.getElementById('btn-isolar-fase'); // <-- NOVO
    const btnDeletar = document.getElementById('btn-deletar-bobina');
    const btnVerTodas = document.getElementById('btn-ver-todas'); // <-- NOVO (era btnFecharMenu)

    // --- ESTADO DA APLICAÇÃO ---
    let ranhurasPosicoes = [];
    let bobinasDesenhadas = [];
    let primeiroSlotSelecionado = null;
    
    // --- (ATUALIZADO) ESTADO DE INTERAÇÃO DA BOBINA ---
    let lastBobinaId = 0; 
    let bobinaSelecionada = null;
    let modoIsolado = null; // <-- MUDANÇA: Agora é null, 'bobina', ou 'fase'
    const COR_FADE = '#CCCCCC'; 
    const TOLERANCIA_CLIQUE = 5; 

    // --- FUNÇÃO DE ATUALIZAÇÃO GERAL ---
    function atualizarTudo() {
        const totalRanhuras = parseInt(ranhurasInput.value);
        if (isNaN(totalRanhuras) || totalRanhuras <= 0) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        desenharBase(totalRanhuras);

        const coresAtuais = { R: coresInputs.R.value, S: coresInputs.S.value, T: coresInputs.T.value };
        desenharBobinas(coresAtuais);
        
        analiseDinamica();
        
        tituloDiagrama.textContent = `Diagrama ${tipoLigacaoSelect.value}`;
        
        if (!bobinaSelecionada) {
            menuBobina.style.display = 'none';
        }
    }
    
    // --- FUNÇÕES DE DESENHO ---
    function desenharBase(totalRanhuras) {
        // ... (código original inalterado) ...
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.85;
        ranhurasPosicoes = [];

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.stroke();

        for (let i = 1; i <= totalRanhuras; i++) {
            const angle = (2 * Math.PI / totalRanhuras) * (i - 1) - (Math.PI / 2);
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            ranhurasPosicoes.push({ id: i, x, y });

            const textX = centerX + (radius + 25) * Math.cos(angle);
            const textY = centerY + (radius + 25) * Math.sin(angle);
            ctx.fillStyle = (primeiroSlotSelecionado === i) ? 'var(--cor-principal)' : '#333';
            ctx.font = (primeiroSlotSelecionado === i) ? 'bold 22px Arial' : '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(i, textX, textY);
        }
    }

    // --- (MODIFICADA) FUNÇÃO DESENHAR BOBINAS ---
    function desenharBobinas(cores) {
        bobinasDesenhadas.forEach(bobina => {
            const ranhuraInicio = ranhurasPosicoes.find(r => r.id === bobina.start);
            const ranhuraFim = ranhurasPosicoes.find(r => r.id === bobina.end);
            
            if (ranhuraInicio && ranhuraFim) {
                let cor = cores[bobina.fase];
                let larguraLinha = 2;

                // --- (NOVA LÓGICA DE ISOLAMENTO) ---
                if (modoIsolado === 'bobina') {
                    // Isola apenas a bobina selecionada
                    if (bobina.id !== bobinaSelecionada?.id) {
                        cor = COR_FADE; // Coloca em cinza
                    } else {
                        larguraLinha = 4; // Destaca a isolada
                    }
                } else if (modoIsolado === 'fase') {
                    // Isola todas as bobinas da mesma fase
                    if (bobina.fase !== bobinaSelecionada?.fase) {
                        cor = COR_FADE;
                    } else {
                        // É da fase isolada, destaca a selecionada
                        larguraLinha = (bobina.id === bobinaSelecionada?.id) ? 5 : 3;
                    }
                } else if (bobina.id === bobinaSelecionada?.id) {
                    // Sem modo de isolamento, apenas destaca a selecionada
                    larguraLinha = 5; 
                }
                // --- (FIM DA NOVA LÓGICA) ---

                ctx.beginPath();
                ctx.moveTo(ranhuraInicio.x, ranhuraInicio.y);
                ctx.lineTo(ranhuraFim.x, ranhuraFim.y);
                ctx.strokeStyle = cor;
                ctx.lineWidth = larguraLinha;
                ctx.stroke();
            }
        });
    }

    // --- CÁLCULO DINÂMICO ---
    function analiseDinamica() {
        // ... (código original inalterado) ...
        const totalRanhuras = parseInt(ranhurasInput.value);
        const polos = parseInt(polosSelect.value);
        infoAngEletrico.textContent = `Ângulo Elétrico/Ranhura: ${((360 / totalRanhuras) * (polos / 2)).toFixed(2)}°`;
        const primeiraR = bobinasDesenhadas.find(b => b.fase === 'R');
        const primeiraS = bobinasDesenhadas.find(b => b.fase === 'S');
        const primeiraT = bobinasDesenhadas.find(b => b.fase === 'T');
        infoDefasagemRS.textContent = 'R-S: --';
        if (primeiraR && primeiraS) {
            let diff = primeiraS.start - primeiraR.start;
            const anguloEletrico = ((diff / totalRanhuras) * 360 * (polos / 2));
            infoDefasagemRS.textContent = `R-S: ${anguloEletrico.toFixed(1)}°`;
        }
        infoDefasagemRT.textContent = 'R-T: --';
        if (primeiraR && primeiraT) {
            let diff = primeiraT.start - primeiraR.start;
            const anguloEletrico = ((diff / totalRanhuras) * 360 * (polos / 2));
            infoDefasagemRT.textContent = `R-T: ${anguloEletrico.toFixed(1)}°`;
        }
    }

    // --- FUNÇÕES HELPER DE DETEÇÃO DE CLIQUE ---
    function distanciaPontoSegmento(p, v, w) {
        // ... (código original inalterado) ...
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projecao = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
        return Math.sqrt(Math.pow(p.x - projecao.x, 2) + Math.pow(p.y - projecao.y, 2));
    }

    function getBobinaPertoDoMouse(mouseX, mouseY) {
        // ... (código original inalterado) ...
        let bobinaMaisProxima = null;
        let menorDistancia = Infinity;
        for (const bobina of bobinasDesenhadas) {
            const ranhuraInicio = ranhurasPosicoes.find(r => r.id === bobina.start);
            const ranhuraFim = ranhurasPosicoes.find(r => r.id === bobina.end);
            if (ranhuraInicio && ranhuraFim) {
                const p = { x: mouseX, y: mouseY };
                const v = { x: ranhuraInicio.x, y: ranhuraInicio.y };
                const w = { x: ranhuraFim.x, y: ranhuraFim.y };
                const dist = distanciaPontoSegmento(p, v, w);
                if (dist < menorDistancia && dist < TOLERANCIA_CLIQUE) {
                    menorDistancia = dist;
                    bobinaMaisProxima = bobina;
                }
            }
        }
        return bobinaMaisProxima;
    }

    // --- (MODIFICADA) INTERAÇÃO MANUAL ---
    function handleCanvasClick(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // 1. Tenta encontrar uma ranhura clicada
        let ranhuraClicada = null;
        for (const ranhura of ranhurasPosicoes) {
            const dist = Math.sqrt(Math.pow(mouseX - ranhura.x, 2) + Math.pow(mouseY - ranhura.y, 2));
            if (dist < 25) { 
                ranhuraClicada = ranhura.id;
                break;
            }
        }
        
        // Se clicou numa ranhura (lógica de desenhar)
        if (ranhuraClicada) {
            menuBobina.style.display = 'none'; 
            bobinaSelecionada = null;
            modoIsolado = null; // <-- MUDANÇA

            if (!primeiroSlotSelecionado) {
                primeiroSlotSelecionado = ranhuraClicada;
                statusMessage.textContent = `Ranhura ${ranhuraClicada} selecionada. Clique no destino.`;
            } else {
                bobinasDesenhadas.push({
                    id: ++lastBobinaId, 
                    start: primeiroSlotSelecionado,
                    end: ranhuraClicada,
                    fase: corDesenhoSelect.value
                });
                primeiroSlotSelecionado = null;
                statusMessage.textContent = 'Ligação criada! Clique para iniciar a próxima.';
            }
            atualizarTudo();
            return; 
        }

        // 2. Se não clicou numa ranhura, tenta encontrar uma bobina
        const bobinaClicada = getBobinaPertoDoMouse(mouseX, mouseY);
        
        if (bobinaClicada) {
            bobinaSelecionada = bobinaClicada;
            modoIsolado = null; // <-- MUDANÇA: Reseta o modo isolado ao selecionar
            statusMessage.textContent = `Bobina ${bobinaClicada.id} (Fase ${bobinaClicada.fase}) selecionada.`;
            
            // --- (NOVO) ATUALIZA TEXTO DO BOTÃO ---
            btnIsolarFase.textContent = `Isolar Fase ${bobinaClicada.fase}`;
            
            // Mostra o menu de contexto na posição do clique
            menuBobina.style.display = 'block';
            menuBobina.style.left = `${event.clientX}px`;
            menuBobina.style.top = `${event.clientY}px`;
            
            atualizarTudo();
            return;
        }

        // 3. Se não clicou em nada (ranhura ou bobina), limpa a seleção
        primeiroSlotSelecionado = null;
        bobinaSelecionada = null;
        modoIsolado = null; // <-- MUDANÇA
        menuBobina.style.display = 'none';
        statusMessage.textContent = 'Clique numa ranhura para iniciar uma ligação.';
        atualizarTudo();
    }

    // --- FUNÇÃO DE EXPORTAÇÃO --- 
    function exportarDiagrama() {
        // ... (código original inalterado) ...
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over'; 
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const link = document.createElement('a');
        link.download = 'diagrama_bobinagem.png';
        link.href = canvas.toDataURL('image/png');
        ctx.restore();
        link.click();
        atualizarTudo();
    }


    // --- EVENTOS ---
    limparBtn.addEventListener('click', () => {
        bobinasDesenhadas = [];
        primeiroSlotSelecionado = null;
        bobinaSelecionada = null;
        modoIsolado = null; // <-- MUDANÇA
        lastBobinaId = 0;
        statusMessage.textContent = 'Desenho limpo. Clique numa ranhura para começar.';
        atualizarTudo();
    });

    exportarBtn.addEventListener('click', exportarDiagrama);
    canvas.addEventListener('click', handleCanvasClick);
    
    // --- (ATUALIZADO) EVENTOS DO MENU DE CONTEXTO ---

    // Botão "Ver Somente Esta" (Isolar Bobina)
    btnIsolarBobina.addEventListener('click', () => {
        if (!bobinaSelecionada) return;
        modoIsolado = 'bobina'; // <-- MUDANÇA
        menuBobina.style.display = 'none'; 
        statusMessage.textContent = `A isolar bobina ${bobinaSelecionada.id}. Clique no fundo para ver todas.`;
        atualizarTudo();
    });

    // --- (NOVO) Botão "Isolar Fase" ---
    btnIsolarFase.addEventListener('click', () => {
        if (!bobinaSelecionada) return;
        modoIsolado = 'fase'; // <-- MUDANÇA
        menuBobina.style.display = 'none'; 
        statusMessage.textContent = `A isolar Fase ${bobinaSelecionada.fase}. Clique no fundo para ver todas.`;
        atualizarTudo();
    });

    // Botão "Deletar Bobina"
    btnDeletar.addEventListener('click', () => {
        if (!bobinaSelecionada) return;
        bobinasDesenhadas = bobinasDesenhadas.filter(b => b.id !== bobinaSelecionada.id);
        
        bobinaSelecionada = null;
        modoIsolado = null; // <-- MUDANÇA
        menuBobina.style.display = 'none';
        statusMessage.textContent = 'Bobina deletada.';
        atualizarTudo();
    });

    // --- (ATUALIZADO) Botão "Ver Todas as Fases" ---
    btnVerTodas.addEventListener('click', () => {
        bobinaSelecionada = null;
        modoIsolado = null; // <-- MUDANÇA
        menuBobina.style.display = 'none';
        statusMessage.textContent = 'Clique numa ranhura para iniciar uma ligação.';
        atualizarTudo();
    });
    // --- FIM DOS EVENTOS ATUALIZADOS ---

    // Adiciona gatilhos para atualizar a interface
    [ranhurasInput, polosSelect, tipoLigacaoSelect, corDesenhoSelect].forEach(el => el.addEventListener('change', atualizarTudo));
    Object.values(coresInputs).forEach(el => el.addEventListener('input', atualizarTudo));

    // --- INICIALIZAÇÃO ---
    atualizarTudo();
});