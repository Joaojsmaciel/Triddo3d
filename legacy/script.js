// Classe para gerenciar filamentos
class FilamentManager {
    constructor() {
        this.filaments = this.loadFilaments();
        this.pendingColors = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateFilamentList();
        this.updateSelectOptions();
        this.calculateCostPerGram();
    }

    bindEvents() {
        // Eventos para adicionar filamento
        document.getElementById('filamentName').addEventListener('input', () => this.calculateCostPerGram());
        document.getElementById('filamentPrice').addEventListener('input', () => this.calculateCostPerGram());
        document.getElementById('filamentWeight').addEventListener('input', () => this.calculateCostPerGram());
        document.getElementById('saveFilament').addEventListener('click', () => this.saveFilament());
        document.getElementById('addColor').addEventListener('click', () => this.addColor());

        // Eventos para cálculo
        document.getElementById('calculateCost').addEventListener('click', () => this.calculatePrintCost());
        document.getElementById('selectedFilament').addEventListener('change', () => this.updateFilamentInfo());
    }

    // Calcular custo por grama automaticamente
    calculateCostPerGram() {
        const price = parseFloat(document.getElementById('filamentPrice').value) || 0;
        const weight = parseFloat(document.getElementById('filamentWeight').value) || 0;
        
        if (price > 0 && weight > 0) {
            const costPerGram = price / weight;
            document.getElementById('filamentCostPerGram').value = costPerGram.toFixed(3);
        } else {
            document.getElementById('filamentCostPerGram').value = '';
        }
    }


    addColor() {
        const colorInput = document.getElementById('filamentColor');
        const color = colorInput.value;
        if (!color) return;
        if (!this.pendingColors.includes(color)) {
            this.pendingColors.push(color);
            this.renderColorChips();
        }
    }

    removeColor(color) {
        this.pendingColors = this.pendingColors.filter(c => c !== color);
        this.renderColorChips();
    }

    renderColorChips() {
        const container = document.getElementById('colorChips');
        if (!container) return;
        container.innerHTML = '';
        this.pendingColors.forEach(color => {
            const chip = document.createElement('div');
            chip.className = 'color-chip';
            chip.innerHTML = `<span class="color-dot" style="background:${color}"></span><span>${color.toUpperCase()}</span><button class="chip-remove" aria-label="Remover cor" title="Remover" onclick="filamentManager.removeColor('${color}')">×</button>`;
            container.appendChild(chip);
        });
    }

    // Salvar filamento
    saveFilament() {
        const name = document.getElementById('filamentName').value.trim();
        const type = (document.getElementById('filamentType')?.value || 'PLA');
        const colors = this.pendingColors.length > 0 ? [...this.pendingColors] : [document.getElementById('filamentColor').value];
        const price = parseFloat(document.getElementById('filamentPrice').value);
        const weight = parseFloat(document.getElementById('filamentWeight').value);
        const costPerGram = parseFloat(document.getElementById('filamentCostPerGram').value);

        // Validações
        if (!name) {
            alert('Por favor, insira o nome do filamento.');
            return;
        }

        if (!price || price <= 0) {
            alert('Por favor, insira um preço válido para o rolo.');
            return;
        }

        if (!weight || weight <= 0) {
            alert('Por favor, insira um peso válido para o rolo.');
            return;
        }

        // Verificar se já existe um filamento com o mesmo nome
        if (this.filaments.some(f => f.name.toLowerCase() === name.toLowerCase())) {
            alert('Já existe um filamento com este nome. Por favor, escolha outro nome.');
            return;
        }

        const filament = {
            id: Date.now().toString(),
            name: name,
            type: type,
            colors: colors,
            price: price,
            weight: weight,
            costPerGram: costPerGram,
            createdAt: new Date().toISOString()
        };

        this.filaments.push(filament);
        this.saveFilaments();
        this.updateFilamentList();
        this.updateSelectOptions();
        this.clearFilamentForm();
        
        // Mostrar mensagem de sucesso
        this.showNotification('Filamento salvo com sucesso!', 'success');
    }

