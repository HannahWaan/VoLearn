/* ===== WORKER CLIENT MODULE ===== */

const WORKER_URL = 'https://volearn-ai.your-worker.workers.dev'; // Update with actual URL

export class WorkerClient {
    constructor() {
        this.baseUrl = WORKER_URL;
    }
    
    async generate(data) {
        return this.request('/ai/generate', data);
    }
    
    async grade(data) {
        return this.request('/ai/grade', data);
    }
    
    async searchWeb(data) {
        return this.request('/ai/search', data);
    }
    
    async request(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `Request failed: ${response.status}`);
            }
            
            return response.json();
        } catch (error) {
            console.error(`Worker request error (${endpoint}):`, error);
            throw error;
        }
    }
}
