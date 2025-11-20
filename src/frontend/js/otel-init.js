/**
 * OpenTelemetry Web SDK Initialization
 * Initializes tracing for frontend application
 */

class OTelInitializer {
    constructor() {
        this.provider = null;
        this.tracer = null;
        this.initialized = false;
    }

    async initialize(config) {
        if (this.initialized) return this.tracer;

        try {
            // Wait for OpenTelemetry SDK to be loaded from CDN
            await this.waitForSDK();

            // Access UMD globals
            const { WebTracerProvider } = window['@opentelemetry/sdk-trace-web'];
            const { OTLPTraceExporter } = window['@opentelemetry/exporter-trace-otlp-http'];
            const { BatchSpanProcessor } = window['@opentelemetry/sdk-trace-base'];
            const { Resource } = window['@opentelemetry/resources'];
            const { SemanticResourceAttributes } = window['@opentelemetry/semantic-conventions'];
            const { W3CTraceContextPropagator } = window['@opentelemetry/core'];
            const { registerInstrumentations } = window['@opentelemetry/instrumentation'];
            const { FetchInstrumentation } = window['@opentelemetry/instrumentation-fetch'];

            console.log('OpenTelemetry SDK loaded, initializing...');

            // Create resource with service information
            const resource = new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName || 'shopsmart-frontend',
                [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion || '1.0.0',
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment || 'production'
            });

            // Create OTLP exporter
            const exporter = new OTLPTraceExporter({
                url: config.endpoint,
                headers: {
                    'Authorization': `Api-Token ${config.apiToken}`
                }
            });

            console.log('OTLP Exporter configured:', config.endpoint);

            // Create tracer provider
            this.provider = new WebTracerProvider({
                resource: resource
            });

            // Add batch span processor
            this.provider.addSpanProcessor(new BatchSpanProcessor(exporter));

            // Register the provider
            this.provider.register({
                propagator: new W3CTraceContextPropagator()
            });

            console.log('Tracer provider registered');

            // Register fetch instrumentation for automatic tracing
            registerInstrumentations({
                instrumentations: [
                    new FetchInstrumentation({
                        propagateTraceHeaderCorsUrls: [/.*/],
                        clearTimingResources: true,
                        applyCustomAttributesOnSpan: (span, request, response) => {
                            span.setAttribute('http.url', request.url);
                            span.setAttribute('http.method', request.method || 'GET');
                            if (response) {
                                span.setAttribute('http.status_code', response.status);
                            }
                        }
                    })
                ]
            });

            console.log('Fetch instrumentation registered');

            // Get tracer
            this.tracer = this.provider.getTracer('shopsmart-frontend', config.serviceVersion || '1.0.0');

            this.initialized = true;
            console.log('✓ OpenTelemetry Web SDK initialized successfully');
            
            return this.tracer;

        } catch (error) {
            console.error('✗ Failed to initialize OpenTelemetry:', error);
            console.error('Error details:', error.stack);
            return null;
        }
    }

    async waitForSDK() {
        const maxAttempts = 50;
        const delay = 100;

        for (let i = 0; i < maxAttempts; i++) {
            if (window['@opentelemetry/sdk-trace-web'] && 
                window['@opentelemetry/exporter-trace-otlp-http'] &&
                window['@opentelemetry/instrumentation-fetch']) {
                console.log('OpenTelemetry SDK packages detected');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        throw new Error('OpenTelemetry SDK not loaded from CDN after 5 seconds');
    }

    getTracer() {
        return this.tracer;
    }

    shutdown() {
        if (this.provider) {
            return this.provider.shutdown();
        }
    }
}

// Create global instance
window.otelInitializer = new OTelInitializer();
console.log('OTelInitializer created');
