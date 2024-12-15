import { PanelType, PanelConfig } from '../ui/PanelManager';

// Define reusable panel properties
const commonPanelProps: Omit<PanelConfig, 'id' | 'type' | 'position' | 'size' | 'minSize' | 'title'> = {
    isDraggable: true,
    isMinimizable: true,
    isResizable: true,
    isClosable: true,
    visible: true,
    className: 'panel-default'
};

// Define panel configurations with improved defaults
const panels: Record<PanelType, Partial<PanelConfig>> = {
    time: {
        title: 'Time Control',
        size: { width: 180, height: 180 },
        minSize: { width: 150, height: 150 },
        isResizable: false,
        isClosable: false,
        className: 'panel-time',
        visible: true
    },
    status: {
        title: 'World Events',
        size: { width: 400, height: 250 },
        minSize: { width: 300, height: 150 },
        isResizable: true,
        isClosable: false,
        className: 'panel-status',
        visible: true
    },
    debug: {
        title: 'Debug Console',
        size: { width: 250, height: 300 },
        minSize: { width: 200, height: 150 },
        isResizable: true,
        isClosable: true,
        className: 'panel-debug',
        visible: false
    },
    controls: {
        title: 'Controls',
        size: { width: 320, height: 80 },
        minSize: { width: 300, height: 60 },
        isResizable: false,
        isMinimizable: false,
        isDraggable: true,
        isClosable: false,
        className: 'panel-controls',
        visible: true
    }
};

// Calculate initial positions with improved spacing and responsiveness
const calculatePositions = (): Record<PanelType, { x: number; y: number }> => {
    const padding = 20;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    return {
        time: { 
            x: padding, 
            y: padding 
        },
        status: { 
            x: Math.max(padding, screenWidth - panels.status.size!.width - padding),
            y: padding 
        },
        debug: {
            x: padding,
            y: Math.max(padding, screenHeight - panels.debug.size!.height - padding)
        },
        controls: {
            x: Math.max(padding, (screenWidth - panels.controls.size!.width) / 2),
            y: Math.max(padding, screenHeight - panels.controls.size!.height - padding)
        }
    };
};

// Generate final config with improved type safety and defaults
export const defaultPanelConfigs = (Object.entries(panels) as [PanelType, typeof panels[PanelType]][]).map(([type, config]) => {
    const positions = calculatePositions();
    return {
        ...commonPanelProps,
        ...config,
        id: `${type}-panel`,
        type,
        title: config.title || type.charAt(0).toUpperCase() + type.slice(1),
        position: positions[type],
        size: config.size || { width: 200, height: 150 },
        minSize: config.minSize || { width: 150, height: 100 }
    } as PanelConfig;
});