#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VoiceAIStack } from './voice-ai-stack.js';

const app = new cdk.App();

new VoiceAIStack(app, 'VoiceAIProductionStack', {
  domainName: 'anturon.io',
  environment: 'production',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'me-south-1', // Bahrain for Middle East
  },
  tags: {
    Project: 'VoiceAI',
    Environment: 'production',
  },
});

// Staging environment
new VoiceAIStack(app, 'VoiceAIStagingStack', {
  domainName: 'anturon.io',
  environment: 'staging',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'me-south-1',
  },
  tags: {
    Project: 'VoiceAI',
    Environment: 'staging',
  },
});

app.synth();
