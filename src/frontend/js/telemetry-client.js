/**
 * Simple Telemetry Client
 * Sends traces, logs, and metrics to backend telemetry collector
 */

class TelemetryClient {
    constructor(collectorUrl) {
        this.collectorUrl = collectorUrl || '/api/telemetry';
        this.serviceName = 'shopsmart-frontend';
        this.serviceVersion = '1.0.0';
    }

    generateTraceId() {
        return Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }

    generateSpanId() {
        return Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }

    async sendTrace(spanName, attributes = {}, duration = 0) {
        const traceId = this.generateTraceId();
        const spanId = this.generateSpanId();
        const now = Date.now() * 1000000; // nanoseconds

        const span = {
            resourceSpans: [{
                resource: {
                    attributes: [
                        { key: 'service.name', value: { stringValue: this.serviceName } },
                        { key: 'service.version', value: { stringValue: this.serviceVersion } }
                    ]
                },
                scopeSpans: [{
                    spans: [{
                        traceId,
                        spanId,
                        name: spanName,
                        kind: 1, // SPAN_KIND_INTERNAL
                        startTimeUnixNano: now,
                        endTimeUnixNano: now + (duration * 1000000),
                        attributes: Object.entries(attributes).map(([key, value]) => ({
                            key,
                            value: { stringValue: String(value) }
                        }))
                    }]
                }]
            }]
        };

        return this.send('traces', span);
    }

    async sendLog(message, level = 'INFO', attributes = {}) {
        const log = {
            resourceLogs: [{
                resource: {
                    attributes: [
                        { key: 'service.name', value: { stringValue: this.serviceName } }
                    ]
                },
                scopeLogs: [{
                    logRecords: [{
                        timeUnixNano: Date.now() * 1000000,
                        severityText: level,
                        body: { stringValue: message },
                        attributes: Object.entries(attributes).map(([key, value]) => ({
                            key,
                            value: { stringValue: String(value) }
                        }))
                    }]
                }]
            }]
        };

        return this.send('logs', log);
    }

    async sendMetric(name, value, unit = '1', attributes = {}) {
        const metric = {
            resourceMetrics: [{
                resource: {
                    attributes: [
                        { key: 'service.name', value: { stringValue: this.serviceName } }
                    ]
                },
                scopeMetrics: [{
                    metrics: [{
                        name,
                        unit,
                        gauge: {
                            dataPoints: [{
                                timeUnixNano: Date.now() * 1000000,
                                asDouble: value,
                                attributes: Object.entries(attributes).map(([key, value]) => ({
                                    key,
                                    value: { stringValue: String(value) }
                                }))
                            }]
                        }
                    }]
                }]
            }]
        };

        return this.send('metrics', metric);
    }

    async send(type, data) {
        try {
            const response = await fetch(`${this.collectorUrl}/${type}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                console.error(`Failed to send ${type}:`, response.status);
            }

            return response;
        } catch (error) {
            console.error(`Error sending ${type}:`, error);
        }
    }
}

// Create global instance
window.telemetryClient = new TelemetryClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TelemetryClient };
}
