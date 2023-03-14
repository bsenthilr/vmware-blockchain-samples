## Introduction
<sup> Add necessary info here </sup>

## Architecture
<sup> Add necessary info here. Add info on pod structure here if necessary as the user needs to login to the app container as a part of the workflow </sup>

## Deployment via Kubernetes
The sample privacy ecosystem presented here can be deployed using helm. 

## Pre-requisites
Make sure to have docker, minikube, helm installed. <sup> Exapnd on installing these binaries </sup>

## Limitations
The privacy capabilities are not currently supported with permission enabled blockchain. VMware Blockchain must be deployed with read and write permissions disabled before trying out privacy.

## Configuring the deployment.
Helm charts for the deployment are available [here](). <sup> link the charts here </sup>The user can set the following configuration to deploy with the intended image.
1. blockchainURL: URL for ETH-RPC service. Determined from the VMBC deployments exposed service.
2. global.imageCredentials.registry: Container registry for image downloads
3. global.imageCredentials.username: Username to access/download for registry
4. global.imageCredentials.password: Password to access/download for registry

By default, one admin DApp and 3 user DApps are deployed by these charts. To scale up or down the number of user DApps, edit the field replicas in the file templates/deployment-user.yaml.

## Steps to deploy
1. Ensure the blockchain is up and running.
```
$ kubectl get pods
NAME                                                      READY   STATUS    RESTARTS   AGE
vmbc-deployment-client-0-clientservice-684db974f9-kcj6b   1/1     Running   0          3h19m
vmbc-deployment-client-0-cre-67654c54f5-pt7qm             1/1     Running   0          3h19m
vmbc-deployment-client-0-ethrpc-9458d574d-wvjtx           1/1     Running   0          3h19m
vmbc-deployment-replica-0-concord-5b98797757-t6b7d        1/1     Running   0          3h19m
vmbc-deployment-replica-1-concord-794fd8f84d-pmkkk        1/1     Running   0          3h19m
vmbc-deployment-replica-2-concord-574fd8d575-nl5ct        1/1     Running   0          3h19m
vmbc-deployment-replica-3-concord-85cdd66ff7-qnmlr        1/1     Running   0          3h19m
```
  
2. Note the URL by which the user can send requests to the blockchain
```
$ minikube service list
|-------------|-----------------|--------------|---------------------------|
|  NAMESPACE  |      NAME       | TARGET PORT  |            URL            |
|-------------|-----------------|--------------|---------------------------|
| default     | client-0        | No node port |
| default     | client-0-ethrpc | 8545/8545    | http://192.168.49.2:32175 |    <= ETHRPC listens on the URL seen here.
|             |                 | 8546/8546    | http://192.168.49.2:32326 |
| default     | kubernetes      | No node port |
| default     | replica-0       | No node port |
| default     | replica-1       | No node port |
| default     | replica-2       | No node port |
| default     | replica-3       | No node port |
| kube-system | kube-dns        | No node port |
|-------------|-----------------|--------------|---------------------------|
```
In the example shown above, ethrpc is listening on http://192.168.49.2:32175.

3. Ensure the system is responsive by sending a test request to the URL above.
```
$ curl -X POST --data '{"jsonrpc":"2.0","method":"eth_gasPrice","id":1}' --header "Content-Type: application/json" http://192.168.49.2:32175
{"id":1,"jsonrpc":"2.0","method":"eth_gasPrice","result":"0x0"}
```
The user can now deploy the privacy dapp ecosystem using the helm install command in the following manner.
```
helm install --set blockchainUrl=<ETHRPC URL> <name of privacy app deployment> .
```

For example:
```
$ helm install --set blockchainUrl=“<client-0-ethrpc url>” privacy-dapp-ecosystem .
```

## Privacy application demo
At this point the user should be able to see both the blockchain and the privacy apps up and running. To verify, run kubectl get pods.

```
$ kubectl get pods
NAME                                                      READY   STATUS    RESTARTS   AGE
privacy-admin-dapp-0                                      2/2     Running   0          19s
privacy-user-dapp-0                                       2/2     Running   0          19s
privacy-user-dapp-1                                       2/2     Running   0          15s
privacy-user-dapp-2                                       2/2     Running   0          10s
vmbc-deployment-client-0-clientservice-684db974f9-kcj6b   1/1     Running   0          24h
vmbc-deployment-client-0-cre-67654c54f5-pt7qm             1/1     Running   0          24h
vmbc-deployment-client-0-ethrpc-9458d574d-wvjtx           1/1     Running   0          24h
vmbc-deployment-replica-0-concord-5b98797757-t6b7d        1/1     Running   0          24h
vmbc-deployment-replica-1-concord-794fd8f84d-pmkkk        1/1     Running   0          24h
vmbc-deployment-replica-2-concord-574fd8d575-nl5ct        1/1     Running   0          24h
vmbc-deployment-replica-3-concord-85cdd66ff7-qnmlr        1/1     Running   0          24h
```

