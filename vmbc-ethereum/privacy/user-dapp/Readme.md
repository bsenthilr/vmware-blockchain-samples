# Privacy user NodeJS Dapp

The user-dapp is a Nodejs based application that demonstrate privacy application users workflow.

# User Workflow

## Start the user dapp container using docker compose file
```sh
docker-compose -f docker-compose-privacy-user-dapp.yml up -d
```
The sample docker compose starts 3 users alice, bob, charlie for demonstration.
The following workflow describes charlie as user. The same flows are applicable for all users.

## Initialize users with privacy application information

User requires the privacy application contract addresses & user PID to initialize.
Attach to the user dapp container shell.
```sh
docker exec -it docker_charlie_privacy_dapp_1 bash
```

Initialize:
```sh
cd to user app directory:

root@eee9aa4af9cd:/app/user-dapp# node privacy-user-dapp.js
Usage: privacy-user-dapp [options] [command]

Options:
  -V, --version                                                        output the version number
  -h, --help                                                           display help for command

Commands:
  configure <private_key_path> <public_key_path>
  register <certificate>
  init <privacy_contract_address> <tokens_contract_address> <user_id>
  convert-public-to-private <value>
  claim-transferred-coins
  claim-budget-coin
  restore-state-from-contract
  show
  convert-private-to-public <value>
  transfer <value> <recipient_id> <path_to_recipient_public_key>
  help [command]                                                       display help for command
```

```sh
root@729ff30fc0de:/app/user-dapp# node privacy-user-dapp.js  init 0x44f95010ba6441e9c50c4f790542a44a2cdc1281 0x3d8b57c2d58bb8c8e36626b05ff03381734ead43 charlie
Ethereum account address is:  0x05b9Cc2f13a2Fd922c2B22623EFE1e209b44AA8d
compile sol:  ./../privacy-lib/contracts/PrivateToken.sol
./../privacy-lib/contracts/PrivateToken.sol
undefined
Successfully compiled PrivateToken from file ./../privacy-lib/contracts/PrivateToken.sol
Bytecode size: 39588
compile sol:  ./../privacy-lib/contracts/PublicToken.sol
./../privacy-lib/contracts/PublicToken.sol
undefined
Successfully compiled PublicToken from file ./../privacy-lib/contracts/PublicToken.sol
Bytecode size: 21214
root@729ff30fc0de:/app/user-dapp#
```
## Configure the user
The user needs to generate a privacy application key pair. He then would need to perform an out of band certificate signing to authorize and authenticate himself with a known certificate authority. 
Currently these steps are handled by a bash script for demonstration. 

Generate secret materials:
```sh
root@729ff30fc0de:/app/user-dapp# ls
Readme.md  generate_self_signed_certificate.sh	node_modules  package-lock.json  package.json  privacy-user-dapp.js  user-state.json
root@729ff30fc0de:/app/user-dapp# mkdir certs
root@729ff30fc0de:/app/user-dapp# cd certs
root@729ff30fc0de:/app/user-dapp/certs# ../generate_self_signed_certificate.sh charlie
Generating a RSA private key
.....+++++
..........................+++++
writing new private key to 'charlie.priv.pem'
-----
Signature ok
subject=C = US, ST = California, L = Mountain View, O = My Company, OU = IT, CN = charlie
Getting Private key
root@729ff30fc0de:/app/user-dapp/certs# ls
charlie.crt  charlie.csr  charlie.priv.pem  charlie.pub.pem  charlie.userid
root@729ff30fc0de:/app/user-dapp/certs#
root@729ff30fc0de:/app/user-dapp/certs# cd ..
```
Now configure the users with generated demonstration certificates:

```sh
root@729ff30fc0de:/app/user-dapp# node privacy-user-dapp.js configure certs/charlie.priv.pem certs/charlie.pub.pem
```

(3) User bootstrapping work flow
The user DAPP has its own persistent volume that gets mounted to /app/wallet-db path.
This enables users to persist the application state and hence support restarts.

* Generate keys, certificates for this user
```
cd /app/wallet-db/
../generate_self_signed_certificate.sh alice
Generating a RSA private key
.................................................+++++
.........+++++
writing new private key to 'alice.priv.pem'
-----
Signature ok
subject=C = US, ST = California, L = Mountain View, O = My Company, OU = IT, CN = alice
Getting Private key
```
## Register the user
Since the user certificates signed by an authority authorizes him implicitly a given user is now able to register himself with the privacy application.

```sh
root@729ff30fc0de:/app/user-dapp# node privacy-user-dapp.js register certs/charlie.crt
sending registration request to the privacy contract
signing myself...
```

