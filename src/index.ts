import {
  Server,
  ServerCredentials,
  loadPackageDefinition,
} from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { resolve } from 'path';

const protoPath = resolve(__dirname, 'ServerProto.proto');

const packageDefinition = loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = loadPackageDefinition(packageDefinition);

const protoPackage = protoDescriptor.server;

function simpleRpc(call, callback): void {
  console.log(call.request);

  callback(null, {
    requestName: `response ${call.request.requestName}`,
    requestInteger: call.request.requestInteger + 1,
    requestBoolean: !call.request.requestBoolean,
    requestFloating: call.request.requestFloating + 0.5,
  });
}

function serverSideRpcStreaming(call): void {
  console.log(call.request);

  for (let i = 0; i < 2; i++) {
    call.write({
      requestName: `response ${call.request.requestName}`,
      requestInteger: i,
      requestBoolean: !call.request.requestBoolean,
      requestFloating: i + 0.5,
    });
  }

  call.end();
}

function clientSideRpcStreaming(call, callback): void {
  const dataset = [];

  call.on('data', data => {
    dataset.push(data);

    console.log(data);
  });

  call.on('end', () =>
    callback(null, {
      requestName: `response ${dataset[0].requestName}`,
      requestInteger: dataset[0].requestInteger + 1,
      requestBoolean: !dataset[0].requestBoolean,
      requestFloating: dataset[0].requestFloating + 0.5,
    }),
  );
}

function bidirectionalRpcStreaming(call): void {
  call.on('data', data => {
    console.log(data);

    call.write({
      requestName: `response ${data.requestName}`,
      requestInteger: data.requestInteger + 1,
      requestBoolean: !data.requestBoolean,
      requestFloating: data.requestFloating + 0.5,
    });
  });

  call.on('end', () => call.end());
}

const server = new Server();

server.addService(protoPackage['Server'].service, {
  simpleRpc,
  serverSideRpcStreaming,
  clientSideRpcStreaming,
  bidirectionalRpcStreaming,
});

server.bindAsync(
  '0.0.0.0:5000',
  ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error(error);

      return;
    }

    console.log(`[*] Server running on port ${port}!`);
  },
);
