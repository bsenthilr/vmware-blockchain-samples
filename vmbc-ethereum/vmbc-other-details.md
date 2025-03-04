#### VMware Blockchain and Ethereum Genesis File
The VMware Blockchain genesis file defines the first block in the chain. It contains various configurations that define how the blockchain works.

The genesis file is provided as part of the deployment with default values. Therefore, if operators want to change the default values, they should update the genesis file before deployment.

Currently, the available setting is the free gas mode, enabling the ability not to specify gas fees. See Free Gas Mode.

<details>
    <summary>Sample VMware Blockchain genesis file</summary>

    {
        "config": {
            "chainId": 5000,
            "homesteadBlock": 0,
            "eip155Block": 0,
            "eip158Block": 0
        },
        "alloc": {
            "262c0d7ab5ffd4ede2199f6ea793f819e1abb019": {
            "balance": "12345"
            },
            "5bb088f57365907b1840e45984cae028a82af934": {
            "balance": "0xabcdef"
            },
            "0000a12b3f3d6c9b0d3f126a83ec2dd3dad15f39": {
            "balance": "0x7fffffffffffffff"
            }
        },
        "nonce": "0x000000000000000",
        "difficulty": "0x400",
        "mixhash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "gasLimit": "0xf4240"
    }

</details>
