export declare const config: {
    readonly database: {
        readonly url: () => string;
    };
    readonly ingestion: {
        readonly port: () => number;
    };
    readonly modelService: {
        readonly port: () => number;
        readonly artifactPath: () => string;
    };
    readonly apiGateway: {
        readonly port: () => number;
    };
    readonly redis: {
        readonly url: () => any;
    };
    readonly kafka: {
        readonly brokers: () => any;
    };
};
//# sourceMappingURL=index.d.ts.map