## Help commands for the user app
```
node privacy-user-dapp.js
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

## Show and cross check user state
```
node privacy-user-dapp.js show
{
  privacy_state: { balance: '0', budget: '0', coins: {}, userId: 'charlie' },
  public_balance: '0',
  ethereum_public_address: '0xdF74089bbB16D50C8c757c4B9C9CA5676776DCC0'
}
```

## How to create privacy tokens

### Administrator mints public token for the EOA ethereum address of the user.
The ethereum address for NodeJS app is currently autogenerated within the application. It can be inferred from "show-state" command output.

NOTE: This command is executed on admin dapp!
```sh
root@46ee8c7e51e5:/app/admin-dapp# node privacy-admin-dapp.js  mint-public 0x05b9Cc2f13a2Fd922c2B22623EFE1e209b44AA8d 1000
Privacy wallet service grpc:  docker_admin_privacy_service_1:49002
setting callback....
Initializing last know states....
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
sendTx with identity: admin
Transaction hash :  0xd34403042d1a5548244f6f1c3ab20fca9cb4269f3fc2b031700087850dd38958
```

Admin also creates budget for the user using PID
```sh
root@46ee8c7e51e5:/app/admin-dapp# node privacy-admin-dapp.js create-budget charlie 500
Privacy wallet service grpc:  docker_admin_privacy_service_1:49002
setting callback....
Initializing last know states....
Created eth account for identity: admin address: 0x22dAB3b747b7D0529bf8023F36442228865E666b
Budget req: { userId: 'charlie', expirationDate: 1919241632, value: '500' }
sendTx with identity: admin
Transaction hash :  0xb32a0245a1e0c67547b9b34e4c380b3543ad79bd5d67d944ff776e204f2c9b4b
created budget successfully..
``` 

### User claims the budget coin from the blockchain
After the administrator has created the budget coin, the user has to claim it from the contract
```sh
node privacy-user-dapp.js claim-budget-coin

node privacy-user-dapp.js show
{
  privacy_state: { balance: '0', budget: '500', coins: {}, userId: 'charlie' },
  public_balance: '1000',
  ethereum_public_address: '0xdF74089bbB16D50C8c757c4B9C9CA5676776DCC0'
}
```
### User converts his public tokens to private!
In the example below, the user converts 5 public tokens to 5 private coins of 1 token each:
```sh
node privacy-user-dapp.js convert-public-to-private 1
signing myself...
syncing state for sequence number: 1 , searching for [ 'Mint' ]

node privacy-user-dapp.js convert-public-to-private 1
signing myself...
syncing state for sequence number: 2 , searching for [ 'Mint' ]

node privacy-user-dapp.js convert-public-to-private 1
signing myself...
syncing state for sequence number: 3 , searching for [ 'Mint' ]

node privacy-user-dapp.js convert-public-to-private 1
signing myself...
syncing state for sequence number: 4 , searching for [ 'Mint' ]

node privacy-user-dapp.js convert-public-to-private 1
syncing state for sequence number: 5 , searching for [ 'Mint' ]


root@eee9aa4af9cd:/app/user-dapp# node privacy-user-dapp.js show
{
  privacy_state: {
    balance: '5',
    budget: '500',
    coins: {
      '0 10106416910015704457650640982197588783548405346501386090124365146942221100343 0': '1',
      '0 1106007896721864282393551864911596408397767078760036973029241275684599523969 1': '1',
      '0 11197861258433962921278594703720515578812283394080887809181336409971413895491 0': '1',
      '0 11737546336063730473812391966400334435566029713603164309283139559960417682661 1': '1',
      '0 17646555760902672142278493500656217637097166662370325260597703005620538359371 0': '1'
    },
    userId: 'charlie'
  },
  public_balance: '995',
  ethereum_public_address: '0xdF74089bbB16D50C8c757c4B9C9CA5676776DCC0'
}
```

### User converts private tokens to public tokens
In the example below, the user converts three private tokens to public tokens, for that, he first has to merge 3 coins of 1 tokens each and then convert that new coin of 3 tokens to public:
```sh
node privacy-user-dapp.js convert-private-to-public 3
intermediate transaction for merging/breaking coins
signing myself...
syncing state for sequence number: 6 , searching for [ 'Transfer' ]
intermediate transaction for merging/breaking coins
signing myself...
syncing state for sequence number: 7 , searching for [ 'Transfer' ]
sigs not ready... retry in 1 sec
signing myself...
syncing state for sequence number: 8 , searching for [ 'Burn' ]


