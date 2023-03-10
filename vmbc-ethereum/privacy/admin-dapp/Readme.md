# Privacy admin DAPP 

The admin-dapp is a Nodejs based application that demonstrate privacy application administrators workflow.
The administrator is responsible for:

- Deploying an instance of privacy and public smart contracts and effectively the privacy application. The users rely on these smart contract addresses to get bootstrapped! 

- Since the administrator is the contract owner he can mint public ERC20 tokens to any users based on their EOA ethereum address.

- The administrator can allocate privacy budgets for any users based on their privacy user identifier (PID). 

# Workflow

## Start the admin dapp container using docker compose file
```sh
docker-compose -f docker-compose-privacy-admin-dapp.yml up -d
```

* Attach to the container shell and try out workflows!

```sh
 docker exec -it docker_admin_privacy_dapp_1 bash
```

## Deploy the privacy application (all smart contracts)
```sh
node privacy-admin-dapp.js  deploy
Privacy wallet service grpc:  docker_admin_privacy_service_1:49002
no states found..
no states available..
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Received privacy configuration response
<Buffer 34 0a 32 0a 36 0a 30 20 32 38 39 34 33 38 35 34 30 31 35 35 30 39 39 36 37 36 30 34 34 37 30 39 31 35 39 39 33 36 30 32 35 31 37 36 31 33 38 33 39 33 ... 72505 more bytes>
Deploying privacy app....
config byte size: 72555
compile sol:  ./contracts/PrivateToken.sol
./contracts/PrivateToken.sol
undefined
Successfully compiled PrivateToken from file ./contracts/PrivateToken.sol
Bytecode size: 39588
Deploying with account: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Deploy transaction hash :  0xe22a92e912a38a5a7f8b6cc39689b7d272f07ae279e2243474500a8a49742b54
Successfully deployed PrivateToken contract at 0x44f95010BA6441E9C50c4f790542A44A2CDC1281
compile sol:  ./contracts/PublicToken.sol
./contracts/PublicToken.sol
undefined
Successfully compiled PublicToken from file ./contracts/PublicToken.sol
Bytecode size: 21214
Deploying PublicToken contract with initial balance 10000 for accounts []
Deploying with account: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Deploy transaction hash :  0xf534969514752f79206397ffbe9a6a63d628c8c2ad7291058dda9545665afb23
Successfully deployed PublicToken contract at 0x3d8b57c2D58BB8c8E36626B05fF03381734EAD43
Deployed privacy app successfully...
Done deploying privacy app....

node privacy-admin-dapp.js show
Privacy wallet service grpc:  docker_admin_privacy_service_1:49002
Initializing last know states....
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
-------------------------------------
Admin ethereum account address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Grpc client is UP
Private token contract address:  0x44f95010ba6441e9c50c4f790542a44a2cdc1281
Public contract address:  0x3d8b57c2d58bb8c8e36626b05ff03381734ead43
-------------------------------------
```

## Create budget
```sh
node privacy-admin-dapp.js create-budget alice 1000
Budget req: { userId: 'alice', expirationDate: 1919241632, value: '1000' }
sendTx with identity: admin
node privacy-admin-dapp.js Transaction hash :  0x430b88595f4e0841a81a1836512366c9bf065edfba19673a70fb8f79ed7cfdcc
```

## Mint public balance
Note teh address for alice is public ethereum address. For this testing it can be inferred from alice logs (or) show-state command shown below
```sh
node privacy-admin-dapp.js mint-public 0xF739b28c9ca1eb0cD66d69585443c8FB02b50372 99000
sendTx with identity: admin
```