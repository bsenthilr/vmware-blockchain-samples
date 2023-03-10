# How to bring up the browser client APP

# @TODO @gmaciej - update readme after user-web-app contenerization, discuss using scripts for running the app

The following demonstrates how to bring up a client browser app (client.js) using privacy wallet grpc service and metamask!

## 0. Synchronize protobuf if required..
(temp)
https://github.com/grpc/grpc-web/tree/master/net/grpc/gateway/examples/helloworld#generate-protobuf-messages-and-client-service-stub

```
protoc -I=../ wallet-api.proto --js_out=import_style=commonjs,binary:. --grpc-web_out=import_style=commonjs,mode=grpcwebtext:.
```

issue reference:
https://github.com/grpc/grpc-web/issues/566
option reference:
https://github.com/protocolbuffers/protobuf-javascript/blob/main/generator/js_generator.h

note: protobuf files compilation is required only if `wallet-api.proto` file was modified

## 1. Build Envoy and Privacy service containers!

```
docker build -f privacy-demo/docker/DockerfilePrivacyService  -t privacy-wallet-service:latest .

docker build -f privacy-demo/docker/DockerfileEnvoy -t envoy:latest .
```

## 2. Start privacy server
```
cd  privacy-demo/web3/privacy-dapp

docker run -it --rm --env-file ../../docker/.env --network host --name privacy-service privacy-service:latest

```

## 3. Start envoy proxy for grpc server
```
cd  privacy-demo/web3/privacy-dapp

docker run -it --rm --env-file ../../docker/.env --network host --name envoy envoy:latest
```

## 4. Bootstrap the client nodejs front end app & webpack!
```
cd privacy-demo/web3/privacy-dapp/client-dapp

rm -rf node_module

npm install

npx webpack
```

## 5. Start webserver to serve the front end app 

Currently its started on the localhost itself. We will soon host the webserver on a remote machine which is how a real deployment is anticipated. The bank that hosts the web app would serve as origin.

```
python -m http.server 8081
```

## 6. Deploy token contracts

For admin app build instructions see [admin app readme](../admin-dapp/Readme.md).
In admin app container shell:
```
node privacy-admin-dapp.js  deploy
```

## 7. Bring up a browser and connect to the webserver

Bring up your browser with metamask wallet. 
Navigate to 
```
localhost:8081
```

note: After VMBC instance redeployment in MetaMask the old state may be preserved. In order to clear old deployment data in MetaMask a reset should be performed by clicking account symbol (right top) -> Settings -> Advanced -> Reset account

