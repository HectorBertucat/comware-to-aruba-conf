/**
 * Convertisseur Comware vers Aruba
 * Réplique la logique des scripts Python en JavaScript côté client
 */

class ComwareToArubaConverter {
    constructor() {
        this.configData = null;
        this.parsedData = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('config-file');
        const convertBtn = document.getElementById('convert-btn');
        const downloadBtn = document.getElementById('download-btn');
        const copyBtn = document.getElementById('copy-btn');
        const exportExcelBtn = document.getElementById('export-excel-btn');
        const syncBtn = document.getElementById('sync-btn');
        const stackCountInput = document.getElementById('stack-count');

        fileInput.addEventListener('change', this.handleFileLoad.bind(this));
        convertBtn.addEventListener('click', this.handleConvert.bind(this));
        downloadBtn.addEventListener('click', this.handleDownload.bind(this));
        copyBtn.addEventListener('click', this.handleCopy.bind(this));
        exportExcelBtn.addEventListener('click', this.handleExportExcel.bind(this));
        syncBtn.addEventListener('click', this.handleSync.bind(this));
        stackCountInput.addEventListener('change', this.handleStackCountChange.bind(this));

        // Marquer comme non synchronisé
        this.isManuallyEdited = false;

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', this.handleTabClick.bind(this));
        });

        // Initialize stack configuration
        this.updateStackConfiguration();

        // Initialize synchronized scrolling for config display
        this.initializeConfigDisplay();
    }

    initializeConfigDisplay() {
        const configOutput = document.getElementById('aruba-config');
        const lineNumbers = document.getElementById('line-numbers');

        if (configOutput && lineNumbers) {
            // Synchroniser le scroll vertical
            configOutput.addEventListener('scroll', () => {
                lineNumbers.scrollTop = configOutput.scrollTop;
            });

            // Détecter les modifications manuelles
            configOutput.addEventListener('input', () => {
                this.markAsManuallyEdited();
                this.updateLineNumbers();
            });
        }
    }

    markAsManuallyEdited() {
        this.isManuallyEdited = true;
        const indicator = document.getElementById('sync-indicator');
        const syncBtn = document.getElementById('sync-btn');

        indicator.textContent = '⚠️ Modifié manuellement';
        indicator.className = 'sync-indicator sync-warning';
        syncBtn.style.display = 'inline-flex';
    }

    markAsSynced() {
        this.isManuallyEdited = false;
        const indicator = document.getElementById('sync-indicator');
        const syncBtn = document.getElementById('sync-btn');

        indicator.textContent = '📊 Synchronisé avec le tableau';
        indicator.className = 'sync-indicator sync-ok';
        syncBtn.style.display = 'none';
    }

    handleSync() {
        if (this.parsedData) {
            this.updateConfigPreview();
            this.markAsSynced();
            this.showMessage('Configuration resynchronisée avec le tableau', 'success');
        }
    }

    updateLineNumbers() {
        const configOutput = document.getElementById('aruba-config');
        const lineNumbers = document.getElementById('line-numbers');

        if (configOutput && lineNumbers) {
            const lines = configOutput.value.split('\n');
            const lineNumbersText = lines.map((_, index) => (index + 1).toString()).join('\n');
            lineNumbers.textContent = lineNumbersText;
        }
    }

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.configData = e.target.result;
            this.showFileInfo(file);
            this.showSection('params-section');

            // Extraire le hostname du fichier
            const hostname = this.extractHostname(this.configData);
            if (hostname) {
                document.getElementById('hostname').value = hostname;
            }
        };
        reader.readAsText(file);
    }

    extractHostname(configText) {
        const lines = configText.split('\n');
        for (const line of lines) {
            if (line.trim().includes('sysname')) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    return parts[1];
                }
            }
        }
        return '';
    }

    showFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = fileInfo.querySelector('.file-name');
        const fileSize = fileInfo.querySelector('.file-size');

        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        fileInfo.style.display = 'flex';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showSection(sectionId) {
        document.getElementById(sectionId).style.display = 'block';
    }

    handleStackCountChange() {
        this.updateStackConfiguration();
    }

    updateStackConfiguration() {
        const stackCount = parseInt(document.getElementById('stack-count').value) || 1;
        const stackConfig = document.getElementById('stack-config');
        const stackSwitches = document.getElementById('stack-switches');

        if (stackCount > 1) {
            stackConfig.style.display = 'block';
            stackSwitches.innerHTML = '';

            for (let i = 1; i <= stackCount; i++) {
                const switchDiv = document.createElement('div');
                switchDiv.className = 'stack-switch';
                switchDiv.innerHTML = `
                    <div class="stack-switch-label">Switch ${i}:</div>
                    <select id="switch-${i}-model" class="switch-model-select">
                        <option value="6100-12">Aruba 6100 12 ports</option>
                        <option value="6100-24">Aruba 6100 24 ports</option>
                        <option value="6100-48" ${i === 1 ? 'selected' : ''}>Aruba 6100 48 ports</option>
                        <option value="6200-48">Aruba 6200 48 ports</option>
                    </select>
                    <div class="stack-switch-info" id="switch-${i}-info">
                        48 ports + 4 SFP (49-52)
                    </div>
                `;
                stackSwitches.appendChild(switchDiv);

                // Add event listener for model change
                const modelSelect = switchDiv.querySelector('.switch-model-select');
                modelSelect.addEventListener('change', () => {
                    this.updateSwitchInfo(i, modelSelect.value);
                });

                // Initialize info
                this.updateSwitchInfo(i, modelSelect.value);
            }
        } else {
            stackConfig.style.display = 'none';
        }
    }

    updateSwitchInfo(switchNumber, model) {
        const infoDiv = document.getElementById(`switch-${switchNumber}-info`);
        const modelInfo = this.getSwitchModelInfo(model);
        infoDiv.textContent = `${modelInfo.totalPorts} ports + ${modelInfo.sfpCount} SFP (${modelInfo.sfpStart}-${modelInfo.sfpStart + modelInfo.sfpCount - 1})`;
    }

    getSwitchModelInfo(model) {
        const modelMap = {
            '6100-12': { totalPorts: 12, sfpCount: 4, sfpStart: 13 },
            '6100-24': { totalPorts: 24, sfpCount: 4, sfpStart: 25 },
            '6100-48': { totalPorts: 48, sfpCount: 4, sfpStart: 49 },
            '6200-48': { totalPorts: 48, sfpCount: 4, sfpStart: 49 }
        };
        return modelMap[model] || modelMap['6100-48'];
    }

    getStackConfiguration() {
        const stackCount = parseInt(document.getElementById('stack-count').value) || 1;
        const stackConfig = [];

        if (stackCount === 1) {
            const model = document.getElementById('switch-model').value;
            stackConfig.push({
                switchNumber: 1,
                model: model,
                ...this.getSwitchModelInfo(model)
            });
        } else {
            for (let i = 1; i <= stackCount; i++) {
                const modelSelect = document.getElementById(`switch-${i}-model`);
                const model = modelSelect ? modelSelect.value : '6100-48';
                stackConfig.push({
                    switchNumber: i,
                    model: model,
                    ...this.getSwitchModelInfo(model)
                });
            }
        }

        return stackConfig;
    }

    async handleConvert() {
        if (!this.configData) {
            this.showMessage('Veuillez d\'abord charger un fichier de configuration', 'error');
            return;
        }

        const convertBtn = document.getElementById('convert-btn');
        convertBtn.classList.add('loading');

        try {
            this.showMessage('Analyse de la configuration en cours...', 'info');

            // Réinitialiser le mapping SFP pour une nouvelle conversion
            this.sfpMapping = new Map();

            // Étape 1: Parser la configuration Comware
            this.parsedData = this.parseComwareConfig(this.configData);

            // Étape 2: Afficher les données Excel
            this.displayExcelData(this.parsedData);
            this.showSection('excel-section');

            // Étape 3: Générer la configuration Aruba
            const arubaConfig = this.generateArubaConfig(this.parsedData);
            this.displayArubaConfig(arubaConfig);
            this.showSection('result-section');

            this.showMessage('Conversion terminée avec succès !', 'success');
        } catch (error) {
            console.error('Erreur lors de la conversion:', error);
            this.showMessage('Erreur lors de la conversion: ' + error.message, 'error');
        } finally {
            convertBtn.classList.remove('loading');
        }
    }

    parseComwareConfig(configText) {
        const lines = configText.split('\n').map(line => line.trim());

        const data = {
            intVlan: new Map(),
            intLag: new Map(),
            intPhy: new Map(),
            vlans: new Map()
        };

        let currentInterface = null;
        let currentInterfaceType = null;
        let inInterfaceBlock = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Reset interface context when we hit a new section or empty line starting a new block
            if (line.startsWith('#') || (line.trim() === '' && !inInterfaceBlock)) {
                currentInterface = null;
                currentInterfaceType = null;
                inInterfaceBlock = false;
                continue;
            }

            // Interface detection
            if (line.startsWith('interface ')) {
                const interfaceName = line.substring(10);
                currentInterface = interfaceName;
                inInterfaceBlock = true;

                if (interfaceName.startsWith('Vlan-interface')) {
                    currentInterfaceType = 'vlan';
                    data.intVlan.set(interfaceName, {
                        adminStatus: 'UP',
                        ip: '-',
                        ipSub: '-',
                        dhcpRelay: '-',
                        description: ''
                    });
                } else if (interfaceName.startsWith('Bridge-Aggregation')) {
                    currentInterfaceType = 'lag';
                    data.intLag.set(interfaceName, {
                        adminStatus: 'UP',
                        type: '-',
                        vlan: '-',
                        description: ''
                    });
                } else if (interfaceName.includes('Ethernet')) {
                    currentInterfaceType = 'phy';
                    data.intPhy.set(interfaceName, {
                        adminStatus: 'UP',
                        agg: '-',
                        type: '-',
                        untagVlan: '-',
                        tagVlan: '-',
                        voiceVlan: '-',
                        lldpMedNp: '-',
                        loopbackVlans: '-',
                        description: ''
                    });
                }
            }
            // VLAN detection
            else if (line.startsWith('vlan ') && !line.includes('interface')) {
                const vlanId = line.substring(5).trim();
                if (/^\d+$/.test(vlanId)) {
                    data.vlans.set(vlanId, {
                        name: '-',
                        nbrPorts: 0,
                        snooping: 'Non'
                    });
                    currentInterface = `vlan${vlanId}`;
                    currentInterfaceType = 'vlan-config';
                }
            }
            // Configuration within interfaces
            else if (currentInterface && currentInterfaceType) {
                this.parseInterfaceConfig(line, currentInterface, currentInterfaceType, data);
            }
        }

        // Normaliser les données avec la répartition SFP optimale
        this.normalizeInterfaceData(data);

        return data;
    }

    normalizeInterfaceData(data) {
        // Obtenir la configuration de stack
        const stackConfig = this.getStackConfiguration();

        // Réinitialiser le mapping SFP
        this.sfpMapping = new Map();

        // Créer une nouvelle Map pour les interfaces physiques normalisées
        const normalizedIntPhy = new Map();

        // Trier les interfaces dans l'ordre naturel
        const sortedInterfaces = Array.from(data.intPhy.entries()).sort((a, b) => {
            return this.compareInterfaceNames(a[0], b[0]);
        });

        // Traiter chaque interface
        for (const [interfaceName, intConfig] of sortedInterfaces) {
            let finalInterfaceName = interfaceName;

            // Si c'est un port SFP, appliquer le mapping optimisé
            if (interfaceName.startsWith('Ten-GigabitEthernet')) {
                const arubaInterface = this.mapInterfaceToArubaWithStack(interfaceName, stackConfig);
                if (arubaInterface) {
                    finalInterfaceName = this.convertArubaToComwareFormat(arubaInterface);
                }
            }

            normalizedIntPhy.set(finalInterfaceName, intConfig);
        }

        // Remplacer les données d'origine
        data.intPhy = normalizedIntPhy;
    }

    convertArubaToComwareFormat(arubaInterface) {
        // Convertir format Aruba (1/1/49) vers format Comware (Ten-GigabitEthernet1/0/48)
        const match = arubaInterface.match(/^(\d+)\/(\d+)\/(\d+)$/);
        if (match) {
            const [, module, slot, port] = match;
            const newSlot = parseInt(slot) - 1; // 1 -> 0
            return `Ten-GigabitEthernet${module}/${newSlot}/${port}`;
        }
        return arubaInterface;
    }

    parseInterfaceConfig(line, interfaceName, interfaceType, data) {
        if (line === 'shutdown') {
            if (interfaceType === 'vlan' && data.intVlan.has(interfaceName)) {
                data.intVlan.get(interfaceName).adminStatus = 'Down';
            } else if (interfaceType === 'lag' && data.intLag.has(interfaceName)) {
                data.intLag.get(interfaceName).adminStatus = 'Down';
            } else if (interfaceType === 'phy' && data.intPhy.has(interfaceName)) {
                data.intPhy.get(interfaceName).adminStatus = 'Down';
            }
        }
        else if (line.trim().startsWith('description ')) {
            // Process descriptions inside interface blocks
            const description = line.trim().substring(12).replace(/['"]/g, '').trim();
            if (interfaceType === 'vlan' && data.intVlan.has(interfaceName)) {
                data.intVlan.get(interfaceName).description = description;
            } else if (interfaceType === 'lag' && data.intLag.has(interfaceName)) {
                data.intLag.get(interfaceName).description = description;
            } else if (interfaceType === 'phy' && data.intPhy.has(interfaceName)) {
                data.intPhy.get(interfaceName).description = description;
            }
        }
        else if (line.startsWith('name ') && interfaceType === 'vlan-config') {
            const vlanId = interfaceName.substring(4); // Remove 'vlan' prefix
            const name = line.substring(5).trim();
            if (data.vlans.has(vlanId)) {
                data.vlans.get(vlanId).name = name;
            }
        }
        else if (line.includes('igmp-snooping') && interfaceType === 'vlan-config') {
            const vlanId = interfaceName.substring(4); // Remove 'vlan' prefix
            if (data.vlans.has(vlanId)) {
                data.vlans.get(vlanId).snooping = 'Oui';
            }
        }
        else if (line.startsWith('ip address ')) {
            const parts = line.split(/\s+/);
            if (parts.length >= 4 && interfaceType === 'vlan') {
                const ip = parts[2];
                const mask = parts[3];
                const cidr = this.convertToCIDR(ip, mask);

                if (line.includes('sub')) {
                    data.intVlan.get(interfaceName).ipSub = cidr;
                } else {
                    data.intVlan.get(interfaceName).ip = cidr;
                }
            }
        }
        else if (line.startsWith('dhcp select relay')) {
            if (interfaceType === 'vlan' && data.intVlan.has(interfaceName)) {
                data.intVlan.get(interfaceName).dhcpRelay = 'DHCP Relay';
            }
        }
        // LAG configuration
        else if (line.startsWith('port access vlan ') && interfaceType === 'lag') {
            const vlanMatch = line.match(/port access vlan\s+(\d+)/);
            if (vlanMatch) {
                data.intLag.get(interfaceName).type = 'ACCESS';
                data.intLag.get(interfaceName).vlan = vlanMatch[1];
            }
        }
        else if (line.startsWith('port link-type trunk') && interfaceType === 'lag') {
            data.intLag.get(interfaceName).type = 'TRUNK';
        }
        else if (line.startsWith('port trunk permit vlan') && interfaceType === 'lag') {
            if (line.endsWith('all')) {
                data.intLag.get(interfaceName).vlan = 'all';
            } else {
                const vlans = line.match(/\d+/g);
                if (vlans) {
                    data.intLag.get(interfaceName).vlan = vlans.join(',');
                }
            }
        }
        // Physical interface configuration
        else if (interfaceType === 'phy') {
            this.parsePhysicalInterfaceConfig(line, interfaceName, data);
        }
    }

    parsePhysicalInterfaceConfig(line, interfaceName, data) {
        const intData = data.intPhy.get(interfaceName);

        if (line.startsWith('port link-type trunk')) {
            intData.type = 'TRUNK';
        }
        else if (line.startsWith('port link-type hybrid')) {
            intData.type = 'HYBRID';
        }
        else if (line.startsWith('port access vlan ')) {
            intData.type = 'ACCESS';
            const vlanMatch = line.match(/port access vlan\s+(\d+)/);
            if (vlanMatch) {
                intData.untagVlan = vlanMatch[1];
            }
        }
        else if (line.startsWith('port trunk permit vlan')) {
            if (line.endsWith('all')) {
                intData.tagVlan = 'all';
            } else {
                const vlans = line.match(/\d+/g);
                if (vlans) {
                    intData.tagVlan = this.mergeVlanList(intData.tagVlan, vlans);
                }
            }
        }
        else if (line.startsWith('port hybrid vlan') && line.includes('tagged') && !line.includes('untagged')) {
            const vlans = line.match(/\d+/g);
            if (vlans) {
                intData.tagVlan = this.mergeVlanList(intData.tagVlan, vlans);
            }
        }
        else if (line.startsWith('port hybrid vlan') && line.includes('untagged')) {
            // Extract all VLANs from the line, excluding those after 'untagged'
            const parts = line.split('untagged')[0]; // Get part before 'untagged'
            const vlans = parts.match(/\d+/g);
            if (vlans) {
                intData.untagVlan = this.mergeVlanList(intData.untagVlan, vlans);
            }
        }
        else if (line.startsWith('voice-vlan ')) {
            const vlanMatch = line.match(/voice-vlan\s+(\d+)/);
            if (vlanMatch) {
                intData.voiceVlan = vlanMatch[1];
            }
        }
        else if (line.startsWith('lldp tlv-enable med-tlv network-policy ')) {
            const policyMatch = line.match(/network-policy\s+(\d+)/);
            if (policyMatch) {
                intData.lldpMedNp = policyMatch[1];
            }
        }
        else if (line.startsWith('loopback-detection enable vlan ')) {
            const rangeMatch = line.match(/vlan\s+(.+)/);
            if (rangeMatch) {
                intData.loopbackVlans = rangeMatch[1];
            }
        }
        else if (line.startsWith('port link-aggregation group ')) {
            const aggMatch = line.match(/group\s+(\d+)/);
            if (aggMatch) {
                intData.agg = aggMatch[1];
            }
        }
    }

    mergeVlanList(current, newVlans) {
        const currentList = current === '-' ? [] : current.split(',').filter(v => v.trim());
        const newList = Array.isArray(newVlans) ? newVlans : [newVlans];

        for (const vlan of newList) {
            if (!currentList.includes(vlan)) {
                currentList.push(vlan);
            }
        }

        return currentList.length > 0 ? currentList.join(',') : '-';
    }

    convertToCIDR(ip, mask) {
        try {
            const maskParts = mask.split('.');
            let cidr = 0;
            for (const part of maskParts) {
                const num = parseInt(part);
                cidr += (num >>> 0).toString(2).split('1').length - 1;
            }
            return `${ip}/${cidr}`;
        } catch (error) {
            return `${ip}/${mask}`;
        }
    }

    displayExcelData(data) {
        this.populateTable('table-int-vlan', data.intVlan, [
            'adminStatus', 'ip', 'ipSub', 'dhcpRelay', 'description'
        ]);

        this.populateTable('table-lag', data.intLag, [
            'adminStatus', 'type', 'vlan', 'description'
        ]);

        this.populateTable('table-int', data.intPhy, [
            'adminStatus', 'agg', 'type', 'untagVlan', 'tagVlan',
            'voiceVlan', 'lldpMedNp', 'loopbackVlans', 'description'
        ]);

        this.populateTable('table-vlan', data.vlans, [
            'name', 'nbrPorts', 'snooping'
        ]);
    }

    populateTable(tableId, dataMap, columns) {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        // Trier les interfaces par ordre naturel
        const sortedEntries = Array.from(dataMap.entries()).sort((a, b) => {
            return this.compareInterfaceNames(a[0], b[0]);
        });

        for (const [key, values] of sortedEntries) {
            const row = tbody.insertRow();
            const keyCell = row.insertCell();
            keyCell.textContent = key;

            columns.forEach((column, columnIndex) => {
                const cell = row.insertCell();
                const value = values[column] || '-';

                // Rendre les descriptions éditables
                if (column === 'description') {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = value === '-' ? '' : value;
                    input.className = 'editable-description';
                    input.style.width = '100%';
                    input.style.border = 'none';
                    input.style.background = 'transparent';
                    input.style.padding = '0.25rem';
                    input.addEventListener('change', () => {
                        values[column] = input.value || '';
                        this.updateConfigPreview();
                    });
                    cell.appendChild(input);
                } else if (column === 'agg' && tableId === 'table-int') {
                    // Dropdown pour AGG dans le tableau INT
                    const select = document.createElement('select');
                    select.className = 'editable-agg';
                    select.style.width = '100%';
                    select.style.border = 'none';
                    select.style.background = 'transparent';
                    select.style.padding = '0.25rem';

                    // Option vide
                    const emptyOption = document.createElement('option');
                    emptyOption.value = '-';
                    emptyOption.textContent = '-';
                    select.appendChild(emptyOption);

                    // Options LAG disponibles
                    const availableLags = this.getAvailableLags();
                    availableLags.forEach(lagNum => {
                        const option = document.createElement('option');
                        option.value = lagNum;
                        option.textContent = lagNum;
                        select.appendChild(option);
                    });

                    select.value = value;
                    select.addEventListener('change', () => {
                        values[column] = select.value === '-' ? '-' : select.value;
                        this.updateConfigPreview();
                    });
                    cell.appendChild(select);
                } else {
                    cell.textContent = value;
                }
            });
        }
    }

    compareInterfaceNames(a, b) {
        // Fonction de tri pour les noms d'interfaces
        const extractNumbers = (str) => {
            const matches = str.match(/(\d+)/g);
            return matches ? matches.map(num => parseInt(num)) : [0];
        };

        const extractPrefix = (str) => {
            return str.replace(/\d+/g, '').replace(/[\/\-]/g, '');
        };

        const prefixA = extractPrefix(a);
        const prefixB = extractPrefix(b);

        // Trier d'abord par préfixe
        if (prefixA !== prefixB) {
            // Ordre personnalisé pour les types d'interfaces
            const order = {
                'VlanInterface': 0,
                'BridgeAggregation': 1,
                'GigabitEthernet': 2,
                'TenGigabitEthernet': 3
            };
            return (order[prefixA] || 999) - (order[prefixB] || 999);
        }

        // Ensuite trier par numéros
        const numsA = extractNumbers(a);
        const numsB = extractNumbers(b);

        for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
            const numA = numsA[i] || 0;
            const numB = numsB[i] || 0;
            if (numA !== numB) {
                return numA - numB;
            }
        }

        return 0;
    }

    getAvailableLags() {
        // Retourner la liste des LAGs disponibles basée sur les données parsées
        if (!this.parsedData || !this.parsedData.intLag) {
            return [];
        }

        const lagNumbers = [];
        for (const [lagName, lagConfig] of this.parsedData.intLag) {
            // Extraire le numéro du LAG (ex: Bridge-Aggregation13 -> 13)
            const match = lagName.match(/Bridge-Aggregation(\d+)/);
            if (match) {
                lagNumbers.push(match[1]);
            }
        }

        // Trier les numéros
        return lagNumbers.sort((a, b) => parseInt(a) - parseInt(b));
    }

    updateConfigPreview() {
        // Régénérer et afficher la configuration si les données existent
        if (this.parsedData) {
            const arubaConfig = this.generateArubaConfig(this.parsedData);
            this.displayArubaConfig(arubaConfig);
        }
    }

    generateArubaConfig(data) {
        const hostname = document.getElementById('hostname').value || 'Switch';
        const password = document.getElementById('admin-password').value || 'admin123';
        const stackConfig = this.getStackConfiguration();

        let config = [];

        // Banner MOTD
        config.push(...this.generateBannerMotd(hostname));
        config.push('');

        // Hostname
        config.push(`hostname ${hostname}`);
        config.push('');

        // User admin - CORRECTION: format plaintext
        config.push(`user admin password plaintext ${password}`);
        config.push('');

        // SNMP, NTP, SSH
        config.push(...this.generateSystemConfig());

        // VLANs fixes
        config.push(...this.generateFixedVlans());
        config.push('');

        // LAG interfaces - CORRECTION: ajouter les LAGs manquants
        config.push(...this.generateLagInterfaces(data.intLag, data.intPhy));

        // Interfaces physiques
        config.push(...this.generatePhysicalInterfaces(data.intPhy, stackConfig));

        // Route par défaut
        config.push('ip route 0.0.0.0/0 172.17.1.100');

        return config.join('\n');
    }

    generateBannerMotd(hostname) {
        const line = ` +=============================== ${hostname} ==============================+`;
        return [
            'banner motd !',
            line,
            ' |                                                                               |',
            ' |                                    E N V T                                    |',
            ' |                    Ecole nationale vétérinaire de Toulouse                    |',
            ' |             23 Chemin des Capelles, 31300 Toulouse - www.envt.fr              |',
            ' |                                                                               |',
            ' |                                                                               |',
            ' |                         A X I A N S   T O U L O U S E                         |',
            ' |                         298 Allée du Lac, 31670 Labège                        |',
            ' | Service Client  05.62.71.84.71 - toulouse@axians.com - http://www.axians.com  |',
            ' |                                        -                                      |',
            ' +-------------------------------------------------------------------------------+',
            '!'
        ];
    }

    generateSystemConfig() {
        return [
            'snmp-server vrf default',
            'snmp-server community comEN31pub',
            'snmp-server community pRENiv2',
            'access-level rw',
            'ip source-interface syslog 172.17.1.10',
            '',
            'lldp management-address vlan 1090',
            '',
            'clock timezone etc/gmt-2',
            'ntp server 195.83.103.11',
            'ntp server pool.ntp.org minpoll 4 maxpoll 4 iburst',
            'ntp enable',
            '!',
            '',
            'ssh server vrf default',
            ''
        ];
    }

    generateFixedVlans() {
        const vlans = [
            { id: 1, name: '', igmp: true },
            { id: 2, name: 'Enseignement', igmp: true },
            { id: 3, name: 'Recherche', igmp: true },
            { id: 4, name: 'Scientifique', igmp: true },
            { id: 5, name: 'Sciences', igmp: true },
            { id: 6, name: 'Comptabilite', igmp: true },
            { id: 7, name: 'GTC', igmp: true },
            { id: 8, name: 'GTPTURE', igmp: true },
            { id: 42, name: 'Supevision', igmp: true },
            { id: 104, name: 'CHUVAC_Priv', igmp: true },
            { id: 111, name: 'VMR_Autre', igmp: false },
            { id: 150, name: 'VideoSurv', igmp: true },
            { id: 160, name: 'SurvClinique', igmp: true },
            { id: 180, name: 'TelSecu', igmp: true },
            { id: 222, name: 'IMPRESSION', igmp: true },
            { id: 233, name: 'LABO', igmp: true },
            { id: 244, name: 'Cytogenetique', igmp: true, description: 'vlan cytogenetique bat 8.1 uniquement' },
            { id: 255, name: 'Intheres', igmp: true },
            { id: 1018, name: 'Wifi-AP-2018', igmp: true },
            { id: 1020, name: 'ucopia-out', igmp: true },
            { id: 1025, name: 'StationA3', igmp: true },
            { id: 1073, name: 'Srv-Lan', igmp: true },
            { id: 1090, name: 'ToIP', igmp: true, voice: true },
            { id: 1099, name: 'Audiovisuel', igmp: true, voice: true },
            { id: 1701, name: 'Actifs-Rx', igmp: true },
            { id: 1772, name: 'eduroam2018', igmp: true },
            { id: 1780, name: 'wifi-etudiant-2018', igmp: true },
            { id: 1796, name: 'wifi-invite-2018', igmp: true },
            { id: 1900, name: 'wifi-examen-2023', igmp: true },
            { id: 1916, name: 'wifi-iot-2023', igmp: true }
        ];

        const config = [];
        for (const vlan of vlans) {
            config.push(`vlan ${vlan.id}`);
            if (vlan.name) {
                config.push(`   name ${vlan.name}`);
            }
            if (vlan.description) {
                config.push(`   description "${vlan.description}"`);
            }
            if (vlan.voice) {
                config.push('   voice');
            }
            if (vlan.igmp) {
                config.push('   ip igmp snooping enable');
            }
            config.push('exit');
            config.push('');
        }

        return config;
    }

    generateLagInterfaces(lagData, phyData) {
        const config = [];
        const loopProtectVlans = "2-8,42,104,111,150,160,180,222,233,244,255,1018,1020,1025,1073,1090,1099,1701,1772,1780,1796,1900,1916";

        // CORRECTION: Générer les LAG à partir des données
        for (const [lagName, lagConfig] of lagData) {
            const lagNumber = lagName.replace('Bridge-Aggregation', '');

            config.push(`interface lag ${lagNumber}`);

            if (lagConfig.description) {
                config.push(`   description '${lagConfig.description}'`);
            }

            config.push('   no shutdown');

            if (lagConfig.type === 'TRUNK') {
                if (lagConfig.vlan === 'all') {
                    config.push('   vlan trunk allowed all');
                } else {
                    // CORRECTION: pas d'espaces dans les listes
                    const vlans = lagConfig.vlan.replace(/\s/g, '');
                    config.push(`   vlan trunk allowed ${vlans}`);
                }

                // CORRECTION: native vlan = dernier untagged ou 1 par défaut
                config.push('   vlan trunk native 1');
            }

            config.push('   lacp mode active');
            config.push('   lacp rate fast');
            config.push('exit');
            config.push('');
        }

        return config;
    }

    generatePhysicalInterfaces(phyData, stackConfig) {
        const config = [];
        const loopProtectVlans = "2-8,42,104,111,150,160,180,222,233,244,255,1018,1020,1025,1073,1090,1099,1701,1772,1780,1796,1900,1916";

        for (const [interfaceName, intConfig] of phyData) {
            // Mapper l'interface vers le format Aruba avec la stack
            const arubaInterface = this.mapInterfaceToArubaWithStack(interfaceName, stackConfig);

            if (!arubaInterface) {
                console.warn(`Impossible de mapper l'interface ${interfaceName}`);
                continue;
            }

            config.push(`interface ${arubaInterface}`);

            // CORRECTION: Ajouter les descriptions manquantes
            if (intConfig.description && intConfig.description !== '') {
                config.push(`   description ${intConfig.description}`);
            }

            // Admin status
            if (intConfig.adminStatus === 'Down') {
                config.push('   shutdown');
            } else {
                config.push('   no shutdown');
            }

            // Configuration LAG
            if (intConfig.agg && intConfig.agg !== '-') {
                config.push(`   lag ${intConfig.agg}`);
            } else {
                // Configuration VLAN seulement si pas de LAG
                this.addVlanConfiguration(config, intConfig);

                // QoS pour les ports voice
                if (intConfig.voiceVlan === '1716' || intConfig.tagVlan === '4') {
                    config.push('   qos trust dscp');
                }

                // STP edge pour les ports avec config VLAN
                const hasVlanConfig = intConfig.untagVlan !== '-' || intConfig.tagVlan !== '-' || intConfig.voiceVlan !== '-';
                if (hasVlanConfig) {
                    config.push('   spanning-tree port-type admin-edge');
                }
            }

            // Loop protect
            if (intConfig.loopbackVlans === '1 to 4094') {
                config.push(`   loop-protect vlan ${loopProtectVlans}`);
            }

            // LLDP MED si configuré (retiré car déplacé au début)

            config.push('exit');
            config.push('');
        }

        return config;
    }

    addVlanConfiguration(config, intConfig) {
        const untagVlans = intConfig.untagVlan !== '-' ? intConfig.untagVlan.split(',').map(v => v.trim()) : [];
        const tagVlans = intConfig.tagVlan !== '-' ? intConfig.tagVlan.split(',').map(v => v.trim()) : [];
        const voiceVlan = intConfig.voiceVlan !== '-' ? intConfig.voiceVlan : null;

        if (intConfig.type === 'ACCESS' && untagVlans.length > 0) {
            config.push(`   vlan access ${untagVlans[0]}`);
        } else if (intConfig.type === 'TRUNK' || intConfig.type === 'HYBRID') {
            // Construire la liste des VLANs autorisés
            let allowedVlans = [];

            if (tagVlans.includes('all') || intConfig.tagVlan === 'all') {
                config.push('   vlan trunk allowed all');
            } else {
                allowedVlans = [...tagVlans];

                // Ajouter les VLANs untagged aux allowed
                allowedVlans.push(...untagVlans);

                // Ajouter le VLAN voice si configuré
                if (voiceVlan && !allowedVlans.includes(voiceVlan)) {
                    allowedVlans.push(voiceVlan);
                }

                if (allowedVlans.length > 0) {
                    // CORRECTION: Supprimer les espaces
                    const vlanList = [...new Set(allowedVlans)].sort((a, b) => parseInt(a) - parseInt(b)).join(',');
                    config.push(`   vlan trunk allowed ${vlanList}`);
                }
            }

            // CORRECTION: Native VLAN = dernier untagged
            if (untagVlans.length > 0) {
                const nativeVlan = untagVlans[untagVlans.length - 1];
                config.push(`   vlan trunk native ${nativeVlan}`);
            }
        }
    }

    getModelPortCount(switchModel) {
        const modelMap = {
            '6100-24': { totalPorts: 24, sfpStart: 25 },
            '6100-48': { totalPorts: 48, sfpStart: 49 },
            '6200-48': { totalPorts: 48, sfpStart: 49 }
        };

        return modelMap[switchModel] || modelMap['6100-48'];
    }

    mapInterfaceToArubaWithStack(comwareInterface, stackConfig) {
        // Retirer les préfixes Comware
        let cleanInterface = comwareInterface;
        const isSfp = comwareInterface.startsWith('Ten-GigabitEthernet');

        if (cleanInterface.startsWith('GigabitEthernet')) {
            cleanInterface = cleanInterface.replace('GigabitEthernet', '');
        } else if (cleanInterface.startsWith('Ten-GigabitEthernet')) {
            cleanInterface = cleanInterface.replace('Ten-GigabitEthernet', '');
        }

        // Extraire les numéros de module/slot/port
        const match = cleanInterface.match(/^(\d+)\/(\d+)\/(\d+)$/);
        if (!match) {
            return cleanInterface; // Format inattendu
        }

        const [, module, slot, port] = match;
        const moduleNumber = parseInt(module);
        const portNumber = parseInt(port);

        // Trouver le switch correspondant dans la stack
        const targetSwitch = stackConfig.find(sw => sw.switchNumber === moduleNumber);
        if (!targetSwitch) {
            console.warn(`Switch ${moduleNumber} non trouvé dans la configuration de stack`);
            return null;
        }

        // Calculer le nouveau port selon le type
        let newPort = portNumber;
        if (isSfp) {
            // Pour les ports SFP, utiliser la logique de répartition optimisée
            newPort = this.getOptimalSfpPort(comwareInterface, moduleNumber, stackConfig);
            if (newPort === null) {
                console.warn(`Impossible d'assigner un port SFP pour ${comwareInterface}`);
                return null;
            }
        } else {
            // Port standard - vérifier qu'il ne dépasse pas le nombre de ports
            if (portNumber > targetSwitch.totalPorts) {
                console.warn(`Port ${portNumber} hors limites pour le switch ${targetSwitch.model} (max: ${targetSwitch.totalPorts})`);
                return null;
            }
        }

        // Convertir slot 0 -> 1
        const newSlot = parseInt(slot) + 1;

        return `${moduleNumber}/${newSlot}/${newPort}`;
    }

    getOptimalSfpPort(comwareInterface, moduleNumber, stackConfig) {
        // Trouver le switch cible
        const targetSwitch = stackConfig.find(sw => sw.switchNumber === moduleNumber);
        if (!targetSwitch) return null;

        // Initialiser le mapping SFP si pas encore fait
        if (!this.sfpMapping) {
            this.sfpMapping = new Map();
        }

        // Si déjà mappé, retourner le port assigné
        if (this.sfpMapping.has(comwareInterface)) {
            return this.sfpMapping.get(comwareInterface);
        }

        // Trouver le prochain port SFP disponible pour ce switch
        const moduleKey = `module_${moduleNumber}`;
        if (!this.sfpMapping.has(moduleKey)) {
            this.sfpMapping.set(moduleKey, targetSwitch.sfpStart);
        }

        const nextPort = this.sfpMapping.get(moduleKey);

        // Vérifier qu'on ne dépasse pas le nombre de ports SFP
        if (nextPort >= targetSwitch.sfpStart + targetSwitch.sfpCount) {
            console.warn(`Plus de ports SFP disponibles sur le switch ${moduleNumber}`);
            return null;
        }

        // Assigner ce port et incrémenter pour le prochain
        this.sfpMapping.set(comwareInterface, nextPort);
        this.sfpMapping.set(moduleKey, nextPort + 1);

        return nextPort;
    }

    // Ancienne méthode conservée pour compatibilité
    mapInterfaceToAruba(comwareInterface, modelPorts) {
        // Retirer les préfixes Comware
        let cleanInterface = comwareInterface;
        if (cleanInterface.startsWith('GigabitEthernet')) {
            cleanInterface = cleanInterface.replace('GigabitEthernet', '');
        } else if (cleanInterface.startsWith('Ten-GigabitEthernet')) {
            cleanInterface = cleanInterface.replace('Ten-GigabitEthernet', '');
        }

        // Extraire les numéros de module/slot/port
        const match = cleanInterface.match(/^(\d+)\/(\d+)\/(\d+)$/);
        if (!match) {
            return cleanInterface; // Format inattendu
        }

        const [, module, slot, port] = match;

        // CORRECTION: Gérer le décalage des ports SFP
        let newPort = parseInt(port);
        if (comwareInterface.startsWith('Ten-GigabitEthernet')) {
            // C'est un port SFP, appliquer le décalage
            const originalSfpNumber = parseInt(port);
            newPort = modelPorts.sfpStart + originalSfpNumber - 49; // Ajuster selon le modèle
        }

        // Convertir slot 0 -> 1
        const newSlot = parseInt(slot) + 1;

        return `${module}/${newSlot}/${newPort}`;
    }

    displayArubaConfig(config) {
        const configOutput = document.getElementById('aruba-config');
        const lineNumbers = document.getElementById('line-numbers');

        configOutput.value = config;

        // Générer les numéros de ligne
        const lines = config.split('\n');
        const lineNumbersText = lines.map((_, index) => (index + 1).toString()).join('\n');
        lineNumbers.textContent = lineNumbersText;

        // Mettre à jour le nom du fichier de téléchargement
        const hostname = document.getElementById('hostname').value || 'config';
        this.downloadFilename = `${hostname}.txt`;
    }

    handleTabClick(event) {
        const tabName = event.target.getAttribute('data-tab');

        // Remove active class from all tabs and panes
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // Add active class to clicked tab and corresponding pane
        event.target.classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    }

    handleDownload() {
        const config = document.getElementById('aruba-config').value;
        const blob = new Blob([config], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = this.downloadFilename || 'config.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showMessage('Configuration téléchargée !', 'success');
    }

    async handleCopy() {
        const config = document.getElementById('aruba-config').value;

        try {
            await navigator.clipboard.writeText(config);
            this.showMessage('Configuration copiée dans le presse-papier !', 'success');
        } catch (error) {
            this.showMessage('Erreur lors de la copie', 'error');
        }
    }

    handleExportExcel() {
        if (!this.parsedData) {
            this.showMessage('Aucune donnée à exporter', 'error');
            return;
        }

        try {
            // Créer un nouveau workbook
            const wb = XLSX.utils.book_new();

            // Convertir les données en format Excel
            this.createExcelSheet(wb, 'Int-Vlan', this.parsedData.intVlan, [
                'Interface', 'Admin Statut', 'IP', 'IP-sub', 'DHCP Relay', 'Description'
            ]);

            this.createExcelSheet(wb, 'LAG', this.parsedData.intLag, [
                'Interface', 'Admin Statut', 'Type', 'Vlan', 'Description'
            ]);

            this.createExcelSheet(wb, 'INT', this.parsedData.intPhy, [
                'Interface', 'Admin Statut', 'AGG', 'Type', 'Untag vlan', 'Tag vlan',
                'Voice-VLAN', 'LLDP MED NP', 'Loopback VLANs', 'Description'
            ]);

            this.createExcelSheet(wb, 'Vlan', this.parsedData.vlans, [
                'ID', 'Name', 'Nbr Ports', 'Snooping'
            ]);

            // Télécharger le fichier
            const hostname = document.getElementById('hostname').value || 'export';
            const filename = `${hostname}-modified.xlsx`;
            XLSX.writeFile(wb, filename);

            this.showMessage('Export Excel téléchargé !', 'success');
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            this.showMessage('Erreur lors de l\'export Excel', 'error');
        }
    }

    createExcelSheet(workbook, sheetName, dataMap, columns) {
        const data = [];

        // Header
        data.push(columns);

        // Trier les données comme dans l'affichage
        const sortedEntries = Array.from(dataMap.entries()).sort((a, b) => {
            return this.compareInterfaceNames(a[0], b[0]);
        });

        // Données
        for (const [key, values] of sortedEntries) {
            const row = [key];

            // Mapper les colonnes selon le type de sheet
            if (sheetName === 'Int-Vlan') {
                row.push(values.adminStatus, values.ip, values.ipSub, values.dhcpRelay, values.description);
            } else if (sheetName === 'LAG') {
                row.push(values.adminStatus, values.type, values.vlan, values.description);
            } else if (sheetName === 'INT') {
                row.push(values.adminStatus, values.agg, values.type, values.untagVlan,
                        values.tagVlan, values.voiceVlan, values.lldpMedNp, values.loopbackVlans, values.description);
            } else if (sheetName === 'Vlan') {
                row.push(values.name, values.nbrPorts, values.snooping);
            }

            data.push(row);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    }

    showMessage(text, type = 'info') {
        const messagesContainer = document.getElementById('status-messages');
        const message = document.createElement('div');
        message.className = `status-message ${type}`;
        message.textContent = text;

        messagesContainer.appendChild(message);

        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    new ComwareToArubaConverter();
});