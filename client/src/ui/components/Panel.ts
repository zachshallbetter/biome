import { PanelConfig } from '../PanelManager';

export class Panel {
    private container: HTMLElement;
    private header!: HTMLElement;
    private content!: HTMLElement;
    private config: PanelConfig;
    private isDragging: boolean = false;
    private isResizing: boolean = false;
    private isMinimized: boolean = false;
    private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
    private originalSize: { width: number; height: number } | null = null;
    private originalPosition: { x: number; y: number } | null = null;
    private boundEventHandlers: { [key: string]: (e: Event) => void };

    constructor(config: PanelConfig) {
        this.config = config;

        this.boundEventHandlers = {
            mousemove: this.handleMouseMove.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            resize: this.handleWindowResize.bind(this)
        };

        this.container = document.createElement('div');
        this.container.className = `panel panel-${this.config.type} ${this.config.className || ''}`;
        this.container.id = this.config.id;

        this.createHeader();
        this.createContent();
        this.setupEventListeners();

        this.originalPosition = {
            x: this.config.position.x,
            y: this.config.position.y
        };

        this.setPosition(this.config.position.x, this.config.position.y);
        if (this.config.size) {
            this.setSize(this.config.size.width, this.config.size.height);
        }
    }

    private createHeader(): void {
        this.header = document.createElement('div');
        this.header.className = 'panel-header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'panel-title';
        titleSpan.textContent = this.config.title;

        const controls = document.createElement('div');
        controls.className = 'panel-controls';

        if (this.config.isMinimizable) {
            const minimizeBtn = document.createElement('button');
            minimizeBtn.className = 'panel-minimize';
            minimizeBtn.innerHTML = '−';
            minimizeBtn.title = 'Minimize';
            minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMinimize();
            });
            controls.appendChild(minimizeBtn);
        }

        const resetBtn = document.createElement('button');
        resetBtn.className = 'panel-reset';
        resetBtn.innerHTML = '⟲';
        resetBtn.title = 'Reset Position';
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetPosition();
        });
        controls.appendChild(resetBtn);

        if (this.config.isClosable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'panel-close';
            closeBtn.innerHTML = '×';
            closeBtn.title = 'Close';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dispose();
            });
            controls.appendChild(closeBtn);
        }

        this.header.appendChild(titleSpan);
        this.header.appendChild(controls);
        this.container.appendChild(this.header);
    }

    private createContent(): void {
        this.content = document.createElement('div');
        this.content.className = 'panel-content';
        
        if (this.config.content) {
            this.content.appendChild(this.config.content);
        }
        
        this.container.appendChild(this.content);

        if (this.config.isResizable) {
            const resizer = document.createElement('div');
            resizer.className = 'panel-resize-handle';
            resizer.title = 'Resize';
            this.container.appendChild(resizer);
        }
    }

    private setupEventListeners(): void {
        if (this.config.isDraggable) {
            this.header.addEventListener('mousedown', (e: Event) => {
                if (e instanceof MouseEvent) {
                    const target = e.target as HTMLElement;
                    if (!target.closest('button')) {
                        this.startDragging(e);
                    }
                }
            });
        }

        if (this.config.isResizable) {
            const resizer = this.container.querySelector('.panel-resize-handle');
            if (resizer) {
                resizer.addEventListener('mousedown', (e: Event) => {
                    if (e instanceof MouseEvent) {
                        e.stopPropagation();
                        this.startResizing(e);
                    }
                });
            }
        }

        document.addEventListener('mousemove', this.boundEventHandlers.mousemove);
        document.addEventListener('mouseup', this.boundEventHandlers.mouseup);
        window.addEventListener('resize', this.boundEventHandlers.resize);
    }

    private handleMouseMove(e: Event): void {
        if (e instanceof MouseEvent) {
            if (this.isDragging) this.drag(e);
            if (this.isResizing) this.resize(e);
        }
    }

    private handleMouseUp(): void {
        if (this.isDragging) this.stopDragging();
        if (this.isResizing) this.stopResizing();
    }

    private handleWindowResize(): void {
        const rect = this.container.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        const x = Math.max(0, Math.min(rect.left, maxX));
        const y = Math.max(0, Math.min(rect.top, maxY));
        this.setPosition(x, y);
    }

    private startDragging(e: MouseEvent): void {
        if (e.button !== 0) return; // Only left mouse button
        this.isDragging = true;
        const rect = this.container.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.container.classList.add('dragging');
        e.preventDefault();
    }

    private drag(e: MouseEvent): void {
        if (!this.isDragging) return;
        const maxX = window.innerWidth - this.container.offsetWidth;
        const maxY = window.innerHeight - this.container.offsetHeight;
        const x = Math.max(0, Math.min(e.clientX - this.dragOffset.x, maxX));
        const y = Math.max(0, Math.min(e.clientY - this.dragOffset.y, maxY));
        this.setPosition(x, y);
    }

    private stopDragging(): void {
        this.isDragging = false;
        this.container.classList.remove('dragging');
    }

    private startResizing(e: MouseEvent): void {
        if (e.button !== 0) return; // Only left mouse button
        this.isResizing = true;
        this.container.classList.add('resizing');
        e.preventDefault();
    }

    private resize(e: MouseEvent): void {
        if (!this.isResizing) return;
        const rect = this.container.getBoundingClientRect();
        const maxWidth = window.innerWidth - rect.left;
        const maxHeight = window.innerHeight - rect.top;
        const width = Math.min(e.clientX - rect.left, maxWidth);
        const height = Math.min(e.clientY - rect.top, maxHeight);

        const minWidth = this.config.minSize?.width || 200;
        const minHeight = this.config.minSize?.height || 100;

        this.setSize(
            Math.max(width, minWidth),
            Math.max(height, minHeight)
        );
    }

    private stopResizing(): void {
        this.isResizing = false;
        this.container.classList.remove('resizing');
    }

    private toggleMinimize(): void {
        if (this.isMinimized) {
            if (this.originalSize) {
                this.content.style.display = 'block';
                this.setSize(this.originalSize.width, this.originalSize.height);
                this.originalSize = null;
                this.container.querySelector('.panel-minimize')!.innerHTML = '−';
            }
        } else {
            const rect = this.container.getBoundingClientRect();
            this.originalSize = {
                width: rect.width,
                height: rect.height
            };
            this.content.style.display = 'none';
            this.container.style.height = 'auto';
            this.container.querySelector('.panel-minimize')!.innerHTML = '+';
        }
        this.isMinimized = !this.isMinimized;
        this.container.classList.toggle('minimized');
    }

    private resetPosition(): void {
        if (this.originalPosition) {
            this.setPosition(this.originalPosition.x, this.originalPosition.y);
        }
        if (this.config.size) {
            this.setSize(this.config.size.width, this.config.size.height);
        }
        if (this.isMinimized) {
            this.toggleMinimize();
        }
    }

    private setPosition(x: number, y: number): void {
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
    }

    private setSize(width: number, height: number): void {
        if (!this.isMinimized) {
            this.container.style.width = `${width}px`;
            this.container.style.height = `${height}px`;
        }
    }

    public getContainer(): HTMLElement {
        return this.container;
    }

    public setContent(content: HTMLElement): void {
        this.content.innerHTML = '';
        this.content.appendChild(content);
    }

    public getContent(): HTMLElement {
        return this.content;
    }

    public dispose(): void {
        document.removeEventListener('mousemove', this.boundEventHandlers.mousemove);
        document.removeEventListener('mouseup', this.boundEventHandlers.mouseup);
        window.removeEventListener('resize', this.boundEventHandlers.resize);

        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}