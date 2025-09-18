# Convertisseur Comware vers Aruba

Outil web pour convertir les configurations de switches HP Comware (5130/5140) vers Aruba OS-CX (6100/6200).

## Fonctionnalités

### ✅ Corrections apportées par rapport aux scripts Python originaux :

1. **Format utilisateur admin** : Utilise `user admin password plaintext <password>` au lieu du format incorrect
2. **Descriptions préservées** : Les descriptions des interfaces sont maintenant reprises dans la configuration finale
3. **Pas d'espaces dans les listes** : Format correct `n,n` au lieu de `n, n` pour les VLANs
4. **Interfaces LAG générées** : Les interfaces lag manquantes sont maintenant créées pour les ports SFP
5. **VLAN trunk native correct** : Utilise le dernier VLAN untagged de la configuration source
6. **Mapping des ports amélioré** : Gère correctement le décalage des ports SFP selon le modèle de switch cible
7. **Parsing HYBRID corrigé** : Gestion correcte des ports untagged multiples (`port hybrid vlan 1 4 untagged`)
8. **LLDP management-address global** : Déplacé au début de la configuration au lieu d'être répété sur chaque interface
9. **Descriptions éditables** : Interface interactive pour modifier les descriptions avant génération finale

### 🔧 Fonctionnalités de l'interface web :

- **Chargement de fichier** : Interface drag & drop pour charger la configuration Comware (.txt)
- **Paramètres configurables** :
  - Nom du switch (hostname) - modifiable
  - Modèle de switch cible (6100-12, 6100-24, 6100-48, 6200-48)
  - **Configuration de stack avancée** : Support pour stacks avec différents modèles de switches
  - Mot de passe administrateur
- **Visualisation Excel** : Affichage des 4 feuilles (Int-Vlan, LAG, INT, Vlan) sous forme de tableaux avec headers lisibles
- **Configuration générée** : Visualisation et téléchargement de la configuration Aruba finale
- **Interface responsive** : Optimisée pour desktop et mobile

## Utilisation

1. **Ouvrir l'outil** : Double-cliquez sur `index.html` pour ouvrir l'outil dans votre navigateur
2. **Charger la configuration** : Sélectionnez votre fichier de configuration Comware (.txt)
3. **Configurer les paramètres** :
   - Vérifiez/modifiez le hostname
   - Sélectionnez le modèle de switch cible
   - Définissez le mot de passe admin
4. **Convertir** : Cliquez sur "Convertir la configuration"
5. **Vérifier** : Consultez les données extraites dans les onglets Excel
6. **Modifier (optionnel)** : Cliquez dans les champs "Description" pour les modifier en temps réel
7. **Télécharger** : Téléchargez la configuration Aruba générée avec vos modifications

## Structure des fichiers

```
comware-to-aruba-conf/
├── index.html          # Interface utilisateur principale
├── styles.css          # Feuilles de style (design moderne)
├── converter.js        # Logique de conversion JavaScript
├── README.md          # Ce fichier
└── ressources/        # Fichiers d'exemple et de test
    ├── A-SR9.2-5140-48-source.txt       # Configuration source exemple
    ├── A-SR9-2-6100-48-good.txt         # Configuration cible exemple
    ├── A-SR9-2-6100-48-bad-generated.txt # Ancienne génération (avec erreurs)
    ├── A-SR9-2-6100-48.xlsx             # Fichier Excel intermédiaire
    ├── Script-01-excel-generator.py      # Script Python original (parsing)
    └── Script-02-excel-to-aruba.py       # Script Python original (génération)
```

## Mapping des interfaces

L'outil gère automatiquement le mapping des interfaces selon le modèle de switch :

### Ports standards (GigabitEthernet)
- `GigabitEthernet1/0/X` → `1/1/X`

### Ports SFP (Ten-GigabitEthernet)
- **6100-12** : 12 ports + 4 SFP (13-16)
- **6100-24** : 24 ports + 4 SFP (25-28)
- **6100-48** : 48 ports + 4 SFP (49-52)
- **6200-48** : 48 ports + 4 SFP (49-52)

### Stacking Avancé
- **Support pour stacks hétérogènes** : Mélange de switches avec différents nombres de ports
- **Configuration par switch** : Définir individuellement le modèle de chaque switch dans la stack
- **Validation automatique** : Vérification que les ports source existent sur le switch cible
- **Mapping intelligent** : Adaptation automatique des ports SFP selon le modèle

#### Exemple de stack hétérogène :
- Switch 1 : Aruba 6100-48 (ports 1-48 + SFP 49-52)
- Switch 2 : Aruba 6100-24 (ports 1-24 + SFP 25-28)
- Switch 3 : Aruba 6100-12 (ports 1-12 + SFP 13-16)

## Gestion des VLANs

### Types de ports supportés :
- **ACCESS** : Un seul VLAN untagged
- **TRUNK** : VLANs tagged avec native VLAN
- **HYBRID** : Mélange de VLANs tagged et untagged

### VLANs fixes intégrés :
L'outil génère automatiquement les VLANs standards ENVT :
- VLANs 1-8 (Admin, Enseignement, Recherche, etc.)
- VLANs spéciaux (42, 104, 111, 150, 160, 180, 222, 233, 244, 255)
- VLANs WiFi (1018, 1772, 1780, 1796, 1900, 1916)
- VLANs techniques (1020, 1025, 1073, 1090, 1099, 1701)

## Compatibilité

- **Navigateurs** : Chrome, Firefox, Safari, Edge (versions récentes)
- **Technologies** : HTML5, CSS3, JavaScript ES6+
- **Dépendances** : SheetJS (chargé via CDN)

## Développement

L'outil est entièrement côté client, aucun serveur requis.

### Structure du code JavaScript :
- `ComwareToArubaConverter` : Classe principale
- `parseComwareConfig()` : Parser de configuration Comware
- `generateArubaConfig()` : Générateur de configuration Aruba
- `mapInterfaceToAruba()` : Mapping des interfaces
- Interface utilisateur réactive avec gestion d'événements

### CSS :
- Design responsive (mobile-friendly)
- Variables CSS pour thématisation
- Support mode sombre automatique
- Animations subtiles pour l'UX

## Exemples de conversion

### Input (Comware) :
```
interface GigabitEthernet1/0/1
 port link-type hybrid
 undo port hybrid vlan 1
 port hybrid vlan 4 untagged
 port hybrid pvid vlan 4
 voice-vlan 1716 enable
 stp edged-port
 poe enable
 loopback-detection enable vlan 1 to 4094
```

### Output (Aruba) :
```
interface 1/1/1
   no shutdown
   vlan trunk allowed 4,1716
   vlan trunk native 4
   spanning-tree port-type admin-edge
   loop-protect vlan 2-8,42,104,111,150,160,180,222,233,244,255,1018,1020,1025,1073,1090,1099,1701,1772,1780,1796,1900,1916
exit
```

## Support

Pour signaler un bug ou demander une fonctionnalité, créez un issue sur le repository du projet.