    // Limpar formulário de filamento
    clearFilamentForm() {
        document.getElementById('filamentName').value = '';
        document.getElementById('filamentColor').value = '#4C7DFF';
        document.getElementById('filamentPrice').value = '';
        document.getElementById('filamentWeight').value = '';
        document.getElementById('filamentCostPerGram').value = '';
        this.pendingColors = [];
        this.renderColorChips();
    }

    // Atualizar lista de filamentos na interface
    updateFilamentList() {
        const listContainer = document.getElementById('filamentList');
        listContainer.innerHTML = '';

        if (this.filaments.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #718096; padding: 20px;">Nenhum filamento salvo ainda.</p>';
            return;
        }

        this.filaments.forEach(filament => {
            const filamentItem = document.createElement('div');
            filamentItem.className = 'filament-item';
            filamentItem.innerHTML = `
                <div class="filament-info">
                    <div class="filament-color" style="background: linear-gradient(90deg, ${
                        (filament.colors || ['#4C7DFF']).slice(0,3).join(', ')
                    })"></div>
                    <div class="filament-details">
                        <h4>${filament.name} · <span style="color: var(--brand-blue); font-weight:700;">${filament.type || 'PLA'}</span></h4>
                        <p>R$ ${filament.price.toFixed(2)} / ${filament.weight}g - R$ ${filament.costPerGram.toFixed(3)}/g</p>
                        <p style="color: var(--text-muted); font-size: 0.85rem;">Cores: ${(filament.colors || ['#4C7DFF']).join(', ')}</p>
                    </div>
                </div>
                <div class="filament-actions">
                    <button class="btn btn-primary btn-small" onclick="filamentManager.selectFilament('${filament.id}')">
                        <i class="fas fa-check"></i> Usar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="filamentManager.deleteFilament('${filament.id}')">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            `;
            listContainer.appendChild(filamentItem);
        });
    }

    // Atualizar opções do select
    updateSelectOptions() {
        const select = document.getElementById('selectedFilament');
        select.innerHTML = '<option value="">Selecione um filamento</option>';

        this.filaments.forEach(filament => {
            const option = document.createElement('option');
            option.value = filament.id;
            option.textContent = `${filament.name} · ${filament.type || 'PLA'} (R$ ${filament.costPerGram.toFixed(3)}/g)`;
            select.appendChild(option);
        });
    }

    // Selecionar filamento
    selectFilament(id) {
        document.getElementById('selectedFilament').value = id;
        this.updateFilamentInfo();
    }

    // Atualizar informações do filamento selecionado
    updateFilamentInfo() {
        const selectedId = document.getElementById('selectedFilament').value;
        const filament = this.filaments.find(f => f.id === selectedId);
        
        if (filament) {
            // Destacar o filamento selecionado na lista
            document.querySelectorAll('.filament-item').forEach(item => {
                item.style.border = '2px solid #e2e8f0';
            });
            
            const selectedItem = document.querySelector(`[onclick*="${selectedId}"]`)?.closest('.filament-item');
            if (selectedItem) {
                selectedItem.style.border = '2px solid #667eea';
                selectedItem.style.background = 'linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)';
            }
        }
    }

    // Excluir filamento
    deleteFilament(id) {
        if (confirm('Tem certeza que deseja excluir este filamento?')) {
            this.filaments = this.filaments.filter(f => f.id !== id);
            this.saveFilaments();
            this.updateFilamentList();
            this.updateSelectOptions();
            this.showNotification('Filamento excluído com sucesso!', 'success');
        }
    }

