class QuizModal {
    constructor() {
        this.modal = document.getElementById('typebotContainer');
        this.content = document.getElementById('quizContent');
        this.closeBtn = document.getElementById('closeQuiz');
        this.currentStep = null;
        this.sessionId = null;
        this.userData = {};
        
        this.init();
    }

    init() {
        // Mostrar o Quiz ao clicar no botão (mesmo comportamento do Typebot)
        const chatButton = document.getElementById('chatButton');
        chatButton.addEventListener('click', (event) => {
            event.preventDefault();
            this.open();
        });

        this.closeBtn.addEventListener('click', () => this.close());
        
        // Fechar Quiz ao clicar fora (mesmo comportamento do Typebot)
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        });
    }

    async open() {
        this.modal.style.display = 'flex';
        await this.startQuiz();
    }

    close() {
        this.modal.style.display = 'none';
        this.reset();
    }

    reset() {
        this.currentStep = null;
        this.sessionId = null;
        this.userData = {};
        this.content.innerHTML = '';
    }

    async startQuiz() {        
        // this.showLoading('Iniciando consulta...');

        // Capturar parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};
        urlParams.forEach((value, key) => {
            params[key] = value;
        });

        let html = ``;

        html = `
            <div class="quiz-icon green">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2 class="quiz-title">Bem-vindo(a) ao Portal de Atendimento!</h2>
            <p class="quiz-description">Clique no botão abaixo para verificar se possui Valores Disponíveis.</p>
                    
            <button onclick="quiz.nextStep()" class="quiz-button">
                VERIFICAR VALORES A RECEBER
            </button>
        `
    }

    async nextStep(stepData = {}) {
        try {
            this.showLoading('Processando...');

            const response = await fetch('api/quiz-step.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    stepData: {
                        ...stepData,
                        currentStep: this.currentStep?.id,
                        sessionId: this.sessionId
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                if (data.userData) {
                    this.userData = { ...this.userData, ...data.userData };
                }
                
                this.renderStep(data.step);

                // Auto-redirect se necessário
                if (data.step.autoRedirect) {
                    setTimeout(() => {
                        this.handleRedirect();
                    }, data.step.redirectDelay || 3000);
                }
            } else {
                this.showError(data.error || 'Erro ao processar');
            }
        } catch (error) {
            console.error('Erro ao processar etapa:', error);
            this.showError('Erro de conexão. Tente novamente.');
        }
    }

    async handleRedirect() {
        try {
            const response = await fetch('api/quiz-redirect.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userData: this.userData })
            });

            const data = await response.json();

            if (data.success) {
                // Google Ads Conversion (usando os IDs do seu código)
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'conversion', {
                        'send_to': 'AW-715234635/CONVERSION_LABEL',
                        'value': 1.0,
                        'currency': 'BRL'
                    });
                    gtag('event', 'conversion', {
                        'send_to': 'AW-11088821139/CONVERSION_LABEL',
                        'value': 1.0,
                        'currency': 'BRL'
                    });
                }

                // Redirecionar na mesma aba
                window.location.href = data.redirectUrl;
            } else {
                this.showError('Erro ao gerar redirecionamento');
            }
        } catch (error) {
            console.error('Erro no redirecionamento:', error);
            this.showError('Erro ao processar redirecionamento');
        }
    }

    renderStep(step) {
        this.currentStep = step;
        
        let html = ``;

        if (step.type === 'captcha') {
            html = `
                <div class="quiz-icon ${step.iconColor}">
                    ${this.getIcon(step.icon)}
                </div>
                <h2 class="robot-title">${step.title}</h2>
                ${step.question ? `<div class="quiz-question">${step.question}</div>` : ''}
                <form onsubmit="quiz.handleCaptchaSubmit(event)">
                    <input 
                        type="${step.input.type}" 
                        id="quizInput"
                        placeholder="${step.input.placeholder}"
                        class="quiz-input"
                        ${step.input.required ? 'required' : ''}
                        min="${step.input.validation?.min || 0}"
                        max="${step.input.validation?.max || 999}"
                        autofocus
                    />
                    <button type="submit" class="quiz-button">
                        ${step.button?.text || 'VERIFICAR'}
                    </button>
                </form>
            `;
        } else {
            // Código normal para outros tipos...
            html = `
                <div class="quiz-icon ${step.iconColor}">
                    ${this.getIcon(step.icon)}
                </div>
                <h2 class="quiz-title">${step.title}</h2>
                <p class="quiz-description">${step.description}</p>
                ${step.question ? `<div class="quiz-question">${step.question}</div>` : ''}
                ${step.helpText ? `<p class="quiz-help">${step.helpText}</p>` : ''}
                ${step.loadingText ? `<p style="font-size: 14px; color: #999; margin-bottom: 20px;">${step.loadingText}</p>` : ''}
            `;
        }

        if (step.type === 'welcome' && step.button) {
            html += `
                <button onclick="quiz.nextStep()" class="quiz-button">
                    ${step.button.text}
                </button>
            `;
        }

        if (step.type === 'loading') {
            // Esconder botão de fechar
            this.closeBtn.style.display = 'none';
            
            html += `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 100%"></div>
                </div>
            `;

            if (step.progressSteps) {
                html += '<div class="progress-steps">';
                step.progressSteps.forEach(stepText => {
                    html += `<p>${stepText}</p>`;
                });
                html += '</div>';
            }
        } else {
            this.closeBtn.style.display = 'block';
        }
        
        this.content.innerHTML = html;
    }

    handleCaptchaSubmit(event) {
        event.preventDefault();
        const input = document.getElementById('quizInput');
        const value = input.value.trim();
        
        if (!value) return;
        
        this.nextStep({ captcha: parseInt(value) });
    }

    getIcon(iconName) {
        switch (iconName) {
            case 'check-circle':
                return '<i class="fas fa-check-circle"></i>';
            case 'shield':
                return '<i class="fas fa-shield-alt"></i>';
            case 'loader':
                return '<i class="fas fa-spinner fa-spin"></i>';
            default:
                return '<i class="fas fa-check-circle"></i>';
        }
    }

    showLoading(message) {
        this.content.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <div class="spinner"></div>
                <span>${message}</span>
            </div>
        `;
    }

    showError(message) {
        this.content.innerHTML = `
            <div class="quiz-icon" style="background-color: #ffebee; color: #c62828;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h2 class="quiz-title" style="color: #c62828;">Erro</h2>
            <div class="error-message">${message}</div>
            <button onclick="quiz.close()" class="quiz-button" style="background-color: #666;">
                Fechar
            </button>
        `;
    }
}

// Inicializar quiz
const quiz = new QuizModal();