The user can log into a pod using the **kubectl exec** command in the following manner.
```
kubectl exec -it pod-name -c container-name -- bash
```

## Administrator workflow demo
1. Connect to the admin pod by executing the below command:
```
$ kubectl exec -it privacy-admin-dapp-0 -c privacy-admin-dapp -- bash
```

2. Run **node privacy-admin-dapp.js** to see the list of options available to the admin.
```
root@privacy-admin-dapp-0:/app# node privacy-admin-dapp.js 
Privacy wallet service grpc:  0.0.0.0:49002
no states found..
no states available..
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Usage: privacy-admin-dapp [options] [command]

Options:
  -h, --help                      display help for command

Commands:
  show                            show summary of the admin app
  reset                           reset app states
  deploy                          generates a privacy config and deploys the privacy and token contracts.
  mint-public <address> <budget>  mints public tokens to specified address.
  create-budget <pid> <budget>    requests creation of a privacy budget for a user.
  help [command]                  display help for command

```

3. To show the status of the admin pod, run **node privacy-admin-dapp.js show**
```
root@privacy-admin-dapp-0:/app# node privacy-admin-dapp.js show
Privacy wallet service grpc:  0.0.0.0:49002
no states found..
no states available..
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
-------------------------------------
Admin ethereum account address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Grpc client is UP
Privacy application contract is not yet deployed!!
-------------------------------------
```
Before deploying, the status reads: "Privacy application contract is not yet deployed!!"

4. To deploy, run **node privacy-admin-dapp.js deploy**
```
root@privacy-admin-dapp-0:/app# node privacy-admin-dapp.js deploy
Privacy wallet service grpc:  0.0.0.0:49002
no states found..
no states available..
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Received privacy configuration response
<Buffer 34 0a 32 0a 36 0a 30 20 39 32 35 33 34 32 30 39 33 33 37 32 37 34 33 36 33 30 32 32 34 39 31 34 30 39 39 35 38 33 32 38 39 30 33 35 37 31 31 37 37 31 ... 72519 more bytes>
Deploying privacy app....
config byte size: 72569
compile sol:  ./contracts/PrivateToken.sol
./contracts/PrivateToken.sol
undefined
Successfully compiled PrivateToken from file ./contracts/PrivateToken.sol
Bytecode size: 39588
Deploying with account: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Deploy transaction hash :  0x4031ea13bf5f5e94141215093a73a6df699500c36a5d0cc5414829748209dc8d
Successfully deployed PrivateToken contract at 0xd13AF1bdb8D7DCC79688F73DDebE936e3e7c3F51
compile sol:  ./contracts/PublicToken.sol
./contracts/PublicToken.sol
undefined
Successfully compiled PublicToken from file ./contracts/PublicToken.sol
Bytecode size: 21214
Deploying PublicToken contract with initial balance 10000 for accounts []
Deploying with account: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Deploy transaction hash :  0x456c8bbba666869e4df128227506b6e80fd9a2c161fb58b8b7d953559992e39c
Successfully deployed PublicToken contract at 0xAfFd838bD92d922398Cada2824448Aea7C5497f1
Deployed privacy app successfully...
Done deploying privacy app....
```

Now, when the user checks the state of the admin pod, the contract addresses are shown:
```
root@privacy-admin-dapp-0:/app# node privacy-admin-dapp.js show
Privacy wallet service grpc:  0.0.0.0:49002
Initializing last know states....
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
-------------------------------------
Admin ethereum account address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Grpc client is UP
Private token contract address:  0x5c9b13100ae4e572c5d931ceb55fdc43cf70f797
Public contract address:  0xdb2e213bd5fab905b2aa2a703c59e1b46e05fb0b
-------------------------------------
```
Note down the contract addresses, as these are used in initializing the user later on.

5. To create a budget for a user, run **node privacy-admin-dapp.js create-budget alice 1000**
```
root@privacy-admin-dapp-0:/app# node privacy-admin-dapp.js create-budget alice 1000
Privacy wallet service grpc:  0.0.0.0:49002
Initializing last know states....
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Budget req: { userId: 'alice', expirationDate: 1919241632, value: '1000' }
sendTx with identity: admin
Transaction hash :  0x54b841c6aa19652aae72fe5e608b6f1b1511c402c50972d4f745ac692f96a61a
created budget successfully..
```