node privacy-user-dapp.js show
{
  privacy_state: {
    balance: '2',
    budget: '500',
    coins: {
      '0 11197861258433962921278594703720515578812283394080887809181336409971413895491 0': '1',
      '0 11737546336063730473812391966400334435566029713603164309283139559960417682661 1': '1'
    },
    userId: 'charlie'
  },
  public_balance: '998',
  ethereum_public_address: '0xdF74089bbB16D50C8c757c4B9C9CA5676776DCC0'
}
``` 
### How to transfer privacy tokens
Lets now transfer privacy tokens to user PID - bob. To do this we require the public key to encrypt privacy token for bob.
This flow assumes the way user learns about bob etc., is out of band. We just copy over public key of bob and invoke a transfer.

```sh
copy over bob public key to charlie:
vm:~/privacy-docker-images$ docker cp root@155889a9f304:user-dapp/certs/bob.pub.pem .
Error: No such container:path: root@155889a9f304:user-dapp/certs/bob.pub.pem
vm:~/privacy-docker-images$ docker cp 155889a9f304:/app/user-dapp/certs/bob.pub.pem .
vm:~/privacy-docker-images$ docker cp bob.pub.pem 729ff30fc0de:/app/user-dapp/certs/
vm:~/privacy-docker-images$ docker exec 729ff30fc0de ls /app/user-dapp/certs/
bob.pub.pem
charlie.crt
charlie.csr
charlie.priv.pem
charlie.pub.pem
charlie.userid
vm:~/privacy-docker-images$
```

To transfer 2 tokens to bob, Transfer privacy token to Bob, Charlie runs the following:
```sh
transfer 2 bob /app/user-dapp/certs/bob.pub.pem
signing myself...
syncing state for sequence number: 9 , searching for [ 'Transfer' ]
```
Charlie's new state is reflected in the wallet service:
```sh
node privacy-user-dapp.js show
{
  privacy_state: { balance: '0', budget: '998', coins: {}, userId: 'charlie' },
  public_balance: '998',
  ethereum_public_address: '0xdF74089bbB16D50C8c757c4B9C9CA5676776DCC0'
}
```

On the other hand, Bob has to claim the coins from the blockchain. This command simply go from the last known sequence number to the last sequence number known by the contract and it tries to claim Bob's coins on each sequence number:
```sh
node privacy-user-dapp.js claim-transferred-coins
syncing state for sequence number: 1 , searching for [ 'Transfer' ]
syncing state for sequence number: 2 , searching for [ 'Transfer' ]
syncing state for sequence number: 3 , searching for [ 'Transfer' ]
syncing state for sequence number: 4 , searching for [ 'Transfer' ]
syncing state for sequence number: 5 , searching for [ 'Transfer' ]
syncing state for sequence number: 6 , searching for [ 'Transfer' ]
syncing state for sequence number: 7 , searching for [ 'Transfer' ]
syncing state for sequence number: 8 , searching for [ 'Transfer' ]
syncing state for sequence number: 9 , searching for [ 'Transfer' ]

node privacy-user-dapp.js show
{
  privacy_state: {
    balance: '2',
    budget: '0',
    coins: {
      '0 3254891528456031980284018722138633455212807484413904054756395828172867886844 1': '2'
    },
    userId: 'bob'
  },
  public_balance: '0',
  ethereum_public_address: '0xBFE369130c256A18cCfBeC4d10776c0F0D2170d6'
}
```

### Recovering a wallet from the contract state
Assuming a user has lost its wallet state, he still can read the data from the contract itself. This procedure goes from sequence number 1 up to the latest sequence number known by the contract, and tries to claim all possible transactions (Mint, Burn, and Transfer) from the contract state.
```sh
node privacy-user-dapp.js  restore-state-from-contract
syncing state for sequence number: 1 , searching for [ 'Mint', 'Burn', 'Transfer' ]
syncing state for sequence number: 2 , searching for [ 'Mint', 'Burn', 'Transfer' ]
syncing state for sequence number: 3 , searching for [ 'Mint', 'Burn', 'Transfer' ]
syncing state for sequence number: 4 , searching for [ 'Mint', 'Burn', 'Transfer' ]
syncing state for sequence number: 5 , searching for [ 'Mint', 'Burn', 'Transfer' ]
syncing state for sequence number: 6 , searching for [ 'Mint', 'Burn', 'Transfer' ]
syncing state for sequence number: 7 , searching for [ 'Mint', 'Burn', 'Transfer' ]
syncing state for sequence number: 8 , searching for [ 'Mint', 'Burn', 'Transfer' ]
syncing state for sequence number: 9 , searching for [ 'Mint', 'Burn', 'Transfer' ]

node privacy-user-dapp.js show
{
  privacy_state: { balance: '0', budget: '998', coins: {}, userId: 'charlie' },
  public_balance: '998',
  ethereum_public_address: '0xdF74089bbB16D50C8c757c4B9C9CA5676776DCC0'
}
```