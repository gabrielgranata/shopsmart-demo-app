/**
 * OpenTelemetry Debug Helper
 * Run in browser console to check OTel status
 */

function debugOTel() {
    console.log('=== OpenTelemetry Debug Info ===\n');
    
    // Check if SDK packages loaded
    console.log('1. SDK Packages:');
    console.log('   @opentelemetry/sdk-trace-web:', !!window['@opentelemetry/sdk-trace-web']);
    console.log('   @opentelemetry/exporter-trace-otlp-http:', !!window['@opentelemetry/exporter-trace-otlp-http']);
    console.log('   @opentelemetry/instrumentation-fetch:', !!window['@opentelemetry/instrumentation-fetch']);
    
    // Check initializer
    console.log('\n2. Initializer:');
    console.log('   window.otelInitializer exists:', !!window.otelInitializer);
    if (window.otelInitializer) {
        console.log('   Initialized:', window.otelInitializer.initialized);
        console.log('   Tracer exists:', !!window.otelInitializer.tracer);
    }
    
    // Check logger
    console.log('\n3. Logger:');
    console.log('   window.logger exists:', !!window.logger);
    if (window.logger) {
        console.log('   Logger initialized:', window.logger.initialized);
        console.log('   Logger tracer exists:', !!window.logger.tracer);
    }
    
    // Check config
    console.log('\n4. Config:');
    if (typeof DYNATRACE_CONFIG !== 'undefined') {
        console.log('   Endpoint:', DYNATRACE_CONFIG.endpoint);
        console.log('   Service Name:', DYNATRACE_CONFIG.serviceName);
        console.log('   Has API Token:', !!DYNATRACE_CONFIG.apiToken);
    } else {
        console.log('   DYNATRACE_CONFIG not defined');
    }
    
    console.log('\n=== End Debug Info ===');
}

// Make available globally
window.debugOTel = debugOTel;

// Auto-run after 3 seconds
setTimeout(() => {
    console.log('\n🔍 Auto-running OpenTelemetry debug check...\n');
    debugOTel();
}, 3000);