    // Calcular custo de impressão
    calculatePrintCost() {
        const selectedId = document.getElementById('selectedFilament').value;
        const pieceWeight = parseFloat(document.getElementById('pieceWeight').value);
        const printTime = parseFloat(document.getElementById('printTime').value);
        const profitMargin = parseFloat(document.getElementById('profitMargin').value);

        // Valores fixos
        const printerConsumption = 110; // W
        const energyTariff = 0.857; // R$/kWh

        // Validações
        if (!selectedId) {
            alert('Por favor, selecione um filamento.');
            return;
        }

        if (!pieceWeight || pieceWeight <= 0) {
            alert('Por favor, insira um peso válido para a peça.');
            return;
        }

        if (!printTime || printTime <= 0) {
            alert('Por favor, insira um tempo de impressão válido.');
            return;
        }

        if (profitMargin < 0) {
            alert('A margem de lucro não pode ser negativa.');
            return;
        }

        const filament = this.filaments.find(f => f.id === selectedId);
        
        // Cálculo do custo do filamento
        const filamentCost = pieceWeight * filament.costPerGram;

        // Cálculo do consumo de energia
        // Converter 110W para kW: 110W = 0,110 kW
        const consumptionKW = printerConsumption / 1000; // 0,110 kW
        const energyConsumption = consumptionKW * printTime; // kWh
        const energyCost = energyConsumption * energyTariff;

        // Taxa de serviço: R$ 0,10 por grama
        const serviceFee = pieceWeight * 0.10;

        // Custo total
        const totalCost = filamentCost + energyCost + serviceFee;

        // Preço final com margem
        const finalPrice = totalCost * (1 + profitMargin / 100);

        // Exibir resultados
        this.displayResults(filamentCost, energyCost, serviceFee, totalCost, finalPrice);
    }

    // Exibir resultados
    displayResults(filamentCost, energyCost, serviceFee, totalCost, finalPrice) {
        document.getElementById('filamentCost').textContent = `R$ ${filamentCost.toFixed(2)}`;
        document.getElementById('energyCost').textContent = `R$ ${energyCost.toFixed(2)}`;
        document.getElementById('serviceFee').textContent = `R$ ${serviceFee.toFixed(2)}`;
        document.getElementById('totalCost').textContent = `R$ ${totalCost.toFixed(2)}`;
        document.getElementById('finalPrice').textContent = `R$ ${finalPrice.toFixed(2)}`;

        document.getElementById('results').style.display = 'block';
        
        // Scroll para os resultados
        document.getElementById('results').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    // Salvar filamentos no localStorage
    saveFilaments() {
        localStorage.setItem('triddo_filaments', JSON.stringify(this.filaments));
    }

    // Carregar filamentos do localStorage
    loadFilaments() {
        const saved = localStorage.getItem('triddo_filaments');
        return saved ? JSON.parse(saved) : [];
    }

    // Mostrar notificação
    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        `;

        // Definir cor baseada no tipo
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Adicionar estilos CSS para animações de notificação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Inicializar a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.filamentManager = new FilamentManager();
    
    // Adicionar alguns dados de exemplo se não houver filamentos salvos
    if (window.filamentManager.filaments.length === 0) {
        // Opcional: adicionar dados de exemplo
        console.log('Aplicação TRIDDO inicializada. Adicione seus primeiros filamentos para começar!');
    }
});

// Função para exportar dados (opcional)
function exportData() {
    const data = {
        filaments: window.filamentManager.filaments,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triddo_filaments_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Função para importar dados (opcional)
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.filaments && Array.isArray(data.filaments)) {
                        window.filamentManager.filaments = data.filaments;
                        window.filamentManager.saveFilaments();
                        window.filamentManager.updateFilamentList();
                        window.filamentManager.updateSelectOptions();
                        window.filamentManager.showNotification('Dados importados com sucesso!', 'success');
                    } else {
                        throw new Error('Formato de arquivo inválido');
                    }
                } catch (error) {
                    window.filamentManager.showNotification('Erro ao importar arquivo. Verifique o formato.', 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}