6. To mint tokens for a user, run **node privacy-admin-dapp.js mint-public 0xF739b28c9ca1eb0cD66d69585443c8FB02b50372 99000**.
```
# node privacy-admin-dapp.js mint-public 0xF739b28c9ca1eb0cD66d69585443c8FB02b50372 99000

Privacy wallet service grpc:  0.0.0.0:49002
Initializing last know states....
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
sendTx with identity: admin

Transaction hash :  0x900b4903d36e87acdf794a64444fcc17cfcc2e7ef911a7c63c11984bdc806a5f
```
Note here that the address used corresponds to the eth address of the user.

7. And finally, the admin app state can be reset by running **node privacy-admin-dapp.js reset **
```
root@privacy-admin-dapp-0:/app# node privacy-admin-dapp.js reset
Privacy wallet service grpc:  0.0.0.0:49002
Initializing last know states....
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
root@privacy-admin-dapp-0:/app# node privacy-admin-dapp.js show
Privacy wallet service grpc:  0.0.0.0:49002
no states found..
no states available..
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
-------------------------------------
Admin ethereum account address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Grpc client is UP
Privacy application contract is not yet deployed!!
-------------------------------------
```
Checking the state of the system now, we see that the admin pod state has been reset. 

## User workflow demo
1. Connect to any one of the 3 user pods by executing the below command:
```
$ kubectl exec -it privacy-user-dapp-0 -c privacy-user-dapp -- bash
```

2. Run **node privacy-user-dapp.js** to see the list of options available to the user.
```
root@privacy-user-dapp-0:/app# node privacy-user-dapp.js 
Usage: privacy-user-dapp [options] [command]

Options:
  -V, --version                                                        output the version number
  -h, --help                                                           display help for command

Commands:
  configure <private_key_path> <public_key_path>
  register <certificate>
  init <privacy_contract_address> <tokens_contract_address> <user_id>
  convert-public-to-private <value>
  sync
  show-state
  convert-private-to-public <value>
  transfer <value> <recipient_id> <path_to_recipient_public_key>
  help [command]                                                       display help for command
```

3. To generate and store the keys for a user, create a directory and run the generate_self_signed_certificate.sh script as shown below:
```
root@privacy-user-dapp-0:/app# mkdir certs
root@privacy-user-dapp-0:/app# cd certs/
root@privacy-user-dapp-0:/app/certs# ../generate_self_signed_certificate.sh alice
Generating a RSA private key
.+++++
...+++++
writing new private key to 'alice.priv.pem'
-----
Signature ok
subject=C = US, ST = California, L = Mountain View, O = My Company, OU = IT, CN = alice
Getting Private key
```

4. The next step is to initialize the user. To do this, enter the addresses generated by the admin when deploying the contracts.
```
# node privacy-user-dapp.js  init 0x5c9b13100ae4e572c5d931ceb55fdc43cf70f797 0xdb2e213bd5fab905b2aa2a703c59e1b46e05fb0b alice
Ethereum account address is:  0x18D16E239D2Bc367815Cf38b75C8cdFa7412EdD3
compile sol:  ./contracts/PrivateToken.sol
./contracts/PrivateToken.sol
undefined
Successfully compiled PrivateToken from file ./contracts/PrivateToken.sol
Bytecode size: 39588
compile sol:  ./contracts/PublicToken.sol
./contracts/PublicToken.sol
undefined
Successfully compiled PublicToken from file ./contracts/PublicToken.sol
Bytecode size: 21214
```

5. Once initialized, we can move to the next step which is to configure the user based on the keys generated in step 3, as shown below.
```
root@privacy-user-dapp-0:/app# node privacy-user-dapp.js configure certs/alice.priv.pem certs/alice.pub.pem
root@privacy-user-dapp-0:/app#
```
Note that a successful configuration does not print to console.

6. Once configured, we can register the user using the register option.
```
root@privacy-user-dapp-0:/app# node privacy-user-dapp.js register wallet-db/alice.crt 
sending registration request to the privacy contract
signing myself...
```

7. Now that the user is registered, we can check the state by running **node privacy-user-dapp.js show-state**
```
root@privacy-user-dapp-0:/app# node privacy-user-dapp.js show-state
syncing state from: 1 to: 0
{
  privacy_state: { balance: '0', budget: '1000' },
  public_balance: '0',
  ethereum_public_address: '0x18D16E239D2Bc367815Cf38b75C8cdFa7412EdD3'
}

```
