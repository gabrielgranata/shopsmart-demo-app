const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const https = require('https');
const url = require('url');

const ssmClient = new SSMClient({});
let cachedConfig = null;

async function getConfig() {
    if (cachedConfig) return cachedConfig;
    
    try {
        const [endpointParam, tokenParam] = await Promise.all([
            ssmClient.send(new GetParameterCommand({
                Name: '/shopsmart/prod/opentelemetry/endpoint',
                WithDecryption: false
            })),
            ssmClient.send(new GetParameterCommand({
                Name: '/shopsmart/prod/opentelemetry/api-token',
                WithDecryption: true
            }))
        ]);
        
        cachedConfig = {
            endpoint: endpointParam.Parameter.Value,
            apiToken: tokenParam.Parameter.Value
        };
        
        return cachedConfig;
    } catch (error) {
        console.error('Failed to load config from SSM:', error);
        throw error;
    }
}

function forwardTelemetry(endpoint, apiToken, signalType, data, contentType) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(endpoint);
        let path;
        
        // Dynatrace OTLP endpoints only accept protobuf
        // For JSON, use Dynatrace-specific APIs
        if (contentType.includes('application/x-protobuf')) {
            path = signalType === 'traces' ? '/api/v2/otlp/v1/traces' : 
                   signalType === 'logs' ? '/api/v2/otlp/v1/logs' : 
                   '/api/v2/otlp/v1/metrics';
        } else {
            // JSON endpoints
            path = signalType === 'logs' ? '/api/v2/logs/ingest' :
                   signalType === 'metrics' ? '/api/v2/metrics/ingest' :
                   '/api/v2/otlp/v1/traces'; // Traces require protobuf
        }
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Content-Length': Buffer.byteLength(data),
                'Authorization': `Api-Token ${apiToken}`
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ statusCode: res.statusCode, body: responseData });
                } else {
                    reject(new Error(`Endpoint returned ${res.statusCode}: ${responseData}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

exports.handler = async (event) => {
    console.log('Received telemetry event:', JSON.stringify(event, null, 2));
    
    try {
        const config = await getConfig();
        const signalType = event.pathParameters?.type || 'traces';
        const serviceName = event.queryStringParameters?.service || 'unknown';
        const contentType = event.headers['content-type'] || event.headers['Content-Type'] || 'application/json';
        
        let data;
        if (contentType.includes('application/x-protobuf')) {
            data = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
        } else {
            data = event.body;
        }
        
        console.log(`Forwarding ${signalType} (${contentType}) from service '${serviceName}' to ${config.endpoint}`);
        
        const result = await forwardTelemetry(config.endpoint, config.apiToken, signalType, data, contentType);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({ 
                message: 'Telemetry forwarded successfully',
                signalType,
                serviceName,
                contentType,
                backendStatus: result.statusCode
            })
        };
    } catch (error) {
        console.error('Error forwarding telemetry:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Failed to forward telemetry',
                message: error.message
            })
        };
    }
};
