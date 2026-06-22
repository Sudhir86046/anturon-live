import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface VoiceAIStackProps extends cdk.StackProps {
  domainName: string;
  environment: 'production' | 'staging';
}

export class VoiceAIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: VoiceAIStackProps) {
    super(scope, id, props);

    const { domainName, environment } = props;
    const subdomain = environment === 'production' ? 'app' : 'staging';
    const fullDomain = `${subdomain}.${domainName}`;

    // VPC
    const vpc = new ec2.Vpc(this, 'VoiceAIVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Database credentials
    const dbCredentials = new secretsmanager.Secret(this, 'DbCredentials', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    // RDS PostgreSQL
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for RDS',
      allowAllOutbound: true,
    });

    const database = new rds.DatabaseInstance(this, 'VoiceAIDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        environment === 'production' ? ec2.InstanceSize.MEDIUM : ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      credentials: rds.Credentials.fromSecret(dbCredentials),
      databaseName: 'voiceai',
      securityGroups: [dbSecurityGroup],
      deletionProtection: environment === 'production',
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ElastiCache Redis
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis',
      allowAllOutbound: true,
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis',
      subnetIds: vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
    });

    const redisCluster = new elasticache.CfnCacheCluster(this, 'VoiceAIRedis', {
      cacheNodeType: environment === 'production' ? 'cache.t3.small' : 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'VoiceAICluster', {
      vpc,
      clusterName: `voiceai-${environment}`,
    });

    // Application Load Balancer
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for ALB',
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

    // Route53 Hosted Zone (assumes zone already exists)
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });

    // SSL Certificate
    const certificate = new certificatemanager.Certificate(this, 'Certificate', {
      domainName: fullDomain,
      subjectAlternativeNames: [`*.${domainName}`],
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    // API Service
    const apiTaskDef = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
      memoryLimitMiB: environment === 'production' ? 2048 : 512,
      cpu: environment === 'production' ? 1024 : 256,
    });

    const apiContainer = apiTaskDef.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromAsset('../../apps/api'),
      environment: {
        NODE_ENV: environment,
        DATABASE_URL: `postgresql://${dbCredentials.secretValueFromJson('username').unsafeUnwrap()}:${dbCredentials.secretValueFromJson('password').unsafeUnwrap()}@${database.dbInstanceEndpointAddress}/voiceai`,
        REDIS_URL: `redis://${redisCluster.attrRedisEndpointAddress}:6379`,
        JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
        CORS_ORIGIN: `https://${fullDomain}`,
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'api' }),
    });

    apiContainer.addPortMappings({ containerPort: 3001 });

    const apiService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
      cluster,
      taskDefinition: apiTaskDef,
      desiredCount: environment === 'production' ? 2 : 1,
      publicLoadBalancer: true,
      protocol: ecs.ApplicationLoadBalancedServiceProtocol.HTTPS,
      certificate,
      securityGroups: [albSecurityGroup],
      domainName: `api.${fullDomain}`,
      domainZone: hostedZone,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    // Allow API to access database
    dbSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(apiService.service.connections.securityGroups[0].securityGroupId),
      ec2.Port.tcp(5432)
    );

    // Allow API to access Redis
    redisSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(apiService.service.connections.securityGroups[0].securityGroupId),
      ec2.Port.tcp(6379)
    );

    // S3 Bucket for call recordings
    const recordingsBucket = new s3.Bucket(this, 'RecordingsBucket', {
      bucketName: `voiceai-recordings-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });

    // CloudFront Distribution for static assets
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `voiceai-web-${environment}-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3StaticWebsiteOrigin(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [fullDomain],
      certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Route53 Alias record for CloudFront
    new route53.ARecord(this, 'AppAliasRecord', {
      zone: hostedZone,
      recordName: fullDomain,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.CloudFrontTarget(distribution)
      ),
    });

    // Route53 record for API
    new route53.ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: `api.${fullDomain}`,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.LoadBalancerTarget(apiService.loadBalancer)
      ),
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `https://api.${fullDomain}`,
      description: 'API Endpoint URL',
    });

    new cdk.CfnOutput(this, 'AppUrl', {
      value: `https://${fullDomain}`,
      description: 'Application URL',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.dbInstanceEndpointAddress,
      description: 'Database Endpoint',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redisCluster.attrRedisEndpointAddress,
      description: 'Redis Endpoint',
    });
  }
}
