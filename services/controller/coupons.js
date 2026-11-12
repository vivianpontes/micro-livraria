const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const definition = protoLoader.loadSync('proto/coupons.proto', {
    keepCase: true,
    defaults: true,
});

const { CouponsService } = grpc.loadPackageDefinition(definition);

module.exports = new CouponsService(
    process.env.COUPONS_ADDRESS || '127.0.0.1:3003',
    grpc.credentials.createInsecure()
);